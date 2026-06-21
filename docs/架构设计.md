# Storyloom 技术架构文档

> 面向接替 AI 的架构速查。理解数据流、状态管理和组件通信方式。

---

## 1. 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面框架 | Electron | 42.4.0 | 跨平台桌面壳 |
| 前端框架 | React | 19.2.7 | UI 渲染 |
| 构建工具 | Vite | 6.4.3 | 前端打包 |
| 样式 | Tailwind CSS | v4 | 原子化 CSS |
| UI 组件 | TDesign React | latest | 企业级 UI 组件 |
| UI 组件 | shadcn/ui | latest | 底层 UI 基元（Dialog, Button, Tooltip 等） |
| 状态管理 | Zustand | 4.x | 全局状态 |
| 数据获取 | TanStack Query | 5.x | 服务端状态缓存 |
| 动画 | Framer Motion | 11.x | 页面切换动画 |
| 图标 | IconPark React | latest | 图标库 |
| 后端框架 | Fastify | 5.x | HTTP API 服务器 |
| ORM | Drizzle ORM | 0.x | SQLite 类型安全 ORM |
| 数据库 | SQLite | 3.x | 本地数据库 |
| 驱动 | better-sqlite3 | latest | 同步 SQLite 驱动 |
| 日志 | Pino | 9.x | 结构化日志 |

---

## 2. 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron 主进程                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  main.ts     │  │ 加载页面      │  │ IPC 通信      │         │
│  │ 窗口管理      │  │ loading.html │  │ 安全桥接      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Electron 渲染进程                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                        React 前端                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Zustand  │  │ TanStack │  │ React    │  │ TDesign  │  │  │
│  │  │ Stores   │  │ Query    │  │ Components│  │ + shadcn │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │                          │                               │  │
│  │                          ▼ HTTP fetch                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ localhost:3001
┌─────────────────────────────────────────────────────────────────┐
│                        Fastify 后端服务                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│  │
│  │  │  Routes  │  │  Services│  │  Drizzle │  │  SQLite  ││  │
│  │  │  API 端点 │  │  业务逻辑 │  │  ORM     │  │  DB      ││  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 状态管理（Zustand Stores）

### useUIStore — UI 全局状态
```typescript
interface UIState {
  focusMode: boolean;        // 专注模式
  zenMode: boolean;          // 禅模式（全屏）
  settingsOpen: boolean;     // 设置对话框
  commandPaletteOpen: boolean; // 命令面板
  activePanel: string | null; // 右侧面板类型
  panelWidth: number;        // 右侧面板宽度
  // ...actions
}
```

### useTimelineStore — 时间轴视图状态
```typescript
interface TimelineState {
  zoom: number;              // 缩放比例 (0.5 - 3.0)
  viewMode: ViewMode;        // 'timeline' | 'outline' | 'narrative' | ...
  visibleDateRange: { startMs: number; endMs: number } | null;
  showConnectionLines: boolean;
  scrollToEventId: string | null;
  // ...actions
}
```

### useWorkspaceStore — 工作区状态
```typescript
interface WorkspaceState {
  currentWorkspaceId: string | null;
  // ...actions
}
```

### useSelectionStore — 选中状态
```typescript
interface SelectionState {
  selectedEventId: string | null;
  selectedCharacterId: string | null;
  // ...actions
}
```

### useTrackStore — 轨道操作状态
```typescript
interface TrackState {
  selectedTrackId: string | null;
  editingTrackId: string | null;
  // ...actions
}
```

### useViewStore — 视图切换
```typescript
interface ViewState {
  activeView: ViewId;        // 'timeline' | 'outline' | ...
  // ...actions
}
```

---

## 4. API 架构

### 路由结构（`server/routes/`）

