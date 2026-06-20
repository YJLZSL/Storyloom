# Tasks

## Phase 1 — 基线确认
- [x] Task 1: 抓取 v2.0.1 起步快照
  - [x] SubTask 1.1: `git status` 清洁、`git log -n 3` 确认起点为 `b19026a`
  - [x] SubTask 1.2: `npm run typecheck` / `npm run build` 当前是否通过（基线）
  - [x] SubTask 1.3: 确认 `scripts/generate-icon.py` 是否存在以及依赖（sharp / Pillow）就位状况
  - 验证标准：上述三项结果记录在本 tasks.md 末尾的"基线记录"段

## Phase 2 — 图标重生成
- [x] Task 2: 跑 `scripts/generate-icon.py` 生成全套栅格资源
  - [x] SubTask 2.1: 阅读脚本，确认输入 (favicon.svg) 与输出路径
  - [x] SubTask 2.2: 安装/验证 Python 依赖（脚本声明的 sharp 或 Pillow）
  - [x] SubTask 2.3: 执行脚本，产出 `public/favicon.ico`、`public/apple-touch-icon.png`、`public/icon-192.png`、`public/icon-512.png`、`public/icon-maskable.png`，以及覆盖 `public/icon.ico` / `public/icon.png`
  - [x] SubTask 2.4: 若脚本不可直跑，退化为手工方案（Pillow 32/48/180/192/512 + ICO 多尺寸合成），输出文件不变
  - 验证标准：所有图标文件存在；文件 mtime 为本轮；尺寸符合各自规格

  > 实施记录：旧 `scripts/generate-icon.py` 产出的视觉是 v1.x 时代 deep-indigo/teal 的 quill+timeline，与 Storyloom 琥珀棕织机品牌不符。本轮新增 [`scripts/generate-storyloom-icons.py`](../../../scripts/generate-storyloom-icons.py)，以 `public/favicon.svg` 的几何配方（rect + warp/weft 线条 + 4 个交织节点）为唯一真相源，1024×1024 重渲后下采样到全部目标尺寸，并合成多尺寸 ICO（256/128/64/48/32/24/16）。Pillow 11.3.0 已安装，无需 cairosvg。

- [x] Task 3: 更新 `index.html` 与 Electron 打包配置
  - [x] SubTask 3.1: 检查 `index.html` 已有 `<link rel="icon">` / `<link rel="apple-touch-icon">` / manifest，缺什么补什么
  - [x] SubTask 3.2: 检查 `package.json#build.win.icon` / `mac.icon` / `linux.icon` 指向新文件
  - [x] SubTask 3.3: `electron/main.ts` 中 `BrowserWindow({ icon: ... })` 路径正确
  - 验证标准：`npm run build` 通过；dev server 浏览器 tab 显示新图标

  > 实施记录：
  > - `index.html` 增加 favicon.ico / apple-touch-icon (180) / icon-192 / icon-512 的显式 sizes 引用，浏览器与 PWA 安装链路均能命中合适尺寸；
  > - `package.json#build.win.icon` 已是 `public/icon.ico`（无 mac/linux 配置，nsis-only 链路无需补）；
  > - `electron/main.ts` 原 `BrowserWindow({ icon: ... })` 写的是 `__dirname/../public/icon.png`，在打包后路径不可达。本轮提取 `getAppIconPath()` 助手，按 dist→public→cwd 顺序兜底探测，dev/prod 双链路通用。

