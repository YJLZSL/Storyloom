# 仓库归档与首启 UX 修复 Spec (v3.0.0)

## Why

接手项目后发现两类急需收口的问题：

1. **GitHub 仓库脏乱**：9 个 Releases（v4.0/v4.1/v4.2.1 + v1.0.0/v1.0.1/v1.1.0 + v2.0.0/v2.0.1/v2.0.2）版本号策略前后矛盾、Pre-release 标记混乱、`README` / `package.json` / `.trae/specs/`（23 个目录）/ `.trae/documents/`（多份 handoff）/ `docs/`（4 份 release-notes + audit + screenshots）历史负担堆积，新接手者无法定位"现在是哪一版、应该读哪一份文档"。
2. **真实使用 bug**：
   - **首启 UX 错乱**：截图 2 显示"还没有工作区"空状态时，左侧导航（视图/创作/工具）+ 顶部 Toolbar（轨道/事件/字数/Zoom/-新建事件/保存/Ctrl+ 等）+ 底部 StatusBar（缩放/100%/时间轴）仍然渲染。新用户首启时看到一堆无意义的工作区内 UI，认知负担巨大。
   - **新建工作区按钮不可用**：截图 1 显示对话框里"创建"按钮处于浅色不可点状态；输入名称后仍然如此（怀疑 `disabled` 条件或 `applying` flag 卡死）。
3. **版本号身份升级**：本轮整理足够大、足够带破坏性（删历史 release / 改 `appId` 释放可能性 / 改 GitHub remote URL / 重做首启），适合作为 v3.0.0 的起点 — 也是 v2.0 handoff 里明确预告的"v3 大版本边界"。

## What Changes

### A. GitHub 仓库整理（**BREAKING** 对外可见）
- **Releases 归档清理**：保留 `v2.0.2`（latest，已部署用户的 auto-update 终点）+ 本轮发布的 `v3.0.0`；其余 7 个老 release（v4.0.0 / v4.1.0 / v4.2.1 / v1.0.0 / v1.0.1 / v1.1.0 / v2.0.0 / v2.0.1）改为草稿或显式标"deprecated/archived"。**不删除 git tag**，仅改 release 显示状态，保留代码归档完整性。
- **Repository description / topics / README badge 与版本号同步**到 v3.0.0。
- **Repository About 页面"Releases" 展示**精简到主线两条（v2.0.2 / v3.0.0）。

### B. 仓库内文档大清洗与参考文档重写

#### B-1 现状盘点（要清理的对象）

| 区域 | 现有文件 | 处理 |
|---|---|---|
| `docs/` 顶层（共 15 份 .md） | `release-notes-v2_0.md` / `release-notes-v2_0_1.md` / `release-notes-v2_0_2.md` / `测试报告 v1.1.0.md` / `release-notes-v1.1.0` / `接手开发指南 v1.2-...` / `接手开发指南 v1.3-...` / `视觉 AI 接手指南.md` / `超长期开发路线图 v1.1.0+.md` / `文档变更日志.md` / `前端设计方案.md` / `可用资源参考.md` / `架构与代码地图.md` / `构建与发布指引.md` / `洛笙创作软件前端效果调研.md` / `AI接手开发指南.md` / `README.md` | 全部归档到 `docs/_archive/`，**重写**主线四份（见 B-2） |
| `docs/audit/` | `baseline-v2_0.md` / `brand-decision-v2_0.md` / `code-smells-v2_0.md` / `redundancy-v2_0.md` | 整体保留但**重命名为通版**（去掉 `-v2_0` 后缀），头部加"最后更新于 v3.0.0"标注；过期内容更新或保留 + `> [!NOTE] 本节描述截至 v2.0.x；v3.0 后请以本文件为准` |
| `docs/screenshots/` | luosheng-research（54 张 b 站调研截图）/ v1.3 / v1.4 / v2.0-rebrand / v2.0.1-dist / 2 张 bilibili-* | luosheng-research 与 v1.3、v1.4 历史截图整体 → `docs/screenshots/_archive/`；v2.0-rebrand 与 v2.0.1-dist 保留 |
| `.trae/documents/` 8 份 | `handoff-backend.md` / `handoff-roadmap-backend-and-frontend-redesign.md` / `handoff-next-v2_0.md` / `handoff-next-v2_0_1.md` / `release-notes-v1.1.0.md` / `full-test-build-install.md` / `v1_1_0-polish-startup-autoupdate-plan.md` / `v1_4-tdesign-frontend-polish-luosheng-research.md` | 全部 → `_archive/`；新增 `handoff-next-v3_0.md` 作为唯一活跃 |
| `.trae/specs/` 23 个目录 | 见 spec 列表 | **保留最近 2 个**（finalize-v2_0_1-patch / rebrand-finalize-handoff-v2_0）+ 本 spec；其余 20 个 → `_archive/` |
| 仓库根 | `README.md` | 重写 |

