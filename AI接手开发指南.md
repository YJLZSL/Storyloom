# AI 接手开发指南

> **项目**: AI Timeline Creator V4.0
> **编写日期**: 2026-06-17
> **目标读者**: 下一位接手此项目的 AI 开发助手
> **文档性质**: 实用操作手册，如实反映项目状态
> **文档版本**: v2.0（V7 重构后）

---

## ⚠️ 阅读前必读（V7 重构后状态）

项目刚完成 **V7 全面重构**（5 阶段 17 任务），重构聚焦"新骨架"搭建：
- 新布局：AppShell + TopToolbar + SideNav + ContextPanel + StatusBar
- 新状态管理：useWorkspaceStore / useTimelineStore / useUIStore / useThemeStore
- 新组件：TimelineView / AIPanel / WorkspaceSelector / CommandPalette / RelationshipGraph
- 新设计系统：2 主题（素纸亮色/墨黑暗色）+ shadcn/ui（18 个基础组件）
- 新动画引擎：Framer Motion 11（替代 anime.js）

但大量旧代码残留，新骨架与旧功能面板未对接，导致功能断链。**接手者必须先阅读 [前端问题识别与修复任务](./前端问题识别与修复任务.md)**，了解当前已知问题（P0-P4）。

---

## 1. 项目现状总览

### 1.1 一句话总结

项目处于 **V7 重构遗留问题修复阶段**。新骨架（布局/状态管理/设计系统/核心组件）已搭建完成，但旧功能面板未对接到新骨架，导致 MainCanvas 仅渲染 timeline 视图、ContextPanel 大部分面板是占位符。

### 1.2 V7 重构变更

| 项目 | V7 重构前 | V7 重构后 |
|------|-----------|-----------|
| 主题系统 | 12 主题 + 3 视觉模式 | **2 主题（素纸亮色/墨黑暗色）+ 专注模式** |
| 组件库 | 未集成 | **shadcn/ui 完整集成（18 个基础组件）** |
| 状态管理 | 3 个旧 store（appStore/themeStore/panelStore）| **4 个域 store（useWorkspaceStore/useTimelineStore/useUIStore/useThemeStore）** |
| 动画引擎 | anime.js v4 | **Framer Motion 11**（animejs 依赖待移除）|
| 布局 | TimelineLayout + SidePanelShell | **AppShell 工作台布局（CSS Grid）** |
| 时间轴 | 相对定位 | **绝对像素定位 + SVG 连线 + 虚拟滚动** |
| AI 面板 | 直连 API | **textarea + Markdown + 对话管理 + 后端代理** |
| 搜索 | SearchDialog | **CommandPalette（Ctrl+K，搜索+命令）** |
| Markdown | 无 | **react-markdown + remark-gfm** |
| 图表 | 无 | **D3 7（关系图谱力导向布局）** |
| 环境 | 单一 | **开发/生产分离（dev.db vs userData/timeline.db）** |

### 1.3 什么能用

| 功能 | 状态 | 备注 |
|------|------|------|
| Web 开发模式 (`npm run dev`) | 可用 | 前端 5173 + 后端 3001 |
| 前端构建 (`npm run build`) | 可用 | TypeScript + Vite |
| 后端构建 (`npm run build:server`) | 可用 | TS 编译到 dist-server/ |
| Electron 构建 (`npm run build:electron`) | 可用 | TS 编译到 electron-out/ |
| 完整打包 (`npm run dist`) | 可用 | electron-builder --win |
| 多工作区管理 | 可用 | 创建/删除/切换 + 模板选择 |
| 时间轴视图 | 可用 | V7 重写：绝对像素定位、SVG 连线、拖拽改时长 |
| AI 面板 | 可用 | V7 重写：textarea + Markdown + 对话管理 + 后端代理 |
| 命令面板（Ctrl+K） | 可用 | V7 新增：搜索 + 命令执行 |
| 快捷键系统 | 可用 | V7 升级：when 上下文 + 跨平台 Mod 映射 + 设置面板 |
| 2 主题切换 | 可用 | V7 重写：素纸亮色/墨黑暗色 + View Transitions API |
| 专注模式 | 可用 | V7 实现：useUIStore.focusMode |
| 关系图谱 | 已实现但未接入 | RelationshipView 已用新 store，待接入 MainCanvas |
| 故事模板库 | 可用 | V7 新增：5 个模板，新建工作区时选择 |

### 1.4 什么是占位符（V7 重构遗留）