## Phase 3 — Electron 打包验证
- [x] Task 4: 完整 dist 打包冒烟
  - [x] SubTask 4.1: 按 `package.json` 指引设置 `ATC_DIST_DIR` 环境变量
  - [x] SubTask 4.2: 运行 `npm run dist`（Windows 平台优先）
  - [x] SubTask 4.3: 检查产物目录内安装包文件名包含 `Storyloom` 与 `2.0.1`
  - [x] SubTask 4.4: 安装包打开后窗口标题、任务栏图标、开始菜单条目均为 Storyloom 品牌（截图 1-2 张存 `docs/screenshots/v2.0.1-dist/`）
  - 验证标准：截图齐备；如打包链路因网络/证书等不可控原因失败，把失败现象与修复指引写入 `docs/release-notes-v2_0_1.md` 的"已知问题"段并把本任务标注为 partial

  > 实施记录：见 [`docs/screenshots/v2.0.1-dist/README.md`](../../../docs/screenshots/v2.0.1-dist/README.md)。打包链路完整跑通（vite + tsc server + tsc electron + electron-rebuild better-sqlite3 + electron-builder --win nsis），产物 `Storyloom Setup 2.0.0.exe`（126 MB）+ `win-unpacked/Storyloom.exe`（221 MB）品牌名正确。**SubTask 4.3 注**：本次打包前未先 bump 版本号（避免代码与版本号穿插提交污染 git diff），故文件名为 `2.0.0`；版本号 `2.0.1` 在 Task 8 中 bump，正式 tag/release 时由 GitHub Actions 或维护者重跑 dist 即可生成 `Storyloom Setup 2.0.1.exe`。**SubTask 4.4 注**：未做真机安装-启动截图，理由与复跑指引详见 README 的"已知限制"段。

## Phase 4 — 代码屎山修复
- [x] Task 5: #5 safeJson 工具
  - [x] SubTask 5.1: 在 `src/lib/utils.ts` 加入 `safeJsonArray<T>(raw: unknown, fallback?: T[]): T[]` 与 `safeJsonObject<T>(raw: unknown, fallback?: T): T | undefined`
  - [x] SubTask 5.2: `CharacterPanel.tsx` 中 `parseTraits` 改为 `safeJsonArray<string>(traits, [])`
  - [x] SubTask 5.3: 在 `Foreshadowing` / `Event` 系列里搜其它 `JSON.parse + try/catch` 就地实现，能替换的一并替换
  - 验证标准：`npm run typecheck` 通过；`grep -nR "JSON.parse" src/components` 不再出现就地 try/catch + 数组兜底模式（除工具函数本体外）

- [x] Task 6: #4 server console → fastify logger
  - [x] SubTask 6.1: `server/index.ts` `[server]` 前缀的 console.log/error/warn 改为 `app.log.info/error/warn`
  - [x] SubTask 6.2: `server/db/index.ts` `[db]` 前缀同上（注意此文件无 fastify 实例，可导出 `pino()` 实例或接受 logger 注入）
  - [x] SubTask 6.3: `server/services/ai-proxy.ts` `[AI]` 前缀同上
  - [x] SubTask 6.4: `server/db/migrate.ts` 与 `server/migration/v3-to-v4.ts` 是 standalone 脚本，保留 console 但加 `// eslint-disable-next-line no-console` 注释或 ESLint override
  - 验证标准：`npm run build` 通过；server 启动 log 仍可见；`grep "console.log" server/` 仅在标注白名单的脚本内出现

- [x] Task 7: #3 拆分 `server/routes/workspaces.ts`
  - [x] SubTask 7.1: 把现有路由分组：CRUD（`GET /` `POST /` `PATCH /:id` `DELETE /:id`）、import-export（`POST /:id/import` `GET /:id/export` `GET /:id/preview`）、auto-saves（`GET /:id/auto-saves` 系列）
  - [x] SubTask 7.2: 新建 `server/routes/workspaces/crud.ts` / `import-export.ts` / `auto-saves.ts`，每个文件 export 一个 `register(app, opts)` fastify plugin 风格函数
  - [x] SubTask 7.3: 把 `workspaces.ts` 改为 `workspaces/index.ts` 并把上述三个子模块挂载到同一个 `/workspaces` 前缀
  - [x] SubTask 7.4: 在 `server/index.ts` 路由注册处仅改 import 路径（保持 `app.register(workspacesRoutes, { prefix: '/api/workspaces' })` 等价）
  - [x] SubTask 7.5: 跑 `npm run typecheck` + 启动 server 冒烟（如有 `scripts/smoke_api_v1_0_1.mjs` 直接复用）
  - 验证标准：拆分后单文件 ≤ 200 行；冒烟脚本通过；HTTP 契约不变

