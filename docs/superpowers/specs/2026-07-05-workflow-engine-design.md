# 阶段四：工作流引擎设计文档

> 基于 base_nest（NestJS 11 + Next.js 15 + React Flow）构建的 DAG 工作流编排引擎
> 创建日期：2026-07-05

## 目录

1. [概述](#1-概述)
2. [数据模型](#2-数据模型)
3. [后端模块结构](#3-后端模块结构)
4. [DAG 执行引擎](#4-dag-执行引擎)
5. [节点类型与执行器](#5-节点类型与执行器)
6. [API 设计](#6-api-设计)
7. [图合法性验证](#7-图合法性验证)
8. [错误处理策略](#8-错误处理策略)
9. [前端画布与调试交互](#9-前端画布与调试交互)
10. [与对话应用的打通（后续阶段）](#10-与对话应用的打通后续阶段)
11. [明确不包含的功能](#11-明确不包含的功能)
12. [里程碑](#12-里程碑)

---

## 1. 概述

### 范围

**MVP**（本阶段实现）：

- 工作流定义 CRUD（DAG 图以 JSONB 存储）
- 8 种核心节点：start / end / llm / code / condition / http_request / knowledge_retrieval / question_classifier
- DAG 拓扑排序 + 分层并行执行引擎
- `{{...}}` 变量引用解析引擎
- 运行记录与节点执行快照（调试用途）
- API 触发 + 调试运行（同步返回中间结果）
- React Flow 前端画布编辑器
- 画布调试结果面板

**不包含**（后续阶段）：

- 与 Chat App 的集成（详见第 10 节）
- 循环/迭代节点
- 变量聚合节点（可通过 code 节点替代）
- Webhook 触发
- 工作流版本管理
- 限流排队

### 架构总览

```
┌──────────────────┐     CRUD      ┌──────────────────┐
│  前端 Workflow    │ ◄─────────── │   Workflow        │
│  画布 (ReactFlow) │ ──────POST──► │   Controller      │
│  调试面板         │               └────────┬─────────┘
└──────────────────┘                          │
                                              ▼
                                      ┌──────────────────┐
                                      │   DagEngine       │
                                      │   topologicalSort │
                                      │   layerExecute    │
                                      └────────┬─────────┘
                                               │
                               ┌───────────────┼───────────────┐
                               ▼               ▼               ▼
                      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                      │  LLM Executor │ │  Code Exec    │ │  Condition   │
                      │  (via LLM     │ │  (vm sandbox) │ │  (expression) │
                      │   Strategy)   │ │              │ │              │
                      └──────────────┘ └──────────────┘ └──────────────┘
                               │                                │
                               ▼                                ▼
                      ┌──────────────────────────────────────────┐
                      │  ContextService ({{...}} 变量解析引擎)    │
                      │  + 节点输出写入/读取                       │
                      └──────────────────────────────────────────┘
```

### 执行策略

- **拓扑排序 + 分层并行**：Kahn 算法分层，同一层节点无依赖关系，Promise.all 并行执行
- **Condition 分支路由**：节点的出边通过 `sourceHandle: 'true' | 'false'`（condition）或 `categories[i].id`（classifier）匹配，引擎只走匹配的边
- **普通执行异步**：POST /runs 立即返回 runId，后端异步执行
- **调试执行同步**：POST /runs/debug 等待所有节点执行完，返回全量中间结果

---

## 2. 数据模型

### Workflow 实体 — 工作流定义

表名：`workflows`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| name | varchar(255) | 工作流名称 |
| description | text? | 描述 |
| graph | jsonb | DAG 图定义（nodes + edges） |
| userId | uuid FK -> users.id | 所属用户 |
| createdAt | timestamptz | 创建时间 |
| updatedAt | timestamptz | 更新时间 |

**graph JSONB 结构：**

```typescript
{
  nodes: [
    {
      id: string,             // 节点唯一标识，如 "start", "llm_1"
      type: string,           // 节点类型枚举
      label: string,          // 前端显示名
      position: { x: number, y: number },  // 画布位置
      config: Record<string, any>  // 各类型节点特有配置
    }
  ],
  edges: [
    {
      id: string,             // 边标识
      source: string,          // source node id
      target: string,          // target node id
      sourceHandle?: string    // condition: 'true'|'false'; classifier: categories[i].id
    }
  ]
}
```

### WorkflowRun 实体 — 运行记录

表名：`workflow_runs`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| workflowId | uuid FK -> workflows.id | 所属工作流 |
| status | enum('running', 'succeeded', 'failed', 'cancelled') | 运行状态 |
| inputs | jsonb | 用户传入的输入参数 |
| outputs | jsonb? | end 节点输出 |
| triggeredBy | enum('api', 'manual') | 触发方式 |
| error | text? | 运行级错误信息 |
| startedAt | timestamptz | 开始时间 |
| completedAt | timestamptz? | 完成时间 |
| createdAt | timestamptz | 创建时间 |

### WorkflowNodeExecution 实体 — 节点执行快照

表名：`workflow_node_executions`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| runId | uuid FK -> workflow_runs.id | 所属运行 |
| nodeId | varchar(255) | 对应 graph 中 node.id |
| nodeType | varchar(50) | 节点类型 |
| status | enum('pending', 'running', 'succeeded', 'failed', 'skipped') | 执行状态 |
| inputs | jsonb? | 经过变量解析后的实际输入 |
| outputs | jsonb? | 节点输出 |
| latency | integer? | 执行耗时（ms） |
| error | text? | 错误信息 |
| startedAt | timestamptz? | 开始时间 |
| completedAt | timestamptz? | 完成时间 |

---

## 3. 后端模块结构

```
apps/api/src/workflow/
├── workflow.module.ts
├── workflow.controller.ts              # 工作流 CRUD
├── workflow.service.ts
├── run.controller.ts                   # 执行 + 调试
├── run.service.ts
├── entities/
│   ├── workflow.entity.ts
│   ├── workflow-run.entity.ts
│   └── workflow-node-execution.entity.ts
├── dto/
│   ├── create-workflow.dto.ts
│   ├── update-workflow.dto.ts
│   ├── execute-workflow.dto.ts
│   └── workflow.dto.ts
├── engine/
│   ├── dag-engine.service.ts           # DAG 编排核心
│   ├── context.service.ts              # 变量上下文 {{...}} 解析
│   └── executor/
│       ├── node-executor.interface.ts
│       ├── start-node.executor.ts
│       ├── llm-node.executor.ts
│       ├── code-node.executor.ts
│       ├── condition-node.executor.ts
│       ├── http-request-node.executor.ts
│       ├── knowledge-retrieval-node.executor.ts
│       ├── question-classifier-node.executor.ts
│       └── end-node.executor.ts
```

### 模块依赖

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowRun, WorkflowNodeExecution]),
    AuthGuardModule,
    ProvidersModule,          // LLM 调用
    KnowledgeModule,          // 知识库检索
  ],
  controllers: [WorkflowController, RunController],
  providers: [
    WorkflowService,
    RunService,
    DagEngineService,
    ContextService,
    // 注册所有 executor
    StartNodeExecutor,
    LLMNodeExecutor,
    CodeNodeExecutor,
    ConditionNodeExecutor,
    HttpRequestNodeExecutor,
    KnowledgeRetrievalNodeExecutor,
    QuestionClassifierNodeExecutor,
    EndNodeExecutor,
  ],
})
export class WorkflowModule {}
```

---

## 4. DAG 执行引擎

### 核心执行流程

```typescript
class DagEngineService {
  async execute(
    workflow: Workflow,
    inputs: Record<string, any>,
    runId: string,
    mode: 'api' | 'debug',
  ): Promise<void> {
    const { nodes, edges } = workflow.graph;

    // 1. 拓扑排序
    const layers = this.topologicalSort(nodes, edges);

    // 2. 初始化上下文
    const context = new ContextService(inputs);

    // 3. 逐层执行（层内并行）
    for (const layer of layers) {
      const executions = layer.map(node =>
        this.executeNode(node, edges, context, runId)
      );
      await Promise.all(executions);
    }
  }

  private topologicalSort(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): WorkflowNode[][] {
    // Kahn 算法
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};

    for (const n of nodes) {
      inDegree[n.id] = 0;
      adjList[n.id] = [];
    }
    for (const e of edges) {
      adjList[e.source].push(e.target);
      inDegree[e.target]++;
    }

    const layers: WorkflowNode[][] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    let queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);

    while (queue.length > 0) {
      const layer: WorkflowNode[] = queue.map(id => nodeMap.get(id)!);
      layers.push(layer);

      const nextQueue: string[] = [];
      for (const id of queue) {
        for (const neighbor of adjList[id]) {
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0) {
            nextQueue.push(neighbor);
          }
        }
      }
      queue = nextQueue;
    }

    // 检查环
    const totalProcessed = layers.flat().length;
    if (totalProcessed !== nodes.length) {
      throw new Error('Workflow contains a cycle');
    }

    return layers;
  }

  private async executeNode(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    context: ContextService,
    runId: string,
  ): Promise<void> {
    // 1. 创建/更新 node execution 记录

    // 2. 解析 config 中的 {{...}} 变量
    const resolvedConfig = context.resolve(node.config);

    // 3. 查找匹配的 executor 并执行
    const executor = this.getExecutor(node.type);
    const output = await executor.execute(resolvedConfig, context);

    // 4. 将输出写入上下文
    context.setNodeOutput(node.id, output);

    // 5. 处理条件分支：
    //    - condition 节点: 检查 output.result，
    //      只走 sourceHandle 匹配的边
    //    - 普通节点: 走所有出边
  }
}
```

### ContextService 变量解析

```typescript
class ContextService {
  private data: Map<string, any>;

  constructor(inputs: Record<string, any>) {
    this.data = new Map();
    this.data.set('inputs', inputs);
  }

  setNodeOutput(nodeId: string, output: any) {
    this.data.set(`nodes.${nodeId}.output`, output);
    // 对 LLM 节点额外存储 tokens
    if (output.tokens) {
      this.data.set(`nodes.${nodeId}.tokens`, output.tokens);
    }
  }

  resolve(template: string): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, path: string) => {
      const value = this.getByPath(path);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }

  resolveConfig(config: Record<string, any>): Record<string, any> {
    // 递归遍历 config 对象，对所有 string 值执行 resolve()
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        result[key] = this.resolve(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.resolveConfig(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private getByPath(path: string): any {
    return path.split('.').reduce((obj, key) => {
      if (obj && typeof obj === 'object') return (obj as any)[key];
      return undefined;
    }, Object.fromEntries(this.data));
  }
}
```

---

## 5. 节点类型与执行器

### 统一接口

```typescript
interface NodeExecutor {
  readonly type: string;
  execute(
    config: Record<string, any>,
    context: ContextService,
  ): Promise<Record<string, any>>;
}
```

### 各节点执行器

| 节点类型 | type 值 | execute() 实现 |
|---------|---------|---------------|
| start | `start` | 直接返回 `context.inputs` 作为 output |
| llm | `llm` | 调 `ProvidersService.getProviderClient(providerId)` → `chatStream()` → 收集完整回复 → 返回 `{ content, tokens }` |
| code | `code` | `vm.runInNewContext(code, { inputs, context })`，限制 30s 超时，返回执行结果 |
| condition | `condition` | resolve `expression` → `new Function('return ' + resolvedExpr)()` → 返回 `{ result: boolean }` |
| http_request | `http_request` | `fetch(url, { method, headers, body })` → 返回 `{ status, headers, data }` |
| knowledge_retrieval | `knowledge_retrieval` | 调 `RetrievalService.searchWithScore(knowledgeBaseId, query, topK)` → 返回 `{ segments: [...] }` |
| question_classifier | `question_classifier` | 调用 LLM 分类 → 解析返回的 category 值 → 返回 `{ category: string }` |
| end | `end` | resolve config 中的 output 字段 → 返回最终结果 |

### LLM 节点 config 结构

```json
{
  "providerId": "uuid",
  "model": "gpt-4o",
  "prompt": "请根据参考资料回答问题：\n{{nodes.kb_1.output}}\n\n用户：{{nodes.start.output}}",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### Code 节点 config 结构

```json
{
  "code": "return inputs.text.toUpperCase();",
  "inputs": {
    "text": "{{nodes.start.output}}"
  }
}
```

### Condition 节点 config 结构

```json
{
  "expression": "{{nodes.llm_1.tokens}} > 100"
}
```

### Question Classifier 节点 config 结构

```json
{
  "providerId": "uuid",
  "model": "gpt-4o",
  "instruction": "请将用户问题分类到以下类别：",
  "categories": [
    { "id": "refund", "name": "退货退款" },
    { "id": "shipping", "name": "物流配送" },
    { "id": "other", "name": "其他" }
  ],
  "input": "{{nodes.start.output}}"
}
```

### Condition 和 Classifier 的边路由

```
condition 节点执行后，outDegreeEdgeCount = 2（true 边和 false 边）
  - 若 output.result === true → 只走 sourceHandle === 'true' 的边
  - 若 output.result === false → 只走 sourceHandle === 'false' 的边

classifier 节点执行后，outDegreeEdgeCount = categories.length
  - 根据 output.category 匹配 sourceHandle
  - 匹配不到 → skip 所有下游节点

引擎实现：
  const downstreamEdges = edges.filter(e => e.source === node.id);
/**
 * Condition 节点: output = { result: true | false }
 *   → 匹配 sourceHandle === String(output.result) → "true" | "false"
 * Classifier 节点: output = { category: "refund" | "shipping" | ... }
 *   → 匹配 sourceHandle === output.category
 * 其余节点: 走所有出边
 */
function getMatchingEdges(
  node: WorkflowNode,
  output: Record<string, any>,
  edges: WorkflowEdge[],
): WorkflowEdge[] {
  const downstreamEdges = edges.filter(e => e.source === node.id);

  if (node.type === 'condition') {
    return downstreamEdges.filter(e => e.sourceHandle === String(output.result));
  }
  if (node.type === 'question_classifier') {
    return downstreamEdges.filter(e => e.sourceHandle === output.category);
  }
  return downstreamEdges;
}
```

---

## 6. API 设计

所有端点需 JWT 认证（`@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()`）。

### 工作流 CRUD

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/workflows` | 当前用户的 Workflow 列表（不含 graph 内容） |
| POST | `/workflows` | 创建 Workflow |
| GET | `/workflows/:id` | Workflow 详情（含完整 graph） |
| PATCH | `/workflows/:id` | 更新 Workflow（graph 全量替换） |
| DELETE | `/workflows/:id` | 删除 Workflow（级联删除 runs 和 node_executions） |

**POST/PATCH body：**

```json
{
  "name": "智能客服问答",
  "description": "根据用户问题检索知识库并回答",
  "graph": {
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "label": "用户输入",
        "position": { "x": 100, "y": 200 },
        "config": {}
      },
      {
        "id": "llm_1",
        "type": "llm",
        "label": "生成回复",
        "position": { "x": 400, "y": 200 },
        "config": {
          "providerId": "uuid",
          "model": "gpt-4o",
          "prompt": "用户问题：{{nodes.start.output}}\n请给出回答。",
          "temperature": 0.7
        }
      },
      {
        "id": "end",
        "type": "end",
        "label": "输出结果",
        "position": { "x": 700, "y": 200 },
        "config": {
          "output": "{{nodes.llm_1.output}}"
        }
      }
    ],
    "edges": [
      { "id": "e1", "source": "start", "target": "llm_1" },
      { "id": "e2", "source": "llm_1", "target": "end" }
    ]
  }
}
```

### 执行 API

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/workflows/:id/runs` | 执行工作流（异步，立即返回 runId） |
| POST | `/workflows/:id/runs/debug` | 调试执行（同步，返回全量中间结果） |

**POST body（通用）：**

```json
{
  "inputs": { "query": "退货政策是什么？" }
}
```

**POST /runs 响应：**

```json
{
  "code": 1,
  "data": {
    "runId": "uuid",
    "status": "running"
  },
  "msg": "ok"
}
```

**POST /runs/debug 响应：**

```json
{
  "code": 1,
  "data": {
    "runId": "uuid",
    "status": "succeeded",
    "inputs": { "query": "退货政策是什么？" },
    "outputs": { "result": "根据退货政策..." },
    "nodeExecutions": [
      {
        "nodeId": "start",
        "nodeType": "start",
        "status": "succeeded",
        "latency": 5,
        "inputs": {},
        "outputs": { "query": "退货政策是什么？" }
      },
      {
        "nodeId": "llm_1",
        "nodeType": "llm",
        "status": "succeeded",
        "latency": 3200,
        "inputs": {
          "providerId": "uuid",
          "model": "gpt-4o",
          "prompt": "用户问题：退货政策是什么？\n请给出回答。"
        },
        "outputs": {
          "content": "根据退货政策..."
        }
      },
      {
        "nodeId": "end",
        "nodeType": "end",
        "status": "succeeded",
        "latency": 1,
        "inputs": {},
        "outputs": { "result": "根据退货政策..." }
      }
    ]
  },
  "msg": "ok"
}
```

### 运行记录查询

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/workflows/:id/runs` | 运行列表（按时间 DESC） |
| GET | `/workflows/:id/runs/:runId` | 运行详情（含 outputs 和 status） |
| GET | `/workflows/:id/runs/:runId/nodes` | 节点执行快照列表 |

---

## 7. 图合法性验证

保存 graph 时（PATCH /workflows/:id），后端执行以下验证：

| # | 规则 | 校验方式 |
|---|------|---------|
| 1 | nodes 数组非空 | `Array.isArray(nodes) && nodes.length > 0` |
| 2 | 有且仅有一个 start 节点 | `nodes.filter(n => n.type === 'start').length === 1` |
| 3 | 有且仅有一个 end 节点 | `nodes.filter(n => n.type === 'end').length === 1` |
| 4 | 节点 id 唯一 | `new Set(nodes.map(n => n.id)).size === nodes.length` |
| 5 | 边引用节点存在 | `edges.every(e => nodeIds.has(e.source) && nodeIds.has(e.target))` |
| 6 | 无环 | 拓扑排序成功（不抛异常） |
| 7 | start 可达 end | 从 start 开始 BFS，能访问到 end |
| 8 | condition 出边有 sourceHandle | condition 节点的所有出边必须设置 sourceHandle |
| 9 | type 是合法枚举值 | 必须是预定义节点类型之一 |

---

## 8. 错误处理策略

| 场景 | 处理方式 |
|------|---------|
| LLM 调用失败（超时/API 拒绝） | 节点标记 failed，记录 error，整个 run 标记 failed |
| Code 执行超时（>30s） | 节点标记 failed，error: "Code execution timed out" |
| Code 语法错误/运行时异常 | 捕获异常，节点标记 failed，记录 error message |
| HTTP 请求超时/网络错误 | 节点标记 failed |
| 变量引用不存在 | 保留 `{{path}}` 原样（不中断执行），节点成功但 output 含未解析模板 |
| 图结构非法 | 保存时拒绝，执行前验证双重检查 |
| 条件分支无匹配边 | 下游节点全部标记 skipped |

### 执行前验证

执行启动前，再次验证图合法性（防御性编程，防止并发修改导致的不一致），验证失败则 run 直接标记为 failed，不执行任何节点。

---

## 9. 前端画布与调试交互

### 页面路由

```
app/(dashboard)/
  workflows/
    page.tsx                        # 工作流列表
    new/page.tsx                    # 新建工作流
    [id]/
      edit/page.tsx                 # 画布编辑（主页面）
      runs/page.tsx                 # 运行历史列表
      runs/[runId]/page.tsx         # 运行详情（节点状态图）
```

### 画布编辑器组件树

```
WorkflowEditorPage
  ├── AppHeader
  │   ├── 工作流名称（可编辑）
  │   ├── 保存按钮
  │   ├── 运行按钮（异步执行）
  │   └── 调试运行按钮（同步执行 + 展示结果）
  ├── CanvasArea
  │   └── ReactFlow
  │       ├── CustomNode ×N
  │       │   ├── StartNode          — 绿色圆形
  │       │   ├── LLMNode            — 蓝色方块
  │       │   ├── CodeNode           — 紫色方块
  │       │   ├── ConditionNode      — 黄色菱形
  │       │   ├── HttpRequestNode    — 橙色方块
  │       │   ├── KnowledgeNode      — 青色方块
  │       │   ├── ClassifierNode     — 粉色方块
  │       │   └── EndNode            — 红色圆形
  │       └── CustomEdge             — 边线 + sourceHandle 标签
  ├── NodeConfigPanel                — 右侧抽屉：选中节点时显示配置表单
  │   ├── LLMConfigForm (provider选择, model, prompt, temperature)
  │   ├── CodeConfigForm (代码编辑器)
  │   ├── ConditionConfigForm (表达式输入)
  │   ├── HttpConfigForm (url, method, headers)
  │   ├── KnowledgeConfigForm (知识库选择, query, topK)
  │   └── ClassifierConfigForm (categories 列表编辑)
  └── DebugResultPanel               — 底部滑出：调试运行结果
      ├── NodeExecutionList           — 按图顺序列出的节点状态列表
      │   └── NodeExecutionRow ×N    — 状态图标 + 节点名 + 耗时
      ├── NodeDetailView             — 点击某行后展开
      │   ├── InputTab               — 解析后的输入参数
      │   ├── OutputTab              — 节点输出
      │   └── ErrorTab (if failed)   — 错误详情
      └── FinalOutput                — end 节点运行结果
```

### 调试交互流程

```
1. 用户在画布编辑器中点击"调试运行"
2. 前端 POST /workflows/:id/runs/debug { inputs }
3. 显示 loading 状态，等待后端返回
4. 后端返回后：
   a. DebugResultPanel 从底部滑出
   b. 每个节点在画布上显示执行状态边框（绿色=成功，红色=失败，灰色=跳过）
   c. NodeExecutionList 显示所有节点执行记录（状态图标+耗时）
5. 用户点击 ExecutionList 中的某行 → NodeDetailView 展示该节点的 inputs/outputs
6. 用户点击"关闭" → 清理调试状态，画布恢复编辑模式
```

### 技术选型

| 项 | 选择 |
|----|------|
| 画布库 | `reactflow`（现 @xyflow/react） |
| 代码编辑器 | CodeMirror（Code 节点用） |
| 状态管理 | Zustand（已有） |

---

## 10. 与对话应用的打通（后续阶段）

### 方案

在 App 实体中增加可选字段：

```typescript
// App 实体新增
workflowId?: string;              // FK -> workflows.id (nullable)
workflowTrigger?: 'prefix' | 'regex';  // 触发方式
workflowTriggerRule?: string;     // 触发规则
```

### 触发流程

```
用户发送消息
      │
      ├── App 配置了 workflowId?
      │    否 ──→ 走现有 LLM 对话流程
      │    是
      │
      ├── 检查 Trigger 条件
      │    prefix: 消息以触发词开头（如 "/工作流 分析数据"）
      │    regex: 消息匹配正则
      │
      │   不匹配 ──→ 走现有 LLM 对话流程
      │   匹配
      │
      ├── 执行 Workflow（API 模式），传入 inputs:
      │    { query: messages.content, conversationHistory: [...] }
      │
      ├── 等待 Workflow 执行完成
      │
      └── 将 Workflow outputs 注入为对话上下文
          └→ LLM 基于 workflow 结果生成最终回复
```

### 集成点

| 集成点 | 改动范围 |
|--------|---------|
| App 实体加字段 | `apps.entity.ts` + 迁移 |
| CreateAppDto/UpdateAppDto | 加 workflowId / trigger 字段 |
| ChatService.sendMessage() | 加一段 trigger 判断 → runWorkflow 逻辑 |
| 前端 App 编辑页 | 加 workflow 选择 + trigger 配置 |

---

## 11. 明确不包含的功能

| 功能 | 原因 |
|------|------|
| Variable aggregator 节点 | 可通过 code 节点手动合并多个输入 |
| Loop/Iteration 节点 | 复杂度高，Dify 的迭代节点涉及动态图，后续扩展 |
| 并行限流/排队 | MVP 期 Promise.all 即可，流量增大后加 |
| Webhook 触发 | 后续通过发布模块（阶段五）扩展 |
| 工作流版本管理 | 只保留最新版，历史版本靠 git 管理 graph 变化 |
| 节点模板市场 | 距离太远 |
| 工作流定时触发 | 不属于 MVP 目标 |
| LLM 节点流式输出到前端 | MVP 期内非流式（整个工作流执行完后返回），后续可优化 |

---

## 12. 里程碑

### 阶段 4a — 后端核心（2 周）

- [ ] 数据库迁移（workflow / workflow_run / workflow_node_execution 表）
- [ ] Workflow CRUD API（含 graph 验证）+ 单元测试
- [ ] ContextService（{{...}} 变量解析）+ 单元测试
- [ ] DagEngine 拓扑排序 + 分层并行执行 + 单元测试
- [ ] 所有 8 种 NodeExecutor（含单元测试）
- [ ] Run API（普通执行 + 调试执行）+ 单元测试
- [ ] 图合法性验证 + 错误处理

### 阶段 4b — 前端画布（2 周）

- [ ] 工作流列表页 + 新建/编辑页
- [ ] React Flow 画布（拖拽节点、连线、删除）
- [ ] 8 种自定义节点渲染
- [ ] NodeConfigPanel（各类型配置表单）
- [ ] 运行按钮 + DebugResultPanel
- [ ] 节点执行状态在画布上的可视化
- [ ] 运行历史列表 + 运行详情页

### 阶段 4c — 与对话应用打通（可选，1 周）

- [ ] App 实体加 workflowId/trigger 字段 + 迁移
- [ ] ChatService 集成工作流触发
- [ ] 前端 App 编辑页加工作流选择
