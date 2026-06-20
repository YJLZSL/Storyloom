# Tasks · cleanup-and-firstrun-fix-v3_0_0

## Phase 1 — 基线快照
- [x] Task 1: 抓取起点状态
  - [x] SubTask 1.1: `git status` 干净、`git log -n 3` 起点 commit 已知
  - [x] SubTask 1.2: `npm run typecheck` / `npm run test` 起步通过
  - [x] SubTask 1.3: 用 dev server 复现两个 bug

## Phase 2 — 首启 UX 修复
- [x] Task 2: 抽 EmptyShell 极简空布局
  - [x] SubTask 2.1: 新增 `src/components/layout/EmptyShell.tsx` — 顶部品牌条（logo + Storyloom · 絮织 + 语言切换/设置/关于 3 个最小图标按钮）+ 中央 `<WorkspaceSelector />` + flex 居中
  - [x] SubTask 2.2: 复用 `LanguageSwitcher` / `SettingsDialog` 触发器（不引入新组件，只挪位置）
  - [x] SubTask 2.3: "关于"按钮：点开显示版本号 + 打开 GitHub release 页的链接（不要弹复杂 modal，TDesign Drawer 即可）
  - 验证标准：组件文件 ≤ 100 行，无新依赖

- [x] Task 3: 改造 AppShell 走双布局
  - [x] SubTask 3.1: `AppShell.tsx` 顶部读 `currentWorkspaceId`，无值时直接 `return <EmptyShell />`
  - [x] SubTask 3.2: 把 `WorkspaceContent` 内的 `if (!currentWorkspaceId) return <WorkspaceSelector />` 移除（已被外层吃掉）
  - [x] SubTask 3.3: 验证 dev server：无工作区时左侧导航 / TopToolbar / StatusBar / Ctrl+P 命令面板均不出现
  - 验证标准：截图前后对比，空状态视觉清爽

## Phase 3 — 新建工作区 bug 修复
- [x] Task 4: 排查并修复 disabled / 错误吞噬
  - [x] SubTask 4.1: 阅读 `CreateWorkspaceDialog.tsx` 当前 disabled 计算与 onConfirm/onSubmit 双触发链路，写一份 3-5 行的诊断结论到本 tasks.md "诊断" 段
  - [x] SubTask 4.2: 修复诊断出的真实原因（如 `applying` 在错误路径不复位、TDesign Dialog onConfirm 与 form onSubmit 重复触发导致请求并发被 isPending 卡死、name controlled value 没绑回 onChange、提交按钮没设 type="submit" 又依赖 onConfirm 等等）
  - [x] SubTask 4.3: 错误显式化：try/catch 把 server 错误 message 通过 `toast.error` 显示；`finally` 块复位 `applying`
  - [x] SubTask 4.4: 创建成功后 `setCurrentWorkspace(result.id)` + `onClose()` + 让外层流程进入工作区
  - 验证标准：dev server 实测：输入名称→点创建→空白模板 ≤ 1s 进入工作区；三幕式模板 ≤ 3s 进入工作区且看到默认轨道/事件

## Phase 4 — GitHub 仓库整理
- [x] Task 5: Releases 归档
  - [x] SubTask 5.1: 用 `gh release edit` 给 v4.0.0 / v4.1.0 / v4.2.1 / v1.0.0 / v1.0.1 / v1.1.0 / v2.0.0 / v2.0.1 这 8 个 release 标题前加 `[ARCHIVED] ` 前缀，并加 `notes` 末尾说明"see CHANGELOG.md and v3.0.0 release"
  - [x] SubTask 5.2: v2.0.2 标题保留不变（auto-update 链路依赖）
  - [x] SubTask 5.3: 验证 `gh release list` 显示前两条仍是 v3.0.0（待发） + v2.0.2，其余 archived
  - 验证标准：仓库 Releases 页面外观清爽

- [x] Task 6: 仓库 metadata 同步
  - [x] SubTask 6.1: `gh repo edit YJLZSL/Storyloom --description "..."` 描述更新（同时含中英文 + 一句话突出"v3.0 首启 UX 重做 + 自动更新链路就绪"）
  - [x] SubTask 6.2: 复核 topics 列表（保留现有 15 个，必要时补一两个如 `electron-updater`）
  - 验证标准：`gh repo view --json description,repositoryTopics` 输出符合预期

## Phase 5 — 仓库内文档大清洗与参考文档重写

### 5A 大归档（先把场地腾空）

