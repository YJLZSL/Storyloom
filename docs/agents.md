# Storyloom 智能体编码指南（agents.md）

> 本文档面向所有接替 Storyloom 开发的 AI Agent。遵守这些规则可以避免混乱、减少重复劳动、保护已有功能。
>
> **版本**：v1.4.0 基线
> **最后更新**：2026-06-21
> **状态**：必须遵守

---

## 一、接手流程（动手前必须做的）

### 1.1 阅读顺序（不可跳过）

每次接手新任务，按以下顺序阅读文档，**不要跳过任何一步**：

| 顺序 | 文档 | 目的 | 预计时间 |
|:---:|:---|:---|:---:|
| 1 | `docs/项目交接.md` | 了解项目全貌、已知问题、待办事项 | 5 min |
| 2 | `docs/架构设计.md` | 理解数据流、状态管理、组件通信 | 5 min |
| 3 | 本文件 (`docs/agents.md`) | 理解编码规范和禁忌 | 3 min |
| 4 | 相关功能目录的 README / 注释 | 了解具体模块的上下文 | 2 min |

> **红线**：不读完 `项目交接.md` 和 `架构设计.md` 前，**禁止修改任何代码**。

### 1.2 了解当前状态

动手前确认：

```bash
git status          # 工作区是否干净？是否有未提交的修改？
git log --oneline -5  # 最近5次提交，了解当前进度
npm run typecheck   # 当前代码是否能通过类型检查？（尽量执行）
```

如果发现工作区不干净，**先询问用户**是否需要提交现有修改，再开始自己的工作。

### 1.3 锁定修改范围

明确回答这三个问题，再写第一行代码：

1. **我要改什么？** — 具体文件/组件/功能点
2. **不改什么？** — 与本次任务无关的模块，不要动
3. **最坏情况是什么？** — 如果改坏了，怎么回滚？

---

## 二、编码风格

### 2.1 命名约定

| 类型 | 规则 | 示例 |
|:---|:---|:---|
| 组件 | PascalCase，功能名在前 | `WorkspaceSelector.tsx`, `TimelineCanvas.tsx` |
| Hooks | camelCase，以 `use` 开头 | `useWorkspaceStore`, `useTimelineStore` |
| 工具函数 | camelCase，动词开头 | `formatRelativeTime`, `deserializeSettings` |
| 常量 | UPPER_SNAKE_CASE | `VIEW_TABS`, `DEFAULT_SETTINGS` |
| 类型/接口 | PascalCase | `Workspace`, `TimelineEvent` |
| 文件 | 与默认导出同名 | `export function WorkspaceSelector` → `WorkspaceSelector.tsx` |

### 2.2 导入顺序

按以下顺序排列，每类之间空一行：

```typescript
// 1. React 核心
import { useState, useEffect } from 'react';

// 2. 第三方库（按字母序）
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// 3. 内部服务/工具（按路径长度从短到长）
import { useWorkspaces } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

// 4. 组件（按字母序）
import { TButton } from '@/components/ui-tdesign';
import { WorkspaceCard } from './WorkspaceCard';

// 5. 类型（最后）
import type { Workspace } from '../../../shared/types';
```

### 2.3 图标使用

**所有图标必须经过 `src/lib/icons.ts` 统一导出**。禁止直接从 `@icon-park/react` 或其他图标库导入。

```typescript
// ✅ 正确
import { FolderOpenIcon, DeleteIcon } from '@/lib/icons';

// ❌ 错误 — 直接引用图标库
import { FolderOpen } from '@icon-park/react';
```

需要新图标时：
1. 先检查 `src/lib/icons.ts` 是否已有
2. 如果没有，添加到 `icons.ts` 中统一导出
3. 在组件中从 `@/lib/icons` 导入

### 2.4 样式约定

