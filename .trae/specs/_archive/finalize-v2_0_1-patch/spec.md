# 最终收尾补丁 Spec (v2.0.1)

## Why
v2.0.0 已完成品牌焕新、文档清理与 GitHub 发版（commit `b19026a` / tag `v2.0.0`），但根据 [`handoff-next-v2_0.md`](../../documents/handoff-next-v2_0.md) 第 5 节"已知保留事项"与第 3 节优先级清单，仍有三类活儿明确遗留给"下一位 AI"，且全部属于"收尾"性质而非新功能：
1. `public/icon.ico` / `public/icon.png` 仍是旧时代图标，未与 v2.0 SVG 对齐；
2. Electron 安装包是否仍能正确显示 Storyloom 品牌从未被验证；
3. [`docs/audit/code-smells-v2_0.md`](../../../docs/audit/code-smells-v2_0.md) 列出的 Top 5 屎山修复仅完成 #1。

本 spec 把这三件事打成一个 patch 版本 v2.0.1，作为 v2.x 序列的真正"收官"。

## What Changes
- 用 `scripts/generate-icon.py`（基于 sharp/Pillow）从 `public/favicon.svg` 重新生成全套栅格图标：`favicon.ico`（含 16/32/48）、`apple-touch-icon.png` (180)、`icon-192.png`、`icon-512.png`、`icon-maskable.png`，以及 Electron 打包用的 `public/icon.ico` / `public/icon.png`。
- 跑 `npm run dist` 完整打包流程，确认安装向导、开始菜单条目、任务栏图标、`BrowserWindow` 标题全部使用 `Storyloom · 絮织` 与新图标。
- 实施 [`docs/audit/code-smells-v2_0.md`](../../../docs/audit/code-smells-v2_0.md) Top 5 中尚未完成的 #2–#5 中的最小成本子集：
  - **#5（小）**：在 [`src/lib/utils.ts`](../../../src/lib/utils.ts) 中新增 `safeJsonArray<T>` / `safeJsonObject<T>` 通用工具，并将 [`CharacterPanel.tsx`](../../../src/components/characters/CharacterPanel.tsx) 内的 `parseTraits` 等就地实现替换为该工具的调用。
  - **#4（中）**：在 server 端把 `[server]` / `[db]` / `[Migration]` / `[AI]` 前缀的 `console.log/warn/error`（共 21 处）替换为 fastify `app.log.*` 或顶层 `pino` logger（migrate.ts 这类 standalone 脚本仍允许 console，但加 ESLint 注释）。
  - **#3（中）**：拆分 [`server/routes/workspaces.ts`](../../../server/routes/workspaces.ts)（717 行）为 `workspaces/index.ts` + `workspaces/crud.ts` + `workspaces/import-export.ts` + `workspaces/auto-saves.ts`，保持外部路由路径不变。
  - **#2（大）**：本轮**只评估**抽取 `EntityPanel<T>`，不实施（成本超出 patch 预算，写入下一份 handoff）。
- 发布 v2.0.1 patch：`package.json` 版本号 → `2.0.1`，更新 [`docs/release-notes-v2_0.md`](../../../docs/release-notes-v2_0.md) 同级新增 `release-notes-v2_0_1.md`，提交 + 打 tag `v2.0.1` + GitHub Release。
- 更新 [`docs/audit/code-smells-v2_0.md`](../../../docs/audit/code-smells-v2_0.md) 末尾"本轮已实施重构"段，追加 v2.0.1 的修复记录。
- 写一份 `.trae/documents/handoff-next-v2_0_1.md` 接续移交，明确 v2.x 序列正式收官、把未做的 #2 EntityPanel 抽象与 OutlineView 拆分留给 v3 路线。

## Impact
- Affected specs:
  - [`rebrand-finalize-handoff-v2_0`](../rebrand-finalize-handoff-v2_0/) — 已完结，本 spec 是其遗留事项的延续，不回滚其内容
  - [`frontend-polish-luosheng-v1_4`](../frontend-polish-luosheng-v1_4/) — 已完结，仅引用
