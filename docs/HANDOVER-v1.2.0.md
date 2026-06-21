# Storyloom 项目交接文档 — 2026-06-21

> 本文档面向接替开发 AI。请通读全文后再动手。

---

## 一、项目概述

**Storyloom（絮织）** 是一款面向视觉小说 / 长篇小说 / 剧本创作者的本地桌面创作工作台。
- **当前版本**：v1.2.0（已发布，但存在已知问题，需要修复）
- **代码仓库**：https://github.com/YJLZSL/Storyloom
- **工作目录**：`D:\AIKFCC\Storyloom`
- **GitHub Token**：`***`（已隐藏，请从本地环境获取）

---

## 二、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | v19 |
| 构建工具 | Vite | v6 |
| 样式 | Tailwind CSS v4 + TDesign React | v1.17.1 |
| 图标 | @icon-park/react | — |
| 状态管理 | Zustand | v5 |
| 后端 | Fastify | v5 |
| 数据库 | SQLite (better-sqlite3) | — |
| ORM | Drizzle ORM | — |
| 桌面 | Electron | v42 |
| 打包 | electron-builder | v26 |
| 测试 | Vitest | — |
| Node.js | — | v24.15.1 |

---

## 三、当前版本状态（v1.2.0）

v1.2.0 已发布到 GitHub Release：https://github.com/YJLZSL/Storyloom/releases/tag/v1.2.0

### 已发布资产
- `Storyloom-Setup-1.2.0.exe`（131MB）
- `Storyloom-Setup-1.2.0.exe.blockmap`
- `latest.yml`

### 已构建验证
- `npm run typecheck` ✓ 通过（零 TypeScript 错误）
- `npm run build` ✓ 通过（Vite 前端构建）
- `npm run build:server` ✓ 通过（Fastify 后端构建）
- `npm run build:electron` ✓ 通过（Electron 主进程构建）
- `npm run electron:rebuild` ✓ 通过（better-sqlite3 原生模块重建）
- `electron-builder` ✓ 通过（NSIS 安装包生成）

---

## 四、已知问题清单（按优先级排序）

### 🔴 P0 — 严重功能故障

#### 1. 创建轨道失败
- **现象**：用户在新工作区中点击「新建轨道」→ 输入名称 → 点击「创建」→ 弹出「创建轨道失败」红色错误提示
- **截图证据**：见 `1782013967126-5-image.png`
- **定位**：`src/components/timeline/CreateTrackDialog.tsx` 调用 `useCreateTrack` → `api-hooks.ts` → 后端 `server/routes/tracks.ts`
- **排查方向**：
  1. 后端 `tracks.ts` 第 26-55 行创建逻辑，检查 `validateWorkspaceExists` 是否返回了 404
  2. 检查 `CreateTrackRequest` 类型（`shared/types.ts`）是否缺少 `orderIndex` 字段
  3. 检查 `tracks` 表 schema 中 `orderIndex` 的 `notNull().default(0)` 与后端代码逻辑是否冲突
  4. 检查前端发送的请求体是否完整（目前只发送了 `name` 和 `color`，缺少 `orderIndex` 和 `isVisible`）
  5. 查看 Electron 日志 `%APPDATA%\storyloom\app.log` 获取详细错误

#### 2. 工作区删除失败（"工作区不存在"）
- **现象**：WorkspaceManagerDialog 中点击「删除」→ 弹出「删除失败：工作区不存在」
- **截图证据**：见 `1782013925131-3-image.png`
- **定位**：`server/routes/workspaces/crud.ts` 的删除逻辑
- **排查方向**：
  1. 删除时请求体是否为空（之前修复过 `DELETE` 请求 `Content-Type` 问题）
  2. 检查 `api.ts` 的 `DELETE` 请求是否仍然设置了错误的 `Content-Type` 头
  3. 检查 `WorkspaceManagerDialog.tsx` 中删除按钮的 `onClick` 是否正确传递了 `workspaceId`

#### 3. 翻译键缺失（`workspace.manageTitle` 等）
- **现象**：多处界面显示英文翻译键而非中文，如 `workspace.manageTitle`、`panels.bookmarks`、`panels.maps` 等
- **截图证据**：见 `1782013925131-3-image.png`（WorkspaceManagerDialog 标题显示 `workspace.manageTitle`）
- **缺失键清单**：
  - `workspace.manageTitle`（WorkspaceManagerDialog 标题、TopToolbar  Tooltip）
  - `panels.bookmarks`（LeftPanel 工具标签、ContextPanel 标题）
  - `panels.maps`（LeftPanel 工具标签、ContextPanel 标题）
