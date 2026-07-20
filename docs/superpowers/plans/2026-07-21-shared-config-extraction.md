# 共享配置提取实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将根 `tsconfig.base.json` 提取到 `packages/tsconfig`，将共享 ESLint/Prettier/commitlint 配置提取到 `packages/config`。

**架构：**
- `packages/tsconfig`（`@base/tsconfig`）：含 `base.json`（通用）和 `nest.json`（NestJS 扩展）
- `packages/config`（`@base/config`）：含 `eslint/{base,nest,next}.mjs` 共享 ESLint 配置
- 所有 consumer 通过 npm 包名（`"@base/tsconfig/base.json"`）引用配置

**技术栈：** pnpm workspace, TypeScript, ESLint flat config, Node.js ESM

---

## 文件结构

### 创建的文件

| 路径 | 职责 |
|---|---|
| `packages/tsconfig/package.json` | @base/tsconfig 包定义 |
| `packages/tsconfig/base.json` | 通用基础 TypeScript 配置 |
| `packages/tsconfig/nest.json` | NestJS 扩展配置（extends base.json） |
| `packages/config/package.json` | @base/config 包定义 |
| `packages/config/eslint/base.mjs` | 通用 TypeScript + Prettier ESLint 规则 |
| `packages/config/eslint/nest.mjs` | NestJS 增强 ESLint 规则 |
| `packages/config/eslint/next.mjs` | Next.js ESLint 规则 |

### 修改的文件

| 路径 | 变更 |
|---|---|
| `packages/ui/package.json` | 添加 `@base/tsconfig: workspace:*` devDependency |
| `packages/ui/tsconfig.json` | `extends` 指向 `@base/tsconfig/base.json` |
| `packages/shared/package.json` | 添加 `@base/tsconfig: workspace:*` devDependency |
| `packages/shared/tsconfig.json` | `extends` 指向 `@base/tsconfig/base.json` |
| `apps/api/package.json` | 添加 `@base/tsconfig` + `@base/config` devDependency |
| `apps/api/tsconfig.json` | `extends` 指向 `@base/tsconfig/nest.json` |
| `apps/api/eslint.config.mjs` | 引用 `@base/config/eslint/nest.mjs` |
| `apps/web/tsconfig.json` | `extends` 指向 `@base/tsconfig/base.json` |

### 删除的文件

| 路径 |
|---|
| `tsconfig.base.json` |

---

### 任务 1：创建 packages/tsconfig

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "@base/tsconfig",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./base.json": "./base.json",
    "./nest.json": "./nest.json"
  }
}
```

- [ ] **步骤 2：创建 base.json**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **步骤 3：创建 nest.json**

```json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

---

### 任务 2：创建 packages/config

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "@base/config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./eslint/base": "./eslint/base.mjs",
    "./eslint/nest": "./eslint/nest.mjs",
    "./eslint/next": "./eslint/next.mjs"
  },
  "peerDependencies": {
    "eslint": "^9"
  }
}
```

- [ ] **步骤 2：创建 eslint/base.mjs**

```js
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
```

- [ ] **步骤 3：创建 eslint/nest.mjs**

```js
// @ts-check
import baseConfig from '@base/config/eslint/base';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
```

- [ ] **步骤 4：创建 eslint/next.mjs**

```js
// @ts-check
import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
```

- [ ] **步骤 5：运行 pnpm install 注册新包**

```bash
cd F:\project\nest\base_nest && pnpm install
```

预期：`@base/tsconfig@0.0.1` 和 `@base/config@0.0.1` 成功注册。

---

### 任务 3：更新 packages 的 tsconfig 引用

**文件：** packages/ui/tsconfig.json, packages/shared/tsconfig.json, apps/web/tsconfig.json, apps/api/tsconfig.json, apps/api/tsconfig.build.json

- [ ] **步骤 1：更新 packages/ui/tsconfig.json**

```json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **步骤 2：更新 packages/shared/tsconfig.json**

```json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **步骤 3：更新 apps/web/tsconfig.json**

```json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **步骤 4：更新 apps/api/tsconfig.json**

```json
{
  "extends": "@base/tsconfig/nest.json",
  "compilerOptions": {
    "resolvePackageJsonExports": true,
    "removeComments": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "strictPropertyInitialization": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **步骤 5：检查 tsconfig.build.json**

`apps/api/tsconfig.build.json` 已经 `extends: "./tsconfig.json"`，无需修改（它继承主配置，而主配置已继承 @base/tsconfig/nest.json）。

- [ ] **步骤 6：添加 @base/tsconfig 依赖到各 package**

`packages/ui/package.json` 的 `devDependencies` 中：
```diff
+   "@base/tsconfig": "workspace:*"
```

`packages/shared/package.json` 的 `devDependencies` 中：
```diff
+   "@base/tsconfig": "workspace:*"
```

`apps/web/package.json` 的 `devDependencies` 中：
```diff
+   "@base/tsconfig": "workspace:*"
```

`apps/api/package.json` 的 `devDependencies` 中：
```diff
+   "@base/tsconfig": "workspace:*"
+   "@base/config": "workspace:*"
```

---

### 任务 4：更新 ESLint 配置

- [ ] **步骤 1：更新 apps/api/eslint.config.mjs**

```js
// @ts-check
import nestConfig from '@base/config/eslint/nest';
import globals from 'globals';

export default [
  {
    ignores: ['eslint.config.mjs'],
  },
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
```

- [ ] **步骤 2：更新 apps/web/eslint.config.mjs**

```js
// @ts-check
import nextConfig from '@base/config/eslint/next';

export default [
  ...nextConfig,
];
```

---

### 任务 5：删除根 tsconfig.base.json

- [ ] **步骤 1：删除文件**

```bash
rm "F:\project\nest\base_nest\tsconfig.base.json"
```

- [ ] **步骤 2：更新 pnpm-lock**

```bash
cd "F:\project\nest\base_nest" && pnpm install
```

---

### 任务 6：构建验证

- [ ] **步骤 1：全量 typecheck**

```bash
cd "F:\project\nest\base_nest" && pnpm run typecheck
```

预期：6/6 tasks passed（4 packages typecheck + build 项）。

- [ ] **步骤 2：全量 lint**

```bash
cd "F:\project\nest\base_nest" && pnpm run lint
```

预期：0 error（warning 可接受）。

- [ ] **步骤 3：全量 build**

```bash
cd "F:\project\nest\base_nest" && pnpm run build
```

预期：4/4 packages 构建成功。

- [ ] **步骤 4：运行测试**

```bash
cd "F:\project\nest\base_nest" && pnpm --filter @base/api run test && pnpm --filter @base/web run test
```

预期：API 242/242, Web 71/71 all passed。

---

## 回滚方案

如果任一验证失败：

1. 恢复 tsconfig 引用：`git checkout -- packages/*/tsconfig.json apps/*/tsconfig.json`
2. 恢复 eslint 配置：`git checkout -- apps/*/eslint.config.mjs`
3. 恢复 tsconfig.base.json：`git checkout tsconfig.base.json`
4. 回退依赖：`git checkout -- packages/*/package.json apps/*/package.json`
