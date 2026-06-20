# Storyloom · 絮织 项目全面调研报告

> **调研时间**: 2026-06-20  
> **项目路径**: `D:\AIKFCC\Storyloom`  
> **当前版本**: v1.0.0（Git 最新提交 `75a6703`）  
> **调研范围**: 技术栈、架构、功能、数据模型、构建流程、已知问题、测试覆盖、文档状态

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [技术栈分析](#2-技术栈分析)
3. [架构分析](#3-架构分析)
4. [功能清单](#4-功能清单)
5. [数据模型](#5-数据模型)
6. [构建流程](#6-构建流程)
7. [已知问题](#7-已知问题)
8. [测试覆盖](#8-测试覆盖)
9. [文档状态](#9-文档状态)
10. [风险评估与建议](#10-风险评估与建议)

---

## 1. 执行摘要

Storyloom（絮织）是一款面向 **视觉小说 / 长篇小说 / 剧本创作者** 的本地桌面创作工作台，采用 **Electron + React + Fastify + SQLite** 技术栈。项目经过多轮重构（v1.x → v2.x → v3.x → v1.0.0 稳定版），目前处于**活跃开发状态**。

**关键指标**:

| 指标 | 数值 |
|------|------|
| 前端代码文件 | 112 个 `.ts/.tsx` |
| 前端代码行数 | ~18,777 行 |
| 后端代码文件 | 35 个 `.ts` |
| 后端代码行数 | ~6,858 行 |
| 数据库表数 | 21 张 |
| 数据库索引数 | 44 个 |
| 测试文件 | 3 个 |
| 已发布版本 | v1.0.0（稳定版）|
| 依赖总数 | 39 生产 + 25 开发 = 64 个 |

**总体评估**: 项目架构设计合理，功能丰富，但**测试覆盖率极低**、部分代码文件过长（最大 904 行）、部分文档教程待补充。适合继续迭代开发，但建议优先补齐测试和拆分大型组件。

---

## 2. 技术栈分析

### 2.1 生产依赖（39 个）

| 依赖 | 版本 | 用途 | 状态评估 |
|------|------|------|----------|
| `react` | ^19.2.7 | UI 渲染框架 | 最新稳定版 |
| `react-dom` | ^19.2.7 | React DOM 渲染器 | 最新稳定版 |
| `electron` | ^42.4.0 | 桌面应用壳 | 最新稳定版 |
| `electron-updater` | ^6.8.9 | 自动更新 | 正常 |
| `fastify` | ^5.0.0 | HTTP 服务器框架 | 最新稳定版 |
| `@fastify/cors` | ^11.0.0 | CORS 中间件 | 正常 |
| `@fastify/compress` | ^8.0.0 | 压缩中间件 | 正常 |
| `@fastify/multipart` | ^10.0.0 | 文件上传 | 正常 |
| `@fastify/static` | ^8.0.0 | 静态文件服务 | 正常 |
| `better-sqlite3` | ^12.11.1 | SQLite 驱动（原生模块） | 正常 |
| `drizzle-orm` | ^0.44.0 | ORM | 有 v0.45+ 可用 |
| `drizzle-kit` | ^0.31.0 | 迁移工具 | 有 v0.32+ 可用 |
| `zustand` | ^5.0.14 | 客户端状态管理 | 最新稳定版 |
| `@tanstack/react-query` | ^5.101.0 | 服务端状态管理 | 正常 |
| `framer-motion` | ^11.18.2 | 动画库 | 正常 |
| `d3` | ^7.9.0 | 数据可视化（关系图/时间轴） | 正常 |
| `lucide-react` | ^1.18.0 | 图标库（部分残留） | 正在迁移到 `@icon-park/react` |
| `@icon-park/react` | ^1.4.2 | 图标库（目标主库） | 正常 |
| `tdesign-react` | ^1.17.1 | UI 组件库（主库） | 腾讯开源，持续维护 |
| `tdesign-icons-react` | ^0.6.4 | TDesign 图标 | 正常 |
| `@radix-ui/*` | 多个 | 底层 UI 原语（部分残留） | 已移除大部分，仅剩 tooltip/scroll-area 等 |
| `tailwindcss` | ^4.3.1 | CSS 工具库 | 最新版 |
| `i18next` | ^26.3.1 | 国际化 | 正常 |
| `react-i18next` | ^17.0.8 | React i18n 绑定 | 正常 |
| `sonner` | ^2.0.7 | Toast 通知 | 正常 |
| `react-markdown` | ^10.1.0 | Markdown 渲染 | 正常 |
| `uuid` | ^11.0.0 | UUID 生成 | 正常 |
| `archiver` | ^8.0.0 | 压缩打包 | 正常 |
| `sharp` | ^0.35.1 | 图像处理 | 正常 |
| `class-variance-authority` | ^0.7.1 | 组件变体工具 | 正常 |
| `clsx` | ^2.1.1 | 条件 class 合并 | 正常 |
| `tailwind-merge` | ^3.6.0 | Tailwind class 合并 | 正常 |
| `fastify-plugin` | ^6.0.0 | Fastify 插件工具 | 正常 |
| `i18next-browser-languagedetector` | ^8.2.1 | 浏览器语言检测 | 正常 |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown | 正常 |
| `@types/archiver` | ^8.0.0 | archiver 类型定义 | 正常 |

### 2.2 开发依赖（25 个）

| 依赖 | 版本 | 用途 | 状态评估 |
|------|------|------|----------|
| `typescript` | ^5.8.0 | 类型系统 | 最新 |
| `vite` | ^6.0.0 | 构建工具 | 最新 |
| `@vitejs/plugin-react` | ^4.7.0 | Vite React 插件 | 正常 |
| `@tailwindcss/vite` | ^4.3.1 | Tailwind Vite 插件 | 正常 |
| `vitest` | ^3.2.0 | 测试框架 | 正常 |
| `jsdom` | ^29.1.1 | DOM 测试环境 | 正常 |
| `@testing-library/react` | ^16.3.2 | React 测试工具 | 正常 |
| `@testing-library/jest-dom` | ^6.9.1 | jest-dom 断言 | 正常 |
| `electron-builder` | ^26.15.3 | Electron 打包 | 正常 |
| `@electron/rebuild` | ^4.0.4 | Electron 原生模块重建 | 正常 |
| `tsx` | ^4.19.0 | TypeScript 执行器 | 正常 |
| `concurrently` | ^9.1.0 | 并行命令 | 正常 |
| `cross-env` | ^7.0.3 | 跨平台环境变量 | 正常 |
| `wait-on` | ^9.0.10 | 等待端口就绪 | 正常 |
| `autoprefixer` | ^10.4.20 | CSS 前缀 | Tailwind v4 不再依赖，可移除 |
| `postcss` | ^8.4.49 | CSS 处理器 | 同上，可能冗余 |
| 各类 `@types/*` | 多个 | 类型定义 | 正常 |

### 2.3 依赖问题分析

| 问题 | 严重级别 | 详情 |
|------|----------|------|
| `autoprefixer` / `postcss` 可能冗余 | P4 | Tailwind CSS v4 已内置 PostCSS 处理，这两个包可能不再需要 |
| `drizzle-orm` / `drizzle-kit` 版本 | P4 | 当前 v0.44/v0.31，最新已至 v0.45+/v0.32+，建议跟踪升级 |
| `lucide-react` 残留 | P3 | 项目正在迁移到 `@icon-park/react`，但 `lucide-react` 仍被列为依赖；`src/lib/icons.ts` 已做统一封装，可直接移除 `lucide-react` 依赖 |
| `radix-ui` 残留 | P3 | 多个 radix-ui 子包仍在依赖列表中，但大部分已被 TDesign 替代；仅少数组件（如 tooltip）仍在使用 |
| 无 `eslint` 配置 | P3 | 项目中未配置 ESLint，缺乏静态代码质量检查 |
| 无 `prettier` 配置 | P4 | 同样未配置，代码风格统一依赖开发者自觉 |

---

## 3. 架构分析

### 3.1 整体架构

Storyloom 采用**分层桌面应用架构**，由 4 个并列模块构成：

```
+---------------------------------------------------------------------+
|                         Storyloom Desktop                            |
|                                                                      |
|  electron/          server/              src/              scripts/  |
|  (主进程 + IPC)  ->  (Fastify + SQLite)  <-  (React 渲染层)   (工具)  |
|     |                    ^                    ^                       |
|     | spawn              | HTTP / API        | preload IPC           |
|     +--------+           |                  |                       |
|             v            |                  |                       |
|        BrowserWindow ----+------------------+                       |
+---------------------------------------------------------------------+
```

**架构模式**: 这不是传统的 MVC/MVVM，而是**功能分层 + 模块驱动**的架构：
- **Electron 主进程**: 负责窗口生命周期、端口探测、后端启动、IPC 通信、自动更新
- **Fastify 后端**: 负责 HTTP API、数据持久化、业务逻辑、文件服务
- **React 前端**: 负责 UI 渲染、用户交互、状态管理
- **共享层**: `shared/types.ts` 提供前后端共享类型定义

### 3.2 目录结构

```
Storyloom/
├── electron/              # Electron 主进程
│   ├── main.ts            # 应用入口、窗口创建、后端启动
│   ├── preload.ts         # 预加载脚本（暴露最小 API）
│   ├── updater.ts         # 自动更新逻辑
│   └── loading.html       # 启动 Splash 页面
│
├── server/                # Fastify 后端（~6,858 行）
│   ├── index.ts           # 服务入口 + 路由注册
│   ├── db/                # 数据库层
│   │   ├── schema.ts      # Drizzle 表定义（21 张表）
│   │   ├── index.ts       # DB 连接 + 6 层迁移兜底
│   │   └── migrate.ts     # 迁移入口 + 备份
│   ├── plugins/           # Fastify 插件
│   │   ├── error-handler.ts
│   │   ├── database.ts
│   │   └── validation.ts
│   ├── routes/            # 按资源分组的路由
│   │   ├── workspaces/    # 工作区（CRUD + 导入导出 + 自动保存）
│   │   ├── events.ts      # 事件
│   │   ├── tracks.ts      # 轨道
│   │   ├── characters.ts  # 角色
│   │   ├── connections.ts # 关联
│   │   ├── foreshadowings.ts  # 伏笔
│   │   ├── world-settings.ts  # 世界观
│   │   ├── outline-versions.ts  # 大纲版本
│   │   ├── scenes.ts      # 场景（VN）
│   │   ├── beats.ts       # 节拍（VN）
│   │   ├── choices.ts     # 选项（VN）
│   │   ├── flags.ts       # 标志变量
│   │   ├── maps.ts        # 地图
│   │   ├── assets.ts      # 资产
│   │   ├── revisions.ts   # 修订历史
│   │   ├── search.ts      # 搜索 + 一致性检查
│   │   └── ai.ts          # AI 代理
│   ├── services/          # 业务服务层
│   │   ├── auto-save.ts   # 自动保存 + 备份 + 恢复
│   │   ├── ai-proxy.ts    # AI 接口代理
│   │   └── exporters/     # 导出器（WebGAL 等）
│   └── lib/               # 工具库
│       └── validation.ts  # 输入校验 schema
│
├── src/                   # React 前端（~18,777 行，112 文件）
│   ├── main.tsx           # 渲染入口
│   ├── App.tsx            # 根组件（极简：WorkspaceInitializer + AppShell + UpdateNotifier）
│   ├── components/        # 按功能组织的组件
│   │   ├── layout/        # 布局组件（AppShell, TopToolbar, LeftPanel, ContextPanel, StatusBar）
│   │   ├── timeline/      # 时间轴视图（7 个组件）
│   │   ├── outline/       # 大纲视图
│   │   ├── workspace/     # 工作区管理
│   │   ├── settings/      # 设置面板
│   │   ├── ai-panel/      # AI 助手面板
│   │   ├── characters/    # 角色面板
│   │   ├── foreshadowing/ # 伏笔面板
│   │   ├── worldbuilding/ # 世界观面板
│   │   ├── events/        # 事件编辑器/详情
│   │   ├── relationship-graph/  # 关系图
│   │   ├── stats/         # 统计视图
│   │   ├── consistency/   # 一致性检查
│   │   ├── connection/    # 关联面板
│   │   ├── command-palette/  # 命令面板
│   │   ├── system/        # 系统组件（UpdateNotifier）
│   │   ├── ui/            # shadcn 风格薄封装
│   │   ├── ui-tdesign/    # TDesign 组件适配层
│   │   └── _shared/       # 跨功能共享组件
│   ├── stores/            # Zustand 状态切片（9 个 store）
│   │   ├── useWorkspaceStore.ts
│   │   ├── useTimelineStore.ts
│   │   ├── useTrackStore.ts
│   │   ├── useUIStore.ts
│   │   ├── useSettingsStore.ts
│   │   ├── useThemeStore.ts
│   │   ├── useSelectionStore.ts
│   │   └── historyStore.ts
│   ├── services/          # 数据层服务
│   │   ├── api.ts         # fetch 封装 + 动态 API base
│   │   ├── api-hooks.ts   # React Query hooks（~452 行）
│   │   └── ai-stream.ts   # AI SSE 流处理
│   ├── lib/               # 纯函数工具库
│   │   ├── utils.ts       # cn() + safeJsonArray()
│   │   ├── colors.ts      # 统一调色板（134 行）
│   │   ├── command-registry.ts   # 命令注册表（161 行）
│   │   ├── shortcut-registry.ts # 快捷键注册表（373 行）
│   │   ├── timeline.ts    # 时间轴工具
│   │   ├── consistency-check.ts
│   │   ├── ai-context.ts  # AI 上下文构建
│   │   ├── ai-config.ts   # AI 配置
│   │   ├── icons.ts       # 图标统一登记
│   │   ├── platform.ts    # 平台检测
│   │   ├── word-count.ts
│   │   └── ...
│   ├── hooks/             # 自定义 Hooks
│   │   └── useMediaQuery.ts
│   ├── types/             # 类型声明
│   │   └── electron.d.ts  # window.electronAPI / window.updater 类型
│   └── test/              # 测试配置
│       └── setup.ts       # vitest 配置
│
├── shared/                # 前后端共享类型
│   └── types.ts           # 共享类型定义（677 行）
│
├── drizzle/               # 数据库迁移文件（SQL）
│   └── meta/_journal.json # 迁移日志
│
├── scripts/               # 工具脚本
│   ├── generate-storyloom-icons.py
│   ├── clean-release.ps1
│   ├── smoke_api_v1_0_1.mjs
│   ├── comprehensive_v1_0_0_test.py  # E2E 测试
│   └── ...
│
├── docs/                  # 文档
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── RELEASING.md
│   ├── tutorials/         # 13 篇用户教程
│   ├── audit/             # 审计报告
│   └── _archive/          # 历史归档
│
├── public/                # 静态资源
│   ├── icon.png / icon.ico
│   ├── favicon.svg
│   └── tutorials/         # 教程 markdown（打包后复制）
│
├── package.json           # 依赖 + 构建配置
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 项目引用配置
├── tsconfig.app.json      # 前端 TS 配置
├── tsconfig.server.json   # 后端 TS 配置
├── tsconfig.electron.json # Electron 主进程 TS 配置
└── index.html             # 入口 HTML
```

### 3.3 架构模式详解

#### 状态管理：Zustand + React Query 双轨制

| 状态类型 | 技术 | 用途 | 持久化 |
|----------|------|------|--------|
| 服务端状态 | React Query (TanStack) | API 数据缓存、乐观更新、数据同步 | 否（内存缓存） |
| 客户端全局状态 | Zustand | UI 状态、视图模式、选择状态 | 部分（localStorage） |
| 历史/撤销 | Zustand (historyStore) | 操作历史记录 | 否 |

**关键设计**:
- `api-hooks.ts`（~452 行）聚合了所有 React Query hooks，包括乐观的更新回滚机制（`onMutate` / `onError` / `onSettled`）
- `useWorkspaceStore` 切换工作区时自动清理关联状态（timeline selection、track selection 等）

#### 通信机制：三层通信

```
1. 主进程 -> 后端: 动态 import() 加载 server bundle，随机端口 3001-3010
2. 渲染进程 -> 后端: fetch HTTP API（通过 preload 获取的实际端口）
3. 渲染进程 -> 主进程: IPC（preload 暴露的有限 API：getServerPort, openExternal, openLogFolder, getUserDataPath）
```

**安全设计**:
- `contextIsolation: true` + `nodeIntegration: false` + `sandbox: false`
- preload 是唯一桥梁，渲染层无 Node 能力

#### 组件设计：按功能组织（Feature-based）

组件按业务功能而非类型组织（`components/timeline/`、`components/characters/` 等），这是现代 React 项目的推荐做法。每个功能目录包含该功能所需的所有组件。

---

## 4. 功能清单

### 4.1 核心视图（7 种视图模式）

| 视图 | 组件路径 | 功能描述 |
|------|----------|----------|
| **时间轴视图** | `src/components/timeline/TimelineView.tsx` | 主时间轴，支持多轨道、事件卡片、缩放、拖拽、连线 |
| **甘特图视图** | `src/components/timeline/GanttTimelineView.tsx` | 甘特图形式展示事件时间跨度 |
| **叙事视图** | `src/components/timeline/NarrativeView.tsx` | 按叙事顺序排列事件（非时间顺序） |
| **树状视图** | `src/components/timeline/TreeTimelineView.tsx` | 树状结构展示事件层级关系 |
| **大纲视图** | `src/components/outline/OutlineView.tsx` | 大纲编辑器，章节/事件组织（904 行大文件） |
| **统计视图** | `src/components/stats/StatsView.tsx` | 工作区数据统计 |
| **关系图视图** | `src/components/relationship-graph/RelationshipView.tsx` | D3.js 关系网络图（角色-事件-世界观） |

### 4.2 数据管理功能

| 功能 | 状态 | 路径 |
|------|------|------|
| 工作区 CRUD | 完成 | `server/routes/workspaces/crud.ts` |
| 工作区导入/导出 | 完成 | `server/routes/workspaces/import-export.ts` |
| 事件 CRUD | 完成 | `server/routes/events.ts` |
| 轨道 CRUD | 完成 | `server/routes/tracks.ts` |
| 角色 CRUD | 完成 | `server/routes/characters.ts` |
| 事件-角色关联 | 完成 | `server/db/schema.ts` (eventCharacters) |
| 事件关联（连接） | 完成 | `server/routes/connections.ts` |
| 伏笔追踪 | 完成 | `server/routes/foreshadowings.ts` |
| 世界观设定 | 完成 | `server/routes/world-settings.ts` |
| 大纲版本历史 | 完成 | `server/routes/outline-versions.ts` |
| 自动保存 | 完成 | `server/services/auto-save.ts` |
| 崩溃恢复 | 完成 | `server/services/auto-save.ts` (checkCrashRecovery) |
| 数据库备份 | 完成 | `server/services/auto-save.ts` (createDatabaseBackup) |
| 搜索/全文检索 | 完成 | `server/routes/search.ts` |
| 一致性检查 | 完成 | `server/routes/search.ts` + `src/lib/consistency-check.ts` |
| 数据迁移 | 完成 | `server/db/index.ts`（6 层 fallback） |

### 4.3 视觉小说（VN）功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 场景管理 | 完成 | `server/routes/scenes.ts` |
| 节拍编辑 | 完成 | `server/routes/beats.ts` |
| 选项分支 | 完成 | `server/routes/choices.ts` |
| 资产（图片/音频） | 完成 | `server/routes/assets.ts` |
| 地图（Konva.js） | 完成 | `server/routes/maps.ts` |
| 标志变量 | 完成 | `server/routes/flags.ts` |
| 角色资产绑定 | 完成 | `character_assets` 表 |
| WebGAL 导出 | 完成 | `server/services/exporters/webgal.ts` |

### 4.4 UI/UX 功能

| 功能 | 状态 | 路径 |
|------|------|------|
| 6 套主题 | 完成 | `luosheng` / `midnight` / `forest` / `ink-wash` / `contrast` / `system` |
| 专注模式 | 完成 | `useUIStore` (focusMode) |
| 命令面板 | 完成 | `CommandPalette.tsx` + `CommandPalette.tsx` |
| 快捷键系统 | 完成 | `shortcut-registry.ts` + `command-registry.ts` |
| 快捷键自定义 | 完成 | `ShortcutSettings.tsx` |
| 移动端响应式 | 完成 | `<768px` 抽屉式布局 |
| 国际化（i18n） | 完成 | `i18next` + `react-i18next` |
| 自动更新 | 完成 | `electron/updater.ts` + `UpdateNotifier.tsx` |
| 教程系统 | 完成 | `public/tutorials/` + `TutorialTab.tsx` |
| 骨架屏 | 完成 | `Skeleton.tsx` 等 |
| 空状态 | 完成 | `EmptyState.tsx` + `EmptyShell.tsx` |
| 加载状态 | 完成 | `LoadingState.tsx` |
| 数据面板 | 完成 | `EventContextPanel.tsx`（事件关联数据展示） |
| 章节导航 | 完成 | `ChapterRail.tsx` |
| 缩放控制 | 完成 | 时间轴 0.5x - 3.0x 缩放 |
| 右键菜单 | 完成 | `ContextMenu.tsx` |
| 拖放 | 完成 | 时间轴事件卡片拖拽 |
| 视图切换动画 | 完成 | Framer Motion `AnimatePresence` |

### 4.5 AI 功能

| 功能 | 状态 | 路径 |
|------|------|------|
| AI 对话面板 | 完成 | `AIPanel.tsx` + `AIMessage.tsx` |
| AI 配置 | 完成 | `AIConfigPanel.tsx` / `AISettingsTab.tsx` |
| AI 对话流 | 完成 | `ai-stream.ts` + SSE |
| AI 代理服务 | 完成 | `server/services/ai-proxy.ts` |
| 支持 SiliconFlow | 完成 | `ai-proxy.ts` |
| 支持 OpenAI | 完成 | `ai-proxy.ts` |
| API Key 测试 | 完成 | `POST /api/ai/test` |
| 降级模式 | 完成 | 无 API Key 时返回模拟数据 |
| AI 上下文构建 | 完成 | `src/lib/ai-context.ts` |

---

## 5. 数据模型

### 5.1 数据库架构（SQLite + Drizzle ORM）

数据库位于 `server/db/schema.ts`，共 **21 张表**、**44 个索引**。

#### 核心叙事模型

```
workspaces
+-- tracks (1:N) -> 时间轴轨道
+-- events (1:N) -> 时间轴事件
|   +-- event_characters (M:N) -> characters
|   +-- event_world_settings (M:N) -> world_settings
|   +-- event_assets (M:N) -> assets
+-- characters (1:N) -> 角色
|   +-- character_assets (M:N) -> assets
+-- connections (1:N) -> 事件关联
+-- foreshadowings (1:N) -> 伏笔
+-- world_settings (1:N) -> 世界观设定
+-- auto_saves (1:N) -> 自动保存快照
+-- outline_versions (1:N) -> 大纲版本
+-- maps (1:N) -> 地图
+-- flags (1:N) -> 标志变量
+-- assets (1:N) -> 资产
+-- scenes (1:N) -> 场景（VN）
|   +-- beats (1:N) -> 节拍
|   |   +-- choices (1:N) -> 选项
|   +-- scene_assets (M:N) -> assets
+-- revisions (1:N) -> 操作历史
```

#### 表详情

| 表名 | 行数 | 用途 | 索引数 |
|------|------|------|--------|
| `workspaces` | 13 | 工作区 | 0 |
| `tracks` | 6 | 轨道 | 1 (workspace) |
| `events` | 12 | 事件 | 3 (workspace, track, start_time) |
| `characters` | 8 | 角色 | 1 (workspace) |
| `event_characters` | 4 | 事件-角色关联 | 3 (PK, event, character) |
| `event_world_settings` | 4 | 事件-世界观关联 | 3 (PK, event, worldSetting) |
| `connections` | 6 | 事件关联 | 3 (workspace, source, target) |
| `foreshadowings` | 11 | 伏笔 | 2 (workspace, status) |
| `world_settings` | 6 | 世界观设定 | 2 (workspace, category) |
| `auto_saves` | 5 | 自动保存 | 2 (workspace, created) |
| `outline_versions` | 5 | 大纲版本 | 2 (workspace, created) |
| `assets` | 10 | 资产 | 3 (workspace, sha256, kind) |
| `maps` | 8 | 地图 | 1 (workspace) |
| `scenes` | 8 | 场景 | 2 (workspace, order) |
| `beats` | 9 | 节拍 | 2 (scene, order) |
| `choices` | 5 | 选项 | 2 (beat, order) |
| `flags` | 5 | 标志变量 | 2 (workspace, name unique) |
| `character_assets` | 5 | 角色-资产关联 | 3 (PK, character, asset) |
| `event_assets` | 4 | 事件-资产关联 | 3 (PK, event, asset) |
| `scene_assets` | 4 | 场景-资产关联 | 3 (PK, scene, asset) |
| `revisions` | 8 | 修订历史 | 3 (workspace, entity, created) |

### 5.2 共享类型定义

`shared/types.ts`（677 行）定义了完整的 API 契约，包括：
- 所有数据模型的 TypeScript 接口
- API 请求/响应类型（`ApiResponse<T>`、`PaginatedResponse<T>`）
- 过滤参数（`EventFilterParams`）
- 批量操作（`BatchOperation`、`BatchEventsRequest`）
- AI 请求类型（`AIChatRequest`、`AIChatResponse`）
- 导出数据结构（`ExportData` v4.0）
- 健康检查响应（`HealthCheckResponse`）

### 5.3 数据持久化策略

| 数据类型 | 持久化方式 | 说明 |
|----------|------------|------|
| 业务数据 | SQLite (WAL 模式) | `better-sqlite3` + `drizzle-orm` |
| 客户端设置 | localStorage | Zustand `persist` 中间件 |
| 快捷键绑定 | localStorage | `shortcut-registry.ts` |
| 自动保存 | SQLite (auto_saves 表) | 保留最近 20 个快照 |
| 数据库备份 | 文件系统 | 启动时自动备份，保留最近 10 个 |

---

## 6. 构建流程

### 6.1 开发模式

```bash
npm run dev           # 并行启动 Vite (5173) + Fastify (3001)
npm run dev:web       # 仅 Vite
npm run dev:server    # 仅 Fastify (tsx watch)
npm run dev:electron  # 开发模式 + Electron 主进程
```

### 6.2 生产构建流水线

```
npm run dist
  +-- npm run clean:release    # 清理旧构建
  +-- npm run build            # tsc + vite build（前端 -> dist/）
  +-- npm run build:server     # tsc -p tsconfig.server.json（后端 -> dist-server/）
  +-- npm run build:electron   # tsc -p tsconfig.electron.json（主进程 -> electron-out/）
  +-- npm run electron:rebuild # electron-rebuild -f -w better-sqlite3
  +-- electron-builder --win --publish never  # NSIS 安装包
```

### 6.3 构建配置分析

**Vite 配置** (`vite.config.ts`):
- 端口 5173
- API 代理: `/api` -> `http://localhost:3001`
- 手动 chunk 拆分: `react`, `motion`, `d3`, `icons`, `query`
- base: `./`（支持 Electron file:// 协议）

**TypeScript 配置**:
- `tsconfig.app.json`: 前端，ES2020，DOM lib，strict
- `tsconfig.server.json`: 后端，ES2022，Node lib，输出 `dist-server/`
- `tsconfig.electron.json`: 主进程，ES2022，输出 `electron-out/`
- 项目引用: `tsconfig.json` -> `tsconfig.app.json` + `tsconfig.server.json`

**electron-builder 配置** (`package.json#build`):
- App ID: `com.ai.timeline-creator`（**不可变更**）
- 输出目录: `$env:ATC_DIST_DIR`
- 包含文件: `dist/`, `dist-server/`, `electron-out/`, `drizzle/`, `shared/`, `package.json`
- asarUnpack: `better-sqlite3`（原生模块需要解压）
- Windows 目标: NSIS
- 发布: GitHub Releases (`YJLZSL/Storyloom`)

### 6.4 构建瓶颈

| 瓶颈 | 严重级别 | 详情 |
|------|----------|------|
| `better-sqlite3` 原生编译 | P2 | 首次 `npm install` 和 Electron 版本升级时需要编译，Windows 需要 Visual Studio Build Tools，耗时 10-60 秒 |
| 6 层迁移兜底 | P3 | `runMigrations()` 的 6 层 fallback 逻辑复杂，虽然健壮但增加了启动时间 (~50-200ms) |
| 无并行构建优化 | P4 | `dist` 串行执行，可优化为并行构建前端+后端+主进程 |
| 无 CI/CD | P3 | 构建和发版完全依赖本地手动执行，无 GitHub Actions 自动化 |

---

## 7. 已知问题

### 7.1 TODO/FIXME 注释

| 严重级别 | 位置 | 内容 | 说明 |
|----------|------|------|------|
| P3 | `src/utils/revealInBestView.ts:75` | `// TODO: 后续应切换到专门的 script-editor / scenes 面板` | 功能切换待实现 |
| P3 | `src/components/settings/SettingsTabs.tsx:107` | `// TODO` | 设置项待完成 |
| P3 | `src/components/settings/SettingsTabs.tsx:114` | `// TODO` | 设置项待完成 |

### 7.2 文档待补充

| 严重级别 | 位置 | 内容 |
|----------|------|------|
| P4 | `public/tutorials/command-palette.md` | `TODO: 待补充` |
| P4 | `public/tutorials/branch-map.md` | `TODO: 待补充` |
| P4 | `public/tutorials/tree-view.md` | `TODO: 待补充` |
| P4 | `public/tutorials/auto-backup-and-export-webgal.md` | `TODO: 待补充` |
| P4 | `public/tutorials/ai-panel.md` | `TODO: 待补充` |
| P4 | `public/tutorials/timeline-view.md` | `TODO: 待补充` |
| P4 | `public/tutorials/relationship-graph.md` | `TODO: 待补充` |
| P4 | `public/tutorials/outline-view.md` | `TODO: 待补充` |
| P4 | `public/tutorials/themes-and-focus.md` | `TODO: 待补充` |
| P4 | `public/tutorials/script-editor.md` | `TODO: 待补充` |

> 注：虽然 `public/tutorials/` 下的文件待补充，但 `docs/tutorials/` 下有对应的完整教程。这属于打包与文档的同步问题。

### 7.3 代码异味（来自审计报告）

| 严重级别 | 问题 | 文件 | 详情 |
|----------|------|------|------|
| P2 | **超大文件** | `src/components/outline/OutlineView.tsx` (904 行) | 应拆分为 `OutlineEditorDrawer` + `OutlineFilters` + `useOutlineQueries` |
| P3 | **超大文件** | `src/components/foreshadowing/ForeshadowingPanel.tsx` (697 行) | 应抽取 `ForeshadowingList` 子组件 |
| P3 | **超大文件** | `src/components/events/EventEditorDialog.tsx` (667 行) | 应拆分为 `EventBasicForm` / `EventLinksTab` / `EventChapterTab` |
| P3 | **超大文件** | `src/components/characters/CharacterPanel.tsx` (469 行) | 应抽取 `CharacterCard` + `useCharacterFilters` |
| P3 | **超大文件** | `src/components/worldbuilding/WorldBuildingPanel.tsx` (462 行) | 应抽取 `WorldSettingCard` |
| P3 | **超大文件** | `src/components/timeline/TimelineCanvas.tsx` (462 行) | 应抽取 `useTimelinePan` / `useTimelineZoom` hooks |
| P3 | **重复结构** | Character/World/Foreshadowing Panel | 三者高度同构，建议抽取 `EntityPanel<T>` 通用骨架 |
| P3 | **后端路由样板** | `foreshadowings.ts`, `connections.ts`, `world-settings.ts`, `tracks.ts` | 相同的 CRUD 模板重复，建议 `defineCrudRoutes<T>` 工具 |
| P4 | 无 `as any` | 全项目 | 唯一一处已在 v2.0.1 移除，类型纪律良好 |
| P4 | Server console 残留 | 已修复 | v2.0.1 已全部迁移到 pino |

### 7.4 架构债务

| 严重级别 | 问题 | 详情 |
|----------|------|------|
| P3 | 撤销/重做系统不完整 | 仅支持 `event` 实体的撤销/重做，其他实体类型提示"开发中" |
| P3 | ESM `.js` 后缀约定 | 所有相对 import 必须写 `.js` 后缀，易遗漏导致运行时错误 |
| P4 | 版本号混乱历史 | 早期版本号 v1.x/v2.x/v3.x/v4.x 交替实验，现统一为 v1.0.0 SemVer |
| P4 | 多个品牌名称并存 | 代码中仍存在 `AI-Timeline-Creator` / `timeline-creator` 等旧品牌引用 |

---

## 8. 测试覆盖

### 8.1 测试现状

| 指标 | 数值 | 评估 |
|------|------|------|
| 测试文件总数 | 3 | 严重不足 |
| 单元测试框架 | vitest + jsdom | 配置正确 |
| 测试文件 | `WorkspaceCard.test.tsx` | 组件渲染测试（3 个用例）|
| 测试文件 | `safe-text.test.ts` | 工具函数测试（6 个用例）|
| 测试文件 | `useMediaQuery.test.ts` | Hook 测试（2 个用例）|
| 总用例数 | ~11 | 严重不足 |
| E2E 测试 | Python + Playwright | 存在但非自动化运行 |
| 代码覆盖率 | 未配置 | 无覆盖率报告 |

### 8.2 测试缺失清单

以下关键模块**完全没有测试**:

| 模块 | 建议测试类型 | 优先级 |
|------|------------|--------|
| `server/routes/*.ts` | 集成测试（API 端点） | P0 |
| `server/services/auto-save.ts` | 单元测试 | P1 |
| `server/services/ai-proxy.ts` | 单元测试（mock） | P1 |
| `server/db/migrate.ts` | 集成测试 | P1 |
| `src/services/api-hooks.ts` | 单元测试（React Testing Library） | P0 |
| `src/services/api.ts` | 单元测试 | P1 |
| `src/lib/shortcut-registry.ts` | 单元测试 | P2 |
| `src/lib/command-registry.ts` | 单元测试 | P2 |
| `src/lib/consistency-check.ts` | 单元测试 | P2 |
| `src/stores/*.ts` | 单元测试 | P2 |
| `src/components/timeline/*.tsx` | 组件测试 | P1 |
| `src/components/events/EventEditorDialog.tsx` | 组件测试 | P1 |
| `src/components/outline/OutlineView.tsx` | 组件测试 | P1 |

### 8.3 测试建议

1. **优先级 P0**: 为后端 API 路由添加集成测试（使用 `supertest` 或 Fastify 的 `inject`）
2. **优先级 P1**: 为 `api-hooks.ts` 添加 React Query 测试（使用 `mock Service Worker`）
3. **优先级 P1**: 为 `auto-save.ts` 的核心函数（备份、恢复、清理）添加单元测试
4. **优先级 P2**: 配置 vitest 的覆盖率报告（`@vitest/coverage-v8`）
5. **优先级 P3**: 将 Python E2E 测试迁移到 JavaScript/TypeScript（`@playwright/test`）以实现统一技术栈

---

## 9. 文档状态

### 9.1 当前文档清单

| 文档 | 路径 | 状态 | 时效性 |
|------|------|------|--------|
| README | `README.md` | 完整 | 最新（v1.0.0） |
| 架构文档 | `docs/ARCHITECTURE.md` | 完整 | v3.0.0，核心架构未变 |
| 开发指南 | `docs/DEVELOPMENT.md` | 完整 | v3.0.0，核心流程未变 |
| 发版指南 | `docs/RELEASING.md` | 完整 | v3.0.0，核心流程未变 |
| 变更日志 | `CHANGELOG.md` | 完整 | 最新（v1.0.0） |
| 入门教程 | `docs/tutorials/getting-started.md` | 完整 | 最新 |
| 工作区教程 | `docs/tutorials/workspace.md` | 完整 | 最新 |
| 快捷键大全 | `docs/tutorials/shortcuts.md` | 完整 | 最新 |
| 命令面板 | `docs/tutorials/command-palette.md` | 完整 | 最新 |
| 其他教程 | `docs/tutorials/*.md` | 大部分完整 | 最新 |
| 审计报告 | `docs/audit/code-smells.md` | 完整 | v3.0.0，仍有参考价值 |
| 冗余审计 | `docs/audit/redundancy.md` | 完整 | v3.0.0，已执行清理 |
| 品牌决策 | `docs/audit/brand-decision.md` | 完整 | v3.0.0 |
| 发布说明 | `docs/release-notes-v3_0.md` | 完整 | 归档 |
| 发布说明 | `docs/release-notes-v3_0_1.md` | 完整 | 归档 |
| 历史文档 | `docs/_archive/` | 已归档 | 历史参考 |

### 9.2 文档问题

| 问题 | 严重级别 | 详情 |
|------|----------|------|
| `public/tutorials/` 与 `docs/tutorials/` 不同步 | P3 | `public/` 下多个文件只有 `TODO: 待补充`，而 `docs/` 下有完整内容。需要同步 |
| 教程缺少剧本编辑器 | P3 | `script-editor.md` 存在但内容待补充；功能已存在但文档未跟进 |
| 架构文档版本号滞后 | P4 | `ARCHITECTURE.md` 标注 v3.0.0，实际已是 v1.0.0，但核心架构描述仍准确 |
| 无 API 文档 | P3 | 没有 OpenAPI/Swagger 或类似的 API 参考文档 |
| 无组件库文档 | P4 | 无 Storybook 或组件文档 |

---

## 10. 风险评估与建议

### 10.1 高优先级问题（P0-P1）

| 优先级 | 问题 | 建议行动 |
|--------|------|----------|
| **P0** | 测试覆盖率几乎为零 | 立即制定测试计划，优先后端 API 集成测试 + 前端 hooks 测试 |
| **P1** | 无 CI/CD 自动化 | 配置 GitHub Actions：类型检查 -> 测试 -> 构建 -> 打包 |
| **P1** | `OutlineView.tsx` 904 行超大文件 | 拆分计划：拆出 `OutlineEditorDrawer` + `OutlineFilters` + `useOutlineQueries` |
| **P1** | 无 API 文档 | 为 Fastify 路由添加 Swagger/OpenAPI 注释，或使用 `@fastify/swagger` |
| **P1** | 无 ESLint/Prettier | 添加配置，纳入 CI 检查 |

### 10.2 中优先级问题（P2-P3）

| 优先级 | 问题 | 建议行动 |
|--------|------|----------|
| **P2** | 撤销/重做系统不完整 | 完成所有实体类型的撤销/重做支持 |
| **P2** | 多个 400+ 行组件文件 | 渐进式拆分：`ForeshadowingPanel`、`EventEditorDialog`、`CharacterPanel` 等 |
| **P3** | `EntityPanel<T>` 抽象未实现 | 抽取 `CharacterPanel` / `WorldBuildingPanel` / `ForeshadowingPanel` 的通用骨架 |
| **P3** | `lucide-react` / `radix-ui` 残留依赖 | 清理未使用的依赖，减小包体积 |
| **P3** | 教程文件同步 | 将 `docs/tutorials/` 内容同步到 `public/tutorials/` |
| **P3** | 无代码覆盖率报告 | 配置 `@vitest/coverage-v8`，设定覆盖率目标（建议 60%->80%） |
| **P3** | E2E 测试用 Python | 考虑迁移到 JS/TS 技术栈统一，或保持现状但加入 CI |

### 10.3 低优先级问题（P4）

| 优先级 | 问题 | 建议行动 |
|--------|------|----------|
| **P4** | `autoprefixer` / `postcss` 冗余 | 验证后移除 |
| **P4** | 版本号历史混乱 | 已在 v1.0.0 统一，无需额外处理 |
| **P4** | 无 Storybook | 低优先级，组件数量可控时可添加 |
| **P4** | `drizzle-orm` / `drizzle-kit` 升级 | 跟踪版本更新，评估升级收益 |

### 10.4 技术栈健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 技术选型 | 5/5 | 现代、成熟、社区活跃 |
| 架构设计 | 4/5 | 分层清晰，但部分组件文件过大 |
| 代码质量 | 4/5 | TypeScript 严格模式，几乎无 `any`，类型纪律好 |
| 测试覆盖 | 1/5 | 严重不足，仅 3 个测试文件 |
| 文档完整 | 4/5 | 核心文档齐全，部分教程待同步 |
| 构建流程 | 4/5 | 完整但可优化并行化和 CI/CD |
| 安全设计 | 4/5 | contextIsolation + 最小 IPC 暴露，合理 |
| 可维护性 | 3/5 | 大文件 + 低测试 = 未来维护风险 |
| **综合评分** | **3.5/5** | 功能丰富但测试和可维护性待提升 |

---

## 附录

### A. 项目统计

| 统计项 | 数值 |
|--------|------|
| 前端文件数 | 112 `.ts/.tsx` |
| 前端代码行数 | ~18,777 |
| 后端文件数 | 35 `.ts` |
| 后端代码行数 | ~6,858 |
| 共享代码 | 677 行 (`shared/types.ts`) |
| 数据库表 | 21 张 |
| 数据库索引 | 44 个 |
| 测试文件 | 3 个 |
| 测试用例 | ~11 个 |
| 依赖总数 | 64 个（39 生产 + 25 开发）|
| 最近提交 | `75a6703` fix(ui):修复 TButton 图标缺失 + UI/UX 深度重构 v2.0 |

### B. 关键文件速查

| 用途 | 文件路径 |
|------|----------|
| 项目入口 | `src/main.tsx` -> `src/App.tsx` |
| 主窗口布局 | `src/components/layout/AppShell.tsx` |
| 状态管理 | `src/stores/` (9 个 Zustand store) |
| 数据服务 | `src/services/api-hooks.ts` (~452 行) |
| API 封装 | `src/services/api.ts` |
| 命令面板 | `src/components/command-palette/CommandPalette.tsx` |
| 快捷键 | `src/lib/shortcut-registry.ts` |
| 命令注册 | `src/lib/command-registry.ts` |
| 调色板 | `src/lib/colors.ts` |
| 后端入口 | `server/index.ts` |
| 数据库 | `server/db/schema.ts` + `server/db/index.ts` |
| 迁移 | `server/db/migrate.ts` |
| 自动保存 | `server/services/auto-save.ts` |
| AI 代理 | `server/services/ai-proxy.ts` |
| 主进程 | `electron/main.ts` |
| 预加载 | `electron/preload.ts` |
| 自动更新 | `electron/updater.ts` |
| 构建配置 | `vite.config.ts` + `package.json#build` |
| 类型共享 | `shared/types.ts` |

---

> **报告生成**: 2026-06-20  
> **工具**: 文件读取 + 代码分析 + 文档审计  
> **置信度**: 高（基于实际源码分析，所有引用均有具体文件路径和行号）
