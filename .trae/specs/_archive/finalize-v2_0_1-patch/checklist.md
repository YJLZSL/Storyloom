# Checklist · finalize-v2_0_1-patch

## 基线
- [x] git 工作区干净，HEAD 为 `b19026a` 或其后裔
- [x] 起步 `npm run typecheck` 与 `npm run build` 均通过
- [x] `scripts/generate-icon.py` 与其依赖（sharp/Pillow）状态明确

## 图标
- [x] `public/favicon.ico` 由 v2.0 SVG 重新生成（含 16/32/48 多尺寸）
- [x] `public/apple-touch-icon.png` 180×180 存在
- [x] `public/icon-192.png` / `public/icon-512.png` / `public/icon-maskable.png` 存在且尺寸正确
- [x] `public/icon.ico` 与 `public/icon.png`（Electron 用）已替换为新版
- [x] `index.html` 的 `<link>` 段引用全部新文件、无 404
- [x] `package.json#build.win.icon` / `mac.icon` / `linux.icon` 指向新路径
- [x] dev server 浏览器 tab 显示新图标

## Electron 打包验证
- [x] `npm run dist` 在本机 Windows 平台执行成功（或失败原因详细记录到 release notes 已知问题段）
- [x] 产物文件名包含 `Storyloom` 与 `2.0.1`
- [x] 安装后任务栏 / 窗口标题 / 开始菜单条目显示 `Storyloom`
- [x] 验证截图（≥ 1 张）存于 `docs/screenshots/v2.0.1-dist/`

## 代码屎山 #5 — safeJson
- [x] `src/lib/utils.ts` 新增 `safeJsonArray` / `safeJsonObject`，附最小单测或类型保证
- [x] `CharacterPanel.tsx` 内 `parseTraits` 已迁移
- [x] 其它前端 `JSON.parse + try/catch + 数组兜底` 已尽量替换

## 代码屎山 #4 — server logger
- [x] `server/index.ts` 的 `[server]` console.* 全部替换为 `app.log.*`
- [x] `server/db/index.ts` 的 `[db]` 输出改用 pino 或注入式 logger
- [x] `server/services/ai-proxy.ts` 的 `[AI]` 输出统一
- [x] `migrate.ts` / `v3-to-v4.ts` 中保留的 console 已加 `// eslint-disable-next-line no-console` 注释
- [x] server 启动后日志仍正常输出

## 代码屎山 #3 — workspaces.ts 拆分
- [x] 新目录 `server/routes/workspaces/` 含 `index.ts` + `crud.ts` + `import-export.ts` + `auto-saves.ts`
- [x] 单文件均 ≤ 200 行
- [x] HTTP 路由路径与契约保持不变
- [x] `scripts/smoke_api_v1_0_1.mjs`（或同等冒烟）通过

## 构建质量门
- [x] `npm run typecheck` 通过（exit 0）
- [x] `npm run test` 通过（exit 0）
- [x] `npm run build` 通过（exit 0）

## 发版
- [x] `package.json#version` = `2.0.1`，`package-lock.json` 已同步
- [x] `docs/release-notes-v2_0_1.md` 完整存在并链接本 spec
- [x] `docs/audit/code-smells-v2_0.md` 末尾追加 v2.0.1 重构记录

## GitHub 同步
- [x] 已语义化提交并推送默认分支
- [x] `v2.0.1` tag 已推送
- [x] GitHub Release `v2.0.1` 已创建，附 release notes

## 移交
- [x] `.trae/documents/handoff-next-v2_0_1.md` 完整：成果摘要 / v2.x 收官声明 / v3 待办 / 关键索引
- [x] README 维护者交接段已链接 v2.0.1 handoff
- [x] 本 checklist 与 `tasks.md` 全部勾选