| 功能 | 状态 | 说明 |
|------|------|------|
| 大纲视图 | 占位符 | MainCanvas 中 outline 视图是占位符，OutlineView 需迁移到新 store |
| 叙事视图 | 占位符 | MainCanvas 中 narrative 视图是占位符，NarrativeView 需迁移 |
| 甘特视图 | 占位符 | MainCanvas 中 gantt 视图是占位符，GanttTimelineView 需迁移 |
| 统计视图 | 占位符 | MainCanvas 中 statistics 视图是占位符，StatsView 需迁移 |
| 关系图谱视图 | 占位符 | MainCanvas 中 relationship 视图是占位符，RelationshipView 已用新 store可直接接入 |
| 事件编辑器 | 占位符 | ContextPanel 中 event-editor 是占位符，EventEditorDialog 需迁移 |
| 角色管理 | 占位符 | ContextPanel 中 characters 是占位符，CharacterPanel 需迁移 |
| 世界观设定 | 占位符 | ContextPanel 中 worldview 是占位符，WorldBuildingPanel 需迁移 |
| 伏笔追踪 | 占位符 | ContextPanel 中 foreshadowing 是占位符，ForeshadowingPanel 需迁移 |
| 事件关联 | 占位符 | ContextPanel 中 connections 是占位符，ConnectionPanel 需迁移 |
| 一致性检查 | 占位符 | ContextPanel 中 consistency 是占位符，ConsistencyPanel 需迁移 |

### 1.5 什么不能做

| 问题 | 说明 |
|------|------|
| 新建事件 | TopToolbar "新建事件"按钮无 onClick（P0-4）|
| 保存 | TopToolbar "保存"按钮无 onClick，handleSave 是假保存（P0-4/P0-7）|
| 编辑事件 | EventEditorDialog 完全未接入（P0-3）|
| undo/redo | useHistoryManager 是死代码，历史栈永远为空（P0-6）|
| 命令面板滚动定位 | TimelineCanvas 未订阅 scrollToEventId（P0-5）|
| 无 i18n | 所有 UI 文本硬编码中文 |
| 无测试 | 无单元测试或 E2E 测试 |

---

## 2. 关键代码导航

### 2.1 状态管理

项目使用 **Zustand** 进行状态管理，V7 重构后按域拆分为 4 个 store（推荐使用）+ historyStore：

| Store | 文件 | 职责 |
|-------|------|------|
| useWorkspaceStore | `src/stores/useWorkspaceStore.ts` | 当前工作区 ID（persist 持久化）|
| useTimelineStore | `src/stores/useTimelineStore.ts` | 视图模式(timeline/outline/narrative/gantt/statistics/relationship)、缩放、选中事件/角色、scrollToEventId |
| useUIStore | `src/stores/useUIStore.ts` | 活动面板(activePanel)、面板宽度(280-480)、专注模式、命令面板开关 |
| useThemeStore | `src/stores/useThemeStore.ts` | 2 主题(light/dark)切换 + View Transitions API |
| historyStore | `src/stores/historyStore.ts` | 撤销/重做历史栈 |

**旧 store（仍存在但无活跃引用，待清理）：**
- `appStore.ts` — 旧主 store
- `panelStore.ts` — 旧面板 store
- `themeStore.ts` — 旧主题 store（13 主题 + visualMode）
- `contextMenuStore.ts` — 旧上下文菜单 store
- `pomodoroStore.ts` — 旧番茄 store

> ⚠️ **重要**：新代码必须使用 4 个域 store，不要使用旧 store。迁移旧组件时，第一步就是把旧 store 引用改为新 store。

### 2.2 数据请求

使用 **@tanstack/react-query** 进行数据请求，hooks 在 `src/services/api-hooks.ts`。底层 fetch 封装在 `src/services/api.ts`：

| Hook | 职责 |
|------|------|
| `useWorkspaces` / `useWorkspace` | 工作区列表 / 单个工作区 |
| `useCreateWorkspace` / `useUpdateWorkspace` / `useDeleteWorkspace` | 工作区增删改 |
| `useEvents` / `useEvent` | 事件列表 / 单个事件 |
| `useCreateEvent` / `useUpdateEvent` / `useDeleteEvent` | 事件增删改 |
| `useTracks` / `useCreateTrack` | 轨道列表 / 创建轨道 |
| `useCharacters` / `useCreateCharacter` | 角色列表 / 创建角色 |
| `useConnections` | 事件关联列表 |
| `useForeshadowings` | 伏笔列表 |
| `useWorldSettings` | 世界观设定列表 |
| `useExportWorkspace` | 导出工作区（JSON） |
| `useCreateAutoSave` / `useLatestAutoSave` | 自动保存 |

### 2.3 后端架构

**Fastify 5** + **SQLite** (better-sqlite3 + drizzle-orm)。请求路径形如 `/api/workspaces/:workspaceId/events`。

**路由层** `server/routes/`（8 组）：

