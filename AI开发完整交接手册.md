# AI 开发完整交接手册

> 面向下一个接手此项目的 AI 开发者
> 项目：AI Timeline Creator V4.0
> 编写日期：2026-06-17
> 编写者：OpenCode AI（Phase 1-6 实现 + V7 全面重构）

---

## 0. 阅读顺序（重要）

请按以下顺序阅读项目文档，从概览到细节：

```
1. 本文件（交接手册）              → 了解全局状况和开发约定
2. 前端问题识别与修复任务.md        → ⚠️ V7 重构后遗留问题清单（P0-P4），开工前必读
3. 架构与代码地图.md               → 掌握系统架构、组件树、数据库、API 路由
4. 开发路线图.md                   → 知道哪些任务待完成、优先级如何
5. README.md                       → 快速启动指南和 V7 重构后的关键事实
6. AI接手开发指南.md                → 代码导航、常见陷阱
7. 功能需求规格.md                  → 各功能模块的完整需求定义
8. 前端设计方案.md                  → 视觉设计、动画规格、色彩系统
9. 项目状态报告.md                  → 当前完成度与已知问题
10. 文档变更日志.md                 → 了解文档修订历史
11. .trae/specs/rebuild-v7/         → V7 重构 spec（5 阶段 17 任务，权威来源）
12. .trae/specs/                    → 历史 spec（参考用，部分标记与实际不符）
```

---

## 1. 项目一句话概述

**为小说作者设计的时间轴创作工具**，支持多轨道事件管理、角色关系图谱、伏笔生命周期追踪、世界观设定、AI 辅助创作等功能。桌面应用（Electron），也可作为 Web 应用运行。

---

## 2. 当前状态快照

### 2.1 完成度

| 层面 | 完成度 | 说明 |
|------|--------|------|
| **后端** | ~90% | API 路由全部就绪，SQLite + Drizzle 稳定，AI 代理、自动保存、输入验证已实现 |
| **前端** | ~85% | V7 重构完成新骨架（AppShell + 4 域 store + shadcn/ui + Framer Motion），但旧功能面板尚未全部迁移到新 store，存在功能断链 |
| **整体** | ~80% | 基础创作闭环可用，但 V7 重构遗留 P0 阻塞性问题 7 个需优先修复 |

> ⚠️ **重要**：V7 重构是"新骨架"搭建，新布局/状态/组件已就位，但大量旧代码残留，新骨架与旧功能面板未完全对接。详见 `前端问题识别与修复任务.md`。

### 2.2 什么能跑

- `npm run dev` 启动前后端（前端 5173 + 后端 3001）
- V7 工作台布局：AppShell（CSS Grid：48px 顶栏 + 56px 侧栏 + 主画布 + 可拖拽右栏 280-480px + 28px 状态栏）
- 工作区创建/删除/切换/导入/导出（后端 API）
- 时间轴画布：事件卡片、轨道分组、缩放、拖拽排序
- 时间轴标尺、垂直网格线、当前时间指示器、底部水平滚动条
- 鼠标滚轮控制时间轴水平滚动
- 事件 CRUD（新建/编辑/删除），支持角色/世界观/伏笔/事件关联
- AI 上下文注入 + @引用
- AI 配置面板：提供商选择/API Key 输入/模型选择
- 国产 AI 提供商一键配置：DeepSeek、Kimi、MiniMax、智谱 GLM
- 命令面板（Ctrl+K）：搜索事件/角色/世界观/伏笔/轨道
- 2 主题切换（素纸亮色 / 墨黑暗色）+ View Transitions API 圆形扩散切换
- 专注模式（小黑屋）：全屏写作环境
- 字数统计与日更目标（底部状态栏）
- 角色关系图：D3.js 力导向图
- 事件关联可视化：贝塞尔曲线连线
- 撤销/重做框架（historyStore + useHistoryManager，⚠️ V7 后断链，见 P0-6）
- 前端自动保存框架（⚠️ V7 后未接入 StatusBar，见 P3-8）
- 后端 REST API + 核心实体输入验证
- AI 代理服务（流式/非流式 + 自动降级模拟）

### 2.3 什么不能跑 / 待完成