```
/api/workspaces              GET|POST        工作区 CRUD
/api/workspaces/:id          GET|PATCH|DELETE
/api/workspaces/:id/export   POST            导出
/api/workspaces/:id/import   POST            导入
/api/workspaces/:id/auto-saves  GET|POST     自动保存
/api/workspaces/:id/outline-versions GET|POST 大纲版本
/api/workspaces/:id/search   POST            全文搜索
/api/workspaces/:id/replace  POST            批量替换

/api/workspaces/:id/tracks              GET|POST
/api/workspaces/:id/tracks/:trackId     GET|PATCH|DELETE
/api/workspaces/:id/tracks/reorder     POST

/api/workspaces/:id/events              GET|POST
/api/workspaces/:id/events/:eventId     GET|PATCH|DELETE
/api/workspaces/:id/events/batch        POST

/api/workspaces/:id/characters          GET|POST
/api/workspaces/:id/characters/:charId GET|PATCH|DELETE

/api/workspaces/:id/connections         GET|POST
/api/workspaces/:id/connections/:connId PATCH|DELETE

/api/workspaces/:id/foreshadowings      GET|POST
/api/workspaces/:id/foreshadowings/:id  GET|PATCH|DELETE

/api/workspaces/:id/world-settings      GET|POST
/api/workspaces/:id/world-settings/:id   GET|PATCH|DELETE

/api/workspaces/:id/maps               GET|POST
/api/workspaces/:id/maps/:mapId        GET|PATCH|DELETE
/api/workspaces/:id/maps/:mapId/scenes GET|POST

/api/workspaces/:id/scenes/:sceneId        GET|PATCH|DELETE
/api/workspaces/:id/scenes/:sceneId/beats  GET|POST
/api/workspaces/:id/scenes/:sceneId/beats/:beatId GET|PATCH|DELETE
/api/workspaces/:id/scenes/:sceneId/beats/:beatId/choices GET|POST

/api/workspaces/:id/flags               GET|POST
/api/workspaces/:id/flags/:flagId       GET|PATCH|DELETE

/api/assets                             POST (multipart upload)
/api/assets/:assetId                    GET|DELETE

/api/ai/chat           POST    AI 对话（流式/非流式）
/api/ai/test           POST    测试连接
/api/ai/models         POST    获取模型列表
/api/ai/workspace-context POST 获取工作区上下文

/api/health            GET     健康检查
```