| 文件 | 职责 |
|------|------|
| `server/index.ts` | 服务器入口，注册路由、CORS（按环境）、压缩、静态资源、插件 |
| `server/routes/workspaces.ts` | 工作区 CRUD + 导出/导入端点（V7 修复导入策略 + eventWorldSettings）|
| `server/routes/events.ts` | 事件 CRUD + 分页/过滤/搜索/排序 + 批量操作 + 角色关联（V7 修复 validateWorkspace + escapeLike）|
| `server/routes/tracks.ts` | 轨道 CRUD |
| `server/routes/characters.ts` | 角色 CRUD |
| `server/routes/world-settings.ts` | 世界观设定 CRUD |
| `server/routes/foreshadowings.ts` | 伏笔 CRUD |
| `server/routes/connections.ts` | 事件关联 CRUD |
| `server/routes/ai.ts` | AI 对话端点（流式 SSE + 非流式 + 连接测试，V7 修复 AbortController + close 事件）|

**服务层** `server/services/`：

| 文件 | 职责 |
|------|------|
| `server/services/ai-proxy.ts` | AI 提供商配置、连接测试、流式/非流式 chat completion、无 Key 时模拟降级（V7 添加 degraded/error 字段）|
| `server/services/auto-save.ts` | 工作区快照创建/清理、SQLite 数据库备份、崩溃恢复检测、从快照还原全量数据（V7 补全 eventWorldSettings）|

### 2.4 动画系统

**V7 重构后动画引擎为 Framer Motion 11**（替代 anime.js）：

| 场景 | 技术 | 示例 |
|------|------|------|
| 事件卡片悬浮 | Framer Motion | `whileHover={{ y: -2 }}` |
| 面板过渡 | Framer Motion | `motion.div` + `AnimatePresence` |
| 工作区入场 | Framer Motion | 声明式动画 |
| 模态框/对话框 | Framer Motion | scale + opacity 弹性过渡 |
| hover/focus 微交互 | CSS transitions | 统一 duration/easing 令牌 |

> ⚠️ **V7 重构遗留**：`package.json` 中 animejs 依赖仍存在，部分旧组件仍 import animejs（31 处），待迁移到 Framer Motion 后移除。新代码必须使用 Framer Motion，不要使用 animejs。

### 2.5 关键文件速查

| 要做什么 | 看哪个文件 |
|----------|-----------|
| 修改主题颜色 | `src/index.css` 搜索 `:root`（亮色）和 `.dark`（暗色）|
| 修改全局 UI 状态 | `src/stores/useUIStore.ts` |
| 修改工作区状态 | `src/stores/useWorkspaceStore.ts` |
| 修改时间轴视图状态 | `src/stores/useTimelineStore.ts` |
| 修改主题状态 | `src/stores/useThemeStore.ts` |
| 修改工作台布局 | `src/components/layout/AppShell.tsx` |
| 修改顶栏 | `src/components/layout/TopToolbar.tsx` |
| 修改侧栏 | `src/components/layout/SideNav.tsx` |
| 修改右栏面板 | `src/components/layout/ContextPanel.tsx` |
| 修改状态栏 | `src/components/layout/StatusBar.tsx` |
| 修改时间轴画布 | `src/components/timeline/TimelineCanvas.tsx` |
| 修改事件编辑器 | `src/components/events/EventEditorDialog.tsx` |
| 修改 AI 面板 | `src/components/ai-panel/AIPanel.tsx` |
| 修改命令面板 | `src/components/command-palette/CommandPalette.tsx` |
| 修改关系图谱 | `src/components/relationship-graph/RelationshipGraph.tsx` |
| 修改故事模板 | `src/lib/story-templates.ts` |
| 修改快捷键 | `src/lib/shortcut-registry.ts` |
| 修改后端路由 | `server/routes/*.ts` |
| 修改数据库 schema | `server/db/schema.ts` |
| 修改 API hooks | `src/services/api-hooks.ts` |

---

## 3. 常见陷阱

### 3.1 新旧 Store 并存（V7 重构后最大陷阱）

项目存在新旧两套 store，新代码必须使用新 store：

| 旧 Store（不要用） | 新 Store（必须用） |
|--------------------|--------------------|
| `appStore.ts` 的 `currentWorkspaceId` | `useWorkspaceStore.ts` 的 `currentWorkspaceId` |
| `appStore.ts` 的 `viewMode`（'stats'，无 'relationship'）| `useTimelineStore.ts` 的 `viewMode`（'statistics'，有 'relationship'）|
| `appStore.ts` 的 `enterFocusMode`/`exitFocusMode` | `useUIStore.ts` 的 `toggleFocusMode` |
| `themeStore.ts`（13 主题 + visualMode）| `useThemeStore.ts`（2 主题 light/dark）|
| `panelStore.ts`（'worldbuilding'）| `useUIStore.ts` 的 `activePanel`（'worldview'，含 'properties'/'event-editor'）|

迁移旧组件时，第一步就是把旧 store 引用改为新 store。

