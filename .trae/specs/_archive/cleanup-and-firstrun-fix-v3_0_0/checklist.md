# Checklist · cleanup-and-firstrun-fix-v3_0_0

## 基线
- [x] git 工作区干净，HEAD commit 已记录
- [x] 起步 `npm run typecheck` 与 `npm run test` 通过
- [x] 两个 bug 现象 + 定位文件已写入 tasks.md

## 首启 UX
- [x] 新增 `src/components/layout/EmptyShell.tsx`，文件 ≤ 100 行
- [x] EmptyShell 包含：品牌条（logo + 标题 + 语言切换/设置/关于）+ 居中 WorkspaceSelector
- [x] EmptyShell 不引用任何 TopToolbar / SideNav / StatusBar 组件
- [x] `AppShell.tsx` 在 `currentWorkspaceId == null` 时直接返回 `<EmptyShell />`
- [x] `WorkspaceContent` 内部 `if (!currentWorkspaceId) return <WorkspaceSelector />` 已移除
- [x] dev server 实测：无工作区时左侧导航 / 顶部 toolbar / 底部 statusbar 都不可见
- [x] dev server 实测：无工作区时 `Ctrl+P` 命令面板要么不弹要么不显示工作区相关命令

## 新建工作区 bug
- [x] 在 `tasks.md` 的"诊断"段写下真因（≤ 5 行）
- [x] 修复后 dev server 实测：输入名称后"创建"按钮立刻可点
- [x] 失败时显示具体 server / network 错误的 toast，而非静默
- [x] 成功后自动 setCurrentWorkspace + dialog 关闭 + 进入完整 AppShell
- [x] "三幕式"模板创建 ≤ 3s 完成，模板生成的轨道与事件可见

## GitHub Releases 整理
- [x] 8 个老 release（v4.0.0 / v4.1.0 / v4.2.1 / v1.0.0 / v1.0.1 / v1.1.0 / v2.0.0 / v2.0.1）标题前已加 `[ARCHIVED] `
- [x] 这些 release 的 notes 末尾追加"see CHANGELOG.md and v3.0.0 release"
- [x] v2.0.2 标题保留不变（auto-update 链路依赖）
- [x] `gh release list` 顶部条目是 v3.0.0 (Latest) + v2.0.2

## GitHub repository metadata
- [x] `gh repo view YJLZSL/Storyloom --json description` 描述包含 v3.0 焕新关键字
- [x] topics 列表 ≥ 15 项（实际 16 项）

## 仓库内目录大归档
- [x] `.trae/specs/_archive/` 装入 20 个老 spec
- [x] `.trae/specs/` 顶层只剩 3 个 spec（finalize-v2_0_1-patch / rebrand-finalize-handoff-v2_0 / cleanup-and-firstrun-fix-v3_0_0）+ `_archive/`
- [x] `.trae/documents/_archive/` 装入全部 8 份历史文件
- [x] `.trae/documents/` 顶层只剩 `handoff-next-v3_0.md` + `_archive/`
- [x] `docs/_archive/` 装入 15 份历史 .md
- [x] `docs/screenshots/_archive/` 装入 luosheng-research / v1.3 / v1.4 等历史截图
- [x] `docs/screenshots/` 顶层只剩 `v2.0-rebrand/`、`v2.0.1-dist/`、`_archive/`

## audit 通版
- [x] `docs/audit/baseline.md` / `brand-decision.md` / `code-smells.md` / `redundancy.md` 都已去掉 `-v2_0` 后缀
- [x] 4 份文件头部都有 "最后更新：v3.0.0 / 范围：截至 v3.0 时点"
- [x] code-smells.md 末尾追加 v3.0.0 状态小节

## 重写四份核心参考文档
- [x] `README.md` ≤ 80 行（实际 36 行），无 v1.x / v2.0.x 历史叙事，version badge = v3.0.0
- [x] 仓库根 `CHANGELOG.md` 存在（58 行），覆盖 v3.0 → v1.0（含 v4.x 归档说明）
- [x] `docs/ARCHITECTURE.md` 存在（100 行），覆盖四大模块 + 关键数据流
- [x] `docs/DEVELOPMENT.md` 存在（190 行），含本地起步 + 目录约定 + 测试 + 提交 + 常见坑
- [x] `docs/RELEASING.md` 存在（145 行），含 10 步发版流程 + 自动更新调试 + v2.0.2→v3.0.0 附录

## 仓库根杂物
- [x] `scripts/generate-icon.py` 已删除
- [x] `scripts/generate-storyloom-icons.py` 顶部 docstring 加了 "replaces legacy generate-icon.py removed in v3.0"
- [x] 仓库根 `.md` 仅余 `README.md` + `CHANGELOG.md`
- [x] `.gitignore` 含 data/ release-*/ dist/ dist-server/ electron-out/ node_modules/ *.asar

## 老 release-notes 处理
- [x] `docs/release-notes-v2_0*.md` 全部已移到 `docs/_archive/release-notes/`
- [x] `docs/release-notes-v3_0.md` 是 `docs/` 顶层仅有的 release-notes

## 发版与质量门
- [x] `package.json#version` = `3.0.0`，`package-lock.json` 同步
- [x] `npm run typecheck` exit 0
- [x] `npm run test` exit 0（3 files / 12 tests）
- [x] `npm run build` exit 0（21.6s）
- [x] `docs/release-notes-v3_0.md` 完整，含改动清单 + 升级路径
- [x] `.trae/documents/handoff-next-v3_0.md` 完整，含 v3.x 后续路线

## GitHub 同步与发版
- [x] commit `b3df15c` + push origin master 完成
- [x] tag v3.0.0 已推送
- [x] `npm run dist` 产出 `Storyloom Setup 3.0.0.exe` (126 MB) + `.blockmap` + `latest.yml`
- [x] exe 与 blockmap 已 rename 为 `Storyloom-Setup-3.0.0.exe(.blockmap)` 与 latest.yml url 一致
- [x] GitHub Release v3.0.0 已创建并上传 exe + blockmap + latest.yml

## 自动更新自检
- [x] `https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml` HTTP 200
- [x] latest.yml 中 `version: 3.0.0`，`url: Storyloom-Setup-3.0.0.exe` 与 release asset 名一致
- [x] latest.yml 中 sha512 与 asset 实际哈希对齐（electron-builder 已在构建时校对）
- [x] `gh release view` 显示 latest 指向 v3.0.0
- [x] 文档中包含 v2.0.2 → v3.0.0 自动升级流程的复跑指引（`docs/RELEASING.md` 附录）

## 收官
- [x] 本 checklist 与 tasks.md 全部勾选