#### B-2 重写四份核心参考文档

替代上面"全部归档"的策略：以 v3.0 时点的真实代码为准，**精炼重写四份**新参考文档，作为后续维护者唯一入口。

1. **`README.md`**（重写）：项目一段话定位 + 视觉演示 + 安装/启动/构建三连命令 + 维护者交接 ≤ 6 行链 → CHANGELOG / docs/ARCHITECTURE / docs/DEVELOPMENT / docs/RELEASING。删除现有 README 中所有 v1.x / v2.0 历史叙事段。
2. **`CHANGELOG.md`**（仓库根，新增）：按 release 倒序，每条 ≤ 5 行 + 链到对应 GitHub release 页（archived 也保留链接）。
3. **`docs/ARCHITECTURE.md`**（重写自 `架构与代码地图.md` + `前端设计方案.md`）：以 v3.0 实际代码为准，列出 `electron/` `server/` `src/` `scripts/` 四大模块、关键数据流（API → Fastify → drizzle → SQLite；renderer ↔ preload ↔ main IPC；electron-updater 链路），每模块 ≤ 1 屏。
4. **`docs/DEVELOPMENT.md`**（重写自 `AI接手开发指南.md` + `接手开发指南 v1.x.md` 多份）：本地起步 / 目录约定 / 测试约定 / 提交约定 / 常见坑（ESM `.js` 后缀、`__dirname` 在 ESM 下、better-sqlite3 rebuild）。
5. **`docs/RELEASING.md`**（重写自 `构建与发布指引.md` + `release-notes-v2_0_2.md` 中的发版流程段）：版本号策略（v2.x 已停发，v3.0 起单线递进）、`npm run dist` + 上传 latest.yml 的标准流程、自动更新调试要点。

> 不再有 `视觉 AI 接手指南.md` `超长期开发路线图.md` 等专题文档 — 全部归档；如未来需要再起新主题文档不与上面四份冲突。

#### B-3 仓库根杂物
- 删除 `scripts/generate-icon.py`（v1.x 时代视觉，已被 `generate-storyloom-icons.py` 替代）。
- 检查仓库根除 `README.md` / `CHANGELOG.md` / `LICENSE` / 配置类（`package.json` / `vite.config.ts` 等）/ 标准目录外，不应该有散落 `.md`。如有 → 归档或删。
- 检查 `data/` / `release-*/` / `dist/` 等是否已在 .gitignore（前一轮已加，复核一次）。

### C. 首启 UX 修复（核心 bug）
- **AppShell 在 `currentWorkspaceId == null` 时渲染极简空状态布局**：仅顶部品牌条 + 中央 `<WorkspaceSelector />` + 设置入口；**不渲染** TopToolbar / SideNav / StatusBar / CommandPalette 入口。
- 空状态品牌条：左 logo + "Storyloom · 絮织" 文字 + 右上角"语言切换 / 设置 / 关于"3 个最小入口（不带"-新建事件"等工作区动作）。
- 选中工作区后立即进入完整布局（现有逻辑保持）。