- [x] Task 7: 仓库内三大区域批量归档
  - [x] SubTask 7.1: 新建三个归档目录 `.trae/specs/_archive/`、`.trae/documents/_archive/`、`docs/_archive/`、`docs/screenshots/_archive/`
  - [x] SubTask 7.2: `.trae/specs/` — 把除 `cleanup-and-firstrun-fix-v3_0_0` / `finalize-v2_0_1-patch` / `rebrand-finalize-handoff-v2_0` 外的 20 个目录归档
  - [x] SubTask 7.3: `.trae/documents/` — 把全部 8 份历史文件归档
  - [x] SubTask 7.4: `docs/` 顶层 — 把 15 份历史 .md 归档
  - [x] SubTask 7.5: `docs/screenshots/` — 把 luosheng-research / v1.3 / v1.4 等历史截图归档；保留 v2.0-rebrand / v2.0.1-dist
  - 验证标准：`docs/` 顶层只剩 `audit/` + `screenshots/` + `_archive/` + 新参考文档；`.trae/specs/` / `.trae/documents/` 各自只剩活跃文件 + `_archive/`

### 5B audit 通版

- [x] Task 8: audit 文档通版化
  - [x] SubTask 8.1: 4 份 audit 文件去 `-v2_0` 后缀
  - [x] SubTask 8.2: 每份头部加最后更新元信息
  - [x] SubTask 8.3: code-smells.md 末尾追加"v3.0.0 状态"小节

### 5C 写四份新参考文档

- [x] Task 9: 重写 `README.md`
  - [x] SubTask 9.1: 删除现有 README 内所有 v1.x / v2.0 历史叙事段
  - [x] SubTask 9.2: 新结构（≤ 80 行）：项目定位一段话 → 视觉示例（保留 v2.0-rebrand 截图引用）→ 安装/启动/构建三连 → 维护者交接 ≤ 6 行链 → 许可
  - [x] SubTask 9.3: 顶部 version badge 升级为 v3.0.0；GitHub link 指向 `YJLZSL/Storyloom`
  - 验证标准：README ≤ 80 行；不再出现 "v1.x" / "v2.0.0" / "v2.0.1" 字样（除 CHANGELOG 链接段）

- [x] Task 10: 仓库根新建 `CHANGELOG.md`
  - [x] SubTask 10.1: 按倒序覆盖 v3.0.0 → v2.0.2 → v2.0.1 → v2.0.0 → v1.1.0 → v1.0.1 → v1.0.0 → v4.x 实验版本一行注解；每版块 ≤ 5 行
  - [x] SubTask 10.2: 每条带 GitHub release 链接（archived 也保留链接以便回溯）
  - [x] SubTask 10.3: 顶部加 "Format inspired by Keep a Changelog (https://keepachangelog.com/)；本仓库语义化版本起始于 v3.0.0，更早版本号为历史实验"
  - 验证标准：CHANGELOG.md ≤ 120 行，一屏可读完头三版

- [x] Task 11: 重写 `docs/ARCHITECTURE.md`
  - [x] SubTask 11.1: 写四大模块拓扑：electron 主进程（main + preload + updater）/ server（Fastify + drizzle + SQLite）/ src 渲染层（React + Zustand + react-query + TDesign）/ scripts（图标生成 + 冒烟）
  - [x] SubTask 11.2: 关键数据流图（ASCII 即可）：renderer ↔ preload IPC ↔ main → spawn server → SQLite；electron-updater：客户端 → GitHub releases/latest/download/latest.yml → asset 下载 → NSIS 覆盖
  - [x] SubTask 11.3: 不复述代码细节，只列入口文件与关键约定（ESM `.js` import、drizzle migrations 自动跑、appId 保留原因）
  - 验证标准：≤ 200 行，无 v1.x / v2.0 残留叙事

- [x] Task 12: 重写 `docs/DEVELOPMENT.md`
  - [x] SubTask 12.1: 本地起步：环境要求（Node 20+, Python + Pillow for 图标）、`npm install` → `npm run dev` → 浏览器/Electron 双链路
  - [x] SubTask 12.2: 目录约定（src/components 命名、server/routes plugin 模式、scripts 单独脚本）
  - [x] SubTask 12.3: 测试约定（vitest + jsdom）、提交约定（conventional commits + scope）
  - [x] SubTask 12.4: 常见坑：(1) ESM 下 `.ts` 引用要写 `.js` 后缀；(2) `__dirname` 在 main 进程是 `electron-out/electron/`；(3) better-sqlite3 必须 electron-rebuild；(4) data/ 路径在 prod 用 `app.getPath('userData')`
  - 验证标准：≤ 250 行，每节有可执行命令

