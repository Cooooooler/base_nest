# UI 组件提取实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `apps/web/src/components/ui/` 的 28 个 shadcn 组件提取为独立的 `packages/ui` 包（`@base/ui`），遵循 monorepo 包划分最佳实践。

**架构：**
- 新建 `packages/ui/` 包，内含 `lib/utils.ts`（cn 函数）、`components/{atom,composite}/`（UI 组件）、`hooks/use-mobile.ts`（sidebar hook）
- `packages/ui` 使用 tsc 编译，extends 根 `tsconfig.base.json`
- 消费者 `apps/web` 通过 `"@base/ui": "workspace:*"` 依赖引用，导入路径从 `@/components/ui/*` 改为 `@base/ui/*`

**技术栈：** TypeScript + tsc, Tailwind v4（CSS 变量由消费方提供）, @base-ui/react, pnpm workspace

---

## 文件结构

### 创建的文件

| 路径 | 职责 |
|---|---|
| `packages/ui/package.json` | 包定义，声明依赖和 exports |
| `packages/ui/tsconfig.json` | extends 根 tsconfig.base.json |
| `packages/ui/src/lib/utils.ts` | cn() 工具函数 |
| `packages/ui/src/lib/utils.test.ts` | cn() 测试（从 web 迁移） |
| `packages/ui/src/hooks/use-mobile.ts` | sidebar 响应式 hook |
| `packages/ui/src/index.ts` | 统一桶导出 |
| `packages/ui/src/components/atom/avatar.tsx` | 叶子组件（19个） |
| `packages/ui/src/components/atom/badge.tsx` | |
| `packages/ui/src/components/atom/button.tsx` | |
| `packages/ui/src/components/atom/card.tsx` | |
| `packages/ui/src/components/atom/drawer.tsx` | |
| `packages/ui/src/components/atom/dropdown-menu.tsx` | |
| `packages/ui/src/components/atom/input.tsx` | |
| `packages/ui/src/components/atom/label.tsx` | |
| `packages/ui/src/components/atom/marker.tsx` | |
| `packages/ui/src/components/atom/popover.tsx` | |
| `packages/ui/src/components/atom/scroll-area.tsx` | |
| `packages/ui/src/components/atom/select.tsx` | |
| `packages/ui/src/components/atom/separator.tsx` | |
| `packages/ui/src/components/atom/skeleton.tsx` | |
| `packages/ui/src/components/atom/slider.tsx` | |
| `packages/ui/src/components/atom/sonner.tsx` | |
| `packages/ui/src/components/atom/spinner.tsx` | |
| `packages/ui/src/components/atom/table.tsx` | |
| `packages/ui/src/components/atom/textarea.tsx` | |
| `packages/ui/src/components/atom/tooltip.tsx` | |
| `packages/ui/src/components/composite/combobox.tsx` | 复合组件（9个） |
| `packages/ui/src/components/composite/command.tsx` | |
| `packages/ui/src/components/composite/data-table.tsx` | |
| `packages/ui/src/components/composite/dialog.tsx` | |
| `packages/ui/src/components/composite/field.tsx` | |
| `packages/ui/src/components/composite/input-group.tsx` | |
| `packages/ui/src/components/composite/sheet.tsx` | |
| `packages/ui/src/components/composite/sidebar.tsx` | |

### 修改的文件

