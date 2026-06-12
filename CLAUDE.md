# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm run build           # Build with nest build
pnpm run start:dev       # Start in watch mode (hot-reload)
pnpm run start:debug     # Start with debugger + watch
pnpm run start:prod      # Run compiled dist/main.js
pnpm run format          # Prettier: src/ test/ and *.json
pnpm run lint            # ESLint with --fix
pnpm run test            # Unit tests (Jest, *.spec.ts)
pnpm run test:cov        # Unit tests with coverage
pnpm run test:e2e        # E2E tests (test/jest-e2e.json)
pnpm run test:watch      # Unit tests in watch mode
pnpm run migration:run   # Run pending TypeORM migrations (needs DB)
pnpm run migration:generate -- src/database/<name>  # Generate migration from entities
pnpm run migration:revert # Revert last migration (needs DB)
```

Single test file: `pnpm run test -- app.controller.spec.ts`
Single E2E test: `pnpm run test:e2e -- app.e2e-spec.ts`

## Architecture

NestJS 11 app with JWT auth, TypeORM + Postgres, and a unified response format.

### Modules

- **AppModule** (`src/app.module.ts`) — root, imports ConfigModule, TypeOrmModule (entities: `User`, `BlacklistedToken`), UsersModule, AuthModule. Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **AuthModule** (`src/auth/`) — register (bcrypt + DB transaction), login, refresh (token rotation), logout (token blacklisting), `/auth/profile` (JWT-guarded). PassportStrategy with access token type validation + blacklist check.
- **UsersModule** (`src/users/`) — CRUD on `User` entity (UUID PK, unique email, `@Exclude()` on password). Guarded write endpoints.

### Global Response Format (code/data/msg)

All responses go through a pipeline:
- **ResponseInterceptor** — wraps 2xx as `{ code: 1, data: <body>, msg: "ok" }`
- **HttpExceptionFilter** — wraps errors as `{ code: 0, data: null, msg: <message> }`
- **ClassSerializerInterceptor** (in main.ts) — strips `@Exclude()` fields (e.g. `User.password`)

### TypeORM with Migrations

`synchronize: false` — all schema changes go through migration files. Config is via `registerAs('database', ...)` from `@nestjs/config`, reading `DB_*` env vars. Data source for CLI at `src/database/data-source.ts` reads compiled entities from `dist/`.

### JWT Token Blacklisting

Refresh tokens use rotation: each refresh blacklists the old refresh token (stored as SHA-256 hash in `BlacklistedToken` entity with expiration) and issues a new access + refresh pair. The `JwtAuthGuard` checks the blacklist before validating the token.

### API Docs

Swagger/Scalar UI at `/docs` route with purple theme and Bearer auth support. Decorated with Chinese-language descriptions.

## Testing Patterns

- **Controller unit tests**: mock the service layer via `{ provide: Service, useValue: mockObj }` with `jest.fn()` methods.
- **Service unit tests**: mock TypeORM repositories via `{ provide: getRepositoryToken(Entity), useValue: mockRepo }`.
- **E2E tests**: create `TestingModule` that imports `AppModule`, use `supertest` agent against the compiled module.

## Pre-commit Hooks (Husky)

- **pre-commit**: lint + prettier format + run all unit tests
- **commit-msg**: `commitlint --edit` (Conventional Commits enforced)

## Stack

- **Runtime**: Node.js, TypeScript (ES2023 target, nodenext module), NestJS 11
- **Package manager**: pnpm 10 (pinned in `package.json` `packageManager`)
- **ORM**: TypeORM with Postgres (`pg` driver), migrations for schema management
- **Auth**: Passport + passport-jwt, bcrypt hashing, refresh token rotation with blacklist
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