⚠️ **V7 重构遗留的 P0 阻塞性问题**（详见 `前端问题识别与修复任务.md`）：

- MainCanvas 只渲染 timeline 视图，其他 5 个视图（outline/narrative/gantt/statistics/relationship）全是占位符
- ContextPanel 大部分面板是占位符（properties/characters/worldview/foreshadowing/connections）
- EventEditorDialog 完全未接入（用户无法编辑事件详情）
- TopToolbar "新建事件" 和 "保存" 按钮无功能
- scrollToEvent 功能断链（命令面板点击搜索结果时时间轴不滚动）
- undo/redo 功能完全断链（历史栈永远为空）
- handleSave 是假保存（只 toast 不实际保存）

**其他待完成**（详见 `开发路线图.md`）：

- 38 个残留旧文件需清理（P1）
- 动画系统双轨：animejs（31 处 import）与 framer-motion 并存，需迁移后移除 animejs
- 双 store 并存：旧 store（appStore/panelStore/themeStore 等）与新域 store（useWorkspaceStore/useTimelineStore/useUIStore/useThemeStore）需统一
- 导入/导出 UI 对话框
- 崩溃恢复 UI
- 键盘快捷键注册表与设置
- 新手引导
- 情节密度热力图（统计视图）
- 多视图时间轴（事序图/地铁图/叙事视图等）
- 自定义日历/时间系统
- 一致性检查（吃书检测）
- 电子地图/空间管理
- 单元测试与集成测试

---

## 3. 技术栈与关键约定

### 3.1 核心技术选型

| 技术 | 版本 | 为什么选它 |
|------|------|-----------|
| React 18 | 18.x | ⚠️ V7 重构后确认是 React 18，非 19 |
| Vite 6 | 最新 | 快速 HMR, ESM 原生 |
| Tailwind CSS **v4** | 4.x | ⚠️ v4 不是 v3！使用 @tailwindcss/vite 插件，@theme CSS-first 语法，RGB 通道格式 CSS 变量 |
| Zustand 5 | 5.x | 替代 useReducer，轻量无 boilerplate |
| @tanstack/react-query 5 | 5.x | 服务端状态管理，缓存+后台刷新 |
| **Framer Motion** 11 | 11.x | ⚠️ V7 重构后唯一动画引擎，替代 anime.js |
| **shadcn/ui** | new-york | ⚠️ V7 重构后已集成，18 个基础组件，位于 `src/components/ui/` |
| **react-markdown** + remark-gfm | 10.x | V7 新增，AI 对话 Markdown 渲染 |
| D3 7 | 7.x | 角色关系图力导向图 |
| Fastify 5 | 5.x | 替代 Express，更好的性能和 schema 验证 |
| Drizzle ORM | latest | 类型安全 ORM，SQLite dialect |
| better-sqlite3 | latest | 同步 API，WAL 模式 |
| Electron 42 | latest | 桌面端打包 |

> ⚠️ **anime.js v4 仍残留在 package.json 中**（31 处 import），V7 重构后应迁移到 Framer Motion 并移除。详见 `前端问题识别与修复任务.md` P3-6、P4-1。

### 3.2 编码约定

**模块系统：** 项目 `"type": "module"`，全 ESM。import 路径必须带 `.js` 后缀。不要用 `require()`。

**路径别名：** `@/*` → `./src/*`（前端），`@server/*` → `./server/*`（后端）。

**API 模式：** 统一响应格式 `{ success: boolean, data?: T, error?: { code, message } }`。

**状态分层（V7 重构后）：**
- 服务端数据 → React Query hooks (`api-hooks.ts`)
- 客户端 UI 状态 → 4 个域 store：
  - `useWorkspaceStore` — currentWorkspaceId
  - `useTimelineStore` — viewMode（6 种含 relationship）/zoom/selectedEventId/scrollToEventId
  - `useUIStore` — activePanel/panelWidth/focusMode/commandPaletteOpen
  - `useThemeStore` — 2 主题（light/dark）+ View Transitions API
- 历史栈 → `historyStore`（⚠️ V7 后断链，需重新实现 useHistoryManager）
- 两者不重叠