| 路径 | 变更 |
|---|---|
| `apps/web/package.json` | 添加 `"@base/ui": "workspace:*"` 依赖 |
| `apps/web/src/app/(auth)/login/page.tsx` | 导入路径替换 |
| `apps/web/src/app/(auth)/register/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/layout.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/apps/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/apps/new/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/apps/[id]/edit/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/apps/[id]/chat/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/knowledge/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/knowledge/new/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/knowledge/[id]/page.tsx` | 同上，加 `useIsMobile` 导入变更 |
| `apps/web/src/app/(dashboard)/providers/page.tsx` | 导入路径替换 |
| `apps/web/src/app/(dashboard)/providers/new/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/providers/[id]/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/workflows/page.tsx` | 同上 |
| `apps/web/src/app/(dashboard)/workflows/[id]/edit/page.tsx` | 同上 |
| `apps/web/src/components/app/providers.tsx` | 同上 |
| `apps/web/src/components/app/app-sidebar.tsx` | 同上 |
| `apps/web/src/components/chat/assistant-message.tsx` | 同上 |
| `apps/web/src/components/chat/source-list.tsx` | 同上 |
| `apps/web/src/components/chat/reasoning-block.tsx` | 同上 |
| `apps/web/src/components/chat/message-scroller.tsx` | 同上 |
| `apps/web/src/components/workflow/node-panel.tsx` | 同上 |
| `apps/web/src/components/workflow/node-config-panel/*.tsx` | 同上（约 10 个文件） |

### 删除的文件

| 路径 |
|---|
| `apps/web/src/components/ui/`（整个目录 28 个文件） |
| `apps/web/src/lib/utils.ts` |
| `apps/web/src/lib/utils.test.ts` |
| `apps/web/src/hooks/use-mobile.ts` |

---

### 任务 1：创建 packages/ui 包骨架

**文件：**
- 创建：`packages/ui/package.json`
- 创建：`packages/ui/tsconfig.json`
- 创建：`packages/ui/src/lib/utils.ts`
- 创建：`packages/ui/src/index.ts`

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "@base/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@base-ui/react": "^1.5.0",
    "ahooks": "^3.9.7",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "cmdk": "^1.1.1",
    "lucide-react": "^0.400",
    "next-themes": "^0.4.6",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2",
    "@tanstack/react-table": "^8.21.3"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

注意：
- `react`/`react-dom` 列为 peerDependencies（由消费方提供）
- `@base-ui/react` 为直接依赖（组件 imports）
- `clsx` + `tailwind-merge` 为 cn() 所需
- 暂不在 exports 中声明每个组件的子路径，首版先提供桶导出，后续可按需添加

- [ ] **步骤 2：创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **步骤 3：创建 src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **步骤 4：创建 src/index.ts**

```ts
// Atom components
export { Avatar, AvatarFallback } from './components/atom/avatar';
export { Badge } from './components/atom/badge';
export { Button } from './components/atom/button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/atom/card';
export { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from './components/atom/drawer';
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup } from './components/atom/dropdown-menu';
export { Input } from './components/atom/input';
export { Label } from './components/atom/label';
export { Marker, MarkerIcon, MarkerContent } from './components/atom/marker';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './components/atom/popover';
export { ScrollArea, ScrollViewport, Scrollbar, Thumb } from './components/atom/scroll-area';
export { Select, SelectTrigger, SelectValue, SelectPopup, SelectArrow, SelectPositioner, SelectScrollUpArrow, SelectScrollDownArrow } from './components/atom/select';
export { Separator } from './components/atom/separator';
export { Skeleton } from './components/atom/skeleton';
export { Slider } from './components/atom/slider';
export { Toaster } from './components/atom/sonner';
export { Spinner } from './components/atom/spinner';
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './components/atom/table';
export { Textarea } from './components/atom/textarea';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/atom/tooltip';

// Composite components
export { Combobox, ComboboxAnchor, ComboboxPopup, ComboboxList, ComboboxOption, ComboboxCancel } from './components/composite/combobox';
export { Command, CommandList, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from './components/composite/command';
export { DataTable } from './components/composite/data-table';
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from './components/composite/dialog';
export { Field, FieldLabel, FieldError } from './components/composite/field';
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './components/composite/input-group';
export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose } from './components/composite/sheet';
export { Sidebar, SidebarTrigger, SidebarRail, SidebarInset, SidebarInput, SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarSeparator, SidebarProvider } from './components/composite/sidebar';

// Utils
export { cn } from './lib/utils';
```

注意：如果某些导出名称与实际文件不匹配，安装后 typecheck 时会报错，届时再修正。

- [ ] **步骤 5：迁移 cn() 测试**

