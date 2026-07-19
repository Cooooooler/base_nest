# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm run build           # Turbo build (all packages)
pnpm run dev             # Turbo dev (all packages in parallel)
pnpm run start:dev       # API only: Nest watch mode (hot-reload)
pnpm run start:debug     # API only: debugger + watch
pnpm run start:prod      # API only: run compiled dist/main.js
pnpm run format          # Prettier across all files
pnpm run lint            # Turbo lint (all packages)
pnpm run test            # Turbo test (all packages)
pnpm run test:api        # API unit tests only
pnpm run test:e2e        # API E2E tests (test/jest-e2e.json)
pnpm run migration:run   # Run pending TypeORM migrations (needs DB)
pnpm run migration:generate -- src/database/migrations/<name>  # Generate migration from entities
pnpm run migration:revert # Revert last migration (needs DB)
pnpm run clean           # Clean build artifacts
```

Single test file: `pnpm run test -- app.controller.spec.ts` (from `apps/api/`)
Single E2E test: `pnpm run test:e2e -- app.e2e-spec.ts` (from `apps/api/`)
Single frontend dev: `pnpm --filter @base/web dev` (port 3001)
Single API dev: `pnpm --filter @base/api start:dev` (port 3000)

## Design Documents

- [类 Dify AI 平台开发计划](docs/superpowers/specs/2026-06-13-dify-like-platform-design.md) — 6 阶段后端开发路线图（模型管理 → 知识库 → 对话应用 → 工作流引擎 → 应用发布 → 插件生态）
- [前端开发计划](docs/superpowers/specs/2026-06-13-frontend-development-plan.md) — Next.js + Monorepo 前端配套方案，含 6 阶段页面设计、组件树、关键交互
- [对话应用设计](docs/superpowers/specs/2026-06-18-chat-app-design.md)
- [模型管理设计](docs/superpowers/specs/2026-06-18-model-management-design.md)
- [RAG 来源引用设计](docs/superpowers/specs/2026-06-21-rag-source-citation-design.md)
- [动画系统设计](docs/superpowers/specs/2026-07-05-animation-system-design.md)
- [工作流引擎设计](docs/superpowers/specs/2026-07-05-workflow-engine-design.md)

## Architecture

This is a **pnpm + Turborepo monorepo** with three packages:

| Package        | Path               | Tech                    |
| -------------- | ------------------ | ----------------------- |
| `@base/api`    | `apps/api/`        | NestJS 11 backend       |
| `@base/web`    | `apps/web/`        | Next.js 15 frontend     |
| `@base/shared` | `packages/shared/` | Shared TypeScript types |

Root scripts proxy to packages via `pnpm --filter` and `turbo` (see root `package.json` and `turbo.json`).

### Backend Modules (`apps/api/src/`)

- **AppModule** (`app.module.ts`) — root, imports ConfigModule, TypeOrmModule, UsersModule, AuthModule, ProvidersModule, LocalAIModule, ChatModule, KnowledgeModule, WorkflowModule. Global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`). Global `ThrottlerGuard` (60 req/min). `ScheduleModule` + `EventEmitterModule` for scheduled/event-driven tasks.
- **AuthModule** (`auth/`) — register (bcrypt + DB transaction), login, refresh (token rotation), logout (token blacklisting), `/auth/profile` (JWT-guarded). PassportStrategy with access token type validation + blacklist check.
- **UsersModule** (`users/`) — CRUD on `User` entity (UUID PK, unique email, `@Exclude()` on password). Guarded write endpoints.
- **ProvidersModule** (`providers/`) — LLM provider management: CRUD for `ModelProvider`, `Model`, `ApiKey` entities. Uses a **strategy pattern** (`providers/strategies/`) with implementations for OpenAI, Anthropic (Claude), Ollama, OpenAI-compatible, and LangChain Ollama. API keys encrypted at rest via AES-256-GCM (`ENCRYPTION_KEY` env var).
- **ChatModule** (`chat/`) — App management (CRUD), conversation management, streaming chat (`ChatService` uses LangChain for model invocation). Endpoints: `/apps`, `/conversations`, `/chat/stream`.
- **WorkflowModule** (`workflow/`) — DAG-based workflow engine: workflow CRUD, runs, node execution (`DagEngineService`). 8 node executors: Start, End, LLM, Code, Condition, HTTP Request, Knowledge Retrieval, Question Classifier. Endpoints: `/workflows`, `/workflows/:id/run`.
- **KnowledgeModule** (`knowledge/`) — RAG pipeline: knowledge bases, document management, document chunking (`ChunkProcessorService`), retrieval (`RetrievalService`), file storage (`FileStorageService`). Uses ChromaDB as vector store and Ollama embeddings via `LocalAIModule`. Events: `DocumentProcessingListener` for async processing.
- **LocalAIModule** (`common/local-ai.module.ts`) — Global `@Global()` module providing `EmbeddingsService` and `ChromaVectorStoreService` wired to local Ollama + ChromaDB instances.

### Global Response Format (`apps/api/src/common/`)

All responses go through a pipeline:

- **ResponseInterceptor** — wraps 2xx as `{ code: 1, data: <body>, msg: "ok" }`. Passes through if body already matches `{ code, data }`.
- **HttpExceptionFilter** — wraps errors as `{ code: 0, data: null, msg: <message> }`. Logs 500s with stack trace.
- **ClassSerializerInterceptor** (in `main.ts`) — strips `@Exclude()` fields (e.g. `User.password`).

### TypeORM with Migrations