> ⚠️ **新旧 store 并存**：旧 store（appStore/panelStore/themeStore/contextMenuStore/pomodoroStore）仍存在但无活跃引用，待迁移完所有组件后删除。详见 `前端问题识别与修复任务.md` P1-1、P3。

**动画：** V7 重构后只用 Framer Motion 11，不要用 anime.js（待迁移的旧组件除外）。不要用 CSS @keyframes 做复杂动画。

**样式：** 只用 Tailwind v4 工具类 + CSS 变量（2 主题系统），不写独立 CSS 文件。基础 UI 组件优先使用 shadcn/ui（`src/components/ui/`）。

**主题系统：** 2 主题（素纸亮色 light / 墨黑暗色 dark），通过 `[data-theme="light|dark"]` 切换。CSS 变量使用 RGB 通道格式（如 `--background: 250 247 242`），配合 Tailwind 的 `rgb(var(--background))` 使用。**不要再添加新主题或视觉模式**。

### 3.3 数据库约定

- SQLite WAL 模式，外键启用，5 秒 busy timeout
- 所有 ID 使用 UUID (text 类型)
- 时间戳使用 integer (mode: 'timestamp')
- JSON 字段用 text 存储（如 tagsJson, traitsJson, settingsJson）
- 所有 workspaceId 列建索引
- 外键 onDelete: cascade（events.trackId 为 set null）
- **环境分离**：开发用 `./data/dev.db`，生产用 `userData/timeline.db`

---

## 4. 关键文件速查表

### 4.1 V7 重构后的核心文件（最常修改）

| 文件 | 作用 | 修改场景 |
|------|------|----------|
| `src/components/layout/AppShell.tsx` | V7 工作台布局核心（CSS Grid） | 修改布局结构、接入新视图 |
| `src/components/layout/TopToolbar.tsx` | 顶部工具栏 | 添加工具按钮、接入功能 |
| `src/components/layout/SideNav.tsx` | 左侧图标导航 | 添加导航入口 |
| `src/components/layout/ContextPanel.tsx` | 右侧上下文面板 | 接入面板组件 |
| `src/components/layout/StatusBar.tsx` | 底部状态栏 | 接入保存状态、字数统计 |
| `src/components/timeline/TimelineView.tsx` | 时间轴视图（V7 新） | 时间轴功能扩展 |
| `src/components/timeline/TimelineCanvas.tsx` | 时间轴画布 | 订阅 scrollToEventId、拖拽逻辑 |
| `src/components/ai-panel/AIPanel.tsx` | AI 面板（V7 新） | AI 对话功能 |
| `src/components/workspace/WorkspaceSelector.tsx` | 工作区选择器（V7 新） | 工作区切换 |
| `src/components/command-palette/CommandPalette.tsx` | 命令面板（V7 新） | 命令注册 |
| `src/components/relationship-graph/RelationshipView.tsx` | 角色关系图视图（V7 新，已用新 store） | 关系图扩展 |
| `src/stores/useWorkspaceStore.ts` | 工作区域 store | 工作区状态 |
| `src/stores/useTimelineStore.ts` | 时间轴域 store | viewMode/zoom/selectedEventId |
| `src/stores/useUIStore.ts` | UI 域 store | activePanel/panelWidth/focusMode |
| `src/stores/useThemeStore.ts` | 主题域 store | 2 主题切换 |
| `src/stores/historyStore.ts` | 撤销/重做历史栈 | 扩展历史记录类型 |
| `src/index.css` | Tailwind v4 @theme 设计令牌 + 2 主题 CSS 变量 | 修改设计令牌 |
| `src/services/api-hooks.ts` | React Query hooks | 添加新实体的 CRUD hooks |
| `src/lib/timeline.ts` | 时间轴计算工具 | 修改刻度、事件位置计算 |
| `server/routes/*.ts` | 后端 API 路由 | 添加新端点或修改逻辑 |
| `server/lib/validation.ts` | 后端 JSON Schema 验证 | 添加或修改验证规则 |
| `shared/types.ts` | 前后端共享类型 | 添加新数据类型或修改字段 |

### 4.2 shadcn/ui 组件（V7 新增，18 个基础组件）

