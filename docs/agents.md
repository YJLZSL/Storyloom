# Storyloom 智能体编码指南（agents.md）

> 面向所有接替 Storyloom 开发的 AI Agent 和开发者。
> 遵守这些规则可以避免混乱、减少重复劳动、保护已有功能。
>
> **版本**：v1.1.1
> **最后更新**：2026-06-22

---

## 一、项目概况

**Storyloom（织叙）** 是面向小说作者、编剧与游戏叙事设计师的本地桌面创作工作台。核心隐喻是"织机"——用时间轴经线编织故事结构。

**三进程架构**：

```
┌─────────────────┐     stdout JSON      ┌──────────────────────┐     HTTP localhost     ┌──────────────────┐
│  Tauri Rust 主进程 │ ──────────────────► │  Node.js Sidecar 子进程 │ ◄─────────────────── │  WebView2 渲染进程  │
│  窗口/系统 API     │   {"type":"ready",  │  Fastify 5 + Drizzle   │   fetch /api/*       │  React 19 前端    │
│  sidecar 生命周期   │    "port":N}       │  SQLite (better-sqlite3) │                     │  Zustand + TanStack│
└─────────────────┘                      └──────────────────────┘                      └──────────────────┘
```

| 层级 | 技术 | 关键版本 |
|------|------|----------|
| 桌面壳 | Tauri 2.x | 2.11.3 |
| 前端框架 | React | 19.2.7 |
| 构建工具 | Vite | 6.x |
| 样式 | Tailwind CSS v4 | 4.3.1 |
| UI 组件 | TDesign React + shadcn/ui (Radix) | 1.17.1 |
| 状态管理 | Zustand | 5.x |
| 数据请求 | TanStack Query | 5.x |
| 动画 | Framer Motion + GSAP + PixiJS | 11.x / 3.15 / 8.19 |
| 后端 | Fastify (sidecar) | 5.x |
| ORM | Drizzle ORM | 0.44 |
| 数据库 | SQLite (better-sqlite3) | - |
| 桌面端框架 | Tauri | 2.11.3 |
| 包管理 | npm | - |
| Rust 编译器 | rustc | 1.77+ |

---

## 二、接手流程（动手前必须做）

### 2.1 阅读顺序

| 顺序 | 文档 | 目的 |
|:---:|:---|:---|
| 1 | `docs/项目交接.md` | 了解项目全貌、已知问题 |
| 2 | `docs/架构设计.md` | 理解数据流、状态管理、组件通信 |
| 3 | 本文件 (`docs/agents.md`) | 编码规范和禁忌 |
| 4 | `docs/路线图.md` | 了解当前优先级和后续方向 |

### 2.2 确认当前状态

```bash
git status            # 工作区是否干净
git log --oneline -5  # 最近提交
npm run typecheck     # 类型检查
```

如果工作区不干净，**先询问用户**再开始工作。

### 2.3 锁定修改范围

动手前回答：改什么？不改什么？改坏了怎么回滚？

---

## 三、项目结构