### 统一响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
```

---

## 5. 数据库架构（SQLite + Drizzle）

### 核心表（17 个）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `workspaces` | 工作区 | id, name, description, settings_json, calendar_config_json |
| `tracks` | 时间轴轨道 | id, workspace_id, name, color, order_index, is_visible |
| `events` | 时间轴事件 | id, workspace_id, track_id, title, summary, description, start_time, end_time, narrative_order |
| `characters` | 角色 | id, workspace_id, name, role, description, avatar_url, traits_json |
| `connections` | 事件关联 | id, workspace_id, source_event_id, target_event_id, type, description |
| `foreshadowings` | 伏笔 | id, workspace_id, title, description, status, planted_event_id, resolved_event_id |
| `world_settings` | 世界观设定 | id, workspace_id, category, key, value, description |
| `assets` | 资源文件 | id, workspace_id, kind, file_name, mime_type, sha256 |
| `maps` | 地图 | id, workspace_id, name, background_asset_id, markers_json |
| `scenes` | 场景 | id, workspace_id, name, background_asset_id, bgm, scene_order |
| `beats` | 节拍 | id, scene_id, kind, character_id, text, beat_order |
| `choices` | 选项 | id, beat_id, label, next_scene_id, condition |
| `flags` | 标志变量 | id, workspace_id, name, default_value_json, description |
| `auto_saves` | 自动保存 | id, workspace_id, data_json |
| `outline_versions` | 大纲版本 | id, workspace_id, content, description |
| `revisions` | 操作历史 | id, workspace_id, entity_type, entity_id, op, before_json, after_json |
| `event_characters` | 事件-角色关联 | event_id, character_id, role_description |

### 新增 AI 表（v1.1.0，2 个）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `ai_conversations` | 对话历史 | id, workspace_id, title, messages_json, summary |
| `ai_cache` | 语义缓存 | id, workspace_id, query_hash, query_text, response, model, hit_count |

---

## 6. 主题系统

### 8 个主题（`src/index.css`）

| 主题键 | 名称 | 特点 |
|--------|------|------|
| `theme-loosheng` | 洛生（默认） | 暖米色，东方风格 |
| `theme-midnight` | 子夜 | 深色蓝调 |
| `theme-forest` | 森林 | 绿色系 |
| `theme-ink` | 水墨 | 黑白极简 |
| `theme-highcontrast` | 高对比 | 无障碍 |
| `theme-sakura` | 桜 | 粉色樱花 |
| `theme-deepsea` | 深海 | 蓝色深海 |
| `theme-aurora` | 极光 | 紫绿渐变 |

### 主题切换机制
- 主题通过 `useSettingsStore` 的 `theme` 状态管理
- 在 `<html>` 标签上添加 `data-theme="theme-name"` 属性
- CSS 使用 `:root[data-theme="xxx"]` 选择器定义变量
- 变量格式：`--color-*`, `--border-*`, `--radius-*`, `--shadow-*`, `--glass-*`

---

## 7. 关键组件通信

### AppShell 布局
```
AppShell
├── TopToolbar          (h-11, 固定高度)
├── LeftPanel           (w-60/w-12, 可折叠)
├── MainCanvas          (flex-1, 动态内容)
│   ├── TimelineView    → TimelineCanvas
│   ├── OutlineView
│   ├── NarrativeView
│   ├── GanttTimelineView
│   ├── TreeTimelineView
│   ├── StatsView
│   └── RelationshipView
├── ContextPanel        (右侧面板, 可调整宽度)
│   ├── EventEditor
│   ├── AIPanel
│   ├── CharacterPanel
│   └── ...
├── StatusBar           (h-6, 底部)
├── ZenMode             (全屏覆盖层)
├── CommandPalette      (Cmd+K)
├── SettingsDialog
└── EventDetailView
```

### 数据流
```
用户操作 → Zustand Store → TanStack Query Mutation
                                        ↓
                              Fastify API → Drizzle ORM → SQLite
                                        ↓
                              invalidateQueries → React re-render
```

---

## 8. 构建产物

```
release/
├── win-unpacked/                    # 未打包的 Electron 应用
│   └── Storyloom.exe               # 可执行文件
├── Storyloom Setup 1.1.0.exe       # NSIS 安装包（131 MB）
├── Storyloom-Setup-1.1.0.exe.blockmap  # 自动更新块映射
├── latest.yml                      # 自动更新元数据
└── builder-debug.yml               # 构建调试信息
```

---

## 9. 开发注意事项

### 9.1 必须使用 `Edit` 工具修改文件
- 用 `Read` 读取文件后，使用 `Edit` 的 `old_string`/`new_string` 精确替换
- 不要猜测 `old_string`，必须从 `Read` 输出中复制
- 对于大文件，使用 `line_offset` 和 `n_lines` 分页读取

### 9.2 不要依赖 `drizzle` 迁移目录
- 项目没有 `drizzle/` 目录，不使用 `drizzle-kit generate`
- 数据库迁移在 `server/db/index.ts` 中通过硬编码 DDL 执行
- 新增表/列必须同时修改：schema.ts → index.ts DDL → ensureSchemaCompatibility

### 9.3 构建时序
- 必须先 `npm run build`（前端），再 `npm run build:server`（后端），再 `npm run build:electron`
- `electron:rebuild` 用于重建原生模块（如 better-sqlite3）
- NSIS 构建：`node scripts/build-nsis.cjs`

### 9.4 测试
- 测试框架：Vitest
- 测试文件：`*.{test,spec}.{ts,tsx}`
- 运行：`npm test`
- 当前通过：193/193（22 个测试文件）

---

*本文档基于 v1.1.0 版本，最后更新：2026-06-20*
