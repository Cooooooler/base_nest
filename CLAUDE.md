# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm run build       # Build with nest build
pnpm run start:dev   # Start in watch mode
pnpm run lint        # Lint with ESLint --fix
pnpm run test        # Run unit tests (Jest, *.spec.ts)
pnpm run test:cov    # Unit tests with coverage
pnpm run test:e2e    # E2E tests (test/jest-e2e.json)
pnpm run test:watch  # Unit tests in watch mode
```

Single test file: `pnpm run test -- app.controller.spec.ts`

## Architecture

NestJS 11 application using the standard modular architecture:

- **Modules** (`@Module()`) — root `AppModule` in `src/app.module.ts`. Feature modules live alongside `src/` following NestJS conventions.
- **Controllers** (`@Controller()`) — handle HTTP routes in `src/*.controller.ts`.
- **Providers** (`@Injectable()`) — business logic in `src/*.service.ts`.
- **main.ts** bootstraps via `NestFactory.create(AppModule)` on `PORT ?? 3000`.

Key config: `nest-cli.json` sets `sourceRoot: "src"` and `deleteOutDir: true`. `tsconfig.json` uses `nodenext` module resolution with decorator metadata (`experimentalDecorators`, `emitDecoratorMetadata`).

## Stack

- **Runtime**: Node.js, TypeScript (ES2023 target), NestJS 11
- **Package manager**: pnpm 10 (pinned in `package.json` `packageManager` field)
- **Testing**: Jest + ts-jest, unit tests co-located (`*.spec.ts`), E2E in `test/`
- **Linting**: ESLint flat config (`eslint.config.mjs`), Prettier via `.prettierrc`