`synchronize: false` — all schema changes go through migration files. Config is via `registerAs('database', ...)` from `@nestjs/config`, reading `DB_*` env vars. Data source for CLI at `src/database/data-source.ts` reads compiled entities from `dist/`.

### JWT Token Blacklisting

Refresh tokens use rotation: each refresh blacklists the old refresh token (stored as SHA-256 hash in `BlacklistedToken` entity with expiration) and issues a new access + refresh pair. The `JwtAuthGuard` checks the blacklist before validating the token. Blacklist insert uses `orIgnore()` for idempotent inserts.

### API Docs

Swagger/Scalar UI at `/docs` route with purple theme and Bearer auth support. Decorated with Chinese-language descriptions. Set up in `common/docs/setup.ts`.

### Encryption Utility (`common/crypto.util.ts`)

API keys are encrypted at rest using AES-256-GCM. Requires `ENCRYPTION_KEY` as a 64-character hex string. Format: `iv:tag:ciphertext`.

### Frontend (`apps/web/`)

Next.js 15 app with App Router, Tailwind CSS v4, and shadcn/ui components.

- **Pages**: Login/Register under `(auth)/`, dashboard under `(dashboard)/` with knowledge base, provider management, app management, workflow editor, and settings views.
- **API Client** (`src/api/client.ts`) — ky-based HTTP client with automatic Bearer token injection and 401 → refresh token rotation via `afterResponse` hooks. All responses unwrapped from `{ code, data, msg }` envelope. Includes `apiUpload` for multipart file uploads.
- **State Management**: Zustand (`src/store/auth-store.ts`, `src/store/sidebar-store.ts`) for client state (auth tokens, sidebar visibility), React Query (`@tanstack/react-query`) for server state via hooks in `src/hooks/` (`use-chat.ts`, `use-providers.ts`, `use-knowledge.ts`, `use-chat-stream.ts`).
- **UI**: shadcn/ui components in `src/components/ui/`, app-level components (sidebar, auth guard, providers wrapper) in `src/components/app/`.
- **Animated components** (`src/components/animated/`): `FadeIn`, `StaggerList` for page transitions using framer-motion-style spring animations.
- **Workflow Editor**: `@xyflow/react` (React Flow v12) based canvas with custom nodes, minimap, and controls in `src/components/workflow/`.
- **Styling**: Tailwind CSS v4 (`tailwindcss`), `tw-animate-css`, `next-themes` for dark mode.
- **Dev server**: port 3001 (`pnpm --filter @base/web dev`).

### Workflow Engine (`apps/api/src/workflow/`)

DAG-based workflow engine with a directed acyclic graph execution model:

- **Entities**: `Workflow` (definition with nodes/edges JSON), `WorkflowRun` (execution instance with status/run_id), `WorkflowNodeExecution` (per-node execution state).
- **DagEngineService** (`engine/dag-engine.service.ts`) — orchestrates DAG execution: topological sort, node dispatch, cycle detection, error handling, retry logic.
- **Node Executors** (`engine/executor/`) — each node type has a dedicated executor:
  - `StartNodeExecutor` / `EndNodeExecutor` — entry/exit
  - `LLMNodeExecutor` — LLM inference via configured provider
  - `CodeNodeExecutor` — sandboxed code execution
  - `ConditionNodeExecutor` — branching logic
  - `HttpRequestNodeExecutor` — external API calls
  - `KnowledgeRetrievalNodeExecutor` — RAG retrieval
  - `QuestionClassifierNodeExecutor` — routing/classification
- **Controllers**: `WorkflowController` (CRUD), `RunController` (execution trigger/status).
- **Frontend**: React Flow v12 canvas in `apps/web/src/components/workflow/` with shadcn-based node config panels.

### Shared Types (`packages/shared/src/types/`)

TypeScript types shared between frontend and backend: `api.ts` (generic `ApiResponse<T>`), `auth.ts`, `knowledge.ts`, `provider.ts`, `chat.ts` (App, Conversation, Message interfaces).

## Testing Patterns

- **Controller unit tests**: mock the service layer via `{ provide: Service, useValue: mockObj }` with `jest.fn()` methods.
- **Service unit tests**: mock TypeORM repositories via `{ provide: getRepositoryToken(Entity), useValue: mockRepo }`.
- **E2E tests**: create `TestingModule` that imports `AppModule`, use `supertest` agent against the compiled module.

## Pre-commit Hooks (Husky)

- **pre-commit**: lint + prettier format + run all unit tests
- **commit-msg**: `commitlint --edit` (Conventional Commits enforced)

## Stack

- **Runtime**: Node.js, TypeScript (ES2023 target, nodenext module), NestJS 11, Next.js 15
- **Monorepo**: pnpm 10 workspaces + Turborepo
- **ORM**: TypeORM with Postgres (`pg` driver), migrations for schema management
- **Auth**: Passport + passport-jwt, bcrypt hashing, refresh token rotation with blacklist
- **LLM**: Provider strategy pattern (OpenAI, Anthropic, Ollama, OpenAI-compatible, LangChain Ollama), ChromaDB vector store
- **Frontend**: Next.js App Router, Tailwind CSS v4, shadcn/ui, Zustand, React Query, ky HTTP client
- **Testing**: Jest + ts-jest, unit tests co-located (`*.spec.ts`), E2E in `test/`
- **Linting**: ESLint flat config (`eslint.config.mjs`), Prettier via `.prettierrc`
- **Config**: `@nestjs/config` with `registerAs` for typed env var loading, `dotenv` for migrations

<!-- superpowers-zh:begin (do not edit between these markers) -->

# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。

<!-- superpowers-zh:end -->
