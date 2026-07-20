# 共享配置提取设计：packages/tsconfig + packages/config

## 概述

将当前根级别的共享 TypeScript 配置和代码质量配置提取到专用的 monorepo 包中：

- `packages/tsconfig`（`@base/tsconfig`）— 共享 TypeScript 编译配置
- `packages/config`（`@base/config`）— 共享 ESLint、Prettier、commitlint 等配置

## 动机

- **命名空间化**：使用 npm 包名引用配置（`@base/tsconfig/base.json`）而非相对路径（`../../tsconfig.base.json`），更符合 monorepo 包管理规范
- **可发现性**：配置集中存放，新 package 只需 `"extends": "@base/tsconfig/base.json"` 即可获得基础配置
- **版本化**：配置变更通过 workspace 协议传播，lock 文件追踪

## 包结构

### packages/tsconfig（@base/tsconfig）

```
packages/tsconfig/
├── package.json
├── base.json           ← 当前 tsconfig.base.json（通用基础配置）
└── nest.json           ← NestJS 配置（emitDecoratorMetadata 等扩展 base.json）
```

**base.json** — 通用基础配置：
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

**nest.json** — NestJS 特有扩展：
```json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

### packages/config（@base/config）

```
packages/config/
├── package.json
├── eslint/
│   ├── base.mjs       ← 通用 TypeScript 规则
│   ├── nest.mjs       ← NestJS 增强（extends base.mjs）
│   └── next.mjs       ← Next.js 增强（extends base.mjs）
├── prettier.mjs       ← 共享 Prettier 配置
└── commitlint.ts      ← 共享 commitlint 配置
```

**eslint/base.mjs** — 通用 TypeScript + Prettier 规则：
```js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
```

**eslint/nest.mjs** — NestJS：
```js
import baseConfig from './base.mjs';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
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

**eslint/next.mjs** — Next.js：
```js
import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
];
```

## 消费者迁移

### packages/ui → 示例

```json
// packages/ui/package.json
{
  "devDependencies": {
    "@base/tsconfig": "workspace:*"
  }
}
```

```json
// packages/ui/tsconfig.json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### packages/shared → 示例

```json
// packages/shared/tsconfig.json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### apps/api → 示例

```json
// apps/api/tsconfig.json
{
  "extends": "@base/tsconfig/nest.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*", "test/**/*"]
}
```

```js
// apps/api/eslint.config.mjs
import nestConfig from '@base/config/eslint/nest.mjs';
import globals from 'globals';

export default [
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
```

### apps/web → 示例

```json
// apps/web/tsconfig.json
{
  "extends": "@base/tsconfig/base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  }
}
```

```js
// apps/web/eslint.config.mjs
import nextConfig from '@base/config/eslint/next.mjs';

export default [
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
```

## 根目录配置保留

根目录保留：
- `.prettierrc` — 简化，仅作为根格式化的入口？还是完全交给 `packages/config/prettier.mjs`？
- `commitlint.config.ts` — 同上

两种方式：
1. **根配置通过 `extends` 指向包** — 根 `.prettierrc` 写 `"prettier.config.mjs"` 指向 packages
2. **根配置仅保留脚本入口** — `"format": "prettier --write ."` 不变，prettier 自身配置走 packages

推荐方式 1，保持根级 prettier/commitlint 命令仍可用。

## 构建与发布

两个包都用 tsc 编译（但 tsconfig 包实际只需复制 json 文件，无需编译）：

- `packages/tsconfig`：无 build 脚本（`package.json` 直接用 `"exports"` 暴露 `.json`）
- `packages/config`：eslint config 为 `.mjs`，直接使用无需编译

```json
// packages/tsconfig/package.json
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

```json
// packages/config/package.json
{
  "name": "@base/config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./eslint/base": "./eslint/base.mjs",
    "./eslint/nest": "./eslint/nest.mjs",
    "./eslint/next": "./eslint/next.mjs"
  }
}
```

## 实施步骤

1. 创建 `packages/tsconfig/` — package.json + base.json + nest.json
2. 创建 `packages/config/` — package.json + eslint/{base,nest,next}.mjs
3. 更新 4 个 package 的 tsconfig 引用路径
4. 更新 API 和 Web 的 eslint.config.mjs 引用
5. 根 `.prettierrc` 引用 `packages/config/prettier.mjs`
6. 根 `commitlint.config.ts` 引用 `packages/config/commitlint.ts`
7. 删除根 `tsconfig.base.json`
8. 全体验证（typecheck + build + lint + test）
