# AGENTS.md — Guide for AI coding agents

Purpose: quick, actionable knowledge for an AI agent to be immediately productive in this repository (a NestJS monorepo).

1. Big picture

- Monorepo managed by pnpm + Turborepo. Root scripts proxy to packages using `pnpm --filter` and `turbo` (see `package.json`).
- Service apps:
  - `apps/api` — NestJS 11 backend (TypeORM + Postgres, Passport JWT auth, Swagger at `/docs`).
  - `apps/web` — Next.js frontend (UI + components under `apps/web/src`).
  - `packages/shared` — shared types/utilities.
- Database + schema: TypeORM with `synchronize: false` — migrations are the source of truth. CLI DataSource reads compiled `dist` entities (see `apps/api/src/database/data-source.ts`).

2. Key files to consult (examples)

- `apps/api/src/main.ts` — global interceptors and filters (ClassSerializerInterceptor, ResponseInterceptor, HttpExceptionFilter).
- `apps/api/src/app.module.ts` — ConfigModule + TypeOrmModule setup; global ValidationPipe settings.
- `apps/api/src/database/data-source.ts` — DataSource used by migration CLI (uses `dist/` compiled entities/migrations).
- `apps/api/src/common/interceptors/response.interceptor.ts` — unified 2xx response format; note pass-through behavior when body already matches `{ code, data }`.
- `apps/api/src/common/filters/http-exception.filter.ts` — error wrapper `{ code: 0, data: null, msg }` and server-error logging.
- `apps/api/src/auth` — JWT strategy, refresh/blacklist mechanics and `TokenBlacklistService` (SHA‑256 hashes, `orIgnore()` insert). Example: `token-blacklist.service.ts`.
- `apps/api/package.json` and root `package.json` — scripts for build, run, tests and migrations.
- `.claude/skills/` and `CLAUDE.md` — repository-level guidance and the internal "superpowers" skills framework (agent must respect these skills).

3. Important patterns & conventions

- Global response envelope: all successful responses should be `{ code: 1, data, msg: 'ok' }`. Interceptor enforces/normalizes this.
- Errors are normalized to `{ code: 0, data: null, msg }` by the HttpExceptionFilter.
- ClassSerializerInterceptor is enabled globally in `main.ts` to strip `@Exclude()` fields (e.g. `User.password`).
- ValidationPipe is configured globally via `APP_PIPE` in `app.module.ts` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` — DTO-based validation is expected.
- Auth: refresh-token rotation + blacklist. Blacklisted tokens stored as SHA-256 hash in DB. When working with auth flows, check `auth` module for service-level conventions.
- Migrations: always use generated migration files and run via npm scripts that build first. DO NOT rely on TypeORM `synchronize: true`.
- Migration CLI/commands must run against compiled `dist` files (see `apps/api/package.json` commands like `migration:generate`, `migration:run`).
- Tests: Jest + ts-jest. Unit tests mock services/repositories (see CLAUDE.md testing patterns). E2E tests live in `apps/api/test/` and use `supertest`.
- Pre-commit: Husky enforced (`prepare` script). pre-commit runs lint/format/tests; commit-msg uses commitlint for Conventional Commits.

4. Developer workflows (commands & examples)

- Start backend in dev (watch): from repo root

  pnpm run start:dev

  (root proxies to `@base/api` start:dev script)

- Build for production

  pnpm run build

- Run migration generation (NOTE: builds first; CLI reads `dist`):

  pnpm run migration:generate -- src/database/migrations/<name>

- Run migrations (requires DB env vars):

  pnpm run migration:run

- Run unit tests (all)

  pnpm run test

- Run a single unit test file (example)

  pnpm run test -- apps/api/src/app.controller.spec.ts

- Run E2E tests

  pnpm run test:e2e

5. Environment & configuration

- `@nestjs/config` is used; `ConfigModule.forRoot(...)` loads `database` via `registerAs` and expects a `.env` file by default. Migrations use `dotenv` in `src/database/data-source.ts`.
- Environment variables: DB\_\* (host/port/username/password/database) and NODE_ENV.

6. Where to look for examples and common code

- Entities: `apps/api/src/**/entities/*.ts` (e.g. `users/user.entity.ts`, `auth/entities/blacklisted-token.entity.ts`).
- Controllers/services: `apps/api/src/*/*.controller.ts` and `*.service.ts` (see `auth`, `users`, `knowledge`, `providers`).
- Shared utilities / docs: `apps/api/src/common/*` (interceptors, filters, docs setup, local-ai adapter).

7. Agent conduct & important project-specific rules

- Respect `.claude/skills` and `CLAUDE.md`: this repo embeds an explicit agent workflow ("superpowers"). Before making changes or beginning implementation, check `CLAUDE.md` and applicable SKILL.md files.
- Migrations must be generated and run with the build step; mention and follow the build → migration pattern in any automation or PR instructions.
- Tests are the expected verification method. The repo enforces pre-commit hooks that run lint/format/tests; be conservative with commits that skip tests.

8. Quick investigative checklist for agents

- Read `CLAUDE.md` and relevant `.claude/skills/*` SKILL.md before implementing (project policy).
- Check `apps/api/src/app.module.ts` for registration of global pipes/interceptors/filters when changing request/response behaviors.
- If changing schema: generate migration via `pnpm run migration:generate ...` and include migration file in PR.
- If touching auth: read `auth/token-blacklist.service.ts` and `auth/strategies/jwt.strategy.ts` to preserve refresh-rotation and blacklist checks.
- When running migrations or scripts, ensure `pnpm` + `turbo` proxying is used as shown in root `package.json`.

References (files to open first)

- `CLAUDE.md`
- `.claude/skills/using-superpowers/SKILL.md`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/database/data-source.ts`
- `apps/api/src/common/interceptors/response.interceptor.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/auth/token-blacklist.service.ts`
- `apps/api/package.json`

---

Generated by an automated analysis of the repository. Update this file if repository conventions change.