位于 `src/components/ui/`，包括：button、input、dialog、dropdown-menu、select、tabs、tooltip、popover、command、scroll-area、separator、label、switch、checkbox、slider、badge、card、sheet 等。

使用方式：`import { Button } from '@/components/ui/button'`

### 4.3 不要随意修改的文件

| 文件 | 原因 |
|------|------|
| `server/db/schema.ts` | 修改需要配套 Drizzle 迁移 |
| `server/db/index.ts` | 数据库初始化逻辑，改动可能影响启动 |
| `electron/main.ts` | Electron 主进程（单实例锁、ESM file:// URL），需要特殊测试环境 |
| `vite.config.ts` | 构建配置，改动需要验证整个构建链 |
| `components.json` | shadcn/ui 配置（new-york 风格），改动影响组件生成 |
| `src/index.css` 的 `@theme` 块 | 设计令牌定义，改动影响全局视觉 |

---

## 5. 已知陷阱（踩坑记录）

### 5.1 ESM/CJS 混淆

整个项目是纯 ESM (`"type": "module"`)。如果你引入新的 npm 包：
- 确认它支持 ESM，或者用 `import()` 动态导入
- better-sqlite3 是 CJS 包，但 Drizzle ORM 封装后可以在 ESM 中使用
- Electron main.ts 中动态 `import()` Fastify 服务器就是为了避免 ESM/CJS 冲突，使用 file:// URL 加载

### 5.2 新旧 store 并存（V7 重构后最大陷阱）

V7 重构引入了 4 个新域 store，但旧 store 仍存在：
- **新 store**（活跃）：`useWorkspaceStore` / `useTimelineStore` / `useUIStore` / `useThemeStore`
- **旧 store**（待删除）：`appStore` / `panelStore` / `themeStore` / `contextMenuStore` / `pomodoroStore`

**陷阱**：
- 旧 `themeStore` 有 13 主题 + visualMode，新 `useThemeStore` 只有 2 主题（light/dark）
- 旧 `appStore` 的 viewMode 用 'stats'，新 `useTimelineStore` 用 'statistics' 且有 'relationship'
- 旧 `panelStore` 的 PanelType 用 'worldbuilding'，新 `useUIStore` 用 'worldview'
- 旧 `appStore` 有 enterFocusMode(target)/exitFocusMode()，新 `useUIStore` 只有 toggleFocusMode()

**规则**：新代码一律用新 store。迁移旧组件时，把对旧 store 的引用改为新 store。

### 5.3 动画系统双轨（V7 重构后）

V7 重构选定 Framer Motion 11 作为唯一动画引擎，但旧组件中仍有 31 处 anime.js import：
- **新代码**：只用 Framer Motion（`import { motion, AnimatePresence } from 'framer-motion'`）
- **待迁移组件**：仍用 anime.js v4，迁移时改为 Framer Motion
- **迁移完成后**：移除 package.json 中的 animejs 依赖

**Framer Motion 基本用法**：
```tsx
import { motion, AnimatePresence } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  内容
</motion.div>
```

### 5.4 Tailwind CSS v4 配置

v4 与 v3 配置完全不同：
- 没有 `tailwind.config.js`，配置在 CSS 中用 `@theme` 语法
- 通过 `@tailwindcss/vite` 插件集成，不是 PostCSS 插件
- 自定义值用 CSS 变量而非 JS 配置
- CSS 变量使用 RGB 通道格式（如 `--background: 250 247 242`）
- 参考 `src/index.css` 中的 `@theme` 块和 `[data-theme="light|dark"]` 选择器

### 5.5 shadcn/ui 已集成（V7 重构后）

V7 重构后 shadcn/ui **已集成**（new-york 风格，18 个基础组件位于 `src/components/ui/`）。旧文档中"未集成"的标注已过时。

配置文件：`components.json`。添加新组件：`npx shadcn@latest add <component>`

### 5.6 撤销重做 ID 保留

为了支持 delete 的 undo 能保留原实体 ID，后端 create 路由已支持传入可选 `id` 字段。若 ID 已存在会返回 409 CONFLICT。前端 `useHistoryManager` 在 undo delete 时会传入原 ID。

> ⚠️ V7 重构后 useHistoryManager 是死代码，需重新实现并挂载到 AppShell。详见 `前端问题识别与修复任务.md` P0-6。