- [x] Task 13: 重写 `docs/RELEASING.md`
  - [x] SubTask 13.1: 版本号策略：v3.0 起单线 SemVer 递进；不再出现 v1.x / v2.x / v4.x 同时迭代
  - [x] SubTask 13.2: 标准发版流程（10 步）：bump version → typecheck/test/build → commit + tag + push → `npm run dist` → rename exe/blockmap 与 latest.yml url 一致 → `gh release create` 上传三件套 → 验证 latest.yml 稳定 URL → 写 release-notes-vX_Y_Z.md → 同步 CHANGELOG.md → 验 v 一辑前一版自动更新
  - [x] SubTask 13.3: 自动更新调试：手动改本地版本号 + 抓包 latest.yml + electron-updater 的 logger 配置
  - [x] SubTask 13.4: 把 v2.0.2 → v3.0.0 的本轮升级流程作为"已验证示例"附录
  - 验证标准：流程 10 步可逐字执行；附录可作为复跑指引

### 5D 仓库根杂物 & .gitignore 复核

- [x] Task 14: 仓库根杂物清理
  - [x] SubTask 14.1: 删除 `scripts/generate-icon.py`；`scripts/generate-storyloom-icons.py` 顶部 docstring 加了 "replaces legacy generate-icon.py removed in v3.0"
  - [x] SubTask 14.2: 仓库根仅余 `README.md` + `CHANGELOG.md`（`Get-ChildItem -File *.md` 已确认）
  - [x] SubTask 14.3: `.gitignore` 含 `data/` `release-*/` `dist/` `dist-server/` `electron-out/` `node_modules/` `*.asar`
  - 验证标准：仓库根 `Get-ChildItem -File` 输出干净

### 5E 旧 release-notes-v2_0_2.md 处理

- [x] Task 15: release-notes 合并到 CHANGELOG
  - [x] SubTask 15.1: `docs/release-notes-v2_0*.md` 三份已移到 `docs/_archive/release-notes/`
  - [x] SubTask 15.2: `docs/release-notes-v3_0.md` 留待 Task 16 创建
  - 验证标准：`docs/` 顶层不再有 `release-notes-v2_*.md`

## Phase 6 — v3.0.0 release notes + handoff
- [x] Task 16: 写发版与移交文档
  - [x] SubTask 16.1: 新增 `docs/release-notes-v3_0.md`：摘要 → 改动清单 → 升级路径 → 已知问题
  - [x] SubTask 16.2: 新增 `.trae/documents/handoff-next-v3_0.md`：本轮成果 / 后续 v3.x 路线
  - 验证标准：两份文档结构与既有版本对齐

## Phase 7 — 构建质量门 + 发版
- [x] Task 17: 三连质量门
  - [x] SubTask 17.1: `npm run typecheck` exit 0
  - [x] SubTask 17.2: `npm run test` exit 0（3 files / 12 tests）
  - [x] SubTask 17.3: `npm run build` exit 0（21.6s）

- [x] Task 18: bump 版本号 + commit + tag
  - [x] SubTask 18.1: `package.json#version` 2.0.2 → 3.0.0；`package-lock.json` 同步
  - [x] SubTask 18.2: commit `b3df15c chore(v3.0.0): cleanup repo + rewrite docs + fix first-run UX + fix create-workspace dialog`（142 files changed）
  - [x] SubTask 18.3: `git push origin master --tags` 推送 commit 与 `v3.0.0` tag 完成

- [x] Task 19: 构建 + 上传 release
  - [x] SubTask 19.1: `npm run dist` 产出 `Storyloom Setup 3.0.0.exe` (126 MB) + blockmap + latest.yml
  - [x] SubTask 19.2: rename 为 `Storyloom-Setup-3.0.0.exe(.blockmap)` 与 latest.yml `url` 一致
  - [x] SubTask 19.3: `gh release create v3.0.0` 上传三件套 → https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.0

## Phase 8 — 自动更新链路自检
- [x] Task 20: 验证 v2.0.2 → v3.0.0 自动更新可达
  - [x] SubTask 20.1: `Invoke-WebRequest` 拉 latest.yml → HTTP 200，内容 `version: 3.0.0` + url + sha512 与 asset 实际值对齐
  - [x] SubTask 20.2: latest release 指向 v3.0.0
  - [x] SubTask 20.3: 复跑指引在 `docs/RELEASING.md` 附录已记录

