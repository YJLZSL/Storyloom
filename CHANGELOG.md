# Changelog

> Format inspired by [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/).
> Storyloom 自 v3.0.0 起采用语义化版本（SemVer），更早版本号（v4.x → v1.x → v2.x）为历史实验记录，
> v3.0.1 起 GitHub Releases 列表只保留当前最新版（旧版本仍可通过 git tag 回溯，不再以 Release 形式陈列）。
> **v1.0.0 是全面重构后的正式版本，代表 Storyloom 进入稳定阶段。**

## [1.0.0] — 2026-06-20

**全面前端重构 + 设计系统统一 + 教程大全。**

### 设计系统重构
- **统一组件库**：全面迁移到 TDesign React，消除 3 套弹窗（Radix Dialog / TDesign Dialog / 手写 `bg-black/30`）、3 套按钮（shadcn Button / TButton / 原生 `<button>`）、3 套输入框（shadcn Input / TInput / 原生 `<input>`）的混用
- **集中调色板**：新建 `src/lib/colors.ts`，统一轨道 8 色、连线 7 色、关系图 3 色、伏笔 4 色等 68 处硬编码颜色
- **图标统一**：14 个文件的 lucide-react 图标全部迁移到 `@icon-park/react`（`@/lib/icons.ts` 统一登记）
- **新增共享组件**：`EmptyState`（统一空状态）、`LoadingState`（统一加载态）、`SettingsRow`（统一设置行）

### 主题与样式完善
- **动态主题预览**：`ThemeSelector.tsx` 预览色改为从 `lib/colors.ts` 动态生成，消除与 `index.css` 的 3 处重复维护
- **sonner 主题同步**：`sonner.tsx` 传入 `theme` 读 `useThemeStore` 解析值，替代跟随 `prefers-color-scheme`
- **SideNav 暗色修复**：`useDarkMode` MutationObserver 改为读 `useThemeStore`，兼容非 midnight/contrast 的暗色主题
- **CSS 优化**：删除死令牌 `--theme-radius`，补全局 `::selection` 选区配色和 `:focus-visible` 聚焦环
- **AboutTab 完善**：用 `getUserDataPath` IPC 读取真实用户数据路径，替代硬编码 `~/.storyloom`

### 面板与布局优化
- **弹窗统一**：`CharacterPanel` / `WorldBuildingPanel` / `AIConfigPanel` 的 5 处手写 `bg-black/30` z-40 模态全部替换为 TDesign Dialog
- **工作区对话框**：`CreateWorkspaceDialog` / `ExportDialog` / `ImportDialog` / `CreateTrackDialog` 的原生 button/input 全部替换为 TDesign 组件
- **事件编辑器**：`EventEditorDialog.tsx` 的 10 色硬编码调色板迁移到 `lib/colors.ts`，lucide 图标迁移到 icon-park
- **时间轴颜色**：`TimelineTrack` / `TimelineConnections` / `TreeTimelineView` 硬编码颜色全部迁移到 `lib/colors.ts`
- **关系图/伏笔**：`RelationshipGraph` / `RelationshipView` / `ForeshadowingGraph` / `StatsView` / `ConsistencyPanel` 颜色迁移

### 新增教程（13 篇）
- `docs/tutorials/getting-started.md` — 入门指南
- `docs/tutorials/workspace.md` — 工作区管理
- `docs/tutorials/timeline-view.md` — 时间轴视图详解
- `docs/tutorials/outline-view.md` — 大纲视图
- `docs/tutorials/tree-view.md` — 树状视图
- `docs/tutorials/relationship-graph.md` — 关系图
- `docs/tutorials/command-palette.md` — 命令面板
- `docs/tutorials/themes-and-focus.md` — 主题与专注模式
- `docs/tutorials/ai-panel.md` — AI 助手面板
- `docs/tutorials/shortcuts.md` — 快捷键大全
- `docs/tutorials/script-editor.md` — 剧本编辑器
- `docs/tutorials/auto-backup-and-export-webgal.md` — 自动备份与 WebGAL 导出
- `docs/tutorials/branch-map.md` — 分支地图

### 新增 IPC
- `electron/preload.ts` 暴露 `getUserDataPath` API
- `electron/main.ts` 注册 `get-user-data-path` handler，返回 `app.getPath('userData')`
- `src/types/electron.d.ts` 补充类型声明

[v1.0.0 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v1.0.0)

## [3.0.4] — 2026-06-20