- Affected code / files:
  - 图标：`public/favicon.svg`（不动）、`public/icon.ico`、`public/icon.png`、`public/apple-touch-icon.png`、`public/icon-192.png`、`public/icon-512.png`、`public/icon-maskable.png`、`index.html` 的 `<link>` 段
  - Electron：`electron/main.ts`（确认 BrowserWindow icon 引用）、`package.json#build.win.icon` / `mac.icon` / `linux.icon`
  - server 重构：`server/routes/workspaces.ts` → 拆分；`server/index.ts` / `server/db/index.ts` / `server/db/migrate.ts` / `server/services/ai-proxy.ts` / `server/migration/v3-to-v4.ts` 的 console.*
  - 前端工具：`src/lib/utils.ts`、`src/components/characters/CharacterPanel.tsx`
  - 版本：`package.json#version` 1.1.0/2.0.0 → `2.0.1`
  - 文档：`docs/release-notes-v2_0_1.md`、`docs/audit/code-smells-v2_0.md`、`README.md`、`.trae/documents/handoff-next-v2_0_1.md`
  - 远端：tag `v2.0.1`、GitHub Release v2.0.1

## ADDED Requirements

### Requirement: 全套栅格图标
The system SHALL ship a complete set of raster icons derived from `public/favicon.svg` and reference them correctly in `index.html` and Electron build config.

#### Scenario: 浏览器/Electron 一致使用新图标
- **WHEN** 用户在浏览器打开 dev server 或安装 Electron 安装包
- **THEN** 浏览器 tab、Electron 任务栏、Windows 开始菜单、安装向导、`BrowserWindow` 左上角图标均显示新 Storyloom 图标，无 404 / 未找到资源警告

### Requirement: Electron 打包验证
The system SHALL verify that `npm run dist` produces an installable artifact whose product name, window title, taskbar icon and start-menu entry all read `Storyloom`.

#### Scenario: dist 产物品牌正确
- **WHEN** 维护者跑 `npm run dist`（按 `package.json` 指引设 `ATC_DIST_DIR`）
- **THEN** 产物目录内 `Storyloom Setup 2.0.1.exe`（或对应 mac/linux 名）可正常打开，启动后窗口标题为 `Storyloom · 絮织`，开始菜单/启动台条目为 `Storyloom`

### Requirement: 代码屎山 #3 #4 #5 修复
The system SHALL apply low-to-medium cost refactors from `docs/audit/code-smells-v2_0.md` priorities #3, #4, #5.

#### Scenario: safeJson 工具上线
- **WHEN** 任意组件需要把字符串解析为数组或对象并附 fallback
- **THEN** 调用 `safeJsonArray` / `safeJsonObject`（`src/lib/utils.ts`），不再就地写 try/catch + JSON.parse；`CharacterPanel.tsx` 的 `parseTraits` 已迁移

#### Scenario: server 日志统一
- **WHEN** server 运行时打印日志
- **THEN** 所有 `[server]` / `[db]` / `[AI]` 前缀的输出经由 fastify `app.log.*` 或顶层 pino logger；仅 standalone 脚本（如 `migrate.ts` / `v3-to-v4.ts` 命令行直跑路径）允许保留 console 并附 `// eslint-disable-next-line no-console` 注释

#### Scenario: workspaces.ts 拆分
- **WHEN** 维护者打开 `server/routes/workspaces.ts`
- **THEN** 单文件 ≤ 200 行；CRUD / import-export / auto-saves 子模块各占独立文件；外部 HTTP 路径与契约保持不变；`npm run typecheck` 通过

### Requirement: v2.0.1 发版
The system SHALL bump version to `2.0.1`, tag `v2.0.1` and publish a GitHub Release with notes referencing this spec.

#### Scenario: tag 与 release 可见
- **WHEN** 全部 checklist 通过
- **THEN** 远端可见 `v2.0.1` tag，GitHub Release 页面引用 `docs/release-notes-v2_0_1.md`

### Requirement: v2.x 收官移交
The system SHALL produce `.trae/documents/handoff-next-v2_0_1.md` declaring v2.x as closed and listing remaining work for v3.

#### Scenario: 移交文档完整
- **WHEN** 本 spec 全部 checklist 通过
- **THEN** 该移交文档存在并包含：本轮成果摘要、未做的 #2 EntityPanel/OutlineView 拆分明确移至 v3、关键文件索引、起步检查清单

## MODIFIED Requirements

### Requirement: 应用图标（继承自 v2.0）
现 v2.0.0 仅交付 SVG 主图标 + 旧栅格图标占位；v2.0.1 SHALL 用 SVG 重新生成所有栅格变体并替换旧的 `public/icon.ico` / `public/icon.png`，使 Electron 打包链路视觉与浏览器一致。

## REMOVED Requirements

无。本 spec 不移除任何已存在能力，仅补齐 v2.0 遗留项与最小成本重构。
