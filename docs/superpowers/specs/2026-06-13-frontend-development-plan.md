# 类 Dify AI 平台 — 前端开发计划

> Next.js 前端应用，配套后端 NestJS API
> 创建日期：2026-06-13

## 目录

1. [技术选型与架构策略](#1-技术选型与架构策略)
2. [项目初始化与 Monorepo 配置](#2-项目初始化与-monorepo-配置)
3. [阶段一：模型提供商管理页面](#3-阶段一模型提供商管理页面)
4. [阶段二：知识库管理页面](#4-阶段二知识库管理页面)
5. [阶段三：对话应用页面](#5-阶段三对话应用页面)
6. [阶段四：工作流编辑器](#6-阶段四工作流编辑器)
7. [阶段五：应用发布与管理页面](#7-阶段五应用发布与管理页面)
8. [阶段六：插件市场页面](#8-阶段六插件市场页面)
9. [共享设计系统](#9-共享设计系统)
10. [API 类型共享策略](#10-api-类型共享策略)

---

## 1. 技术选型与架构策略

### 推荐方案：Monorepo（pnpm workspace + Turborepo）

**推荐理由：**

| 考量 | Monorepo | 分开仓库 |
|------|----------|---------|
| 类型共享 | API DTO 直接共享 | 需要独立发包 |
| 前后端联调 | 一键启动两端 | 分别启动 |
| CI 一致性 | 统一 lint/test/build | 各自维护 |
| 原子提交 | 一次 commit 包含 FE+BE 修改 | 跨仓库 PR |

**结论：** 使用 **pnpm workspace + Turborepo** 管理 monorepo。原因：
- 已使用 pnpm，零额外包管理器
- Turborepo 提供缓存构建、并行任务、依赖图编排
- shared 包放置 TypeScript 类型，API 请求/响应类型前后端共享

### 前端技术栈

| 类别 | 选型 | 用途 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | React 全栈框架 |
| 语言 | TypeScript | 类型安全 |
| 状态管理 | Zustand | 轻量客户端状态（会话、UI） |
| 数据请求 | TanStack Query (React Query) | 服务端状态缓存、自动重验证 |
| UI 组件 | shadcn/ui (Radix + Tailwind) | 设计系统基础 |
| 样式 | Tailwind CSS | 原子化样式 |
| 表单 | React Hook Form + Zod | 表单验证 |
| 图表 | Recharts | 用量/监控图表 |
| 工作流画布 | React Flow | 可视化 DAG 编辑器 |
| 流式响应 | EventSource + fetch SSE | LLM 流式对话 |

### 目录结构

```
base_nest/                          # monorepo 根
├── apps/
│   ├── api/                        # 现有 NestJS 后端 (移到 apps/api)
│   └── web/                        # Next.js 前端 (新增)
├── packages/
│   └── shared/                     # 共享类型
│       ├── src/
│       │   ├── types/              # API 请求/响应类型
│       │   │   ├── api.ts          # 统一响应 { code, data, msg }
│       │   │   ├── provider.ts     # 模型提供商类型
│       │   │   ├── knowledge.ts    # 知识库类型
│       │   │   ├── chat.ts         # 对话类型
│       │   │   └── workflow.ts     # 工作流类型
│       │   ├── constants/          # 共享常量
│       │   └── index.ts
│       └── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

#### 迁移说明

现有代码在 `src/` 下，放入 monorepo 后建议将 NestJS 项目移到 `apps/api/`。Turborepo 配置只影响构建编排，不影响已有代码结构。

---

## 2. 项目初始化与 Monorepo 配置

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

### apps/web/package.json (核心依赖)

```json
{
  "name": "web",
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "zustand": "^5",
    "@tanstack/react-query": "^5",
    "react-hook-form": "^7",
    "zod": "^3",
    "tailwindcss": "^4",
    "@radix-ui/*": "shadcn/ui 组件",
    "reactflow": "^11",
    "recharts": "^2",
    "lucide-react": "^0.400",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "@shared": "workspace:*"
  }
}
```

### 共享包 (@shared/types)

```typescript
// packages/shared/src/types/api.ts
export interface ApiResponse<T = unknown> {
  code: number;       // 1 成功, 0 失败
  data: T | null;
  msg: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

```typescript
// packages/shared/src/types/provider.ts
export interface ModelProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'ollama' | 'openai-compatible';
  isEnabled: boolean;
  baseUrl?: string;
  models: Model[];
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  contextWindow: number;
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
  };
}
```

---

## 3. 阶段一：模型提供商管理页面

### 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/providers` | 提供商列表 | 展示已配置的模型提供商 |
| `/providers/new` | 添加提供商 | 选择类型、填 baseUrl |
| `/providers/:id` | 提供商详情 | 管理模型列表和 API Key |
| `/providers/:id/keys` | API Key 管理 | 添加/删除密钥（只显示 masked） |

### 页面组件树

```
app/providers/
├── page.tsx                    # 提供商列表
├── new/page.tsx                # 添加提供商
├── [id]/
│   ├── page.tsx                # 提供商详情
│   └── keys/
│       └── page.tsx            # API 密钥管理
└── _components/
    ├── provider-card.tsx       # 提供商卡片
    ├── provider-form.tsx       # 添加/编辑表单
    ├── api-key-list.tsx        # 密钥列表（只显示 maskedKey）
    └── add-key-dialog.tsx      # 添加密钥弹窗
```

### 关键交互

- **添加提供商**：选择类型 → 填写名称/baseUrl → 保存 → 系统自动加载预定义模型列表
- **添加 API Key**：输入 key → 后端 AES 加密存储 → 页面只显示 `sk-****abc`
- **状态指示**：每个卡片显示 isEnabled 状态，用 toggle 开关

### 与阶段一 API 的关系

| API 端点 | 前端页面 |
|----------|---------|
| `GET /providers` | 提供商列表页 |
| `POST /providers` | 添加提供商页 |
| `GET /providers/:id` | 提供商详情页 |
| `PUT /providers/:id` | 编辑提供商 |
| `DELETE /providers/:id` | 删除提供商 |
| `GET /providers/:id/keys` | API 密钥列表 |
| `POST /providers/:id/keys` | 添加密钥 |
| `DELETE /providers/:id/keys/:keyId` | 删除密钥 |
| `GET /providers/:id/models` | 模型列表 |

---

## 4. 阶段二：知识库管理页面

### 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/knowledge` | 知识库列表 | 展示所有知识库 |
| `/knowledge/new` | 新建知识库 | 设置名称、嵌入模型、分块策略 |
| `/knowledge/:id` | 知识库详情 | 文档列表 + 检索测试 |
| `/knowledge/:id/documents/:docId` | 文档详情 | 分段列表、编辑、状态追踪 |
| `/knowledge/:id/retrieval-test` | 检索测试 | 输入查询，展示检索结果 |

### 页面组件树

```
app/knowledge/
├── page.tsx
├── new/page.tsx
├── [id]/
│   ├── page.tsx                  # 知识库概览（文档列表 + 统计数据）
│   ├── retrieval-test/
│   │   └── page.tsx              # 检索测试页
│   └── documents/
│       └── [docId]/
│           └── page.tsx          # 文档详情 + 分段管理
└── _components/
    ├── knowledge-base-card.tsx
    ├── knowledge-base-form.tsx
    ├── document-uploader.tsx      # 拖拽上传区域
    ├── document-list.tsx          # 文档列表（状态图标）
    ├── segment-list.tsx           # 分段列表（内容预览、编辑）
    ├── segment-editor.tsx         # 分段内容编辑
    └── retrieval-test-panel.tsx   # 查询输入 + 检索结果展示
```

### 关键交互

- **文档上传**：拖拽或点击选择 → 显示上传进度 → 后端异步处理 → 状态轮询（pending → processing → completed/failed）
- **分段预览**：展示所有 chunk，高亮显示重叠区域，支持编辑内容
- **检索测试**：左侧输入查询 → 实时显示检索结果（相似度评分、来源文档、内容片段）

### 文档处理状态流程

```
用户上传 → [Uploading] → 服务端接收 → [Pending]
                                     → 解析 + 分块 → [Processing]
                                     → 向量化 → [Completed]
                                     → 出错 → [Failed]
```

前端通过 `status` 字段轮询或 WebSocket 更新文档状态。

---

## 5. 阶段三：对话应用页面

### 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/apps` | 应用列表 | 展示所有对话/Agent 应用 |
| `/apps/new` | 创建应用 | 选择类型、填名称、配置模型 |
| `/apps/:id/edit` | 应用设置 | Prompt 模板、工具选择、模型参数 |
| `/apps/:id/chat` | 对话界面 | 多轮对话、流式输入、会话管理 |

### 页面组件树

```
app/apps/
├── page.tsx                    # 应用列表
├── new/page.tsx                # 创建应用向导
├── [id]/
│   ├── edit/page.tsx           # 应用配置编辑
│   └── chat/
│       └── page.tsx            # 对话界面
└── _components/
    ├── app-card.tsx
    ├── app-form.tsx
    ├── chat/
    │   ├── chat-layout.tsx      # 对话布局（左侧会话列表 + 右侧对话）
    │   ├── message-list.tsx     # 消息列表
    │   ├── message-bubble.tsx   # 单条消息（支持 Markdown + 代码高亮）
    │   ├── chat-input.tsx       # 输入框（支持 Enter 发送 / Shift+Enter 换行）
    │   ├── streaming-content.tsx # 流式文本逐字渲染
    │   ├── conversation-sidebar.tsx # 会话侧边栏
    │   └── tool-call-display.tsx # 工具调用展示（搜索/知识库检索结果）
    └── settings/
        ├── model-config.tsx     # 模型选择参数
        ├── prompt-editor.tsx    # System Prompt 编辑器
        └── tool-selector.tsx    # 工具开关选择
```

### 流式对话实现

```typescript
// 流式调用示例
async function sendMessage(conversationId: string, content: string) {
  const response = await fetch(`/api/chat/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // 解析 SSE 事件：
    // event: message\ndata: {"content": "你好"}
    // event: message\ndata: {"content": "，今天"}
    // event: message\ndata: {"isEnd": true}
    // event: tool_call\ndata: {"name": "web_search", "arguments": "..."}
    processChunk(chunk);
  }
}
```

### 关键交互

- **流式渲染**：message-bubble 中的 streaming-content 组件逐 token 渲染，支持 Markdown 实时解析
- **会话管理**：左侧会话列表，支持创建新会话、重命名、删除
- **工具调用可视化**：当 Agent 调用工具时，在对话流中插入工具调用卡片（展示工具名、参数、结果摘要）
- **对话上下文**：显示当前窗口内的 token 用量，超出时自动截断历史

---

## 6. 阶段四：工作流编辑器

### 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/workflows` | 工作流列表 | 展示工作流模板和已创建的 |
| `/workflows/new` | 新建工作流 | 填写名称和描述 |
| `/workflows/:id/edit` | 工作流编辑器 | 可视化 DAG 编辑（核心） |
| `/workflows/:id/runs` | 运行历史 | 查看执行记录 |

### 工作流编辑器架构

```
app/workflows/[id]/edit/
├── page.tsx                    # 编辑器主页面
└── _components/
    ├── workflow-canvas.tsx      # React Flow 画布
    ├── node-palette.tsx         # 左侧节点面板（拖拽添加到画布）
    ├── config-panel.tsx         # 右侧节点配置面板
    ├── nodes/
    │   ├── start-node.tsx       # 开始节点
    │   ├── llm-node.tsx         # LLM 节点（模型选择 + Prompt）
    │   ├── knowledge-node.tsx   # 知识库检索节点
    │   ├── code-node.tsx        # 代码执行节点
    │   ├── condition-node.tsx   # 条件分支节点
    │   ├── http-node.tsx        # HTTP 请求节点
    │   ├── aggregator-node.tsx  # 聚合节点
    │   └── end-node.tsx         # 结束节点
    ├── edges/
    │   └── condition-edge.tsx   # 条件分支边（带标签 true/false）
    ├── toolbar.tsx              # 顶部工具栏（运行/保存/撤销/重做）
    └── minimap.tsx              # 缩略图导航
```

### React Flow 配置要点

```typescript
// workflow-canvas.tsx 核心结构
export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      // 验证连接合法性（类型检查、防止环）
      if (!isValidConnection(params, nodes, edges)) return;
      setEdges(eds => addEdge(params, eds));
    },
    [nodes, edges]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      // 从 node-palette 拖拽添加新节点
      const type = event.dataTransfer!.getData('application/reactflow');
      addNode(type, position);
    },
    []
  );

  return (
    <div className="workflow-editor">
      <Toolbar onSave={saveWorkflow} onRun={executeWorkflow} />
      <div className="flex h-full">
        <NodePalette />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
        {selectedNode && (
          <ConfigPanel node={selectedNode} onChange={updateNodeConfig} />
        )}
      </div>
    </div>
  );
}
```

### 节点自定义渲染

每个节点类型有独特的视觉样式和配置面板：

| 节点 | 画布外观 | 配置面板内容 |
|------|---------|------------|
| start | 绿色圆角矩形，只有输出端口 | 定义输入参数列表 |
| llm | 蓝色矩形，输入/输出端口 | 模型选择、Prompt 编辑、温度 |
| knowledge | 紫色矩形，输入/输出端口 | 知识库选择、topK、query 模板 |
| condition | 菱形，1 输入 2 输出（true/false） | 条件表达式编辑器 |
| code | 橙色矩形，输入/输出端口 | 代码编辑器（语法高亮） |
| end | 红色圆角矩形，只有输入端口 | 输出表达式 |

### 运行调试

- **全量运行**：点击 Run → 后端执行 → 节点逐个变为 running/completed/error 状态
- **节点状态可视化**：每个节点边框颜色表示状态（灰色=待执行，蓝色=运行中，绿色=成功，红色=错误）
- **中间结果**：点击已执行节点可查看输出数据

---

## 7. 阶段五：应用发布与管理页面

### 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/apps/:id/deploy` | 发布配置 | 版本号、速率限制设置 |
| `/apps/:id/tokens` | API Token 管理 | 生成/撤销访问令牌 |
| `/apps/:id/analytics` | 用量分析 | Token 消耗、请求量、延迟图表 |

### 页面组件树

```
app/apps/[id]/
├── deploy/
│   └── page.tsx               # 发布/下线
├── tokens/
│   └── page.tsx               # API Token 管理
└── analytics/
    └── page.tsx               # 用量图表
```

### 关键交互

- **Token 生成**：创建时只显示一次完整 token（"app-xxx..."），后续只显示 masked
- **速率限制**：滑块设置 RPM/TPD，实时显示当前配置
- **用量仪表盘**：
  - 请求量趋势图（近 7 天/30 天）
  - Token 消耗分布（按模型/应用）
  - 平均延迟折线图
  - 错误率统计

---

## 8. 阶段六：插件市场页面

### 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/plugins` | 插件市场 | 浏览可用插件 |
| `/plugins/:id` | 插件详情 | 查看文档和安装 |

### 组件

```
app/plugins/
├── page.tsx                   # 插件列表/市场
└── [id]/
    └── page.tsx               # 插件详情
```

### 关键交互

- 卡片网格展示插件（图标、名称、简短描述、安装量）
- 安装按钮 → 确认 → 后端处理 → 状态变更

---

## 9. 共享设计系统

基于 shadcn/ui 构建设计系统，确保所有页面视觉一致性。

### 主题

```css
/* tailwind.config.ts */
{
  theme: {
    extend: {
      colors: {
        // 品牌色（紫色系，与后端 /docs 页面一致）
        primary: { /* shadcn 默认 */ },
        // 节点类型颜色
        'node-llm': '#3b82f6',
        'node-knowledge': '#8b5cf6',
        'node-code': '#f97316',
        'node-condition': '#eab308',
        'node-start': '#22c55e',
        'node-end': '#ef4444',
      }
    }
  }
}
```

### 通用组件

| 组件 | 用途 |
|------|------|
| `PageHeader` | 页面标题 + 操作按钮 |
| `DataTable` | 通用数据表格（排序、过滤、分页） |
| `EmptyState` | 空数据占位 |
| `StatusBadge` | 状态标签（active/pending/error） |
| `LoadingSkeleton` | 加载骨架屏 |
| `ConfirmDialog` | 删除/危险操作确认 |

### 布局

```
┌─────────────────────────────────────┐
│  Sidebar                    Topbar  │
│  ┌─────┐ ┌───────────────────────── │
│  │ 📊  │ │                         │
│  │ 仪表盘│ │   Page Content          │
│  │     │ │                         │
│  │ 🤖  │ │                         │
│  │ 应用  │ │                         │
│  │     │ │                         │
│  │ 📚  │ │                         │
│  │ 知识库│ │                         │
│  │     │ │                         │
│  │ 🔌  │ │                         │
│  │ 模型  │ │                         │
│  │     │ │                         │
│  │ ⚙️  │ │                         │
│  │ 设置  │ │                         │
│  └─────┘ └───────────────────────── │
└─────────────────────────────────────┘
```

---

## 10. API 类型共享策略

### 工作流

```
每次后端新增/修改 DTO:
  1. 在 packages/shared/src/types/ 中更新对应类型
  2. 前端自动获取类型定义（workspace 引用）

开发流程:
  1. 后端定义 DTO + entity
  2. 共享包导出对应 TypeScript interface
  3. 前端直接 import 使用
```

### 开发顺序

1. 初始化 monorepo 结构
2. `packages/shared` — 定义所有共享类型（先定义空壳，后续逐步填充）
3. `apps/web` — 搭建 Next.js 项目、设计系统、布局
4. 按阶段迭代：每个阶段先实现 API，再实现前端页面

---

## 总里程碑路线图（含前端）

```
Monorepo 搭建 + 设计系统 ─────────── 1 周
      │
阶段一 ─ 后端模型管理 + 前端管理页面 ── 2 周  ← 同时开发，共享类型先行
      │
阶段二 ─ 后端知识库 + 前端管理页面 ──── 3 周
      │
阶段三 ─ 后端对话 + 前端对话界面 ────── 4 周  ← 流式 SSE 前后端联调重点
      │
阶段四 ─ 后端工作流引擎 + 前端编辑器 ── 6 周  ← 前端 React Flow 集成最耗时
      │
阶段五 ─ 发布管理 + 前端仪表盘 ──────── 2 周
      │
阶段六 ─ 插件生态 + 前端插件市场 ────── 2 周
                                   ─────
                                   共约 20 周
```

> **说明：** 阶段四前端估算 6 周，因为 React Flow 自定义节点、配置面板、实时状态同步、撤销/重做等工作量较大。其余阶段前后端大致 50/50 分工。