# Task Dependencies

- Task 1 → 所有其他 Task
- Task 2 → Task 3
- Task 4 独立于 Task 2/3，可并行
- Task 5 / Task 6 独立，可并行
- Task 7（大归档）→ Task 8（audit 通版）→ Task 9 / 10 / 11 / 12 / 13（重写四份新参考文档；这 5 个互相独立可并行）→ Task 14（杂物清理）→ Task 15（release-notes 合并）
- Task 16 在 Task 2/3/4/15 完成后写
- Task 17 在 Task 2/3/4/8-15 完成后跑
- Task 18 在 Task 17 通过后做
- Task 19 在 Task 18 完成后做
- Task 20 在 Task 19 完成后做

# 基线记录

| 项 | 值 |
|---|---|
| HEAD commit | `213f7bf chore(v2.0.2): enable electron-updater auto-update chain` |
| 分支 | `master`，与 `origin/master` 同步 |
| typecheck 起步 | exit 0 ✅ |
| test 起步 | 3 files / 12 tests passed ✅ |
| 复现 bug 1（创建按钮不可点）真因怀疑 | `confirmBtn.disabled` 表达式正确，但截图 1 显示 dialog 刚打开（name 为空）时按钮浅色 — 这是预期行为（disabled）。**真正的 bug 不是按钮卡死**，而是用户反馈"无法新建" — 怀疑是 `<Dialog onConfirm>` 与 form `onSubmit` 双触发时由于 `mutateAsync` 已 inflight 第二次直接 return 静默；外加 `onCreated` 调用了 `WorkspaceSelector.handleSelect` → `setCurrentWorkspace(id)`，但 dialog 关闭后由于 `setCurrentWorkspace` 是局部 closure，外层 AppShell 没有立刻 rerender 进入完整布局。需要 dev server 实测确认。 |
| 复现 bug 2（空状态布局错误）定位文件 | `src/components/layout/AppShell.tsx` Line 33-34（`MainCanvas` 内部 if 语句）— 根本问题是 `<TopToolbar />`、`<SideNav />`、`<StatusBar />`、`<CommandPalette />`、`<SettingsDialog />` 全部在 `AppShell` 顶层无条件渲染（Line 157, 160, 173, 175, 176），仅 `MainCanvas` 主区域在没工作区时返回 `<WorkspaceSelector />`。截图 2 完全印证了这一点。 |

# 诊断（Task 4.1）

`CreateWorkspaceDialog` 当前实现（行号引自原文件）：

1. **Line 91-96**：TDesign `<Dialog>` 同时绑定 `confirmBtn`（自带按钮）+ `onConfirm` 回调；form 也绑了 `onSubmit`（Line 99-102）；button[type=submit] 隐藏（Line 156）。— 用户点 dialog 自带的"创建"按钮时只走 `onConfirm` → `handleSubmit()`，无 e 参数；如果用户在 input 内回车，会触发 form submit 走 `handleSubmit(e)`。两条路径都会经过 Line 53 的 `e?.preventDefault()` 守卫，**没有双触发风险**。
2. **Line 73-75**：`catch {}` 静默吞掉了 mutation 抛的错（"// error handled by mutation"），但实际上 `useCreateWorkspace` 没有 `onError`，错误就丢了 — 这是用户感知"点了没反应"的真凶。
3. **Line 70-72**：成功路径调用 `onCreated(result.id)` + `onClose()` 后退出。`onCreated = handleSelect = setCurrentWorkspace(id)`。但 store 更新后是异步的，`AppShell` 的 `useWorkspaceStore` 订阅会触发 rerender，进入完整布局 — 这部分逻辑本身正确。

**修复策略**：
- **吞错处理**：把 `catch {}` 改成显式 `toast.error(message)`，让用户看到 server 报的错
- **applying 不复位**（Line 58-69）：当 `setApplying(true)` 后 mutation 抛错（catch 走 Line 73 外层），`setApplying(false)` 在外层 catch 里没处理 — 把 `setApplying(false)` 复位移到 `finally` 块外层
- **首启 UX**：用 `currentWorkspaceId == null` 时整体走 `<EmptyShell />` 替换掉 AppShell 的完整布局，从根上解掉截图 2 的问题