```
D:\AIKFCC\Storyloom
├── package.json                 # 版本 1.0.0，依赖管理
├── vite.config.ts               # Vite 构建配置
├── tsconfig.json                # 前端 TS 配置
├── tsconfig.server.json         # 后端 TS 配置
├── src-tauri/                   # Tauri Rust 主进程
│   ├── src/
│   │   ├── main.rs              # 入口（调用 lib.rs 的 run()）
│   │   └── lib.rs               # 命令注册 + sidecar 启动 + 日志（282 行）
│   ├── Cargo.toml               # Rust 依赖
│   ├── tauri.conf.json          # 窗口/bundle/updater/图标配置
│   ├── icons/                   # 多尺寸 PNG + ICO + ICNS
│   └── sidecars/                # storyloom-sidecar.exe（pkg 编译的 Node.js）
├── src/                         # 前端源码
│   ├── App.tsx                  # 根组件（sidecar 端口获取 + 启动遮罩）
│   ├── main.tsx                 # 前端入口
│   ├── index.css                # ~2900 行（主题 + 动画 + 工具类）
│   ├── lib/
│   │   ├── icons.ts             # IconPark 图标统一导出（~60 个）
│   │   ├── tauri-api.ts         # Tauri invoke/listen 封装
│   │   ├── ai-config.ts         # AI 配置 localStorage
│   │   └── ai-icons.tsx         # AI 厂商品牌 SVG
│   ├── components/              # ~100 个组件，29 个子目录
│   │   ├── layout/              # AppShell, TopToolbar, LeftPanel, StatusBar 等
│   │   ├── timeline/            # TimelineCanvas, TimelineTrack, 15 个文件
│   │   ├── ai-panel/            # AIPanel, AIConversationList 等
│   │   ├── ai/                  # AIAssistantView, AIFunctionCards
│   │   ├── settings/            # SettingsDialog, ThemeSelector 等
│   │   ├── workspace/           # WorkspaceSelector, ChapterRail 等
│   │   ├── script-editor/       # SceneEditor, BeatEditor 等（VN 编辑器）
│   │   ├── notebook/            # NotebookView, NoteEditor, FolderTree
│   │   ├── writing/             # WritingView（三栏写作）
│   │   ├── _shared/             # EmptyState, LoadingState, Skeleton, PomodoroTimer
│   │   ├── render-layer/        # PixiBackground（PixiJS 粒子背景）
│   │   ├── splash/              # LoomSplash（织机启动动画）
│   │   ├── transition/          # PageTransition（页面过渡）
│   │   ├── ui/                  # shadcn/ui 组件（ContextMenu, Dialog 等）
│   │   └── ui-tdesign/          # TDesign 适配器
│   ├── stores/                  # 15 个 Zustand store
│   │   ├── useWorkspaceStore.ts # 工作区 CRUD + 当前工作区
│   │   ├── useTimelineStore.ts  # 时间轴视口/缩放/日期范围
│   │   ├── useSelectionStore.ts # 当前选中事件/角色
│   │   ├── useTrackStore.ts     # 轨道管理
│   │   ├── useViewStore.ts      # 当前视图模式
│   │   ├── useUIStore.ts        # UI 状态（侧边栏/对话框）
│   │   ├── useSettingsStore.ts  # 用户设置（字体/语言/更新偏好）
│   │   ├── useThemeStore.ts     # 主题切换
│   │   ├── useDailyGoalStore.tsx # 每日目标字数
│   │   └── historyStore.ts      # 操作历史（undo/redo）
│   └── services/                # API 层
│       ├── api.ts               # fetch 封装 + 动态 base URL
│       ├── api-hooks.ts         # 所有 react-query hooks
│       ├── api-hooks-factory.ts # createTopLevelHooks / createNestedHooks
│       ├── ai-stream.ts         # AI 流式请求
│       └── ai-conversations-api.ts # AI 对话 API
├── server/                      # 后端源码（sidecar）
│   ├── index.ts                 # Fastify 服务器入口
│   ├── sidecar-entry.ts         # Tauri sidecar 入口
│   ├── db/
│   │   ├── schema.ts            # Drizzle 表定义（28 表）
│   │   ├── index.ts             # 数据库连接 + 迁移 + DDL 兜底
│   │   └── migrate.ts           # 迁移工具
│   ├── routes/                  # 20 个路由文件 + 1 个子目录
│   │   ├── workspaces/          # 工作区 CRUD + 导入导出 + 自动保存
│   │   ├── events.ts            # 事件 CRUD
│   │   ├── ai.ts                # AI 代理（7 厂商）
│   │   ├── ai-conversations.ts  # AI 对话持久化
│   │   └── ...                  # characters, tracks, connections 等
│   ├── services/
│   │   ├── ai-proxy.ts         # AI 代理核心（7 提供商）
│   │   ├── auto-save.ts         # 自动保存服务
│   │   └── exporters/webgal.ts  # WebGAL 导出器
│   └── lib/
│       └── validation.ts        # Fastify schema 校验
├── shared/
│   └── types.ts                 # 前后端共享类型定义
└── docs/                        # 文档目录
    ├── agents.md                # 本文件
    ├── 项目交接.md               # 项目概况与已知问题
    ├── 架构设计.md               # 详细架构说明
    ├── 路线图.md                 # 未来规划
    ├── 开发指南.md               # 开发环境搭建
    └── _archive/                # 历史归档文档
```

---

## 四、编码风格

### 4.1 命名约定

