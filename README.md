# AI Timeline Creator V4.0

面向小说创作者的时间轴管理工具，支持多工作区、时间轴画布、角色管理、世界观设定、伏笔追踪、AI 创意助手等功能。

> **项目状态**: V7 全面重构已完成（2026-06-17）。5 阶段 17 任务全部落地：基础设施修复、设计系统重写（2 主题 + shadcn/ui）、前端架构重写（4 域 store + 工作台布局 + 时间轴核心 + AI 面板）、新增功能（命令面板/快捷键系统/故事模板库/关系图谱）、测试验证通过。当前仍有新旧代码并存的遗留问题，详见 [前端问题识别与修复任务](./前端问题识别与修复任务.md)。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18 |
| 类型系统 | TypeScript | ~5.9 |
| 构建工具 | Vite | 6 |
| CSS 框架 | Tailwind CSS | v4（@theme CSS-first）|
| 组件库 | shadcn/ui | new-york 风格 |
| 状态管理 | Zustand | 5（4 个域 store）|
| 数据请求 | TanStack Query | 5 |
| 动画 | Framer Motion | 11（替代 anime.js）|
| Markdown | react-markdown + remark-gfm | 10/4 |
| 图表 | D3 | 7（关系图谱）|
| 后端框架 | Fastify | 5 |
| 数据库 | SQLite (better-sqlite3 + drizzle-orm) | — |
| 桌面端 | Electron | 42 |

## 快速开始

```bash
# 安装依赖
npm install

# 前端 + 后端联合开发
npm run dev
# 前端: http://localhost:5173 (Vite)
# 后端: http://localhost:3001 (Fastify)

# 仅前端（无后端，API 会失败）
npm run dev:web

# 仅后端（tsx watch 热重载）
npm run dev:server

# 启动 Electron（开发模式，加载 localhost:5173）
npm run dev:electron

# 构建
npm run build            # tsc -b 类型检查 + vite build 前端构建
npm run build:server     # 后端 TS 编译到 dist-server/
npm run build:electron   # Electron 主进程 TS 编译到 electron-out/

# 完整打包（前端+后端+Electron+electron-builder）
npm run dist

# 类型检查
npm run typecheck
```

## 项目结构

```
├── src/                          # React 前端
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 主应用组件（仅渲染 AppShell）
│   ├── index.css                 # Tailwind v4 @theme 设计令牌 + 2 主题 CSS 变量
│   ├── components/
│   │   ├── layout/               # 工作台布局（AppShell/TopToolbar/SideNav/ContextPanel/StatusBar）
│   │   ├── timeline/             # 时间轴核心（TimelineView/Canvas/Ruler/Track/EventCard/Connections）
│   │   ├── ai-panel/             # AI 助手（AIPanel/Input/Message/ConversationList/ConfigPanel）
│   │   ├── workspace/            # 工作区管理（Selector/Card/CreateWorkspaceDialog/Import/Export）
│   │   ├── command-palette/      # 命令面板（Ctrl+K，CommandPalette/commands）
│   │   ├── relationship-graph/   # 关系图谱（RelationshipGraph/RelationshipView，D3 force）
│   │   ├── settings/             # 设置（ShortcutSettings/CalendarConfigDialog）
│   │   ├── events/               # 事件编辑（EventEditorDialog）
│   │   ├── characters/           # 角色管理
│   │   ├── worldbuilding/        # 世界观设定
│   │   ├── foreshadowing/        # 伏笔追踪
│   │   ├── connection/           # 事件关联
│   │   ├── consistency/          # 一致性检查
│   │   ├── outline/              # 大纲视图
│   │   ├── stats/                # 统计视图
│   │   ├── ui/                   # shadcn/ui 基础组件（18 个：button/input/textarea/label/badge/dialog/sheet/tooltip/sonner/command/select/checkbox/switch/slider/scroll-area/separator/tabs）
│   │   └── ...                   # 其他（auto-save/effects/history/mode/onboarding/pomodoro/search/shortcut/structure/theme/writing 等旧组件，部分待清理）
│   ├── stores/                   # Zustand 状态管理
│   │   ├── useWorkspaceStore.ts  # 当前工作区 ID（域 store）
│   │   ├── useTimelineStore.ts   # 视图模式/缩放/选中事件/滚动定位（域 store）
│   │   ├── useUIStore.ts         # 活动面板/面板宽度/专注模式/命令面板开关（域 store）
│   │   ├── useThemeStore.ts      # 2 主题切换 + View Transitions API（域 store）
│   │   ├── historyStore.ts       # 撤销/重做历史栈
│   │   └── ...                   # 旧 store（appStore/panelStore/themeStore/contextMenuStore/pomodoroStore，待清理）
│   ├── services/                 # API 服务层（api.ts/api-hooks.ts/ai-stream.ts）
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具函数（utils/ai-config/ai-context/animations/apply-template/command-registry/consistency-check/custom-calendar/history/micro-interactions/name-generator/platform/queryClient/shortcut-registry/story-templates/timeline/word-count）
│   └── styles/                   # CSS 样式
│
├── server/                       # Fastify 后端
│   ├── index.ts                  # 服务器入口
│   ├── db/                       # 数据库 (SQLite + Drizzle)
│   ├── routes/                   # API 路由（8 组）
│   ├── services/                 # 业务逻辑（ai-proxy/auto-save）
│   ├── plugins/                  # 插件（database/error-handler/validation）
│   ├── lib/                      # 验证工具
│   └── migration/                # 数据迁移
│
├── shared/                       # 前后端共享类型
├── electron/                     # Electron 主进程（main.ts/preload.ts）
├── data/                         # 运行时数据（dev.db 开发用，生产用 userData/timeline.db）
├── drizzle/                      # 数据库迁移 SQL
└── .trae/specs/rebuild-v7/       # V7 重构 spec（spec.md/tasks.md/checklist.md）
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api` | 前端 API 基础 URL |
| `DATA_DIR` | `{cwd}/data` | 数据库存储目录 |
| `PORT` | `3001` | 服务器端口 |

