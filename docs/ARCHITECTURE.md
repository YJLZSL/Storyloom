# Storyloom 架构与代码地图

> 最后更新：v3.0.0

Storyloom 是一个面向视觉小说与时间线驱动叙事的桌面创作工作台。整体由 4 个并列模块构成：Electron 主进程负责窗口与生命周期；Fastify 后端负责数据与业务；React 渲染层负责 UI 与交互；scripts 目录承载一次性脚本与冒烟测试。运行时主进程在本地随机端口拉起 Fastify，并把 SQLite 数据文件落在 `app.getPath('userData')` 下。

```
+-----------------------------------------------------------------+
|                          Storyloom                              |
|                                                                 |
|  electron/        server/          src/             scripts/    |
|  (主进程+IPC)  →  (Fastify+SQLite) ←  (React 渲染)   (图标/冒烟)   |
|     │                  ▲                ▲                       |
|     │ spawn            │ HTTP           │ preload IPC           |
|     └───────┐          │                │                       |
|             ▼          │                │                       |
|        BrowserWindow ──┴────────────────┘                       |
+-----------------------------------------------------------------+
```

## 1. electron 主进程

入口文件位于 `electron/`，编译产物输出到 `electron-out/electron/`。

- `electron/main.ts`：应用生命周期、`BrowserWindow` 创建、splash (`loading.html`) 加载、随机端口探测（3001–3010）、动态 import 后端入口、IPC `get-server-port` / `open-external`、Ctrl+ +/-/0 缩放、单实例锁。
- `electron/preload.ts`：在 `contextIsolation: true` 下暴露最小 API 给渲染层（端口、外链、更新事件订阅）。
- `electron/updater.ts`：封装 `electron-updater`，订阅 `checking-for-update` / `update-available` / `download-progress` / `update-downloaded`，向渲染层广播 `update:event`，并暴露 `update:check` / `update:download` / `update:install` 三个 IPC handler。启动 5 秒后做首次检查。

## 2. server (Fastify)

入口 `server/index.ts`，编译输出 `dist-server/server/index.js`。