- **使用 Tailwind CSS 原子类**，不手写 CSS 文件（除非动画 keyframes）
- **主题色值通过 CSS 变量引用**：`bg-primary`, `text-muted-foreground`, `border-border`
- **自定义 CSS 类名**：放在 `src/index.css` 中，按功能分组，加注释说明
- **禁用内联 style**：除非必须动态计算（如 `style={{ '--panel-width': ... }}`）
- **z-index 必须使用 CSS 变量**：`z-index: var(--z-toolbar)`，不硬编码数字

---

## 三、状态管理规范

### 3.1 Zustand Store 规则

每个 Store 是一个独立的 `.ts` 文件，放在 `src/stores/` 中：

```typescript
// ✅ 正确的 Store 结构
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SomeState {
  // 所有 state 字段
}

export interface SomeActions {
  // 所有 action 方法
}

export const useSomeStore = create<SomeState & SomeActions>()(
  persist(
    (set, get) => ({
      // state + actions
    }),
    { name: 'some-storage' }
  )
);
```

**禁忌**：
- ❌ 不要在一个 Store 中存储所有状态，按功能拆分
- ❌ 不要直接从组件内修改另一个 Store 的状态（用 `useStore.getState()` 时小心）
- ❌ 不要在 Store 中引入 React 组件或 JSX

### 3.2 TanStack Query 规则

**所有服务端状态必须通过 `api-hooks.ts` 或 `api-hooks-factory.ts` 访问**：

```typescript
// ✅ 正确 — 使用已封装的 hooks
import { useWorkspaces, useCreateWorkspace } from '@/services/api-hooks';

// ❌ 错误 — 直接 fetch
const res = await fetch('/api/workspaces');  // 禁止！
```

新增 API 时：
1. 如果已有同类型资源（如 `events`, `tracks`），用 `createNestedHooks` 工厂
2. 如果是顶层资源（如 `workspaces`），用 `createTopLevelHooks` 工厂
3. 不要直接写 `useQuery` / `useMutation`

### 3.3 跨 Store 通信

如果需要在 Store 之间通信：

```typescript
// 在 action 中调用其他 Store 的 getState()（同步）
setCurrentWorkspace: (id) => {
  set({ currentWorkspaceId: id });
  useTimelineStore.getState().setVisibleDateRange(null);
  useSelectionStore.getState().clear();
},
```

**注意**：只在 action 中调用，不在组件 render 中调用 `getState()`。

---

## 四、组件开发规范

### 4.1 组件文件结构

```typescript
// 1. imports
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Workspace } from '../../../shared/types';

// 2. 类型定义（如果导出）
export interface MyComponentProps {
  workspace: Workspace;
  onSelect: (id: string) => void;
}

// 3. 辅助常量/函数（非导出）
const ANIMATION_DURATION = 0.3;

function formatSomething(value: number): string {
  return `${value}%`;
}

// 4. 主组件（默认导出）
export function MyComponent({ workspace, onSelect }: MyComponentProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      {/* ... */}
    </div>
  );
}
```

### 4.2 UI 组件选择

| 场景 | 使用 | 不推荐使用 |
|:---|:---|:---|
| 基础按钮/输入框 | TDesign React (`TButton`, `TInput`) | 手写 |
| 对话框/弹窗 | `Dialog` (shadcn/ui) + TDesign | 手写 |
| 右键菜单 | `ContextMenu` (shadcn/ui) | TDesign 的 `DropdownMenu` |
| 工具提示 | `TTooltip` (TDesign) | 手写 |
| 自定义图标按钮 | 原生 `<button>` + 图标（CSS 类控制） | `TButton variant="text"` |

### 4.3 动画

- 页面切换：`Framer Motion` (`AnimatePresence` + `motion.div`)
- 简单 hover 效果：Tailwind CSS (`transition-all`, `hover:scale-105`)
- 复杂序列动画：Framer Motion `variants` + `staggerChildren`
- **不要**在动画中硬编码颜色值，使用 CSS 变量

### 4.4 国际化（i18n）

**所有用户可见文本必须走 `react-i18next`**：