Hotfix：修复 v3.0.3 打包版预加载脚本崩溃导致渲染层无法访问 Electron API 与更新功能。
- **根因**：v3.0.3 在 `electron/preload.ts` 中 `import { app }` 以读取 `app.isPackaged`，但 `app` 是主进程 API，在预加载脚本的渲染上下文中 `electron` 模块并不导出 `app`，导致 `SyntaxError: The requested module 'electron' does not provide an export named 'app'`，整个预加载脚本加载失败。结果是 `window.electronAPI` 与 `window.updater` 均未暴露——渲染层 API 基址回退为空（`/api/*` 全部 404），且更新 Tab/自动检查全部失效。
- **修复**：预加载脚本不再 import `app`；`isPackaged` 改由同步 IPC 获取（`ipcRenderer.sendSync('updater:is-packaged')`），主进程在启动早期注册 `ipcMain.on('updater:is-packaged')` 返回 `app.isPackaged`。
- v3.0.3 因该缺陷已撤回（Release 删除，git tag 保留以作记录），请升级至 v3.0.4。

[v3.0.4 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.4)

## [3.0.3] — 2026-06-20

补齐设置页"自动更新"入口 + v3.0.2 收尾清理。
- **新增设置「更新」Tab**：此前 electron-updater 后端已就绪但设置页无任何更新入口。新增 `UpdateTab.tsx`，含当前版本展示、「启动时自动检查更新」开关、「检查更新」按钮、更新状态机（检查中 / 已是最新 / 发现新版本+发布说明 / 下载进度 / 下载完成重启安装 / 错误）、下载与安装按钮。
- **新增「启动时自动检查更新」偏好**：持久化到 `useSettingsStore`（默认开启），自动检查触发点从主进程迁移到渲染层 `UpdateNotifier`，受该开关与 `isPackaged` 共同控制。
- **抽离共享类型**：新增 `src/types/electron.d.ts` 集中声明 `window.updater` / `window.electronAPI`（含 `isPackaged`），移除 `UpdateNotifier.tsx` / `api.ts` 内联重复声明；preload 暴露 `isPackaged` 供渲染层判断更新可用性。
- **修复错误仓库 URL**：`UpdateNotifier` 硬编码的 `YJLZSL/2026-06-19` / `AI-Timeline-Creator` 统一修正为 `YJLZSL/Storyloom`。
- **修复版本来源不一致**：`EmptyShell` 不再回退到过时的 `3.0.1`，统一从 `package.json` 取版本。
- **避免重复弹窗**：设置弹窗打开时，`UpdateNotifier` 跳过 `available`/`downloaded` 被动弹窗，由 UpdateTab 承接。
- **清理孤儿依赖**：移除 6 个已无消费者的 npm 依赖（`@radix-ui/react-checkbox/select/slider/switch/tabs` + `cmdk`）。
- **文档收尾**：修复 `docs/audit/redundancy.md` 死链、`code-smells.md` 旧品牌路径链接、handoff P3 数量笔误。

[v3.0.3 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.3)

## [3.0.2] — 2026-06-20

修复生产环境数据库迁移静默失败 + Tailwind v4 色彩变量兼容 + 死代码清理。
- **修复迁移失败**：`server/db/index.ts` 重写 `runMigrations()` 为 4 层 fallback（标准 drizzle migrate → 手动读取 journal + SQL 文件直接 exec → readMigrationFiles API → 硬编码 CREATE TABLE IF NOT EXISTS DDL），确保 Electron asar 内 CJK 路径下全部 21 张表 + 44 个索引正确创建。
- **修复 Dialog 背景透明**：`src/index.css` @theme 块添加 `--color-*` 别名桥接 Tailwind v4 命名空间（`bg-background` / `text-foreground` / `border-border` 等 utility class 现在正确解析）。
- **增强错误处理**：`initDatabase()` 迁移失败时抛错中断启动（不再静默继续），并验证 workspaces/events/tracks 三张核心表必须存在。
- **扩展列兼容**：`ensureSchemaCompatibility()` 从仅覆盖 3 张表扩展到约 20 张表（含 v1.2 VN 模型全部列）。
- **清理死代码**：删除 9 个从未被 import 的文件（CalendarConfigDialog.tsx + 8 个未用 shadcn ui 组件）+ 移除 `safeJsonObject` 未用导出。
- 全程 `[migration]` 结构化日志，失败步骤自动降级并在 app.log 中可见。

