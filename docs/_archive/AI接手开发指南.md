# Storyloom · 絮织 — AI 接手开发指南

> **🚦 v1.2 起请优先阅读**：[`接手开发指南 v1.2-roadmap-backend-and-frontend.md`](./接手开发指南%20v1.2-roadmap-backend-and-frontend.md)。该指南整合了"路线图后端开发任务清单 + 已知前端缺陷与重设大方向 + docs 大清洗"。本文件保留为代码导航 / 状态管理 / 构建陷阱 / 6 主题等"通用开发参考"，新接手者请先读 v1.2 指南再回到本文件查"怎么做"。
>
> **🗑 v1.2 已删除的过期文档**：`AI开发完整交接手册.md` / `项目状态报告.md` / `UI-UX 走查记录 v1.0.1.md` / `浏览器兼容性测试清单.md` / `功能差距与改进方向.md` / `功能需求规格.md` / `开发路线图.md` 与 `docs/screenshots/v1.0.1-uiux-walkthrough/`。这些文档曾经覆盖的内容点已并入 v1.2 指南 §6 归档。
>
> **🆕 项目改名（v1.1.4）**：`AI Timeline Creator` → `Timeline Creator`（过渡） → **`Storyloom · 絮织`**。Storyloom 双关 Story（故事）+ Loom（织机），与多轨道时间轴的"经纬"隐喻天然契合。`appId` 与 GitHub 仓库 URL 暂保留以维持已发布客户端的自动更新链路。
>
> **🎨 核心定位（v1.1.4 起）**：「**视觉小说编剧的上游工作台**」。剧本（带分支） + 立绘 + 背景 CG + 对话 + 选项五要素一体化；最终**导出到 WebGAL / Ren'Py 等主流引擎可消费的格式**；未来内置试玩预览。**用户上传自己的图，不做 AI 图生成；不做引擎本身，做引擎的上游**。
>
> **🗺 长期路线图（精简版）**：参见 [`docs/超长期开发路线图 v1.1.0+.md`](./超长期开发路线图%20v1.1.0%2B.md)。聚焦 8 件事：**视觉对标 51mazi / 图片资产能力（头像/立绘/场景图） / 剧本编辑器（Beat-by-Beat） / 分支地图 / 地图功能 / 导入导出（含 WebGAL 导出） / 操作历史·时光机 / 内置试玩预览**。
>
> **🎨 视觉 AI 路径**：本 AI 没有视觉功能，**视觉对标必须由下一位有视觉能力的 AI 来做**。详见 [`视觉 AI 接手指南.md`](./视觉%20AI%20接手指南.md)。运行 `npm run test:visual` 在真实浏览器中点击与截图。
>
> **上一个 AI 已完成的工作索引**
>
> - 版本：`v1.1.0`（已发布为 GitHub Release Latest，`package.json` 已升级到 1.1.0）
> - 主题：v1.0.0 正式版发布，前端重构完成，旧版 v4.2.0/v4.2.1 已撤回归档。
> - v1.0.1 修复内容（已完成）：
>   - `src/main.tsx` — 添加 `tdesign-react/es/_util/react-19-adapter`，修复 `reactRender is not a function` pageerror
>   - `src/components/timeline/CreateTrackDialog.tsx` / `src/components/events/EventEditorDialog.tsx` — 修复提交成功后不关闭对话框、重复创建轨道/事件的问题
>   - `src/components/characters/CharacterPanel.tsx` / `src/components/worldbuilding/WorldBuildingPanel.tsx` / `src/components/foreshadowing/ForeshadowingPanel.tsx` / `src/components/workspace/CreateWorkspaceDialog.tsx` — 统一添加提交中禁用与成功关闭逻辑
>   - `src/services/api-hooks.ts` — 为 `useUpdateEvent` 添加乐观更新，修复大纲视图快速编辑后标题未即时刷新
>   - `src/components/workspace/WorkspaceCard.tsx` — 对全 `?`/空名称和描述显示兜底文案
>   - `server/routes/workspaces.ts` — 增加 name/description 输入校验，拒绝空串/纯空白/全问号
>   - `scripts/cleanup_garbled_workspaces.js` — 清理数据库中 name/description 全为 `?` 的残留工作区
> - 测试结论：`npm run typecheck` 通过，`npm run build` 通过。
> - GitHub Release：[`v1.0.0`](https://github.com/YJLZSL/AI-Timeline-Creator/releases/tag/v1.0.0) 已发布；`v4.2.0` / `v4.2.1` 已标记为 prerelease 并附加撤回说明。
> - 当前状态：**v1.1.0 已发布完成**。GitHub Release v1.1.0 为 Latest，v1.0.0/v1.0.1 已标记为 prerelease。安装包 `AI-Timeline-Creator-Setup-1.1.0.exe`（119.2 MB）已上传，含 `latest.yml` 与 `.blockmap`，自动更新链路已闭环。下一阶段方向：**前端功能更新进化**（视图打磨 / 创作辅助 / 交互动效 / 无障碍 / 偏好设置），辅以 i18n 全量翻译、Vitest 覆盖率到 30%、GitHub Actions CI、自动更新真实回归。**不再做 macOS / Linux 跨平台构建**，当前阶段聚焦 Windows 桌面端 + 前端体验深耕。详情见 [`视觉 AI 接手指南.md`](./视觉%20AI%20接手指南.md)。
>
> **交接重点**：
> 1. 当前 `docs/全面测试报告 v1.0.0.md` 记录的是修复前的问题；修复后需重新运行 `scripts/comprehensive_v1_0_0_test.py` 生成新报告，并改名为 `docs/测试报告 v1.0.1.md`。
> 2. `scripts/comprehensive_v1_0_0_test.py` 目前支持 Chromium/Firefox/WebKit，但在脚本内部启动前后端时容易因终端输出管道阻塞；建议后续改为外部手动启动服务后再运行脚本，或进一步完善进程管理。
> 3. 数据库中乱码数据已清理，但生产环境若存在旧数据，可考虑在应用启动时自动运行 `scripts/cleanup_garbled_workspaces.js` 类似的清理逻辑。

> **⚠️ 构建必读：构建产物必须输出到仓库目录之外。**
>
> Windows 下仓库根目录会被 IDE / OneDrive / Windows Indexer / 防病毒 同时监听，
> `release/` 或 `win-unpacked/` 一旦落到仓库内，下次 `npm run dist` 就会卡在
> `EBUSY: resource busy or locked, unlink ... app.asar`。打包前请先：
>
> ```powershell
> $env:ATC_DIST_DIR = "D:\AIKFCC\AI-Timeline-Creator-dist\4.1.0"
> npm run dist
> ```
>
> 详见 [`构建与发布指引.md`](./构建与发布指引.md)（含 asar extract 解锁方案）。

> **项目**: Storyloom · 絮织（前身：AI Timeline Creator）
> **编写日期**: 2026-06-18
> **目标读者**: 下一位接手此项目的 AI 开发助手
> **文档性质**: 实用操作手册，如实反映项目状态
> **文档版本**: v3.2（v1.0.1 已发布）

---

## ⚠️ 阅读前必读（项目状态说明）

项目已于 2026-06-18 发布 **v1.0.1 稳定修复版**（取代 v1.0.0），核心功能闭环且修复了一系列 v1.0.0 中发现的 P0 问题：
- 修复 TDesign React 与 React 19 不兼容导致的 `reactRender is not a function` pageerror
- 修复新建轨道/事件/角色/世界观/伏笔/工作区对话框提交后不关闭、导致重复创建的问题
- 清理数据库中 name/description 全为 `?` 的残留工作区，并在服务端/UI 层增加兜底校验
- 为大纲视图快速编辑添加乐观更新，使标题修改即时生效

**v1.0.1 已完成的发布动作**：
1. ✅ `package.json` 版本号已升级到 `1.0.1`
2. ✅ Playwright Python 已升级到 1.60，chromium-headless-shell 1223 已安装
3. ✅ `npm run dist` 已产出 `AI Timeline Creator Setup 1.0.1.exe`（118.8 MB）
4. ✅ GitHub Release v1.0.1 已发布为 Latest，v1.0.0 已标记为 prerelease
5. ✅ README.md、变更日志、测试报告 v1.0.1、UI/UX 走查记录均已同步

**v1.1.0 后的下一阶段方向**（核心：**前端功能更新进化**，详细路线图见 [`视觉 AI 接手指南.md`](./视觉%20AI%20接手指南.md#5-下一阶段路线图按推荐优先级)）：
- **前端功能进化（核心使命）**：视图打磨（时间轴/大纲/甘特/关系图/统计）、创作辅助（AI 助手、面板搜索、空状态插画）、交互动效（View Transitions、framer-motion）、无障碍与响应式细节、偏好设置页
- i18n 全量翻译（panel/空状态/占位符）
- Vitest 覆盖率到 30%
- GitHub Actions CI（自动 typecheck/test 与 release 发布）
- 自动更新真实回归测试

**不再列入计划**：macOS / Linux 构建（当前阶段聚焦 Windows + 前端体验深耕）。

旧版 v4.2.0 / v4.2.1 已撤回归档，v1.0.0 / v1.0.1 已标记为 prerelease。

---

## 1. 项目现状总览

### 1.1 一句话总结

项目已发布 **v1.0.1 稳定修复版**（GitHub Release Latest），前端架构重构、6 主题切换、卡片化视图全部就绪，TDesign React 19 兼容、对话框防重复提交、大纲乐观更新、数据库乱码兜底等 P0 问题已修复。后续可继续聚焦 UI 精致度、跨浏览器兼容、单元测试覆盖与多语言支持。

### 1.2 骨架搭建变更

| 项目 | 骨架搭建前 | 骨架搭建后 |
|------|-----------|-----------|
| 主题系统 | 12 主题 + 3 视觉模式 | **6 主题（洛圣/子夜/森林/水墨/高对比/跟随系统）+ 专注模式** |
| 组件库 | 未集成 | **shadcn/ui 完整集成（18 个基础组件）** |
| 状态管理 | 3 个旧 store（appStore/themeStore/panelStore）| **5 个域 store（useWorkspaceStore/useTimelineStore/useUIStore/useThemeStore/useViewStore）** |
| 动画引擎 | anime.js v4 | **Framer Motion 11**（animejs 已完全移除）|
| 布局 | TimelineLayout + SidePanelShell | **AppShell 工作台布局（顶部标签导航 + 分组侧边栏 + 卡片化视图）** |
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
| 完整打包 (`npm run dist`) | 可用 | electron-builder --win，v1.0.1 已产出 118.8 MB exe |
| 多工作区管理 | 可用 | 创建/删除/切换 + 模板选择；v1.0.1 已增加空串/全问号校验 |
| 时间轴视图 | 可用 | 重写：绝对像素定位、SVG 连线、拖拽改时长；v1.0.1 已修复新建轨道/事件重复创建 |
| AI 面板 | 可用 | 重写：textarea + Markdown + 对话管理 + 后端代理 |
| 命令面板（Ctrl+K） | 可用 | 新增：搜索 + 命令执行 |
| 快捷键系统 | 可用 | 升级：when 上下文 + 跨平台 Mod 映射 + 设置面板 |
| 6 主题切换 | 可用 | 重写：洛圣/子夜/森林/水墨/高对比/跟随系统 + View Transitions API |
| 专注模式 | 可用 | 实现：useUIStore.focusMode |
| 关系图谱 | 可用 | RelationshipView 已用新 store，已接入 MainCanvas |
| 故事模板库 | 可用 | 新增：5 个模板，新建工作区时选择 |
| 多浏览器 E2E 测试 | 部分可用 | Chromium 全面通过；Firefox/WebKit binaries 已安装但未深度跑 |

### 1.4 视图与面板接入状态（原 骨架搭建遗留占位符已全部接入）

| 功能 | 状态 | 说明 |
|------|------|------|
| 大纲视图 | 已接入 | MainCanvas 中 outline 视图已渲染 OutlineView |
| 叙事视图 | 已接入 | MainCanvas 中 narrative 视图已渲染 NarrativeView |
| 甘特视图 | 已接入 | MainCanvas 中 gantt 视图已渲染 GanttTimelineView |
| 统计视图 | 已接入 | MainCanvas 中 statistics 视图已渲染 StatsView |
| 关系图谱视图 | 已接入 | MainCanvas 中 relationship 视图已渲染 RelationshipView |
| 事件编辑器 | 已接入 | ContextPanel 中 event-editor 已渲染 EventEditorDialog，双击事件卡可打开 |
| 角色管理 | 已接入 | ContextPanel 中 characters 已渲染 CharacterPanel |
| 世界观设定 | 已接入 | ContextPanel 中 worldview 已渲染 WorldBuildingPanel |
| 伏笔追踪 | 已接入 | ContextPanel 中 foreshadowing 已渲染 ForeshadowingPanel |
| 事件关联 | 已接入 | ContextPanel 中 connections 已渲染 ConnectionPanel |
| 一致性检查 | 已接入 | ContextPanel 中 consistency 已渲染 ConsistencyPanel |

### 1.5 已修复的 P0 问题与剩余限制

> 以下 P0 问题均已修复（2026-06-17）：
> - 新建事件：TopToolbar "新建事件"按钮已调用 `ctx.createEvent`（原 P0-4）
> - 保存：TopToolbar "保存"按钮已调用 `ctx.save`（后端 auto-save API，原 P0-4/P0-7）
> - 编辑事件：EventEditorDialog 已接入，双击事件卡可打开（原 P0-3）
> - undo/redo：`handleUndo`/`handleRedo` 已根据 HistoryRecord 调用反向 API（原 P0-6）
> - 命令面板滚动定位：TimelineCanvas 已订阅 `scrollToEventId`（原 P0-5）

剩余限制（未修复）：

| 问题 | 说明 |
|------|------|
| 无 i18n | 所有 UI 文本硬编码中文 |
| 无测试 | 无单元测试或 E2E 测试 |

---

## 2. 关键代码导航

### 2.1 状态管理

项目使用 **Zustand** 进行状态管理，v1.0.0 按域拆分为 5 个 store（推荐使用）+ historyStore：

| Store | 文件 | 职责 |
|-------|------|------|
| useWorkspaceStore | `src/stores/useWorkspaceStore.ts` | 当前工作区 ID（persist 持久化）|
| useViewStore | `src/stores/useViewStore.ts` | 当前激活视图（timeline/outline/narrative/gantt/tree/statistics/relationship）|
| useTimelineStore | `src/stores/useTimelineStore.ts` | 缩放、选中事件/角色、scrollToEventId |
| useUIStore | `src/stores/useUIStore.ts` | 活动面板(activePanel)、面板宽度(280-480)、专注模式、命令面板开关 |
| useThemeStore | `src/stores/useThemeStore.ts` | 6 主题切换（luosheng/midnight/forest/ink-wash/contrast/system）+ View Transitions API |
| historyStore | `src/stores/historyStore.ts` | 撤销/重做历史栈 |

**旧 store 已全部删除：**
- ~~`appStore.ts`~~ — 旧主 store（已删除）
- ~~`panelStore.ts`~~ — 旧面板 store（已删除）
- ~~`themeStore.ts`~~ — 旧主题 store（13 主题 + visualMode，已删除）
- ~~`contextMenuStore.ts`~~ — 旧上下文菜单 store（已删除）
- ~~`pomodoroStore.ts`~~ — 旧番茄 store（已删除）

> ✅ **重要**：新代码必须使用 5 个域 store。旧 store 已全部删除，无需迁移。

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
| `server/routes/workspaces.ts` | 工作区 CRUD + 导出/导入端点（修复导入策略 + eventWorldSettings）|
| `server/routes/events.ts` | 事件 CRUD + 分页/过滤/搜索/排序 + 批量操作 + 角色关联（修复 validateWorkspace + escapeLike）|
| `server/routes/tracks.ts` | 轨道 CRUD |
| `server/routes/characters.ts` | 角色 CRUD |
| `server/routes/world-settings.ts` | 世界观设定 CRUD |
| `server/routes/foreshadowings.ts` | 伏笔 CRUD |
| `server/routes/connections.ts` | 事件关联 CRUD |
| `server/routes/ai.ts` | AI 对话端点（流式 SSE + 非流式 + 连接测试，修复 AbortController + close 事件）|

**服务层** `server/services/`：

| 文件 | 职责 |
|------|------|
| `server/services/ai-proxy.ts` | AI 提供商配置、连接测试、流式/非流式 chat completion、无 Key 时模拟降级（添加 degraded/error 字段）|
| `server/services/auto-save.ts` | 工作区快照创建/清理、SQLite 数据库备份、崩溃恢复检测、从快照还原全量数据（补全 eventWorldSettings）|

### 2.4 动画系统

**骨架搭建后动画引擎为 Framer Motion 11**（替代 anime.js）：

| 场景 | 技术 | 示例 |
|------|------|------|
| 事件卡片悬浮 | Framer Motion | `whileHover={{ y: -2 }}` |
| 面板过渡 | Framer Motion | `motion.div` + `AnimatePresence` |
| 工作区入场 | Framer Motion | 声明式动画 |
| 模态框/对话框 | Framer Motion | scale + opacity 弹性过渡 |
| hover/focus 微交互 | CSS transitions | 统一 duration/easing 令牌 |

> ✅ animejs 已完全移除：`package.json` 中无 animejs 依赖，所有组件已迁移到 Framer Motion。新代码必须使用 Framer Motion。

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

### 3.1 Store 使用规范（旧 store 已删除）

旧 store 已全部删除，新代码必须使用 5 个域 store：

| 新 Store（必须用） | 职责 |
|--------------------|--------------------|
| `useWorkspaceStore.ts` 的 `currentWorkspaceId` | 当前工作区 ID |
| `useViewStore.ts` 的 `activeView` | 视图模式（含 'tree'） |
| `useTimelineStore.ts` 的 `zoom` / `selectedEventId` / `scrollToEventId` | 时间轴缩放与选中状态 |
| `useUIStore.ts` 的 `toggleFocusMode` | 专注模式 |
| `useThemeStore.ts`（6 主题 luosheng/midnight/forest/ink-wash/contrast/system）| 主题切换 |
| `useUIStore.ts` 的 `activePanel`（'worldview'，含 'properties'/'event-editor'）| 活动面板 |

> ✅ 旧 store（appStore/panelStore/themeStore/contextMenuStore/pomodoroStore）已全部删除，无需迁移。

### 3.2 动画引擎（animejs 已移除）

`package.json` 中 animejs 依赖已完全移除，所有组件已迁移到 Framer Motion。新代码必须使用 Framer Motion，不要引入 animejs。

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
- 6 主题通过 `:root`（洛圣默认）和 `[data-theme="..."]` 选择器定义，`.dark` 类用于 midnight/contrast 暗色主题

### 3.6 shadcn/ui 已集成

骨架搭建后 shadcn/ui 已完整集成：
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

- **总入口**：详见 [接手开发指南 v1.2-roadmap-backend-and-frontend.md](./接手开发指南%20v1.2-roadmap-backend-and-frontend.md)（v1.2 起的统一入口）
- **路线图**：详见 [超长期开发路线图 v1.1.0+.md](./超长期开发路线图%20v1.1.0+.md)
- **代码定位**：详见 [架构与代码地图](./架构与代码地图.md)
- **视觉对标 / 前端缺陷**：详见 [视觉 AI 接手指南.md](./视觉%20AI%20接手指南.md)

## 6. 功能需求

详见 [接手开发指南 v1.2 §2](./接手开发指南%20v1.2-roadmap-backend-and-frontend.md) 的后端任务清单与 [超长期开发路线图 v1.1.0+.md §1](./超长期开发路线图%20v1.1.0+.md) 的视觉小说能力定义。原 `功能需求规格.md` 已删除（v1.1.4 之前定位过期）。

## 7. 可用资源

详见 [可用资源参考](./可用资源参考.md)。

重点提示：
- **shadcn/ui 已完整集成**（骨架搭建后）：18 个基础组件在 `src/components/ui/`，new-york 风格
- **Framer Motion 11 已集成**（骨架搭建后）：替代 anime.js，新代码必须使用
- **D3 7 已集成**（骨架搭建后）：用于关系图谱力导向布局
- **react-markdown + remark-gfm 已集成**（骨架搭建后）：用于 AI 回复 Markdown 渲染
- 当前图标为 **lucide-react**（已集成）
- TDesign React / IconPark 未安装，需要时 `npm i tdesign-react @icon-park/react`