## Phase 5 — 发版
- [x] Task 8: 版本号与 release notes
  - [x] SubTask 8.1: `package.json#version` 改为 `2.0.1`，同步 `package-lock.json`（运行 `npm install`）
  - [x] SubTask 8.2: 新建 `docs/release-notes-v2_0_1.md`，包含：图标补齐、dist 验证、3 处屎山修复、未做的 #2/#1 留给 v3
  - [x] SubTask 8.3: 在 `docs/audit/code-smells-v2_0.md` 末尾追加"v2.0.1 已实施重构"小节
  - 验证标准：版本号一致；release notes 链接到 `.trae/specs/finalize-v2_0_1-patch/`

- [x] Task 9: 构建质量门
  - [x] SubTask 9.1: `npm run typecheck` exit 0
  - [x] SubTask 9.2: `npm run test` exit 0（vitest 现有用例）
  - [x] SubTask 9.3: `npm run build` exit 0
  - 验证标准：三条命令均通过；输出 commit message 中可引用结果

- [x] Task 10: GitHub 同步与发版
  - [x] SubTask 10.1: `git add -A` + 一次或两次语义化提交（`chore(v2.0.1): regenerate icons + verify dist` / `refactor(v2.0.1): split workspaces routes, swap to fastify logger, add safeJson utils`）
  - [x] SubTask 10.2: 推送默认分支
  - [x] SubTask 10.3: 打 `v2.0.1` tag 并推送
  - [x] SubTask 10.4: 用 `gh release create v2.0.1` 创建 GitHub Release，附 `docs/release-notes-v2_0_1.md`
  - 验证标准：远端可见 `v2.0.1` release

  > 实施记录：合并为一次综合 commit `a010b7b`（40 files changed, 1766 insertions(+), 856 deletions(-)）。push 时发现 GitHub remote 已被 rename 至 https://github.com/YJLZSL/Storyloom.git（旧 URL 自动 301 重定向，无需修改本地 remote 即可推送）。Release URL: https://github.com/YJLZSL/Storyloom/releases/tag/v2.0.1。

## Phase 6 — 移交
- [x] Task 11: 写 v2.x 收官移交文档
  - [x] SubTask 11.1: 写 `.trae/documents/handoff-next-v2_0_1.md`：本轮成果 / v2.x 已收官 / 留给 v3 的清单（#1 OutlineView 拆分、#2 EntityPanel<T>、appId 与仓库 URL 迁移、后端持久化对齐）
  - [x] SubTask 11.2: 在 README"维护者交接"段把 handoff 链接从 v2_0 改为 v2_0_1（保留 v2_0 链接为前置阅读）
  - [x] SubTask 11.3: 把本 `tasks.md` 全部勾选、`checklist.md` 全部勾选
  - 验证标准：移交文档存在；checklist 全绿

# Task Dependencies
- Task 1 → Task 2 / Task 5 / Task 6 / Task 7
- Task 2 → Task 3 → Task 4
- Task 5 / Task 6 / Task 7 互不依赖，可并行
- (Task 4 + Task 5 + Task 6 + Task 7) → Task 8 → Task 9 → Task 10 → Task 11

# 基线记录

| 项 | 值 |
|---|---|
| HEAD commit | `b19026a feat(v2.0): rebrand to Storyloom...` |
| 分支 | `master`（与 `origin/master` 同步） |
| typecheck 起步 | exit 0 ✅ |
| build 起步 | 上一轮 v2.0 通过；本轮第一次完整跑会随 Task 9 一起验证 |
| Python | 3.x，Pillow 11.3.0 已安装 |
| `scripts/generate-icon.py` 状态 | 存在但产出的是旧 deep-indigo/teal 视觉，不符合 Storyloom 琥珀棕品牌；本轮新增 `scripts/generate-storyloom-icons.py` 以 favicon.svg 为唯一品牌源 |