### 5.7 自动保存状态

自动保存状态使用全局变量 + 订阅者模式（非 React state），以便在 `useAutoSave` 外部也能读取状态。`AutoSaveStatus.tsx` 通过 `subscribeAutoSave` 订阅变化。

> ⚠️ V7 重构后 AutoSaveStatus 未接入 StatusBar，StatusBar 中"已保存"是硬编码。详见 `前端问题识别与修复任务.md` P3-8。

### 5.8 clsx / tailwind-merge

这两个包已添加到 package.json 的直接依赖中（之前仅靠传递依赖）。如果 `npm install` 报错，运行 `npm install clsx tailwind-merge` 重新安装。

### 5.9 环境分离（V7 重构后）

- **开发环境**：数据库位于 `./data/dev.db`（项目根目录）
- **生产环境**：数据库位于 `userData/timeline.db`（Electron 用户数据目录）
- 通过 `NODE_ENV` 环境变量区分

---

## 6. 开发工作流

### 6.1 日常开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发环境（前端 5173 + 后端 3001 同时启动）
npm run dev

# 3. 浏览器访问 http://localhost:5173
# 4. 后端 API 文档: http://localhost:3001/api/health

# 其他命令
npm run build          # 构建前端
npm run build:server   # 构建后端
npm run build:electron # 构建 Electron
npm run dist           # 打包分发
```

### 6.2 添加新功能的标准流程

1. **如果需要新数据类型：** 先在 `shared/types.ts` 中定义类型
2. **如果需要新数据库表：** 在 `server/db/schema.ts` 添加表定义，然后 `npm run db:generate` 生成迁移
3. **如果需要新 API：** 在 `server/routes/` 中添加路由文件，在 `server/index.ts` 中注册
4. **添加前端 hooks：** 在 `src/services/api-hooks.ts` 中添加 React Query hooks
5. **创建组件：** 在 `src/components/` 对应子目录中创建组件
6. **如果需要新全局状态：** 在对应域 store 中添加（useWorkspaceStore / useTimelineStore / useUIStore / useThemeStore）
7. **如果需要新 UI 组件：** 优先用 shadcn/ui（`npx shadcn@latest add <component>`），位于 `src/components/ui/`
8. **如果需要动画：** 用 Framer Motion，不要用 anime.js

### 6.3 接入视图到 MainCanvas

参考 V7 重构后的 MainCanvas 结构（`src/components/layout/AppShell.tsx`）：

```
1. 确保视图组件已迁移到新 store（useTimelineStore/useWorkspaceStore 等）
2. 在 AppShell.tsx 的 MainCanvas 中，对应 viewMode 分支渲染视图组件
3. 如果视图组件仍用旧 store，先迁移：
   - useAppStore → useWorkspaceStore / useUIStore
   - themeStore → useThemeStore
   - panelStore → useUIStore
   - anime.js → Framer Motion
```

### 6.4 接入面板到 ContextPanel

参考 V7 重构后的 ContextPanel 结构（`src/components/layout/ContextPanel.tsx`）：

```
1. 确保面板组件已迁移到新 store
2. 在 ContextPanel.tsx 的 getPanelContent 中，对应 panelType 分支渲染面板组件
3. 如果需要从 SideNav 进入，在 SideNav.tsx 中添加导航入口
```

### 6.5 添加撤销重做记录的流程

⚠️ V7 重构后 useHistoryManager 需重新实现。完成后，如果要让某个面板操作支持撤销/重做：

```ts
import { pushHistoryRecord } from '@/lib/history.js';

// 更新操作：推送 before/after
pushHistoryRecord({
  workspaceId,
  entityType: 'character',
  action: 'update',
  entityId: char.id,
  data: { name: oldName }, // 变更前的字段
  meta: { after: { name: newName } }, // 变更后的字段
});

// 删除操作：推送完整实体
pushHistoryRecord({
  workspaceId,
  entityType: 'character',
  action: 'delete',
  entityId: char.id,
  data: char as unknown as Record<string, unknown>,
});

