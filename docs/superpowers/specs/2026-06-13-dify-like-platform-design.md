# 类 Dify AI 平台开发计划

> 基于 base_nest（NestJS 11 + TypeORM/Postgres）构建的 AI 应用开发平台
> 创建日期：2026-06-13

## 目录

1. [技术栈扩展](#1-技术栈扩展)
2. [阶段一：模型提供商与密钥管理](#2-阶段一模型提供商与密钥管理)
3. [阶段二：RAG 知识库](#3-阶段二rag-知识库)
4. [阶段三：对话应用](#4-阶段三对话应用)
5. [阶段四：工作流引擎](#5-阶段四工作流引擎)
6. [阶段五：应用发布与管理](#6-阶段五应用发布与管理)
7. [阶段六：插件生态](#7-阶段六插件生态)

---

## 1. 技术栈扩展

在现有基础上新增以下基础设施：

| 类别 | 技术选型 | 用途 |
|------|----------|------|
| 向量库 | **Chroma**（本地开发）/ pgvector（生产） | 向量检索 |
| 缓存/队列 | `Redis`（`@nestjs/bull` 或 `ioredis`） | 会话缓存、任务队列 |
| 文件存储 | 本地磁盘 + S3 兼容（`@aws-sdk/client-s3`） | 文档、知识库文件 |
| 流式响应 | SSE（Server-Sent Events） | LLM 流式输出 |
| 嵌入模型 | **Ollama mxbai-embed-large**（LangChain `OllamaEmbeddings`） | 文档向量化 |
| 生成模型 | **Ollama qwen2.5:7b**（LangChain `ChatOllama`） | 本地 LLM 推理 |
| 框架 | **LangChain**（`@langchain/ollama`, `@langchain/community`） | LLM 调用、分块、链式编排 |
| 文档解析 | `pdf-parse`, `tiktoken`, `langchain/text_splitter` | 文档解析与分块 |

### 现有项目可复用资产

- **AuthModule** — JWT 认证、注册登录、Token 刷新/黑名单 → 直接复用
- **UsersModule** — 用户管理 → 直接复用
- **统一响应格式** — code/data/msg 拦截器 → 全局复用
- **TypeORM + 迁移流程** — 新模块沿用相同模式

---

## 2. 阶段一：模型提供商与密钥管理

### 目标

搭建 AI 能力的入口：管理多个 LLM 提供商和 API 密钥，提供统一的模型调用接口。

### 模块结构

```
src/
  providers/
    providers.module.ts
    providers.service.ts          # 统一调用入口
    providers.controller.ts       # 管理 API
    dto/
      create-provider.dto.ts
      update-provider.dto.ts
    entities/
      model-provider.entity.ts    # 提供商配置（类型、baseUrl 等）
      api-key.entity.ts           # 加密存储的 API Key
      model.entity.ts             # 模型定义（name、context、capabilities）
    strategies/
      openai.strategy.ts          # OpenAI 协议适配
      claude.strategy.ts          # Anthropic 协议适配
      ollama.strategy.ts          # Ollama 本地模型适配
      openai-compatible.strategy.ts  # 兼容 OpenAI 协议的第三方
    interfaces/
      llm-provider.interface.ts   # 统一接口定义
```

### 核心模型

```typescript
// ModelProvider 实体
{
  id: uuid PK,
  name: string,          // "OpenAI", "Anthropic", "Ollama"
  type: enum,            // openai | anthropic | ollama | openai-compatible
  isEnabled: boolean,
  baseUrl: string?,      // 自定义端点
  // 关联 models
}

// ApiKey 实体
{
  id: uuid PK,
  providerId: FK -> ModelProvider,
  name: string,          // 别名 "生产 Key"
  encryptedKey: string,  // AES-256 加密存储
  maskedKey: string,     // 显示 "sk-****...abc"
  isActive: boolean,
  createdAt: timestamptz,
}

// Model 实体
{
  id: uuid PK,
  providerId: FK -> ModelProvider,
  name: string,          // "gpt-4o", "claude-sonnet-4-20250514"
  displayName: string,
  contextWindow: number,
  maxOutput: number,
  capabilities: jsonb,   // { streaming: true, functionCalling: true, vision: true }
  isBuiltin: boolean,    // 预定义 vs 自定义
}
```

### 统一调用接口

```typescript
interface LlmProvider {
  chat(params: ChatParams): Promise<ChatResponse>;
  chatStream(params: ChatParams): Observable<ChatChunk>;
  embed(texts: string[]): Promise<number[][]>;  // 可选：嵌入模型
}

interface ChatParams {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
```

### 密钥安全

- `ApiKey.encryptedKey` 使用 AES-256-GCM 加密，密钥来自环境变量 `ENCRYPTION_KEY`
- 响应中只返回 `maskedKey`（前 4 位 + `****` + 后 4 位）

### 里程碑

- [ ] 数据库迁移创建 provider/api-key/model 表
- [ ] 实现 OpenAI 和 OpenAI-compatible 策略
- [ ] 实现 Anthropic 策略
- [ ] 模型列表 API（CRUD）
- [ ] 密钥管理 API（CRUD，加密存储）
- [ ] 统一聊天测试页（选择模型 → 输入消息 → 流式回复）

---

## 3. 阶段二：RAG 知识库

### 目标

支持文档上传、解析分块、向量化存储、语义检索。

### 模块结构

```
src/
  knowledge/
    knowledge.module.ts
    knowledge.controller.ts       # 知识库 CRUD
    knowledge.service.ts
    document.controller.ts        # 文档上传/管理
    document.service.ts
    retrieval.service.ts          # 检索服务
    entities/
      knowledge-base.entity.ts    # 知识库
      document.entity.ts          # 文档（文件）
      document-segment.entity.ts  # 文档分段（chunk）
      embedding.entity.ts         # 向量嵌入（可选独立的表）
    chunking/
      chunk-strategy.interface.ts
      token-chunker.ts            # Token-based chunking
      recursive-chunker.ts        # Recursive character splitting
      markdown-chunker.ts         # Markdown 结构分块
    vector/
      vector-store.service.ts     # pgvector 操作封装
    dto/
      create-knowledge-base.dto.ts
      upload-document.dto.ts
      retrieval-query.dto.ts
```

### 核心模型

```typescript
// KnowledgeBase 实体
{
  id: uuid PK,
  name: string,
  description: string?,
  embeddingModel: string,      // 使用的嵌入模型名
  chunkStrategy: string,       // chunking 策略
  chunkSize: number,
  chunkOverlap: number,
  userId: FK -> User,
  createdAt: timestamptz,
}

// Document 实体
{
  id: uuid PK,
  knowledgeBaseId: FK -> KnowledgeBase,
  fileName: string,
  fileType: string,            // pdf | txt | md | html | csv
  fileSize: number,
  storagePath: string,         // 文件存储路径
  status: enum,                // pending | processing | completed | failed
  errorMessage: string?,
  charCount: number,
  tokenCount: number?,
  processedAt: timestamptz?,
  createdAt: timestamptz,
}

// DocumentSegment 实体
{
  id: uuid PK,
  documentId: FK -> Document,
  knowledgeBaseId: FK -> KnowledgeBase,
  index: number,               // 段落在文档中的序号
  content: text,
  charCount: number,
  tokenCount: number,
  // embedding: vector(1536)  — pgvector 列，由迁移创建
  metadata: jsonb,             // { page: 1, heading: "Introduction" }
  createdAt: timestamptz,
}
```

### 文档处理流水线

```
上传 → 文档解析 → 分块 → 向量化 → 存储
           │          │         │
        pdf-parse   chunker   embedding model
```

### 检索流程

```
查询 → 嵌入查询文本 → pgvector ANN 检索 → 可选 rerank → 返回 Top-K 分段

                              ┌─ SQL: ORDER BY embedding <-> $1 LIMIT K
                              │   + 可选 metadata 过滤
                              │   + 可选 keyword (tsvector) 混合
```

### 里程碑

- [ ] 安装 pgvector 扩展
- [ ] 数据库迁移创建知识库/文档/分段表（含 vector 列）
- [ ] 知识库 CRUD API
- [ ] 文档上传与文件存储
- [ ] 文档解析与分块（支持 PDF/TXT/MD）
- [ ] 嵌入向量生成与存储
- [ ] 语义检索 API
- [ ] 分段预览与编辑功能

---

## 4. 阶段三：对话应用

### 目标

创建可配置的 AI 对话应用：支持多模型、系统提示词、多轮记忆、Agent 工具调用。

### 模块结构

```
src/
  chat/
    chat.module.ts
    chat.controller.ts            # 对话 API
    chat.service.ts               # 对话逻辑
    conversation.controller.ts    # 会话管理
    conversation.service.ts
    entities/
      app.entity.ts               # 对话应用配置
      conversation.entity.ts      # 会话
      message.entity.ts           # 消息
    dto/
      create-app.dto.ts
      send-message.dto.ts
    prompt/
      prompt-template.service.ts  # 模板引擎
      template.interface.ts
    agent/
      agent-executor.service.ts   # Agent 循环
      tool.interface.ts
      tools/
        calculator.tool.ts
        web-search.tool.ts
        knowledge-retrieval.tool.ts
        http-request.tool.ts
    session/
      session-store.service.ts    # 上下文窗口管理
```

### 核心模型

```typescript
// App 实体 — 一个可发布的应用配置
{
  id: uuid PK,
  name: string,
  description: string?,
  type: enum,                // chat | agent | workflow
  modelConfig: jsonb,        // { provider, model, temperature, maxTokens }
  promptConfig: jsonb,       // { systemPrompt, variables, examples }
  tools: jsonb,              // [{ type: 'builtin', name: 'web_search' }]
  userId: FK -> User,
  isPublished: boolean,
  createdAt: timestamptz,
}

// Conversation 实体
{
  id: uuid PK,
  appId: FK -> App,
  title: string?,
  userId: FK -> User,
  metadata: jsonb,           // { ip, userAgent }
  createdAt: timestamptz,
  updatedAt: timestamptz,
}

// Message 实体
{
  id: uuid PK,
  conversationId: FK -> Conversation,
  role: enum,                // user | assistant | system | tool
  content: text,
  toolCalls: jsonb?,         // [{ id, type, function: { name, arguments } }]
  toolResults: jsonb?,       // [{ toolCallId, output }]
  tokens: jsonb?,            // { prompt, completion, total }
  metadata: jsonb?,          // { latency, model }
  createdAt: timestamptz,
}
```

### 对话流程

```
用户消息 → 加载会话历史 → 构建 Prompt（模板 + 变量 + 历史）
       → 调用 LLM（stream）
       → 若触发 Function Calling → 执行工具 → 返回工具结果
       → 继续 LLM 调用（Agent 循环）
       → 保存消息 → 流式返回给用户
```

### 流式响应格式

```
// SSE (text/event-stream)
event: message
data: {"content": "你好", "isEnd": false}

event: message
data: {"content": "，今天", "isEnd": false}

event: message
data: {"content": "有什么可以帮你的？", "isEnd": true}

event: tool_call
data: {"id": "call_xxx", "name": "web_search", "arguments": "{\"q\":\"天气\"}"}
```

### 里程碑

- [ ] 对话应用配置 CRUD
- [ ] 会话管理 API（创建/列表/删除）
- [ ] 多轮消息存储与上下文管理
- [ ] Prompt 模板引擎（变量替换 + 系统提示词）
- [ ] LLM 流式调用（SSE）
- [ ] Agent 循环（ReAct / Function Calling）
- [ ] 内置工具（知识库检索 + 计算 + Web 搜索）

---

## 5. 阶段四：工作流引擎

### 目标

可视化 AI 工作流引擎：基于 DAG 的节点编排引擎，支持条件分支、并行执行、变量传递。

### 模块结构

```
src/
  workflow/
    workflow.module.ts
    workflow.controller.ts       # 工作流定义 CRUD
    workflow.service.ts
    run.controller.ts            # 工作流执行
    run.service.ts
    entities/
      workflow.entity.ts         # 工作流定义
      workflow-node.entity.ts    # 节点定义
      workflow-edge.entity.ts    # 边定义
      workflow-run.entity.ts     # 运行记录
      workflow-node-execution.entity.ts  # 节点执行记录
    engine/
      dag-engine.service.ts      # DAG 编排核心
      context.service.ts         # 上下文传递（变量/数据）
      executor/
        llm-node.executor.ts
        knowledge-node.executor.ts
        code-node.executor.ts
        http-request-node.executor.ts
        condition-node.executor.ts
        aggregator-node.executor.ts
        start-node.executor.ts
        end-node.executor.ts
      evaluator/
        condition-evaluator.service.ts  # 条件表达式求值
        variable-evaluator.service.ts   # 变量引用解析
    dto/
      save-workflow.dto.ts
      execute-workflow.dto.ts
      workflow-node.dto.ts
```

### 工作流 DSL 定义

```typescript
// 工作流定义结构
{
  id: uuid,
  title: string,
  description: string?,
  nodes: [
    {
      id: "node_1",
      type: "start",
      position: { x: 100, y: 200 },
      config: {}
    },
    {
      id: "node_2",
      type: "llm",
      position: { x: 300, y: 200 },
      config: {
        model: "gpt-4o",
        prompt: "{{nodes.node_1.output}}",
        temperature: 0.7
      }
    },
    {
      id: "node_3",
      type: "knowledge_retrieval",
      position: { x: 300, y: 400 },
      config: {
        knowledgeBaseId: "kb_xxx",
        query: "{{nodes.node_1.output}}",
        topK: 5
      }
    },
    {
      id: "node_4",
      type: "condition",
      position: { x: 500, y: 300 },
      config: {
        expression: "{{nodes.node_2.tokens}} > 100"
      }
    },
    {
      id: "node_5",
      type: "end",
      position: { x: 700, y: 300 },
      config: { output: "{{nodes.node_2.output}}" }
    }
  ],
  edges: [
    { id: "edge_1", source: "node_1", target: "node_2" },
    { id: "edge_2", source: "node_1", target: "node_3" },
    { id: "edge_3", source: "node_2", target: "node_4" },
    { id: "edge_4", source: "node_3", target: "node_4" },
    { id: "edge_5", source: "node_4", target: "node_5" }
  ]
}
```

### 执行引擎核心逻辑

```typescript
// DAG 引擎
class DagEngine {
  async execute(workflow: WorkflowDefinition, inputs: Record<string, any>) {
    // 1. 拓扑排序
    const sorted = topologicalSort(workflow.nodes, workflow.edges);

    // 2. 逐层执行（层内可并行）
    for (const layer of sorted) {
      const results = await Promise.all(
        layer.map(node => this.executeNode(node, context))
      );
      // 将结果写入上下文，供下游节点引用
    }

    // 3. 返回最终输出
    return context.getOutput();
  }

  private async executeNode(node: WorkflowNode, context: Context) {
    const executor = this.resolver.resolve(node.type);
    // 解析输入变量（替换 {{nodes.node_x.output}}）
    const resolvedConfig = resolveVariables(node.config, context);
    return executor.execute(resolvedConfig, context);
  }
}
```

### 节点类型

| 节点类型 | 功能 | 输入 | 输出 |
|---------|------|------|------|
| start | 入口，接收用户输入 | — | 用户输入参数 |
| llm | 调用大模型 | prompt, model, temperature | content, tokens |
| knowledge_retrieval | 知识库检索 | query, knowledgeBaseId, topK | segments[] |
| code | 执行自定义 Python/JS 代码 | code, inputs | 返回值 |
| http_request | HTTP API 调用 | url, method, headers, body | status, data |
| condition | 条件分支 | expression (布尔) | true | false |
| aggregator | 聚合多个输入 | inputs[] | 合并结果 |
| end | 输出最终结果 | output | — |

### 里程碑

- [ ] 工作流定义 CRUD（带节点的 JSON 持久化）
- [ ] DAG 拓扑排序与合法性验证（环检测、类型检查）
- [ ] 变量引用解析引擎（`{{...}}` 表达式）
- [ ] 核心节点执行器（llm/knowledge/code/http/condition）
- [ ] 并行执行与上下文传递
- [ ] 运行历史与节点执行日志
- [ ] 条件分支与聚合逻辑
- [ ] 错误处理与重试机制

---

## 6. 阶段五：应用发布与管理

### 目标

将应用（对话/工作流）发布为可调用的 API，提供访问控制与监控。

### 模块结构

```
src/
  publish/
    publish.module.ts
    publish.controller.ts
    publish.service.ts            # 应用发布逻辑
    api-token.service.ts          # API Token 管理
    usage.service.ts              # 用量统计
    entities/
      published-app.entity.ts     # 已发布应用
      api-token.entity.ts         # 访问令牌
      usage-log.entity.ts         # 调用日志
    guards/
      api-token.guard.ts          # 外部 API 鉴权
```

### 核心模型

```typescript
// PublishedApp 实体
{
  id: uuid PK,
  appId: FK -> App,
  version: number,
  status: enum,            // active | disabled
  rateLimit: jsonb,        // { requestsPerMinute: 60, tokensPerDay: 1000000 }
  publishedAt: timestamptz,
}

// ApiToken 实体
{
  id: uuid PK,
  publishedAppId: FK -> PublishedApp,
  name: string,
  token: string,           // hashed token（前缀 + bcrypt 哈希）
  maskedToken: string,     // "app-****xyz"
  expiresAt: timestamptz?,
  lastUsedAt: timestamptz?,
  createdAt: timestamptz,
}

// UsageLog 实体
{
  id: uuid PK,
  publishedAppId: FK -> PublishedApp,
  apiTokenId: FK -> ApiToken?,
  model: string?,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  latency: number,         // ms
  status: string,          // success | error
  errorMessage: string?,
  createdAt: timestamptz,
}
```

### 外部 API

```
POST /api/v1/apps/{appId}/chat       # 对话应用
POST /api/v1/apps/{appId}/workflow   # 工作流应用
Authorization: Bearer app-xxx...

响应：
{
  "code": 1,
  "data": { ... },
  "msg": "ok"
}
```

### 里程碑

- [ ] 应用发布/下线管理
- [ ] API Token 生成与鉴权
- [ ] 速率限制（令牌桶算法）
- [ ] Token 用量与调用延迟统计

---

## 7. 阶段六：插件生态

### 目标

提供插件 SDK 和插件市场，支持第三方扩展工具、模型和数据源。

### 模块结构

```
src/
  plugin/
    plugin.module.ts
    plugin.controller.ts
    plugin.service.ts
    plugin-loader.service.ts   # 插件动态加载
    plugin-registry.service.ts # 插件注册表
    entities/
      plugin.entity.ts         # 插件定义
      plugin-install.entity.ts # 安装记录
    sdk/
      plugin.interface.ts      # 插件标准接口
      tool-plugin.interface.ts # 工具插件接口
```

### 里程碑

- [ ] 插件定义与清单标准（plugin.json）
- [ ] 插件安装/卸载管理
- [ ] 插件 SDK 文档与示例

---

## 环境变量（新增）

```env
# 现有
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nest_base
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# 新增
ENCRYPTION_KEY=your-aes-256-key-32bytes
REDIS_HOST=localhost
REDIS_PORT=6379
STORAGE_DRIVER=local            # local | s3
STORAGE_LOCAL_PATH=./storage    # local 存储根目录
S3_ENDPOINT=                    # S3 兼容存储端点
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

## 总里程碑路线图

```
阶段一 ─── 模型管理与密钥             2周
    ↓
阶段二 ─── RAG 知识库                3周
    ↓
阶段三 ─── 对话应用 + Agent           4周
    ↓
阶段四 ─── 工作流引擎                 5周
    ↓
阶段五 ─── 应用发布与管理              2周
    ↓
阶段六 ─── 插件生态                   2周
                                    ─────
                                    共约 18 周
```

每个阶段产出一个可运行的功能子集。阶段一至三完成后即可获得一个可用的 AI 对话平台，阶段四为工作流自动化核心，阶段五至六为生产化与生态扩展。