## 关键约束

- 根 `package.json` 有 `"type": "module"`，不可删除
- Electron 主进程通过 `path.join(app.getAppPath(), 'dist-server', 'server', 'index.js')` 动态 import（ESM file:// URL）
- 开发环境用 `./data/dev.db`，生产环境用 `app.getPath('userData')/timeline.db`
- Electron 单实例锁（`app.requestSingleInstanceLock()`），重复启动会聚焦已有窗口

## V7 重构后的关键事实（2026-06-17）

> 以下要点经代码核实，与早期文档描述有出入，开发时以本节为准：

- **Tailwind CSS 是 v4**（`@tailwindcss/vite` 插件 + `@import "tailwindcss"`），项目根目录**没有** `tailwind.config.js` 或 `postcss.config.js`，主题通过 `src/index.css` 的 `@theme {}` 和 RGB 通道格式 CSS 变量定义（如 `--card: 250 248 245`）。
- **shadcn/ui 已完整集成**：`src/components/ui/` 目录存在，含 18 个基础组件（button/input/textarea/label/badge/dialog/sheet/tooltip/sonner/command/select/checkbox/switch/slider/scroll-area/separator/tabs），`components.json` 配置为 new-york 风格。
- **2 主题系统**：素纸亮色（light）/ 墨黑暗色（dark），通过 `useThemeStore` 管理，使用 View Transitions API 圆形扩散切换。**已移除** 12 主题 + 3 视觉模式（cinematic/balanced/minimal）。
- **4 个域 store**：`useWorkspaceStore` / `useTimelineStore` / `useUIStore` / `useThemeStore`。旧 store（appStore/panelStore/themeStore 等）仍存在但无活跃引用，待清理。
- **动画引擎为 Framer Motion 11**：替代 anime.js。`package.json` 中 animejs 依赖仍存在（待移除），部分旧组件仍引用 animejs（待迁移）。
- **工作台布局**：CSS Grid（48px 顶栏 + 56px 侧栏 + 主画布 + 可拖拽右栏 280-480px + 28px 状态栏），由 `AppShell` 统一管理。
- **前端开发端口是 5173**（见 `vite.config.ts`）。
- **字体**：思源宋体（Noto Serif SC，标题）、思源黑体（Noto Sans SC，正文）、JetBrains Mono（等宽），通过 CSS `@theme` 定义。
- **后端服务层完整实现**：`server/services/ai-proxy.ts`（AI 流式/非流式调用 + 模拟降级）、`server/services/auto-save.ts`（自动保存快照 + 数据库备份 + 崩溃恢复）。
- **已知遗留问题**：新旧 store 并存、animejs 残留、MainCanvas 仅渲染 timeline 视图、ContextPanel 大部分面板是占位符等，详见 [前端问题识别与修复任务](./前端问题识别与修复任务.md)。

## 文档

**入门与状态类（先读这些）**：
- [AI接手开发指南](./AI接手开发指南.md) — 面向接手者的操作手册，如实反映项目状态
- [架构与代码地图](./架构与代码地图.md) — ⭐ 文件树、数据库 schema 字段表、store/api/route 完整对照（最实用）
- [项目状态报告](./项目状态报告.md) — 功能完成度评估、已知问题、开发方向
- [开发路线图](./开发路线图.md) — 基于真实代码的优先级任务清单（P0→P3）
- [前端问题识别与修复任务](./前端问题识别与修复任务.md) — ⭐ V7 重构后前端遗留问题清单（P0-P4），修复任务的权威来源
- [文档变更日志](./文档变更日志.md) — 本次审计对文档做了哪些修订及原因

**规格与设计类（开发时参考）**：
- [功能需求规格](./功能需求规格.md) — 各模块需要实现的功能描述
- [前端设计方案](./前端设计方案.md) — 视觉体系、交互设计、动效规格、主题系统
- [可用资源参考](./可用资源参考.md) — 组件库、图标库、动画库等可用资源整理

## License

Private