### 3.2 animejs 残留（V7 重构后第二大陷阱）

`package.json` 中 animejs 依赖仍存在（`"animejs": "^4.4.1"`），部分旧组件仍 import animejs（31 处）。新代码必须使用 Framer Motion，不要使用 animejs。迁移旧组件时，把 animejs 调用改为 Framer Motion。

### 3.3 ESM/CJS 模块系统

- 根 `package.json` 有 `"type": "module"`，不可删除
- Electron 主进程通过 `path.join(app.getAppPath(), 'dist-server', 'server', 'index.js')` 动态 import（ESM file:// URL）
- better-sqlite3 是 CJS 包，但 Drizzle ORM 封装后可以在 ESM 中使用

### 3.4 React Hooks 规则

- 所有 Hooks 必须在组件顶层无条件调用，不能在 `if (!open) return null;` 之后调用
- EventEditorDialog 曾因 `useCallback` 在条件返回后调用导致 Hooks 错误

### 3.5 Tailwind CSS v4 配置

v4 与 v3 配置完全不同：
- 没有 `tailwind.config.js`，配置在 CSS 中用 `@theme` 语法
- 通过 `@tailwindcss/vite` 插件集成，不是 PostCSS 插件
- CSS 变量使用 RGB 通道格式（如 `--card: 250 248 245`），通过 `rgb(var(--card))` 或 `rgba(var(--card), 0.7)` 引用
- 2 主题通过 `:root`（亮色）和 `.dark`（暗色）选择器定义

### 3.6 shadcn/ui 已集成

V7 重构后 shadcn/ui 已完整集成：
- `src/components/ui/` 目录存在，含 18 个基础组件
- `components.json` 配置为 new-york 风格
- 基于 `@radix-ui/*` + `class-variance-authority` + `tailwind-merge` + `clsx`
- 新组件优先使用 shadcn/ui，不要自研基础 UI 组件

### 3.7 数据库

- 开发环境：`./data/dev.db`
- 生产环境：`app.getPath('userData')/timeline.db`
- Drizzle ORM 的 schema 定义在 `server/db/schema.ts`
- 迁移 SQL 在 `drizzle/` 目录

### 3.8 ViewMode/PanelType 定义冲突

- 旧 ViewMode：'stats'，无 'relationship'
- 新 ViewMode：'statistics'，有 'relationship'
- 旧 PanelType：'worldbuilding'
- 新 PanelType：'worldview'，新增 'properties'/'event-editor'
- 迁移旧组件时，必须使用新定义

---

## 4. 构建与发布

```bash
# 开发
npm run dev              # 前端(5173) + 后端(3001) 联合开发（concurrently）
npm run dev:web          # 仅前端（无后端，API 调用会失败）
npm run dev:server       # 仅后端（tsx watch）
npm run dev:electron     # Electron 开发模式（加载 localhost:5173）

# 构建
npm run build            # tsc -b 类型检查 + vite build 前端构建
npm run build:server     # 后端 TS 编译到 dist-server/
npm run build:electron   # Electron 主进程 TS 编译到 electron-out/

# 完整打包
npm run dist             # 前端+后端+Electron+electron-builder --win

# 类型检查
npm run typecheck        # tsc -b --noEmit

# 数据库
npm run db:generate      # drizzle-kit 生成迁移 SQL
npm run db:migrate       # drizzle-kit 执行迁移
npm run db:studio        # drizzle-kit studio（可视化数据库）
```

> 开发环境数据库位于 `data/dev.db`，生产环境数据库位于 `app.getPath('userData')/timeline.db`，迁移 SQL 在 `drizzle/`，备份在 `data/backups/`。

---

## 5. 开发方向建议

- **任务优先级**：详见 [开发路线图](./开发路线图.md)（V7 重构遗留 P0→P3 排序）
- **完成度评估**：详见 [项目状态报告](./项目状态报告.md)
- **代码定位**：详见 [架构与代码地图](./架构与代码地图.md)
- **遗留问题**：详见 [前端问题识别与修复任务](./前端问题识别与修复任务.md)（P0-P4 问题清单）

## 6. 功能需求

详见 [功能需求规格](./功能需求规格.md)。

## 7. 可用资源

详见 [可用资源参考](./可用资源参考.md)。

重点提示：
- **shadcn/ui 已完整集成**（V7 重构后）：18 个基础组件在 `src/components/ui/`，new-york 风格
- **Framer Motion 11 已集成**（V7 重构后）：替代 anime.js，新代码必须使用
- **D3 7 已集成**（V7 重构后）：用于关系图谱力导向布局
- **react-markdown + remark-gfm 已集成**（V7 重构后）：用于 AI 回复 Markdown 渲染
- 当前图标为 **lucide-react**（已集成）
- TDesign React / IconPark 未安装，需要时 `npm i tdesign-react @icon-park/react`