```typescript
const { t } = useTranslation();

// ✅ 正确
<span>{t('workspace.selectPlaceholder')}</span>

// ❌ 错误 — 硬编码中文
<span>选择工作区</span>
```

新增翻译键时：
1. 同时添加到 `src/lib/i18n/locales/zh-CN.json` 和 `en-US.json`
2. 使用点分命名空间：`namespace.key`（如 `workspace.createTitle`）
3. 保持两个文件的键结构一致

---

## 五、API 层规范

### 5.1 目录结构

```
src/services/
├── api.ts              # 底层 fetch 封装 + 动态 base URL
├── api-hooks.ts        # 所有 react-query hooks 的单文件入口
├── api-hooks-factory.ts # createTopLevelHooks / createNestedHooks 工厂
└── ai-stream.ts        # AI 流式请求特殊处理
```

### 5.2 新增 API 流程

1. 在 `shared/types.ts` 中定义请求/响应类型
2. 在后端 `server/routes/` 中添加路由
3. 在前端 `src/services/api-hooks.ts` 中用工厂函数创建 hooks
4. 在组件中导入使用

**不要**跳过类型定义，**不要**直接在组件内写 `fetch`。

### 5.3 错误处理

- API 层：用 `toast` 或 `MessagePlugin` 显示用户友好错误
- Store 层：捕获错误后设置 `error` 状态，不直接抛给 UI
- 组件层：显示 `loading` 和 `error` 状态，不要吞掉错误

---

## 六、修改纪律（最重要）

### 6.1 修改前确认

修改任何文件前，先回答：

```
1. 这个文件当前的功能是什么？
2. 修改后会影响哪些其他文件/组件？
3. 是否已有测试？修改后测试是否仍能通过？
4. 是否破坏向后兼容性？（用户数据/设置是否会丢失？）
```

### 6.2 最小修改原则

- **只改与任务相关的代码**，不重构无关模块
- **不要"顺手优化"** 看起来不顺眼的代码，除非它是本次任务的一部分
- 如果看到一个坏味道，**记下来**而不是顺手改掉（除非修改范围极小）

### 6.3 破坏性修改的声明

如果修改涉及：
- 删除已有 API 端点
- 修改 Store 的 state 结构
- 重命名组件 props
- 修改数据库 schema

必须在修改前：
1. 在文档中说明影响范围
2. 提供迁移方案（如果有用户数据）
3. 更新所有调用方（不要留下废弃调用）

### 6.4 提交前检查清单

```bash
# 1. 确认修改范围合理
git diff --stat

# 2. 类型检查（如果环境允许）
npm run typecheck

# 3. 测试（如果环境允许）
npm run test

# 4. 确认没有意外修改的文件
git diff --name-only
```

---

## 七、Git 提交规范

### 7.1 Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

| 类型 | 用途 |
|:---|:---|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `refactor` | 重构（不改变行为） |
| `docs` | 仅文档修改 |
| `style` | 代码格式（不影响功能） |
| `test` | 添加/修改测试 |
| `chore` | 构建/工具链修改 |

示例：

```bash
feat(workspace): 添加工作区重命名功能

- WorkspaceCard 新增 isEditing 状态 + 内联编辑
- WorkspaceSelector 引入 useUpdateWorkspace
- 补充 zh-CN/en-US 翻译键

fix #123
```

### 7.2 提交频率

- **小步快跑**：每次 commit 只做一件事
- 不要积累大量修改后一次性提交
- 如果一次修改涉及多个文件但不同主题，拆分成多个 commit

---

## 八、禁忌清单（绝对不要做）

### 8.1 代码层面