```bash
cp "F:\project\nest\base_nest\apps\web\src\lib\utils.test.ts" \
   "F:\project\nest\base_nest\packages\ui\src\lib\utils.test.ts"
```

并将测试中的导入路径改为：
```ts
- import { cn } from './utils';
+ import { cn } from './utils';
```
（同包内路径无需修改）

- [ ] **步骤 6：验证骨架**

运行：`pnpm install`
预期：成功注册 `@base/ui` workspace 包

---

### 任务 2：迁移原子组件（19 个叶子组件）

**文件：** 将以下文件从 `apps/web/src/components/ui/` 创建到 `packages/ui/src/components/atom/`：
- avatar.tsx, badge.tsx, button.tsx, card.tsx, drawer.tsx, dropdown-menu.tsx, input.tsx, label.tsx, marker.tsx, popover.tsx, scroll-area.tsx, select.tsx, separator.tsx, skeleton.tsx, slider.tsx, sonner.tsx, spinner.tsx, table.tsx, textarea.tsx, tooltip.tsx

每个组件中 `import { cn } from '@/lib/utils'` 需要改为 `import { cn } from '../../lib/utils'`。

通过 Shell 命令批量完成：复制文件 + sed 替换导入路径。

- [ ] **步骤 1：复制原子组件并替换路径**

运行：

```bash
# 创建目标目录
mkdir -p "F:\project\nest\base_nest\packages\ui\src\components\atom"

# 复制 19 个原子组件（可在此添加 s v等排除，或直接复制）
for f in avatar badge button card drawer dropdown-menu input label marker popover scroll-area select separator skeleton slider sonner spinner table textarea tooltip; do
  cp "F:\project\nest\base_nest\apps\web\src\components\ui/$f.tsx" \
     "F:\project\nest\base_nest\packages\ui\src\components\atom/$f.tsx"
done
```

- [ ] **步骤 2：替换原子组件中的导入路径**

```bash
cd "F:\project\nest\base_nest\packages\ui\src\components\atom"
# 将所有 '@/lib/utils' 替换为相对路径
sed -i "s|from '@/lib/utils'|from '../../lib/utils'|g" *.tsx
```

- [ ] **步骤 3：验证无遗漏**

```bash
# 确认没有遗留的 @/ 导入
grep -rn "from '@/" *.tsx
# 预期输出为空
```

---

### 任务 3：迁移复合组件（9 个）

**文件：** 将以下文件从 `apps/web/src/components/ui/` 创建到 `packages/ui/src/components/composite/`：
- combobox.tsx, command.tsx, data-table.tsx, dialog.tsx, field.tsx, input-group.tsx, sheet.tsx, sidebar.tsx

每个组件需要替换多种导入路径：
- `@/lib/utils` → `../../lib/utils`（所有复合组件）
- `@/components/ui/xxx` → 相对路径（atom 或 composite 内部）
- `@/hooks/use-mobile` → `../../hooks/use-mobile`（仅 sidebar）

具体替换映射：

| 组件 | 替换 `@/components/ui/` | 替换 `@/hooks/` |
|---|---|---|
| combobox.tsx | button → `../atom/button`, input-group → `./input-group` | 无 |
| command.tsx | dialog → `./dialog`, input-group → `./input-group` | 无 |
| data-table.tsx | table → `../atom/table` | 无 |
| dialog.tsx | button → `../atom/button` | 无 |
| field.tsx | label → `../atom/label`, separator → `../atom/separator` | 无 |
| input-group.tsx | button → `../atom/button`, input → `../atom/input`, textarea → `../atom/textarea` | 无 |
| sheet.tsx | button → `../atom/button` | 无 |
| sidebar.tsx | button → `../atom/button`, input → `../atom/input`, separator → `../atom/separator`, sheet → `./sheet`, skeleton → `../atom/skeleton`, tooltip → `../atom/tooltip` | `../../hooks/use-mobile` |

- [ ] **步骤 1：复制复合组件**