### D. 新建工作区 bug 修复（核心 bug）
- 排查 `CreateWorkspaceDialog`：`disabled = !name.trim() || createWorkspace.isPending || applying` 三条件中是否有挂死（如 `applying` 永远 true、或 `createWorkspace.isPending` 不复位）；同时检查 TDesign `<Dialog onConfirm>` 与表单 onSubmit 双触发是否打架。
- 创建失败时显示**具体错误**（API 返回 400/500、网络错误、template apply 失败），不要静默吞错。
- 创建成功后：自动 `setCurrentWorkspace(result.id)`、关闭 dialog、focus 到时间轴。

### E. 自动更新与版本号
- `package.json#version` 2.0.2 → **3.0.0**（明确 BREAKING 边界）。
- `package.json#build.appId` 仍保留 `com.ai.timeline-creator`，本轮**不**做 appId 迁移（避免 v2.0.2 用户收不到 v3.0.0 自动更新；appId 迁移留给 v3.1+）。
- 跑 `npm run dist` → 上传 `Storyloom-Setup-3.0.0.exe` + `.blockmap` + `latest.yml` 到 v3.0.0 release，保证 v2.0.2 用户能平滑覆盖升级到 v3.0.0。

### F. 不在本轮范围内（明确移交后续）
- v2.0 handoff 列出的 EntityPanel\<T\> 抽象 / OutlineView 拆分 / `appId` 迁移 / AI 配置入库等深度重构 — 本 spec 是"清理 + 关键 bug"，不是大重构。
- 继续保留所有数据 schema，data/storyloom.db 兼容。

## Impact

- **Affected specs**：
  - 历史 21 个 spec 大多归档；保留最近 3 个（`finalize-v2_0_1-patch` / `rebrand-finalize-handoff-v2_0` / `frontend-polish-luosheng-v1_4`）+ 本 spec。
- **Affected code**：
  - [`src/App.tsx`](../../../src/App.tsx) — 不变，但顶层路由树由 AppShell 决定
  - [`src/components/layout/AppShell.tsx`](../../../src/components/layout/AppShell.tsx) — **核心修改**：根据 `currentWorkspaceId` 走双布局
  - 新增 [`src/components/layout/EmptyShell.tsx`](../../../src/components/layout/EmptyShell.tsx) — 空状态极简布局
  - [`src/components/workspace/WorkspaceSelector.tsx`](../../../src/components/workspace/WorkspaceSelector.tsx) — 视觉微调（更居中、更显眼的"创建第一个工作区"CTA）
  - [`src/components/workspace/CreateWorkspaceDialog.tsx`](../../../src/components/workspace/CreateWorkspaceDialog.tsx) — bug 修复 + 错误显式化
  - [`package.json`](../../../package.json) — version 3.0.0，可能微调 description
  - [`README.md`](../../../README.md) — 维护者交接段重写
  - 新增/删除 文档与归档目录（详见 What Changes B 段）
- **Affected GitHub state**：
  - 7 个老 Release 改为 draft 或加"[ARCHIVED]"前缀
  - About description / topics 同步
  - 新建 v3.0.0 Release，附 dist 三件套

## ADDED Requirements

### Requirement: 首启空状态极简布局
The system SHALL render only the brand bar + WorkspaceSelector + minimal global entries (language / settings / about) when no workspace is selected.

#### Scenario: 新用户首次启动
- **WHEN** 用户第一次启动应用、本地 `currentWorkspaceId == null` 且后端无任何 workspace
- **THEN** 全屏只显示：顶部品牌条（logo + 标题 + 语言/设置/关于）、中央"还没有工作区"插画 + "创建第一个工作区"按钮；不显示左侧导航、不显示工作区内 toolbar、不显示底部 StatusBar、键盘按 Ctrl+P 不应弹出工作区相关命令

### Requirement: 新建工作区按钮可用
The system SHALL make the "创建" button clickable as soon as `name.trim().length > 0` and no in-flight create request exists.

#### Scenario: 输入名称后能立刻提交
- **WHEN** 用户在新建对话框中输入合法 name（≥1 字符）、未在请求中、未在 applying template
- **THEN** "创建"按钮变为可点状态；点击后 ≤500ms 内或者收到成功 toast + dialog 关闭、或者收到具体错误 toast（不能静默无响应）

