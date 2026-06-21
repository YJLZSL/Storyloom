# 快速参考 — 5 分钟上手

> 如果你是接替的 AI，先读这篇，再读 HANDOVER.md。

## 项目一句话

Storyloom = Electron + React + Fastify + SQLite 的小说创作时间轴工具。前端在 `src/`，后端在 `server/`。

## 关键约束（踩坑预警）

1. **TButton 的 `icon` prop 不能传 IconPark 图标** — 必须当 children 用：`<TButton><Icon /></TButton>`
2. **没有 drizzle 迁移文件** — 改表结构要改 `schema.ts` + `db/index.ts` 的硬编码 DDL + `ensureSchemaCompatibility`
3. **Windows Git Bash 环境** — 不能用 PowerShell，用 `node scripts/build-nsis.cjs` 构建 NSIS

## 用户最急迫的问题（按优先级）

| # | 问题 | 文件 | 修复方向 |
|---|------|------|---------|
| 1 | 隐藏轨道恢复按钮点击无反应 | `TimelineCanvas.tsx` ~470行 | 加 `stopPropagation` + `z-index` + 确保 query 失效 |
| 2 | 整体 UI 观感差，布局不自适应 | 全局 CSS + 各布局组件 | 引入 CSS 变量 + 响应式断点 + `clamp()` |
| 3 | AI 厂商图标不是真实品牌 logo | `AISettingsTab.tsx` | 替换为真实品牌 SVG |
| 4 | 前端未调用 AI 工作区上下文 | `AIPanel.tsx` + `ai-stream.ts` | 在 sendMessage 中调用 `/api/ai/workspace-context` |
| 5 | AI 对话历史未存数据库 | 需新增路由 + 改 hook | 后端加 CRUD 路由，前端改 `useAIConversations` |

## 常用命令

```bash
cd D:\AIKFCC\Storyloom

# 检查类型
npm run typecheck

# 测试
npm test

# 构建（完整顺序）
npm run build && npm run build:server && npm run build:electron
node scripts/build-nsis.cjs

# 单独构建前端
npm run build

# 单独构建后端
npm run build:server

# 重建原生模块
npm run electron:rebuild
```

## 文件速查

| 要找什么 | 去这里 |
|---------|--------|
| 主题/颜色定义 | `src/index.css` (~2400 行) |
| 图标列表 | `src/lib/icons.ts` |
| 顶部导航栏 | `src/components/layout/TopToolbar.tsx` |
| 左侧边栏 | `src/components/layout/LeftPanel.tsx` |
| 时间轴画布 | `src/components/timeline/TimelineCanvas.tsx` |
| 轨道渲染 | `src/components/timeline/TimelineTrack.tsx` |
| AI 面板 | `src/components/ai-panel/AIPanel.tsx` |
| AI 配置 | `src/components/ai-panel/AIConfigPanel.tsx` |
| AI 设置 Tab | `src/components/settings/AISettingsTab.tsx` |
| 设置对话框 | `src/components/settings/SettingsDialog.tsx` |
| 快捷键设置 | `src/components/settings/ShortcutSettings.tsx` |
| 后端路由 | `server/routes/` |
| AI 代理 | `server/services/ai-proxy.ts` |
| 数据库表 | `server/db/schema.ts` |
| 数据库连接 | `server/db/index.ts` |
| 共享类型 | `shared/types.ts` |
| 校验规则 | `server/lib/validation.ts` |

## 状态管理速查

```
useUIStore           → focusMode, zenMode, settingsOpen, activePanel, panelWidth
useTimelineStore     → zoom, viewMode, visibleDateRange, showConnectionLines
useWorkspaceStore    → currentWorkspaceId
useSelectionStore    → selectedEventId, selectedCharacterId
useTrackStore        → selectedTrackId, editingTrackId
useViewStore         → activeView
useSettingsStore     → theme, fontSize, openLastWorkspace, autoSave
```

## 测试状态

- 当前：**193/193 通过**，0 错误
- 每次修改后必须运行 `npm run typecheck` 和 `npm test`

## 发布流程

1. 修改 `package.json` 版本号（或 `npm version minor`）
2. 构建：`npm run build && npm run build:server && npm run build:electron`
3. 构建 NSIS：`node scripts/build-nsis.cjs`
4. 检查 `release/latest.yml` 中的 `url` 和 `path`
5. 创建 GitHub Release（使用 `curl` 调用 API）
6. 上传：`Storyloom-Setup-X.X.X.exe` + `latest.yml` + `.blockmap`

---

## 下一步该做什么

用户说"问题很大"，需要下一个 AI 彻底重做前端 UI。建议按以下顺序：

1. **先修 P0-1**：隐藏轨道恢复按钮 — 这是用户最急迫的问题（1 小时）
2. **再修 P0-3**：替换所有 AI 厂商图标为真实品牌 SVG（2 小时）
3. **然后重写响应式布局**：从 `TopToolbar` 和 `LeftPanel` 开始，引入 CSS 变量系统（4-6 小时）
4. **最后实现 AI 功能**：工作区上下文读取、对话历史持久化（4-6 小时）

---

*本文档最后更新：2026-06-20*