| ❌ 禁止 | 原因 | 正确做法 |
|:---|:---|:---|
| 直接 `fetch('/api/...')` 绕过 hooks | 破坏缓存、状态不同步 | 用 `api-hooks.ts` 中的 hooks |
| 直接从 `@icon-park/react` 导入图标 | 破坏统一图标管理 | 从 `@/lib/icons` 导入 |
| 在组件内硬编码中文/英文文本 | 破坏国际化 | 使用 `t('key')` |
| 手写内联 CSS `style={{...}}` | 破坏主题一致性 | 用 Tailwind 类或 CSS 变量 |
| 在 Store 中引入 React 组件 | 导致循环依赖 | Store 只存纯数据 + 纯函数 |
| 用 `any` 类型绕过 TypeScript | 破坏类型安全 | 正确定义类型或使用 `unknown` |
| 直接修改 props 对象 | 破坏 React 不可变约定 | 创建新对象或复制后修改 |
| 在 `useEffect` 里缺少依赖项 | 导致 stale closure | 用 `eslint` 或手动补全依赖 |

### 8.2 架构层面

| ❌ 禁止 | 原因 | 正确做法 |
|:---|:---|:---|
| 新建全局状态而不评估必要性 | 状态膨胀、难以追踪 | 先问：这个状态是否必须全局？能否局部？ |
| 在已有功能上直接重写而不保留旧版 | 用户数据丢失风险 | 渐进式重构，保留兼容层 |
| 修改 `shared/types.ts` 后不更新后端 | 类型不匹配导致运行时错误 | 前后端类型同步修改 |
| 修改数据库 schema 不增加迁移 | 旧数据无法兼容 | 每次 schema 变更加 DDL 迁移 |
| 在已有组件上堆叠新功能而不拆分 | 组件膨胀、难以维护 | 拆分子组件或提取 hooks |

### 8.3 流程层面

| ❌ 禁止 | 原因 | 正确做法 |
|:---|:---|:---|
| 不读文档就动手 | 重复已有方案、破坏已有设计 | 先读 `项目交接.md` + `架构设计.md` + 本文件 |
| 不确认测试就推送 | 可能引入回归 | 至少运行 `typecheck`，有条件时运行 `test` |
| 提交信息写"修改了一些东西" | 无法追溯、无法回滚 | 按 7.1 格式写清晰的 commit message |
| 一次修改超过 20 个文件 | 难以 review、难以回滚 | 拆分成多个主题独立的 commit |
| 删除没有替代方案的旧功能 | 用户功能丢失 | 先标记 deprecated，再逐步移除 |

---

## 九、常见问题速查

### Q: 我想新增一个功能，从哪开始？

1. 检查 `docs/项目交接.md` 的「待办事项」部分，确认是否已规划
2. 在 `docs/路线图-v1.3+.md` 中确认优先级
3. 从 `shared/types.ts` 定义类型开始
4. 后端 → 前端 → 测试，按顺序开发

### Q: 我不确定某个组件的用法，怎么办？

1. 先查看 `src/components/` 中同名或相似功能的组件
2. 查看 `src/services/api-hooks.ts` 中对应的 hooks
3. 查看 `src/stores/` 中对应的 Store
4. 如果仍不清楚，查看 `docs/架构设计.md`

### Q: 修改后出现了错误，但我不确定是不是我引入的？

1. 用 `git stash` 暂存修改，确认错误是否消失
2. 如果消失，逐段 `git stash pop` 回退，定位引入点
3. 检查 `npm run typecheck` 输出
4. 检查浏览器控制台和网络请求

### Q: 我发现了一个旧代码的 bug，但不在我的任务范围内？

1. 记录到 `docs/项目交接.md` 的「已知问题」部分
2. 如果修复只需 1-2 行且不会引入副作用，可以顺手修复
3. 如果修复复杂，不要动，留待专门的 bug 修复任务

---

## 十、文档维护

本文档由每个接手的 AI Agent 维护。如果你发现：
- 本文档与代码实际不符 → 更新本文档
- 发现了新的禁忌模式 → 添加到 8.x 节
- 已有文档被修改后过时 → 更新引用处

> **修改本文档后，在 commit message 中注明 `docs(agents): ...`**

---

*本文档是 Storyloom 开发规范的一部分。违反本文档中的规则可能导致代码被回滚、功能回归、或用户数据丢失。如有疑问，先阅读文档，再动手编码。*