- **定位**：`src/lib/i18n/locales/zh-CN.json` 和 `src/lib/i18n/locales/en-US.json`
- **修复方向**：在 zh-CN.json 和 en-US.json 中补充缺失的翻译键

### 🟡 P1 — UI/UX 问题

#### 4. 番茄钟 MC 风格按钮文字溢出
- **现象**：番茄钟「挖掘中」按钮文字「挖掘中」三个字过大，超出按钮范围，显示为三个堆叠的汉字
- **截图证据**：见 `1782013925131-3-image.png` 和 `1782013957762-4-image.png`
- **定位**：`src/components/_shared/PomodoroTimer.tsx`
- **修复方向**：缩小该按钮字体大小，或使用更短的文案（如「进行中」），或调整按钮尺寸

#### 5. 字体全局适配不彻底
- **现象**：虽然移除了 `Press Start 2P`，但部分组件（如 Dialog 标题、按钮、轨道头部等）仍然使用系统默认字体，而非 `ZCOOL QingKe HuangYou`
- **截图证据**：各截图中均可观察到字体不一致
- **定位**：`src/index.css` 中的 `@theme` 和 `font-family` 定义
- **修复方向**：确保全局 `* { font-family: inherit; }` 生效，检查是否有组件硬编码了 `font-family`

#### 6. 右键菜单缺少「书签」和「地图」入口
- **现象**：右键菜单中只显示「新建事件、保存、切换专注模式、切换 Zen 模式、复制、粘贴」，没有「添加书签」或「添加到地图」的选项
- **截图证据**：见 `1782013957762-4-image.png`
- **定位**：右键菜单组件（可能在 `TimelineCanvas.tsx` 或 `EventCard.tsx` 中）
- **修复方向**：在右键菜单中添加上下文相关的书签和地图操作

### 🟢 P2 — 其他问题

#### 7. 自动更新链路可能无法覆盖全部老用户
- **现象**：用户反馈"老版本无法更新到1.2"
- **根因分析**：
  - v1.1.4 之前版本的 `package.json#build.publish` 指向了错误的仓库 owner（`liteli1987gmail`），已在 v1.1.4 修复为 `YJLZSL`
  - v1.1.4 及之后版本的 `build.publish` 配置正确（`owner: YJLZSL, repo: Storyloom`）
  - v1.2.0 的 `latest.yml` 内容正确（`url: Storyloom-Setup-1.2.0.exe`）
  - **结论**：已安装 v1.1.4+ 的用户理论上可以自动更新。v1.1.4 之前的用户必须手动下载安装
- **修复方向**：在 v1.2.1 的 `UpdateNotifier` 中添加更友好的提示，当检测到旧版本无法自动更新时，引导用户手动下载

---

## 五、需要新AI处理的任务

按优先级排序：

1. **修复创建轨道失败**（P0）
2. **修复翻译键缺失**（P0）
3. **修复番茄钟按钮文字溢出**（P1）
4. **修复字体全局适配**（P1）
5. **在右键菜单中添加书签/地图入口**（P1）
6. **修复工作区删除失败**（P0，如果仍然可复现）
7. **完善 v1.2.1 的更新提示逻辑**（P2）
8. **运行完整测试并验证修复**
9. **重新构建并发布 v1.2.1**

---

## 六、关键文件路径

| 功能 | 路径 |
|------|------|
| 翻译文件 | `src/lib/i18n/locales/zh-CN.json`、`src/lib/i18n/locales/en-US.json` |
| 创建轨道对话框 | `src/components/timeline/CreateTrackDialog.tsx` |
| 轨道后端路由 | `server/routes/tracks.ts` |
| 工作区管理对话框 | `src/components/workspace/WorkspaceManagerDialog.tsx` |
| 工作区后端路由 | `server/routes/workspaces/crud.ts` |
| 番茄钟 | `src/components/_shared/PomodoroTimer.tsx` |
| 全局样式 | `src/index.css` |
| 图标登记 | `src/lib/icons.ts` |
| 颜色调色板 | `src/lib/colors.ts` |
| API Hooks | `src/services/api-hooks.ts` |
| 后端入口 | `server/index.ts` |
| 数据库 Schema | `server/db/schema.ts` |
| 自动更新 | `electron/updater.ts` |
| 更新通知器 | `src/components/update/UpdateNotifier.tsx`（如有） |
| 左侧面板 | `src/components/layout/LeftPanel.tsx` |
| 右侧面板 | `src/components/layout/ContextPanel.tsx` |
| 时间轴画布 | `src/components/timeline/TimelineCanvas.tsx` |
| 书签面板 | `src/components/bookmark/BookmarkPanel.tsx` |
| 地图面板 | `src/components/maps/MapView.tsx` |
| 书签后端 | `server/routes/bookmarks.ts` |
| 地图后端 | `server/routes/maps.ts` |
| 版本号 | `package.json#version` |
| 构建配置 | `package.json#build` |
| 发布指南 | `docs/RELEASING.md` |

