# Storyloom v3.0.0 — 仓库整理 & 首启 UX 重做

> 发布日期：2026-06-20
> 类型：major（v2.0.2 → v3.0.0）
> 上一版：[v2.0.2](./_archive/release-notes/release-notes-v2_0_2.md)（已归档）
> 完整发版历史：见仓库根 [`CHANGELOG.md`](../CHANGELOG.md)

---

## 为什么是 major

虽然没有破坏性 API 变更（用户数据 schema 完全兼容），但本轮做了三件足够大的事：

1. **修复两个真实使用 bug** — 刚启动时左侧导航/顶部 Toolbar/底部 StatusBar 错误显示工作区内 UI；新建工作区按钮静默吞错。
2. **大幅清理仓库** — 22 份历史 spec / 8 份历史 handoff / 15 份历史 docs/*.md 全部归档到 `_archive/`，仅保留 4 份主线参考文档；GitHub 8 个老 release 加 `[ARCHIVED]` 前缀。
3. **重写参考文档** — 以 v3.0 真实代码为准，从零写 README + CHANGELOG + ARCHITECTURE + DEVELOPMENT + RELEASING。

足以作为 v3 序列的"重新出发"起点。

## 改动清单

### A. 首启 UX 修复（核心 bug #1）

**问题**：当 `currentWorkspaceId == null` 时，`AppShell` 顶层无条件渲染 `<TopToolbar />`、`<SideNav />`、`<StatusBar />`、`<CommandPalette />`、`<SettingsDialog />`，仅主区域 `MainCanvas` 内部 `if (!currentWorkspaceId) return <WorkspaceSelector />`。新用户首启时看到一堆"轨道/事件/字数/Zoom/-新建事件/保存/Ctrl+/-"等无意义的工作区内 UI。

**修复**：
- 抽出 [`src/components/layout/EmptyShell.tsx`](../src/components/layout/EmptyShell.tsx)：极简首启布局 — 顶部品牌条（logo + 标题 + 语言/设置/关于）+ 居中 `<WorkspaceSelector />`，**不挂载** TopToolbar / SideNav / StatusBar / CommandPalette / EventDetailView。
- 改造 `AppShell.tsx`：在所有 hooks 之后、`focusMode` 早返之前增加 `if (!currentWorkspaceId) return <EmptyShell />` 早返；`MainCanvas` 内部的 `if` 分支移除。
- "关于"按钮：右侧 360px TDesign Drawer，含版本号 + GitHub 链接 + 团队署名。

### B. 新建工作区 bug 修复（核心 bug #2）

**问题**：[`CreateWorkspaceDialog.tsx`](../src/components/workspace/CreateWorkspaceDialog.tsx) 的 `catch {}` 静默吞掉了 `useCreateWorkspace` mutation 抛出的错。用户反馈"点了创建没反应"，实际上后端报了错（如重名 / 网络断 / template apply 失败）但前端不显示。

**修复**：
- `catch (err) { toast.error(\`创建失败: ${err.message}\`) }` — 显式提示
- `applying` 状态在外层 `finally` 复位，避免错误路径下卡死
- TDesign Dialog `onConfirm={() => { void handleSubmit(); }}` 让 lint 不抱怨

### C. GitHub 仓库整理

- **8 个老 Release 加 `[ARCHIVED]` 前缀**：v4.0.0 / v4.1.0 / v4.2.1 / v1.0.0 / v1.0.1 / v1.1.0 / v2.0.0 / v2.0.1。每个 release notes 末尾追加"see CHANGELOG.md"指引。
- **v2.0.2 保留 Latest 状态**作为 auto-update reference，直到 v3.0.0 上传完成后转交。
- **Repo description 更新**：`Storyloom · 絮织 — Weave timelines into living stories. Desktop authoring workbench for visual novels and narrative-driven stories. v3.0 brings clean first-run UX and a stable auto-update pipeline.`
- **Topics 新增**：`electron-updater`（共 16 项）。

### D. 仓库内文档大清洗

| 区域 | 处理 |
|---|---|
| `.trae/specs/` 23 个目录 | 仅保留 3 个活跃 spec + `_archive/`（20 个老 spec 归档） |
| `.trae/documents/` 8 份 | 全部归档 + 新增 `handoff-next-v3_0.md` 作为唯一活跃 |
| `docs/` 顶层 15 份 .md | 全部归档；新增 4 份主线参考文档（README 在仓库根） |
| `docs/audit/` 4 份 | 去 `-v2_0` 后缀；头部加最后更新元信息；code-smells 末尾加 v3.0.0 状态段 |
| `docs/screenshots/` | luosheng-research / v1.3 / v1.4 历史截图归档；保留 v2.0-rebrand / v2.0.1-dist |
| 仓库根 | 仅余 `README.md` + `CHANGELOG.md` |
| `scripts/generate-icon.py` | 删除（v1.x 视觉脚本，已被 `generate-storyloom-icons.py` 取代） |

### E. 重写四份核心参考文档

| 文件 | 行数 | 用途 |
|---|---:|---|
| [`README.md`](../README.md) | 36 | 项目门面：定位 + 安装 + 维护者交接索引 |
| [`CHANGELOG.md`](../CHANGELOG.md) | 58 | 全部版本历史，倒序，每版 ≤ 5 行 + 链 release |
| [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) | 100 | 四大模块拓扑 + 关键数据流 |
| [`docs/DEVELOPMENT.md`](./DEVELOPMENT.md) | 190 | 本地起步 + 目录约定 + 测试 + 提交 + 5 条常见坑 |
| [`docs/RELEASING.md`](./RELEASING.md) | 145 | 10 步发版流程 + 自动更新调试 + v2.0.2→v3.0.0 附录 |

### F. 自动更新链路保留

- `package.json#version` 2.0.2 → **3.0.0**
- `package.json#build.appId` 仍保留 `com.ai.timeline-creator`（**不**做 appId 迁移，避免 v2.0.2 用户收不到更新；appId 永久保留为约定）
- v2.0.2 用户启动 → 5 秒后 `autoUpdater.checkForUpdates()` 检测到 v3.0.0 → 弹窗 → 后台下载 → 重启覆盖安装；用户数据完整保留

## 质量门

| 检查 | 结果 |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run test` | ✅ 12 passed (3 files) |
| `npm run build` | ✅ exit 0 |
| `npm run dist`（Windows NSIS） | ✅ 产物已上传到本 Release |

## 升级路径

### 已部署 v2.0.2 用户

无需手动操作。启动应用 → 自动收到更新提示 → 确认后下载 → 重启即完成升级。data/storyloom.db 完整保留。

### 已部署 v2.0.0 / v2.0.1 用户

需手动到 https://github.com/YJLZSL/Storyloom/releases 下载 `Storyloom-Setup-3.0.0.exe` 安装一次（v2.0.2 才修了 publish.repo，老两版的 electron-updater 链路指向旧仓库 URL）。安装时选"覆盖现有版本"，data/ 保留。

### 新用户

到 https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.0 下载 `Storyloom-Setup-3.0.0.exe`，双击安装即可。

## 已知问题

无新增。继承自 v2.0.2 的 `appId` 永久保留约定（详见 `docs/RELEASING.md` 版本号策略段）。

## 致谢与下一步

v3.0 正式开启 v3 序列。下一站候选见 [`.trae/documents/handoff-next-v3_0.md`](../.trae/documents/handoff-next-v3_0.md)：

- 候选 A：抽 `EntityPanel<T>` 给 Character / WorldBuilding / Foreshadowing 三大面板复用（来自代码异味 #2）
- 候选 B：拆分 OutlineView.tsx (904 行)（来自代码异味 #1）
- 候选 C：AI 配置入库（v2.0 handoff §4 P0）

---

> **2026-06-20 后续**：v3.0.0 已被 v3.0.1 的 hotfix 取代（修复老库覆盖升级时「无法新建工作区」+ 首启 logo 破图）。详见 [release-notes-v3_0_1.md](./release-notes-v3_0_1.md)。

> v3.0：从一团乱重新出发，每根经线都是为织下一段故事准备。