### Requirement: 创建成功自动进入工作区
The system SHALL automatically `setCurrentWorkspace(result.id)` after a successful create.

#### Scenario: 模板应用成功
- **WHEN** 用户选择 "三幕式" 模板、输入名称"测试"，点击"创建"
- **THEN** 新工作区建好 + 模板内容写入 + dialog 关闭 + 进入完整 AppShell + 默认视图为时间轴 + 模板生成的轨道/事件已可见

### Requirement: GitHub Releases 列表清爽
The repository SHALL show only `v3.0.0` (latest) and `v2.0.2` (auto-update reference) as primary releases on the listing page.

#### Scenario: 新访客打开 Releases 页
- **WHEN** 任何访客打开 `https://github.com/YJLZSL/Storyloom/releases`
- **THEN** 列表前两条是 `v3.0.0` 与 `v2.0.2`，其余历史 release 要么是 Draft、要么标题前加了 `[ARCHIVED]` 前缀，且 v3.0.0 标 "Latest"

### Requirement: 仓库根 CHANGELOG.md
The repository SHALL provide a single `CHANGELOG.md` summarizing the release history.

#### Scenario: 维护者要快速回顾历史
- **WHEN** 任何接手者打开仓库根的 CHANGELOG.md
- **THEN** 看到一份按发版倒序的扁平列表（v3.0.0 → v1.0.0 + v4.x 备注），每条 ≤ 5 行摘要 + 链接到对应 release-notes（在 `_archive/` 中）

### Requirement: v2.0.2 用户能自动升级到 v3.0.0
The release SHALL preserve electron-updater compatibility via unchanged `appId` and a properly populated `latest.yml`.

#### Scenario: 已部署 v2.0.2 用户升级
- **WHEN** 一个装着 v2.0.2 的客户端启动并运行 `autoUpdater.checkForUpdates()`
- **THEN** 客户端能从 `https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml` 拿到 `version: 3.0.0`、下载 `Storyloom-Setup-3.0.0.exe`、覆盖安装、用户数据保留、新版本启动正常

## MODIFIED Requirements

### Requirement: AppShell 渲染规则（自 v2.0 起）
（原行为）`AppShell` 始终渲染 TopToolbar / SideNav / StatusBar，仅 `WorkspaceContent` 内根据 `currentWorkspaceId` 切换 `WorkspaceSelector` 或视图。
（v3.0.0 起）`AppShell` 在 `currentWorkspaceId == null` 时返回 `<EmptyShell />`，**完全不挂载** TopToolbar / SideNav / StatusBar / CommandPalette。

### Requirement: 维护者交接（自 v2.0.1 起）
（原行为）README 列出 v2.0 / v2.0.1 / v2.0.2 多份 handoff 与 release-notes 链接。
（v3.0.0 起）README 仅指向 `.trae/documents/handoff-next-v3_0.md` + `CHANGELOG.md` + `docs/release-notes-v3_0.md`，旧资产统一在 `_archive/` 目录，不在 README 中陈列。

## REMOVED Requirements

### Requirement: 旧 Release v4.x / v1.x / v2.0.0 / v2.0.1 在 Releases 列表显著展示
**Reason**：版本号策略已重启两次（v4.x → v1.x → v2.x → v3.x），列表里夹着 v4.0/v4.1/v4.2.1 + v1.0.0/v1.0.1/v1.1.0 + v2.0.0/v2.0.1 共 8 条对**新用户认知造成误导**（"为什么有 v4 又有 v1？现在到底用哪一版？"）。
**Migration**：保留 git tag（`git tag --list "v*"` 可见全部历史），release 物料移到 draft 或 [ARCHIVED]。code-history 完整保留，不删 commit。

### Requirement: `scripts/generate-icon.py` 历史脚本保留
**Reason**：v1.x 时代视觉，与 Storyloom 品牌无关；release-notes-v2_0_1 已声明"作为历史保留"，但实际上已无任何调用方，参考价值低。
**Migration**：直接删除；如有人想看 v1.x 视觉，git history 可查。