```bash
mkdir -p "F:\project\nest\base_nest\packages\ui\src\components\composite"

for f in combobox command data-table dialog field input-group sheet sidebar; do
  cp "F:\project\nest\base_nest\apps\web\src\components\ui/$f.tsx" \
     "F:\project\nest\base_nest\packages\ui\src\components\composite/$f.tsx"
done
```

- [ ] **步骤 2：替换通用的 `@/lib/utils` 路径**

```bash
cd "F:\project\nest\base_nest\packages\ui\src\components\composite"
sed -i "s|from '@/lib/utils'|from '../../lib/utils'|g" *.tsx
```

- [ ] **步骤 3：替换各复合组件的内部 UI 依赖路径**

```bash
# combobox: @/components/ui/button → ../atom/button, @/components/ui/input-group → ./input-group
sed -i "s|from '@/components/ui/button'|from '../atom/button'|g" combobox.tsx command.tsx dialog.tsx input-group.tsx sheet.tsx sidebar.tsx
sed -i "s|from '@/components/ui/input-group'|from './input-group'|g" combobox.tsx command.tsx
sed -i "s|from '@/components/ui/input'|from '../atom/input'|g" input-group.tsx sidebar.tsx
sed -i "s|from '@/components/ui/textarea'|from '../atom/textarea'|g" input-group.tsx
sed -i "s|from '@/components/ui/separator'|from '../atom/separator'|g" field.tsx sidebar.tsx
sed -i "s|from '@/components/ui/skeleton'|from '../atom/skeleton'|g" sidebar.tsx
sed -i "s|from '@/components/ui/tooltip'|from '../atom/tooltip'|g" sidebar.tsx
sed -i "s|from '@/components/ui/label'|from '../atom/label'|g" field.tsx
sed -i "s|from '@/components/ui/table'|from '../atom/table'|g" data-table.tsx
sed -i "s|from '@/components/ui/dialog'|from './dialog'|g" command.tsx
sed -i "s|from '@/components/ui/sheet'|from './sheet'|g" sidebar.tsx
```

- [ ] **步骤 4：替换 sidebar 的 hook 导入**

```bash
cd "F:\project\nest\base_nest\packages\ui\src\components\composite"
sed -i "s|from '@/hooks/use-mobile'|from '../../hooks/use-mobile'|g" sidebar.tsx
```

- [ ] **步骤 5：验证无遗留 @/ 导入**

```bash
cd "F:\project\nest\base_nest\packages\ui\src\components\composite"
grep -rn "from '@/" *.tsx
# 预期输出为空
```

---

### 任务 4：迁移 hook 和构建验证

- [ ] **步骤 1：复制 use-mobile hook**

```bash
mkdir -p "F:\project\nest\base_nest\packages\ui\src\hooks"
cp "F:\project\nest\base_nest\apps\web\src\hooks\use-mobile.ts" \
   "F:\project\nest\base_nest\packages\ui\src\hooks\use-mobile.ts"
```

```ts
// 从 @/hooks/use-mobile.ts 原样复制
// 内部导入 ahooks，对用户透明
```

- [ ] **步骤 2：验证包编译**

```bash
cd "F:\project\nest\base_nest"
pnpm install   # 确保新包被 workspace 识别
pnpm --filter @base/ui run build
```

预期：`tsc` 编译成功，`dist/` 目录生成。

- [ ] **步骤 3：全量 typecheck**

```bash
pnpm run typecheck
```

预期：所有 4 个包（shared + ui + api + web）typecheck 通过。如果 ui 包有错误，检查 index.ts 中的导出名称是否匹配实际组件导出。

---

### 任务 5：更新消费者导入路径

将 web app 中所有 `@/components/ui/` 替换为 `@base/ui/`，并删除原目录。

- [ ] **步骤 1：批量替换导入路径**

```bash
cd "F:\project\nest\base_nest\apps\web\src"
# 将所有 '@/components/ui/' 替换为 '@base/ui/'（去掉末尾的组件名，保留路径）
# 注意：sed 需要正确处理替换
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "@/components/ui/" | while read f; do
  sed -i "s|from '@/components/ui/\([^/]*\)'|from '@base/ui/\1'|g" "$f"
  # 处理多行导入的情况：from '@/components/ui/xxx' 已在上面覆盖
  # 检查是否还有 @/components/ui/ 遗留（通常在多行导入的续行中）
done
```