- 路由按资源分组注册到 `/api/...`：核心 `routes/workspaces/`（已拆为 `crud.ts` / `auto-saves.ts` / `import-export.ts` + `helpers-*` 工具），其它资源单文件 `events.ts` / `tracks.ts` / `characters.ts` / `connections.ts` / `foreshadowings.ts` / `world-settings.ts` / `outline-versions.ts` / `scenes.ts` / `beats.ts` / `choices.ts` / `flags.ts` / `maps.ts` / `assets.ts` / `revisions.ts` / `search.ts` / `ai.ts`。
- 插件：`plugins/error-handler.ts`、`plugins/database.ts`（把 drizzle 实例 decorate 到 fastify）、`plugins/validation.ts`。
- drizzle 迁移：SQL 在仓库根 `drizzle/`，由 `server/db/migrate.ts` 在启动时调用 `drizzle-orm/better-sqlite3/migrator` 自动跑；生产模式 `MIGRATIONS_DIR` 由主进程指向 `app.getAppPath()/drizzle`。
- SQLite 路径：开发模式落在仓库根 `data/dev.db`；生产模式由主进程把 `DATA_DIR` 设为 `app.getPath('userData')/data`，文件名 `timeline.db`。WAL 模式 + `foreign_keys = ON` + 5s busy_timeout（见 [server/db/index.ts](file:///d:/AIKFCC/Storyloom/server/db/index.ts)）。

## 3. src (React 渲染层)

入口 `src/main.tsx` → `src/App.tsx`，仅挂载 `WorkspaceInitializer` + `AppShell` + `UpdateNotifier` 三层。

- 状态管理：`src/stores/` 下的 Zustand 切片：`useWorkspaceStore` / `useTimelineStore` / `useTrackStore` / `useUIStore` / `useViewStore` / `useSelectionStore` / `useSettingsStore` / `useThemeStore` / `historyStore`。
- 数据获取：`src/services/api-hooks.ts` 一份文件聚合所有 react-query hooks；`src/services/api.ts` 封装 fetch + 动态 API base（生产模式从主进程 IPC 获取端口）；`src/services/ai-stream.ts` 处理 AI SSE。
- UI 库：[TDesign React](https://tdesign.tencent.com/) 作为主要组件库（Dialog / Drawer / Form 等），`src/components/ui/` 与 `src/components/ui-tdesign/` 收容自研 shadcn 风格薄封装。
- 布局：`src/components/layout/AppShell.tsx` 检测 `currentWorkspaceId`，为空时返回 `EmptyShell.tsx`（v3.0 新增的空态极简布局），否则渲染完整壳：`TopToolbar` + `SideNav` + 主画布 + `ContextPanel` + `StatusBar` + `CommandPalette`。
- 关键视图：`timeline/TimelineView` / `timeline/GanttTimelineView` / `timeline/NarrativeView` / `timeline/TreeTimelineView` / `outline/OutlineView` / `stats/StatsView` / `relationship-graph/RelationshipView`。
- 自动更新 UI：`components/system/UpdateNotifier.tsx` 订阅 `update:event` 并展示提示。

## 4. scripts

- `scripts/generate-storyloom-icons.py`：用 Pillow 11 从主标识生成 `public/icon.png` / `icon.ico` / 各尺寸 PNG。
- `scripts/clean-release.ps1`：`npm run dist` 前清理上一份 release 输出。
- `scripts/smoke_api_v1_0_1.mjs` 等冒烟脚本：发版前可选的回归。

## 关键数据流

### 渲染层 → preload IPC → 主进程

```
React 组件 ─► window.electron.* (preload)
            ─► ipcRenderer.invoke('get-server-port'|'open-external'|'update:*')
            ─► main.ts/updater.ts handler
            ─► return / send ('update:event')
```

preload 是唯一桥梁；渲染层无 Node 能力（`contextIsolation: true` + `nodeIntegration: false` + `sandbox: false`）。

### 主进程 spawn Fastify → 渲染层动态 fetch

```
app.whenReady ─► createMainWindow + loading.html(splash)
              ─► findAvailablePort() (3001..3010)
              ─► dynamic import dist-server/server/index.js
              ─► startServer(port)
              ─► loadFile(dist/index.html) + send('server-port', port)
React ─► invoke('get-server-port') ─► fetch(`http://127.0.0.1:${port}/api/...`)
```

端口写入 `process.env.SERVER_PORT`，渲染层通过一次性 IPC 读取，之后所有 react-query 调用都基于该 base URL。

### 自动更新

```
client (electron-updater) ──► GET https://github.com/YJLZSL/Storyloom/
                                 releases/latest/download/latest.yml
        ◄── version + url + sha512 ──
client ──► GET <release asset .exe + .blockmap>
        ◄── 差分/全量下载 ──
client ──► quitAndInstall() ─► NSIS 覆盖安装 ─► 自动重启
```

`build.publish` 指向 `YJLZSL/Storyloom`（见 `package.json`）。`autoDownload = false`，由 UI 显式触发下载；`autoInstallOnAppQuit = true`，重启时自动写入。

## 关键约定

- **ESM `.js` import 后缀**：源码全是 `.ts`，但相对引用必须写 `.js`（例：`import { startServer } from './server/index.js'`），tsc 与 Vite 都按纯 ESM 解析，缺后缀会运行时炸。
- **drizzle 迁移自动化**：`migrate()` 在 `initDatabase()` 内自动跑；生成新迁移用 `npx drizzle-kit generate`，迁移文件落在仓库根 `drizzle/`，由 electron-builder 的 `files` 字段一并打入 asar。
- **`appId = com.ai.timeline-creator`**：v3.0 起为保留字段，**不可变更**。已部署用户的 NSIS 升级链路依赖该 appId 一致；改名等同于强制全员重装，迁移成本远超收益。
- **数据目录解析**：开发模式硬编码 `cwd()/data`；生产模式由主进程注入 `DATA_DIR = app.getPath('userData')/data`，源码侧不再硬编码任何相对路径。
- **窗口/服务/更新分阶段启动**：splash → server → frontend → updater，顺序敏感，不要在 `app.whenReady` 内打乱。
