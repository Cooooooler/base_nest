# UI 组件提取设计：packages/ui

## 概述

将 `apps/web/src/components/ui/` 的 28 个 shadcn (base-nova 风格) UI 组件提取为独立的 monorepo 包 `packages/ui`（包名 `@base/ui`），实现组件与业务应用的解耦，并遵循 monorepo 包划分最佳实践。

## 动机

- **解耦**：UI 组件库与 Next.js 应用分离，可独立版本化和测试
- **复用**：为将来可能的其他前端应用提供共享 UI 层
- **一致性**：按 monorepo 模式对齐 `packages/*` 的结构（参考 skill 中的 packages/ui/ 模式）
- **关注分离**：`apps/web` 专注于业务逻辑，`packages/ui` 专注于组件展示层

## 包结构

```
packages/ui/
├── src/
│   ├── lib/
│   │   └── utils.ts              # cn() 工具函数（从 apps/web/src/lib/utils.ts 迁移）
│   ├── components/
│   │   ├── atom/                  # 叶子组件（无内部 UI 依赖）
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── marker.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── table.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   └── composite/             # 复合组件（引用了其他 UI 组件）
│   │       ├── combobox.tsx
│   │       ├── command.tsx
│   │       ├── data-table.tsx
│   │       ├── dialog.tsx
│   │       ├── field.tsx
│   │       ├── input-group.tsx
│   │       ├── sheet.tsx
│   │       └── sidebar.tsx
│   ├── hooks/
│   │   └── use-mobile.ts         # sidebar 用响应式 hook（从 apps/web/src/hooks/ 迁移）
│   └── index.ts                   # 统一桶导出
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### 分组说明

**atom/** — 19 个叶子组件：不引用其他 UI 组件，只依赖 `@base-ui/react` 原语和 `cn()`。

**composite/** — 9 个复合组件：内部引用了其他 UI 组件：
- `combobox` → Button, InputGroup
- `command` → Dialog, InputGroup
- `data-table` → Table
- `dialog` → Button
- `field` → Label, Separator
- `input-group` → Button, Input, Textarea
- `sheet` → Button
- `sidebar` → Button, Input, Separator, Sheet, Skeleton, Tooltip

## 依赖

### 运行时依赖

| 依赖 | 版本 | 用途 | 被使用组件 |
|---|---|---|---|
| `react` | ^19 | 框架 | 全部 |
| `@base-ui/react` | ^1.5.0 | Base UI 原语 | button/dialog/select 等 14 个组件 |
| `class-variance-authority` | ^0.7 | cva 多变量样式 | badge, button, field, input-group, sidebar |
| `clsx` | ^2 | 类名合并 | cn() |
| `tailwind-merge` | ^2 | Tailwind 类合并去重 | cn() |
| `lucide-react` | ^0.400 | 图标 | combobox, command, dialog 等 9 个组件 |
| `cmdk` | ^1.1.1 | 命令菜单 | command |
| `sonner` | ^2.0.7 | Toast 通知 | sonner |
| `next-themes` | ^0.4.6 | 主题感知 | sonner（配合 dark mode） |
| `@tanstack/react-table` | ^8.21.3 | 表格逻辑 | data-table |

### 开发依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| `typescript` | ^5.7.3 | 编译 |
| `@types/react` | ^19 | 类型定义 |
| `@types/react-dom` | ^19 | 类型定义 |

## 导出方案

### 双重导出模式

使用 `package.json` 的 `exports` 字段同时支持全量导入和按需导入：

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./button": {
      "types": "./dist/components/atom/button.d.ts",
      "default": "./dist/components/atom/button.js"
    },
    "./card": {
      "types": "./dist/components/atom/card.d.ts",
      "default": "./dist/components/atom/card.js"
    }
    // ... 每个组件一个入口
  }
}
```

### 消费方式

消费者可选择：

```ts
// 全量导入（tree-shakeable）
import { Button, Card, Input } from '@base/ui';

// 按需导入（明确路径）
import { Button } from '@base/ui/button';
```

## CSS 策略

UI 组件使用 Tailwind v4 的 CSS 变量名（如 `bg-primary`、`text-foreground`、`border-input`），这些变量由**消费方**的 Tailwind 主题配置定义。

- `packages/ui` **不包含** CSS 文件
- `apps/web/src/app/globals.css` 的 `@theme inline` 块继续提供 CSS 变量定义
- UI 组件依赖消费方已在 Tailwind 上下文中，`cn()` 函数保持原样

### Tailwind v4 兼容性

`apps/web` 使用 Tailwind v4（`@import 'tailwindcss'`），UI 组件中的 Tailwind 类名（如 `flex items-center justify-center`）直接在 JSX 中使用，由消费方的 PostCSS 编译。不需要在 UI 包中配置 PostCSS 或 Tailwind。

## 消费者迁移

### 文件变更

| 文件 | 操作 |
|---|---|
| `apps/web/package.json` | 添加 `"@base/ui": "workspace:*"` 依赖 |
| `apps/web/src/lib/utils.ts` | 删除（已迁移到 UI 包），若仍有其他非 cn 工具函数则保留 |
| `apps/web/src/hooks/use-mobile.ts` | 删除（迁移到 UI 包） |
| `apps/web/tsconfig.json` | 路径别名不变（`@/* → ./src/*` 仍用于其他模块） |
| ~40 个页面/组件文件 | 替换导入路径：`@/components/ui/*` → `@base/ui` |
| `apps/web/components.json` | 将 `aliases.ui` 指向 `@base/ui` |

### 导入路径替换模式

```diff
- import { Button } from '@/components/ui/button';
+ import { Button } from '@base/ui/button';

- import { Card, CardContent } from '@/components/ui/card';
+ import { Card, CardContent } from '@base/ui/card';

- import { cn } from '@/lib/utils';
+ import { cn } from '@base/ui';
```

### turbo.json 集成

```json
"build": {
  "dependsOn": ["^build"],
  "outputs": [".next/**", "dist/**", ".turbo/**"]
}
```

通过在 `turbo.json` 中配置 `^build` 依赖，`@base/shared` 和 `@base/ui` 会自动在 `@base/web` 构建前完成编译。

## 实施步骤

### 第 1 步：创建 packages/ui 骨架
- 创建 `packages/ui/package.json`（声明依赖）
- 创建 `packages/ui/tsconfig.json`（extends 根配置）
- 创建 `packages/ui/src/lib/utils.ts`（cn 函数）
- 创建 `packages/ui/src/index.ts`（桶导出）

### 第 2 步：迁移组件文件
- 将 28 个 `.tsx` 组件从 `apps/web/src/components/ui/` 复制到 `packages/ui/src/components/{atom,composite}/`
- 更新组件内的导入路径：`@/lib/utils` → `@/lib/utils`（同包内）或使用相对路径
- 迁移 `use-mobile.ts` hook

### 第 3 步：修复导入路径
- 全局替换所有 `@/components/ui/` → `@base/ui/`
- `apps/web/package.json` 添加 `@base/ui: workspace:*` 依赖
- 删除 `apps/web/src/components/ui/` 目录（原组件）
- 如果 `apps/web/src/lib/utils.ts` 只剩 `cn()` 则删除，否则保留其他工具函数

### 第 4 步：构建验证
- `pnpm install`（注册新 workspace 包）
- `pnpm run build`（验证编译）
- `pnpm run typecheck`（验证类型）
- `pnpm --filter @base/web run test`（验证测试）