---

## 七、约束与注意事项

### 7.1 TButton 图标约束
**TButton 的 `icon` prop 不能传 IconPark 图标。** 必须当 children 使用：
```tsx
// ❌ 错误
<TButton icon={<SomeIcon />} />

// ✅ 正确
<TButton><SomeIcon /></TButton>
```

### 7.2 Dialog 使用约束
- 使用 `Dialog`（从 `src/components/ui-tdesign/dialog.tsx` 导出）而非 `TDialog`（原始 tdesign-react 组件）
- `Dialog` 接受 `open` 和 `onOpenChange` prop；`TDialog` 接受 `visible` 和 `onClose`
- 组件中统一用 `import { Dialog } from '@/components/ui-tdesign'`

### 7.3 数据库迁移约束
- **没有 drizzle 迁移文件**。改表结构要同时改：
  1. `server/db/schema.ts` — 表定义
  2. `server/db/index.ts` — 硬编码 DDL（`ensureSchemaCompatibility` 函数）
  3. 后端路由文件（如需新增/修改列）

### 7.4 图标 DPI 自适应
- 已使用 `clamp()` 公式：`size={Math.round(clamp(14, 16, 20))}` 等
- 图标大小应使用 `min` / `max` 或 `clamp()` 来响应式调整

### 7.5 构建环境
- 使用 Git Bash，**不能用 PowerShell**
- 构建命令：`npm run dist`（或 `npm run build && npm run build:server && npm run build:electron && npm run electron:rebuild && electron-builder --win --publish never`）
- 构建产物在 `release/` 目录
- `ATC_DIST_DIR` 环境变量需要设置为 `release`

### 7.6 版本号与发布
- `package.json#version` 必须同步更新
- 版本号格式：`X.Y.Z`（SemVer）
- 安装包命名必须连字符：`Storyloom-Setup-X.Y.Z.exe`（不能用空格）
- `appId` 不可变更：`com.ai.timeline-creator`
- `build.publish` 配置：`owner: YJLZSL, repo: Storyloom`
- 发布步骤参考 `docs/RELEASING.md`

---

## 八、构建与发布流程（标准 10 步）

参考 `docs/RELEASING.md`：

1. **Bump version**：修改 `package.json#version`，执行 `npm install --package-lock-only`
2. **质量门**：`npm run typecheck`、`npm run test`、`npm run build` — 必须全部 exit 0
3. **Commit**：`git add -A && git commit -m "chore(vX.Y.Z): ..."`
4. **Tag**：`git tag -a vX.Y.Z -m "Storyloom vX.Y.Z — ..."`
5. **Push**：`git push origin master && git push origin vX.Y.Z`
6. **构建分发包**：`$env:ATC_DIST_DIR = "release"; npm run dist`
7. **重命名**：将空格版文件名改为连字符版（如 `Storyloom Setup 1.2.0.exe` → `Storyloom-Setup-1.2.0.exe`）
8. **上传 GitHub Release**：使用 `gh release create` 或 GitHub API
9. **验证**：`Invoke-WebRequest https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml`
10. **更新 CHANGELOG**：`CHANGELOG.md` + `docs/CHANGELOG-vX.Y.Z.md`

---

## 九、调试日志

- **Electron 主进程日志**：`%APPDATA%\storyloom\app.log`
- **更新日志前缀**：`[updater] checking-for-update`、`[updater] update-available`、`[updater] error`
- **后端日志**：主进程通过 `setupLogging()` 将 stdout/stderr 写入 `app.log`

---

## 十、当前 Git 状态

- 分支：`master`
- 最新提交：`c4af907` — "chore(v1.2.0): 地图系统、书签系统、UI 字体修复与自适应优化"
- Tag：`v1.2.0` 已推送
- GitHub Release：v1.2.0 已发布，资产已上传

---

> **请接替 AI 优先处理 P0 级别的问题，然后按优先级顺序推进。** 所有文档和代码请使用中文。如有疑问，请查阅 `docs/RELEASING.md`、`docs/DEVELOPMENT.md` 和 `docs/QUICKSTART.md`。