// 创建操作：在 mutation 成功后推送结果
const result = await createCharacter.mutateAsync({ workspaceId, data });
pushHistoryRecord({
  workspaceId,
  entityType: 'character',
  action: 'create',
  entityId: result.id,
  data: result as unknown as Record<string, unknown>,
});
```

然后在 `src/components/history/useHistoryManager.tsx` 中确保该实体类型的反向操作已实现（create/update/delete 三种）。

### 6.6 添加后端验证的流程

在 `server/lib/validation.ts` 中定义 schema，然后在路由中引用：

```ts
import { workspaceIdParam, createXBody, updateXBody, xIdParam } from '../lib/validation.js';

app.post<{ Params: {...}; Body: CreateXRequest }>('/', {
  schema: { params: workspaceIdParam, body: createXBody },
}, async (request, reply) => { ... });
```

---

## 7. 文档索引

### 7.1 项目根目录文档

| 文件 | 内容 | 阅读优先级 |
|------|------|-----------|
| `AI开发完整交接手册.md` | 本文件 | ★★★ 首先阅读 |
| `前端问题识别与修复任务.md` | V7 重构后遗留问题清单（P0-P4） | ★★★ 开工前必读 |
| `架构与代码地图.md` | 系统架构、组件树、ER 图、API 表、数据流图 | ★★★ |
| `开发路线图.md` | P0-P3 优先级任务清单 | ★★★ |
| `项目状态报告.md` | 完成度评估 | ★★★ |
| `README.md` | 快速启动 + V7 重构后的关键事实 | ★★☆ |
| `AI接手开发指南.md` | 代码导航、常见陷阱 | ★★☆ |
| `功能需求规格.md` | 各功能模块完整需求 | ★★☆ |
| `前端设计方案.md` | 视觉设计、色彩系统、动画规格 | ★★☆ |
| `浏览器兼容性测试清单.md` | 跨浏览器/分辨率测试范围 | ★★☆ |
| `可用资源参考.md` | 可用库和组件资源 | ★☆☆ |
| `文档变更日志.md` | 文档审计与修订记录 | ★☆☆ |

### 7.2 Spec 目录

| 目录 | 内容 | 参考价值 |
|------|------|----------|
| `.trae/specs/rebuild-v7/` | **V7 全面重构 spec（5 阶段 17 任务）** | ★★★ 权威来源 |
| `.trae/specs/build-frontend-v4/` | V4 前端重建 spec | 中（部分标记与实际不符） |
| `.trae/specs/rebuild-backend-v4/` | V4 后端重建 spec | 高（后端实现参考） |
| `.trae/specs/polish-frontend-cinematic/` | 电影级视觉打磨 spec | 中（V7 后视觉模式已移除） |
| `.trae/specs/audit-backend-fix/` | 后端审计修复 spec | 中（已修复问题的记录） |
| `.trae/specs/refine-frontend-ux/` | 前端 UX 精修 spec | 中（未开始的待办任务） |

---

## 8. 给下一个 AI 的建议

### 8.1 第一天应该做什么

1. **先读 `前端问题识别与修复任务.md`**：了解 V7 重构后的 7 个 P0 阻塞性问题和 38 个待清理文件
2. 运行 `npm install && npm run dev`，在浏览器中实际操作一遍，验证 P0 问题
3. 阅读本交接手册和 `开发路线图.md`
4. 从 P0 第一批任务开始（按修复优先级）：
   - 接入 RelationshipView 到 MainCanvas（最简单，已用新 store）
   - 迁移并接入 EventEditorDialog 到 ContextPanel
   - 迁移并接入 5 个面板（characters/worldview/foreshadowing/connections/consistency）
   - 迁移并接入 4 个视图（outline/narrative/gantt/statistics）
   - TopToolbar 新建/保存按钮接入功能
   - TimelineCanvas 订阅 scrollToEventId
   - 重新实现 useHistoryManager 并挂载到 AppShell
   - handleSave 调用实际保存 API

### 8.2 开发策略建议

- **先修复 P0 阻塞性问题**：这是 V7 重构后的首要任务，不修复则核心功能不可用
- **迁移组件时遵循统一模式**：旧 store → 新 store，anime.js → Framer Motion
- **一个功能一个功能地做**：每迁移一个组件就形成模板，后续可批量推进
- **保持小步提交**：每个组件的迁移是一个独立的 commit
- **修改后端时同步更新验证**：如果新增字段，记得更新 `server/lib/validation.ts`
- **P0 修复完成后清理 P1**：删除 38 个残留旧文件，移除 animejs 依赖

### 8.3 不要做什么

- **不要信任 .trae/specs 中的旧完成标记**：build-frontend-v4 的 tasks.md 标记约 20 个组件为完成，但它们不存在
- **不要引入新的动画库**：项目已选定 Framer Motion 11，不要混用 anime.js（迁移中除外）或 GSAP
- **不要修改数据库 schema 而不生成迁移**：用 `npm run db:generate` 生成迁移文件
- **不要用 CSS @keyframes 替代 Framer Motion**：项目明确选择了 Framer Motion 作为动画方案
- **不要在不看 `前端设计方案.md` 的情况下写样式**：色彩系统、间距网格、动画规格都在那里定义
- **不要添加新主题或视觉模式**：V7 重构后只有 2 主题（light/dark），无视觉模式
- **不要使用旧 store**：新代码一律用新域 store（useWorkspaceStore/useTimelineStore/useUIStore/useThemeStore）

### 8.4 测试策略

当前零测试覆盖。如果要开始写测试：
- 后端用 Fastify 的 `app.inject()` 做 API 测试，不需要 supertest
- 前端 store 用 Zustand 的测试模式
- 前端组件用 @testing-library/react
- vitest 已在 devDependencies 中，直接写 `.test.ts` / `.test.tsx` 即可

---

## 9. 项目独特之处

这个项目与普通 CRUD 应用的最大区别在于它的**视觉设计野心**与**网文创作专注**。`前端设计方案.md` 定义了"如纸般沉浸"的设计哲学、2 主题氛围（素纸亮色 / 墨黑暗色）、Framer Motion 动效体系。

V7 重构后，设计系统已简化为 2 主题 + 专注模式，移除了旧的 12 主题 + 3 视觉模式（cinematic/balanced/minimal）。这意味着开发不只是"让功能跑起来"，还需要关注动画节奏、色彩和谐、交互反馈的精致程度，但不再需要为多主题/多视觉模式做适配。

---

## 10. V7 全面重构记录（2026-06-17）

### 10.1 重构概述

V7 对项目进行了全面重构（5 阶段 17 任务），重点在于建立新骨架：
- 新布局：AppShell + TopToolbar + SideNav + ContextPanel + StatusBar
- 新状态管理：4 个域 store（useWorkspaceStore / useTimelineStore / useUIStore / useThemeStore）
- 新组件：TimelineView / AIPanel / WorkspaceSelector / CommandPalette / RelationshipGraph
- 新设计系统：2 主题（素纸亮色 / 墨黑暗色）+ 专注模式
- 新动画引擎：Framer Motion 11 替代 anime.js
- 新组件库：shadcn/ui（new-york 风格，18 个基础组件）

此次重构没有改变数据库 schema 或后端 API 结构，主要变更集中在前端架构层。

### 10.2 重构阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 基础设施修复（环境分离、Tailwind v4 @theme、shadcn/ui 集成） | ✅ 完成 |
| Phase 2 | 设计系统重写（2 主题 + 专注模式，移除 12 主题 + 3 视觉模式） | ✅ 完成 |
| Phase 3 | 前端架构重写（AppShell + 4 域 store + 新组件） | ✅ 完成 |
| Phase 4 | 新增功能（CommandPalette、RelationshipGraph、AI Panel） | ✅ 完成 |
| Phase 5 | 测试验证 | ✅ 完成 |

### 10.3 变更内容

**新增布局组件：**
- `AppShell`：V7 工作台布局核心（CSS Grid：48px 顶栏 + 56px 侧栏 + 主画布 + 可拖拽右栏 280-480px + 28px 状态栏）
- `TopToolbar`：顶部工具栏
- `SideNav`：左侧图标导航
- `ContextPanel`：右侧上下文面板
- `StatusBar`：底部状态栏

**新增域 Store（4 个）：**
- `useWorkspaceStore`：currentWorkspaceId
- `useTimelineStore`：viewMode（6 种含 relationship）/zoom/selectedEventId/scrollToEventId
- `useUIStore`：activePanel/panelWidth/focusMode/commandPaletteOpen
- `useThemeStore`：2 主题（light/dark）+ View Transitions API

**新增功能组件：**
- `TimelineView`：时间轴视图（V7 新）
- `AIPanel`：AI 面板（V7 新）
- `WorkspaceSelector`：工作区选择器（V7 新）
- `CommandPalette`：命令面板（V7 新，Ctrl+K）
- `RelationshipView`：角色关系图视图（V7 新，已用新 store + d3）

**新增设计系统：**
- 2 主题（素纸亮色 light / 墨黑暗色 dark），通过 `[data-theme]` 切换
- CSS 变量使用 RGB 通道格式
- 移除 12 主题 + 3 视觉模式（cinematic/balanced/minimal）
- shadcn/ui（new-york 风格，18 个基础组件）

**新增动画引擎：**
- Framer Motion 11 替代 anime.js（旧组件迁移中）

### 10.4 V7 重构遗留问题

⚠️ **V7 重构是"新骨架"搭建，新布局/状态/组件已就位，但大量旧代码残留，新骨架与旧功能面板未完全对接。**

完整问题清单详见 `前端问题识别与修复任务.md`，摘要：

- **P0 阻塞性问题（7 个）**：MainCanvas 只渲染 timeline 视图、ContextPanel 大部分面板是占位符、EventEditorDialog 未接入、TopToolbar 按钮无功能、scrollToEvent 断链、undo/redo 断链、handleSave 假保存
- **P1 残留旧代码（38 个文件）**：旧 store、旧布局组件、旧时间轴视图、旧效果组件、旧主题组件、旧功能组件、旧 Hook 和 Lib
- **P2 未接入功能**：5 个视图未接入 MainCanvas、6 个面板未接入 ContextPanel
- **P3 一致性问题**：双 store 并存、双 ViewMode 定义冲突、双 PanelType 定义冲突、动画系统双轨、StatusBar 硬编码
- **P4 依赖问题**：animejs 应移除、@types/d3 位置不当、d3-force 可能冗余

---

## 11. 竞品调研结论（2026-06-16）

### 11.1 市场定位

本项目是**唯一同时具备专业时间轴 + 中文原生 + AI 集成**的工具。国产网文工具（橙瓜、百灵、墨者）聚焦写作生产力，缺少时间轴功能。Aeon Timeline 功能最强但无中文支持、价格高、无 AI。

### 11.2 竞品对比

| 工具 | 时间轴功能 | 中文支持 | AI 集成 | 价格 |
|------|-----------|---------|---------|------|
| Aeon Timeline | ★★★★★ 最佳 | ❌ | ❌ | $68/年 |
| 云岸写作 | ★★★☆☆ 基础 | ✅ 原生 | ❌ | 免费 |
| 橙瓜码字 | ★☆☆☆☆ 仅大纲 | ✅ 原生 | ❌ | 免费+付费 |
| 百灵创作 | ☆☆☆☆☆ 无 | ✅ 原生 | ❌ | 免费+付费 |
| 墨者写作 | ★★☆☆☆ 文本大纲 | ✅ 原生 | 基础 | 免费 |
| **本项目** | ★★★☆☆ 中等 | ✅ 原生 | ✅ 深度 | 开源 |

### 11.3 差异化优势

1. 唯一中文原生专业时间轴
2. AI 深度集成（上下文注入 + @引用 + 国产 AI 一键配置）
3. 网文特色功能（取名生成器、小黑屋、日更目标）
4. 伏笔全生命周期追踪

### 11.4 需追赶的竞品特色

1. 多视图时间轴（Aeon Timeline 的 7 种视图）
2. 自定义日历系统（Aeon Timeline）
3. 叙事顺序 vs 时间顺序分离（Aeon Timeline Narrative 视图）
4. 一致性检查/吃书检测（唐库 Agent）
5. 电子地图（云岸写作）

---

> **本手册版本**: v3.0
> **最后更新**: 2026-06-17 (V7 全面重构完成，反映新骨架与遗留问题)
> **下次更新触发条件**: P0 阻塞性问题修复完成后 / 重大架构变更时