[v3.0.2 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.2)

## [3.0.1] — 2026-06-20

Hotfix：解决 v2.x → v3.x 老库覆盖升级"无法新建工作区"+ 首启 logo 破图。
- 修复服务器 5xx 错误在 prod 下完全静默：error-handler 加 `console.error('[5xx]', ...)` 兜底，附带 `error.code`；Electron 桌面端默认开 fastify logger。
- 补 v2.x 老库缺列兜底：`runMigrations()` 内 try/catch ENOENT，再跑 `ensureSchemaCompatibility()` 对 workspaces / tracks / events 三张主表做 PRAGMA + ALTER TABLE 幂等补列。
- 修首启 logo 破碎：`EmptyShell` 改用 `import faviconUrl from '/favicon.svg?url'`；`index.html` 把 `/xxx` 改为 `./xxx`，让 Electron `file://` 能解析。
- 关于 Drawer 加「查看日志」按钮：`shell.showItemInFolder(app.getPath('userData')/app.log)`，便于用户反馈。
- toast 服务器错误附 `error.code`（如 `服务器内部错误 (SQLITE_ERROR)`）。
- GitHub Releases 列表清空：撤回所有 v1.x / v2.x / v3.0.0 / v4.x 共 9 个旧 release（git tag 不动），重新发布 v3.0.1 作为唯一干净 release。

[v3.0.1 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.1)

## [3.0.0] — 2026-06-20

仓库整理 & 首启体验大修。
- 修复"无法新建工作区"：CreateWorkspaceDialog 的吞错 catch 改为显式 toast；applying 状态在 finally 复位。
- 修复首启 UX 错乱：抽出 `EmptyShell` 极简空布局，无工作区时不再渲染 TopToolbar/SideNav/StatusBar。
- 文档大清洗：22 份历史 spec、8 份历史 handoff、15 份历史 docs/*.md 全部归档至 `_archive/`，仅保留主线四份参考文档（README / ARCHITECTURE / DEVELOPMENT / RELEASING）。
- GitHub Releases 整理：v4.0.0 / v4.1.0 / v4.2.1 / v1.0.0 / v1.0.1 / v1.1.0 / v2.0.0 / v2.0.1 八个老 release 加 `[ARCHIVED]` 前缀。
- 自动更新链路保留：`appId` 仍为 `com.ai.timeline-creator`，v2.0.2 用户可平滑升级。

## [2.0.2] — 2026-06-19 — Auto-Update Release

修复 electron-updater 链路：`build.publish.repo` 从 `AI-Timeline-Creator` 改为 `Storyloom`，本 release 上传完整安装包 + blockmap + latest.yml。

[v2.0.2 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v2.0.2)

## [2.0.1] — 2026-06-19 — v2.x Final Wrap-up

代码屎山 #3/#4/#5 修复（safeJson 工具 / server console → pino / workspaces.ts 拆分）+ 全套栅格图标重生成 + dist 链路验证。

[v2.0.1 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v2.0.1)

## [2.0.0] — 2026-06-19 — Storyloom 品牌焕新

正式更名 Storyloom · 絮织；琥珀棕织机视觉品牌；首发 NSIS 安装包；electron-updater 接入。

[v2.0.0 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v2.0.0)

## [1.1.0] — 2026-06-19

[ARCHIVED] AI Timeline Creator v1.x 末班车版本：性能优化 + 启动流程 + 自动更新基础设施。

[v1.1.0 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v1.1.0)

## [1.0.1] — 2026-06-18

[ARCHIVED] v1.0 hotfix。

[v1.0.1 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v1.0.1)

## [1.0.0] — 2026-06-18

[ARCHIVED] AI Timeline Creator 第一个对外正式版。

[v1.0.0 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v1.0.0)

## [4.x] — 2026-06-17 / 06-18 — 早期实验版本

[ARCHIVED] v4.0.0 / v4.1.0 / v4.2.1 是项目最早的内部代号，版本号策略尚未稳定，记录在此供历史回溯：

- [v4.2.1](https://github.com/YJLZSL/Storyloom/releases/tag/v4.2.1) — TDesign 前端重构 hotfix
- [v4.1.0](https://github.com/YJLZSL/Storyloom/releases/tag/v4.1.0) — 章节横滑首页 / 树状时间轴 / 事件详情页
- [v4.0.0](https://github.com/YJLZSL/Storyloom/releases/tag/v4.0.0) — 早期内部架构原型