实际可能需要更精细的替换，因为有些文件使用多行导入：

```ts
import {
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
```

上面的 sed 命令应该能覆盖这种情况（因为 `from '@/components/ui/sidebar'` 在一行内）。

验证：
```bash
# 确认无遗留
grep -rn "@/components/ui/" --include="*.tsx" --include="*.ts" .
# 预期输出为空
```

- [ ] **步骤 2：替换 use-mobile 导入（knowledge 页面）**

`apps/web/src/app/(dashboard)/knowledge/[id]/page.tsx` 中：
```diff
- import { useIsMobile } from '@/hooks/use-mobile';
+ import { useIsMobile } from '@base/ui';
```

- [ ] **步骤 3：替换非 UI 组件中的 cn() 导入**

非 UI 组件中仍有 5 个文件从 `@/lib/utils` 导入 `cn`：
- `components/animated/stagger-list.tsx`
- `components/animated/fade-in.tsx`
- `components/chat/typing-animation.tsx`
- `components/chat/message-scroller.tsx`
- `components/chat/message-animated.tsx`
- `components/chat/empty.tsx`
- `components/workflow/node-panel.tsx`

这些文件不是 UI 组件，不需要移动。但它们可以从 `@base/ui` 导入 `cn`：
```diff
- import { cn } from '@/lib/utils';
+ import { cn } from '@base/ui';
```

- [ ] **步骤 4：添加 @base/ui 依赖到 web**

`apps/web/package.json` 中：
```diff
  "dependencies": {
    "@base/shared": "workspace:*",
+   "@base/ui": "workspace:*",
```

- [ ] **步骤 5：删除原 UI 组件目录**

```bash
rm -rf "F:\project\nest\base_nest\apps\web\src\components\ui"
```

如果 `apps/web/src/lib/utils.ts` 只剩下 cn 函数且无其他引用，也删除。但保留它也无妨（空文件不影响）。

检查是否有其他文件从 `@/lib/utils` 导入 cn：
```bash
grep -rn "from '@/lib/utils'" --include="*.tsx" --include="*.ts" "F:\project\nest\base_nest\apps\web\src"
```
如果只有 UI 目录（已删除），则删除 `apps/web/src/lib/utils.ts`。

- [ ] **步骤 6：删除原 use-mobile hook**

```bash
rm "F:\project\nest\base_nest\apps\web\src\hooks\use-mobile.ts"
```

- [ ] **步骤 7：重新安装依赖**

```bash
cd "F:\project\nest\base_nest"
pnpm install
```

---

### 任务 6：构建验证

- [ ] **步骤 1：全量构建**

```bash
cd "F:\project\nest\base_nest"
pnpm run build
```

预期：shared → ui → web（顺序构建），全部成功。

- [ ] **步骤 2：类型检查**

```bash
pnpm run typecheck
```

预期：4/4 packages 通过。

- [ ] **步骤 3：运行 web 测试**

```bash
pnpm --filter @base/web run test
```

预期：14 suites, 76 tests, all passed。

- [ ] **步骤 4：验证 dev server 可启动**

```bash
cd "F:\project\nest\base_nest\apps\web"
pnpm run dev &
sleep 5
curl -s http://localhost:3001 | head -20
# 确认页面正常返回
kill %1 2>/dev/null
```

---

## 回滚方案

如果任一构建/测试步骤失败：

1. 恢复 `apps/web/src/components/ui/` 目录（从 git）：`git checkout -- apps/web/src/components/ui/`
2. 恢复 `apps/web/src/hooks/use-mobile.ts`：`git checkout -- apps/web/src/hooks/use-mobile.ts`
3. 恢复 `apps/web/package.json`：`git checkout -- apps/web/package.json`
4. 删除 `packages/ui/`：`rm -rf packages/ui`
5. 回退导入变更：`git checkout -- apps/web/src/`