| 类型 | 规则 | 示例 |
|:---|:---|:---|
| 组件 | PascalCase | `WorkspaceSelector.tsx` |
| Hooks | camelCase + `use` | `useWorkspaceStore` |
| 工具函数 | camelCase + 动词 | `formatRelativeTime` |
| 常量 | UPPER_SNAKE_CASE | `VIEW_TABS` |
| 类型 | PascalCase | `Workspace`, `TimelineEvent` |
| 文件 | 与默认导出同名 | `export function Foo` → `Foo.tsx` |

### 4.2 导入顺序

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
import { WorkspaceCard } from './WorkspaceCard';

// 5. 类型（最后）
import type { Workspace } from '../../../shared/types';
```

### 4.3 图标使用

**所有图标必须经过 `src/lib/icons.ts` 统一导出**，禁止直接从 `@icon-park/react` 导入。

```typescript
// ✅ 正确
import { FolderOpenIcon } from '@/lib/icons';

// ❌ 错误
import { FolderOpen } from '@icon-park/react';
```

### 4.4 样式约定

- 使用 Tailwind CSS 原子类，不手写 CSS（动画 keyframes 除外）
- 主题色值通过 CSS 变量引用：`bg-primary`, `text-muted-foreground`
- z-index 使用 CSS 变量：`z-index: var(--z-toolbar)`
- 禁用内联 `style={{...}}`（除非必须动态计算）

---

## 五、状态管理

### 5.1 Zustand Store

每个 Store 是独立的 `.ts` 文件，放在 `src/stores/` 中。当前共 15 个 Store。

**跨 Store 通信**：只在 action 中调用 `其他Store.getState()`，不在组件 render 中调用。

```typescript
setCurrentWorkspace: (id) => {
  set({ currentWorkspaceId: id });
  useTimelineStore.getState().setVisibleDateRange(null);
},
```

### 5.2 TanStack Query

**所有服务端状态必须通过 `api-hooks.ts` 或 `api-hooks-factory.ts` 访问**。

新增 API 时：
1. 同类型资源（如 events, tracks）→ 用 `createNestedHooks` 工厂
2. 顶层资源（如 workspaces）→ 用 `createTopLevelHooks` 工厂
3. 不要直接写 `useQuery` / `useMutation`

---

## 六、API 层

### 6.1 通信流程

```
组件 → api-hooks → api.ts → fetch(localhost:PORT/api/*) → Fastify sidecar → Drizzle → SQLite
```

### 6.2 新增 API 流程

1. `shared/types.ts` 定义类型
2. `server/routes/` 添加路由
3. `src/services/api-hooks.ts` 用工厂函数创建 hooks
4. 组件中导入使用

### 6.3 数据库迁移

- **不使用** drizzle 的迁移文件
- 迁移逻辑在 `server/db/index.ts` 的 `runMigrations()` 和 `ensureSchemaCompatibility()` 中
- 新增表必须同时修改 `schema.ts` + `index.ts` 的硬编码 DDL + `ensureSchemaCompatibility` 的列检测
- 当前 28 张表

---

## 七、组件开发

### 7.1 UI 组件选择

| 场景 | 使用 | 备注 |
|:---|:---|:---|
| 基础按钮/输入框 | TDesign React (`TButton`, `TInput`) | 首选 |
| 对话框/弹窗 | `Dialog` (shadcn/Radix) + TDesign | 统一使用 |
| 右键菜单 | `ContextMenu` (shadcn/Radix) | TDesign DropdownMenu 不推荐 |
| 工具提示 | `TTooltip` (TDesign) | - |

### 7.2 TDesign Button 兼容

**TDesign Button 的 `icon` prop 不兼容 IconPark 图标**，必须使用 children 模式：

```tsx
// ✅ 正确
<TButton><ZoomOutIcon /></TButton>

// ❌ 错误 — 运行时异常
<TButton icon={<ZoomOutIcon />} />
```

### 7.3 国际化

**所有用户可见文本必须走 `react-i18next`**：

```typescript
const { t } = useTranslation();
<span>{t('workspace.selectPlaceholder')}</span>
```

新增翻译键时同时添加 `zh-CN.json` 和 `en-US.json`。

---

## 八、构建与发布

### 8.1 构建命令

```bash
# 开发模式
npm run dev              # 前端 + 后端同时启动（concurrently）

# 生产构建
npm run build            # Vite 前端构建
npm run build:server     # 后端 TypeScript 编译
npm run build:sidecar    # pkg 打包为 storyloom-sidecar.exe
npm run tauri:build      # Tauri NSIS 安装包

# 质量检查
npm run typecheck        # TypeScript 严格检查
npm run test             # vitest 单元测试
```

### 8.2 构建产物

- 安装包：`src-tauri/target/release/bundle/nsis/Storyloom_1.0.0_x64-setup.exe`（~27 MB）
- 签名：minisign 密钥对，`.sig` 文件
- 更新元数据：`latest.json`

### 8.3 环境要求

- Node.js 20.x+
- Rust 1.77+（Tauri 2.x 要求）
- MSVC Build Tools（Windows）
- Python 3.x（签名工具）

---

## 九、Git 提交规范

### 9.1 Commit Message 格式

```
<type>(<scope>): <subject>

<body>
```

| 类型 | 用途 |
|:---|:---|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `refactor` | 重构（不改变行为） |
| `docs` | 文档 |
| `style` | 格式 |
| `test` | 测试 |
| `chore` | 构建/工具链 |

### 9.2 提交纪律

- 小步快跑：每次 commit 只做一件事
- 一次修改不超过 20 个文件
- 修改前运行 `npm run typecheck`
- 提交前确认 `git diff --stat` 范围合理

---

## 十、禁忌清单

### 10.1 代码层面

| ❌ 禁止 | 正确做法 |
|:---|:---|
| 直接 `fetch('/api/...')` 绕过 hooks | 用 `api-hooks.ts` |
| 直接从 `@icon-park/react` 导入图标 | 从 `@/lib/icons` 导入 |
| 在组件内硬编码中文文本 | 使用 `t('key')` |
| 在 Store 中引入 React 组件 | Store 只存纯数据 + 纯函数 |
| 用 `any` 类型绕过 TypeScript | 正确定义类型或使用 `unknown` |
| 在 `useEffect` 里缺少依赖项 | 补全依赖或添加 eslint-disable |

### 10.2 架构层面

| ❌ 禁止 | 正确做法 |
|:---|:---|
| 新建全局状态而不评估必要性 | 先问：这个状态是否必须全局？ |
| 修改 `shared/types.ts` 后不更新后端 | 前后端类型同步修改 |
| 修改数据库 schema 不增加 DDL 兜底 | 同时修改 schema.ts + index.ts |
| 在已有组件上堆叠新功能而不拆分 | 拆分子组件或提取 hooks |

### 10.3 流程层面

| ❌ 禁止 | 正确做法 |
|:---|:---|
| 不读文档就动手 | 先读项目交接 + 架构设计 + 本文件 |
| 不确认测试就推送 | 至少运行 typecheck |
| 一次修改超过 20 个文件 | 拆分成多个独立 commit |
| 删除没有替代方案的旧功能 | 先标记 deprecated，再逐步移除 |
| "顺手优化"无关代码 | 记录下来，专门处理 |

---

## 十一、常见问题

**Q: 新增功能从哪开始？**
1. 检查 `docs/路线图.md` 确认优先级
2. 从 `shared/types.ts` 定义类型开始
3. 后端路由 → 前端 hooks → 组件 → 测试

**Q: 不确定某个组件的用法？**
1. 查看 `src/components/` 中同名或相似组件
2. 查看 `src/services/api-hooks.ts` 中对应 hooks
3. 查看 `src/stores/` 中对应 Store
4. 查看 `docs/架构设计.md`

**Q: 修改后出现错误？**
1. `git stash` 暂存，确认错误是否消失
2. 检查 `npm run typecheck` 输出
3. 检查浏览器控制台和网络请求

**Q: 发现旧代码 bug 但不在任务范围？**
1. 记录到 `docs/项目交接.md` 的已知问题
2. 修复只需 1-2 行且无副作用 → 顺手修
3. 修复复杂 → 不动，留给专门任务

---

## 十二、文档维护

本文档由每个接手的 Agent 维护。如果发现：
- 本文档与代码实际不符 → 更新本文档
- 发现了新的禁忌模式 → 添加到第十节
- 已有文档被修改后过时 → 更新引用处

修改本文档后，在 commit message 中注明 `docs(agents): ...`。
