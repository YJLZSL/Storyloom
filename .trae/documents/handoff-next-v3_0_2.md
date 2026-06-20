# 移交说明 · v3.0.2

> 交接时间：2026-06-20
> 交接对象：下一位维护者 / 下一段对话的 AI
> 前置状态：Storyloom v3.0.2 已发布（commit `305846c`），安装包已上传至 [GitHub Release](https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.2)

> 前置阅读（按顺序）：
> 1. [`README.md`](../../README.md) — 项目门面
> 2. [`CHANGELOG.md`](../../CHANGELOG.md) — v3.0.2 顶部摘要
> 3. [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) / [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md) / [`docs/RELEASING.md`](../../docs/RELEASING.md) — 三大核心参考
> 4. [`docs/audit/`](../../docs/audit/) — 代码异味审计、品牌决策、冗余审计

---

## 1. 本轮（v3.0.2）做了什么

### 修了两个致命 bug

#### Bug A：生产环境数据库迁移完全失败（v3.0.1 遗留问题 #5A）

**根因**：drizzle-orm 的 `migrate()` 在 Electron asar 内读取迁移 SQL 文件时静默失败——尤其是安装路径含中文 + 空格时（如 `E:\新建文件夹 (9)\Storyloom\resources\app.asar\drizzle`）。结果是生产数据库 `timeline.db` 只有一张空的 `__drizzle_migrations` 表，21 张业务表全部不存在。`initDatabase()` 的 try/catch 把迁移错误降级为 warn 后继续启动，应用带着空数据库跑起来，所有 API 全部 5xx。

**修复**（`server/db/index.ts`）：重写 `runMigrations()` 为 **4 层 fallback**：

| 层级 | 方法 | 说明 |
|------|------|------|
| 1 | 标准 `migrate(db, { migrationsFolder })` | drizzle 原生迁移，正常工作环境下一把过 |
| 2 | 手动读 `_journal.json` + 逐 `.sql` 文件 `sqlite.exec()` | 绕过 drizzle 内部读文件的逻辑 |
| 3 | `readMigrationFiles()` API | drizzle 的公开 API，返回解析好的 SQL 数组 |
| 4 | 硬编码 `CREATE TABLE IF NOT EXISTS` DDL | 终极兜底，按依赖顺序建全部 21 张表 + 44 个索引 |

每一层都有 `[migration]` 前缀的 pino 日志，失败时自动降级。`foreign_keys` 在 fallback 时临时关闭以允许乱序建表。

同时修改了 `initDatabase()`（`server/db/migrate.ts`）：迁移失败时不再静默继续，而是 **throw 中断启动**；并在迁移后验证 `workspaces` / `events` / `tracks` 三张核心表必须存在。

`ensureSchemaCompatibility()` 从原来只覆盖 3 张表（workspaces/tracks/events）扩展到 **约 20 张表**的所有带 default 的列，覆盖 v1.0 主表和 v1.2 VN 模型表。

#### Bug B：设置弹窗背景透明（v3.0.1 遗留问题 #5B）

**根因**：项目使用 Tailwind CSS v4（`tailwindcss@^4.3.1` + `@tailwindcss/vite`），但 CSS 变量仍使用 shadcn v3 的裸名约定（`--background`、`--foreground` 等）。Tailwind v4 的 utility class（如 `bg-background`）需要 `--color-background` 才能解析，而项目只定义了 `--background`，导致 `var(--color-background)` 未定义，背景透明。

**修复**（`src/index.css`）：在 `@theme` 块末尾添加 19 个 `--color-*` 别名，桥接裸名变量到 Tailwind v4 命名空间：

```css
@theme {
  /* ... existing tokens ... */
  --color-background: rgb(var(--background));
  --color-foreground: rgb(var(--foreground));
  --color-card: rgb(var(--card));
  /* ... 共 19 个 */
}
```

这个修复影响所有使用 shadcn utility class 的组件（Dialog、AppShell、EmptyShell、Input、Button 等），且对所有 5 个主题（luosheng/midnight/forest/ink-wash/contrast）都生效，因为别名引用的是各主题自定义的裸名变量。

### 清理了死代码

- 删除 `CalendarConfigDialog.tsx`（252 行，从未被 import）
- 删除 8 个未使用的 shadcn `ui/` 组件：`checkbox`、`command`、`popover`、`select`、`sheet`、`slider`、`switch`、`tabs`
- 移除 `src/lib/utils.ts` 中从未被使用的 `safeJsonObject` 导出

### 整理了文档

- 归档 `docs/audit/baseline.md`（冻结在 v1.4/v2.0 过渡期）
- 归档 `.trae/documents/handoff-next-v3_0.md`（被 v3.0.1 handoff 取代）
- 归档 `.trae/documents/hotfix-and-clean-release-v3_0_1-plan.md`（已执行的计划）
- 归档 3 个已完成的 spec（v3.0.0 / v2.0.1 / v2.0）
- 删除 `docs/screenshots/v2.0-rebrand/`（空占位目录，无实际截图）
- 更新 `README.md`：版本徽章 v3.0.1 → v3.0.2，精简 handoff 链接
- 更新 `CHANGELOG.md`：添加 v3.0.2 条目

---

## 2. 本轮踩过的坑（**下一位 AI 务必注意**）

### 坑 1：`npm run dist` 的 `ATC_DIST_DIR` 环境变量

`package.json` 的 `build.directories.output` 设为 `"${env.ATC_DIST_DIR}"`。electron-builder 要求这个环境变量**必须**在运行时设置，否则报错：

```
⨯ cannot expand pattern "${env.ATC_DIST_DIR}": env ATC_DIST_DIR is not defined
```

**正确用法**（在 bash/git-bash 下）：

```bash
# 先跑完 build + rebuild（dist 脚本的前置步骤）
npm run build && npm run build:server && npm run build:electron && npm run electron:rebuild

# 再设置环境变量跑 electron-builder
ATC_DIST_DIR="D:/AIKFCC/Storyloom/release-v3.0.2" npx electron-builder --win --publish never
```

**不能**直接 `npm run dist`，因为 `predist` 调用 PowerShell 脚本 `clean-release.ps1`，该脚本内部用 `node -e "require(...)"` 读 `package.json` 时路径解析会出问题（Windows 路径在 bash→PowerShell 传递时被截断）。

### 坑 2：`git push` 需要手动传 token

QoderWork 的 bash 环境下 `terminal prompts disabled`，`git push origin master` 会直接失败。两种解法：

```bash
# 方法 A：用 gh CLI 的 token 内联到 URL
git push "https://x-access-token:$(gh auth token)@github.com/YJLZSL/Storyloom.git" master

# 方法 B：先配 credential helper（不一定在所有环境下生效）
gh auth setup-git
```

### 坑 3：`better-sqlite3` 的 NODE_MODULE_VERSION 不匹配

`better-sqlite3` 的 `.node` 文件是为 Electron 编译的（NODE_MODULE_VERSION 146），不能直接 `require()` 在系统 Node.js（v22 = NODE_MODULE_VERSION 127）下使用。如果需要从命令行查生产数据库，用 Python 的 `sqlite3` 模块：

```bash
python -c "import sqlite3; conn = sqlite3.connect(r'C:\Users\...\timeline.db'); ..."
```

### 坑 4：PowerShell 命令中 `$` 符号被 bash 吃掉

在 QoderWork bash 环境下跑 PowerShell 时，`$env:APPDATA` 这类变量会被 bash 先行解析。需要改用 cmd 风格的 `%APPDATA%` 或直接写绝对路径。app.log 的实际位置：

```
C:\Users\<用户名>\AppData\Roaming\Storyloom\app.log
```

### 坑 5：`copy:electron-assets` 脚本用 CJS require

`package.json` 里 `"copy:electron-assets": "node -e \"require('fs').copyFileSync(...)\""` 用了 CJS `require`，但项目是 `"type": "module"`。当前能跑是因为 `node -e` 默认走 CJS，但如果未来 Node.js 改了默认行为就会炸。

---

## 3. v3.0.2 已加的所有护栏

| 位置 | 护栏 | 防什么 |
|---|---|---|
| `server/db/index.ts` `runMigrations()` | 4 层 fallback + `[migration]` 结构化日志 | asar 内迁移静默失败 |
| `server/db/index.ts` `tableExists()` | 迁移后检查 workspaces 表 | 检测迁移是否真的成功 |
| `server/db/migrate.ts` `initDatabase()` | 迁移后验证 3 张核心表，缺失则 throw | 带空库启动 |
| `server/db/index.ts` `ensureSchemaCompatibility()` | 覆盖 ~20 张表的所有 default 列 | 老库覆盖升级缺列 |
| `src/index.css` `@theme` 块 | 19 个 `--color-*` 别名 | Tailwind v4 utility class 失效 |

加上 v3.0.1 已有的护栏（5xx console.error 兜底、toast 附 error.code、favicon Vite import、index.html 相对路径），一共 10 道防线。

---

## 4. 排查指南（用户反馈问题时按顺序跑）

### 第一件：看 app.log 里的 `[migration]` 日志

v3.0.2 起每次启动都有完整的迁移日志：

```
[migration] starting { migrationsPath: '...' }
[migration] drizzle migrate() completed           ← 第 1 层成功
  或
[migration] drizzle migrate() failed, will try manual fallback  ← 第 1 层失败
[migration] workspaces table missing — trying manual SQL execution
[migration] journal entries found { count: 5 }
[migration] applied { tag: '0000_busy_valeria_richards' }
...
[migration] manual SQL execution succeeded         ← 第 2 层成功
```

如果看到 `all migration methods failed — executing hardcoded DDL`，说明前 3 层全挂了，硬编码 DDL 兜底成功。如果看到 `FATAL: hardcoded DDL failed`，那是真的没救了——检查 SQLite 文件是否损坏或磁盘满。

### 第二件：三件套（继承自 v3.0.1）

1. **取 app.log 最近 200 行**：关键搜索词 `[migration]`、`[5xx]`、`SQLITE_`、`ENOENT`、`FATAL`
2. **DevTools Network 抓 API 响应**：看 error.code 和 message
3. **PRAGMA 检查表结构**：`PRAGMA table_info(workspaces);` 等

### 第三件：验证安装包版本

确认用户跑的是 v3.0.2 而不是老版：
- app.log 首行 `Version: 3.0.2`
- 窗口标题 `Storyloom · 絮织`
- electron-updater 检测 `update-not-available v3.0.2`

---

## 5. 遗留技术债（按优先级排序）

### P1：代码屎山（从 v2.0 遗留至今，每次审计都在膨胀）

| 文件 | 当前行数 | 问题 | 建议 |
|------|---------|------|------|
| `OutlineView.tsx` | **948** | 14 个 useState、31 个内联箭头函数、drawer+filters+AI 上下文全耦合 | 拆 `OutlineEditorDrawer` + `OutlineFilters` + `useOutlineQueries` |
| `ForeshadowingPanel.tsx` | **732** | 18 个 useState、全局 document.addEventListener | 抽 `useEntityPanel` hook |
| `EventEditorDialog.tsx` | **698** | 13 个 API hooks、18 个 useState | 拆 `EventBasicForm` / `EventLinksTab` / `EventChapterTab` |

**三大面板（Character/World/Foreshadowing）~80% 结构重复**——相同的 `STATUS_FILTERS`、相同的 `listRef + scrollSelectedIntoView`、相同的 ContextMenu 用法、相同的 create/edit state 模式。抽 `EntityPanel<T>` 通用组件预计可减少 ~600 行。

### P2：测试覆盖率极低

整个 `src/` 仅 3 个测试文件、12 个测试用例（`safe-text`、`useMediaQuery`、`WorkspaceCard`）。核心业务逻辑（时间轴、事件编辑、工作区管理、迁移 fallback）**零测试**。建议至少给 `runMigrations()` 的 4 层 fallback 写单元测试。

### P3：shadcn `ui/` 残留

`ui/` 目录仍有 **11** 个 shadcn 组件在用（ContextMenu、dialog、sonner、tooltip、badge、button、input、label、scroll-area、separator、textarea），但项目已全面转向 TDesign。长期目标是把仍在用的 shadcn 组件也迁移到 TDesign，然后删除整个 `ui/` 目录。

### P4：`server/routes/search.ts` 635 行

最大的路由文件，同时处理全文搜索和替换操作。建议拆为 `search.full-text.ts` / `search.consistency.ts` / `search.suggest.ts`。

### P5：`appId` 仍为旧品牌名

`package.json` 的 `build.appId` 是 `com.ai.timeline-creator`。不能改——改了 electron-updater 链路断裂，老用户必须手动重装。在文档中标注即可。

---

## 6. 构建与发版备忘

### 完整发版流程

```bash
# 1. 版本号
# 编辑 package.json 的 "version" 字段

# 2. 编译验证
npm run typecheck && npm run test

# 3. 构建
npm run build && npm run build:server && npm run build:electron

# 4. rebuild native modules
npm run electron:rebuild

# 5. 打包（关键：必须设 ATC_DIST_DIR）
ATC_DIST_DIR="D:/AIKFCC/Storyloom/release-vX.Y.Z" npx electron-builder --win --publish never

# 6. Git
git add -A && git commit -m "fix(vX.Y.Z): ..." && git push

# 7. Tag + Release
git tag vX.Y.Z
git push "https://x-access-token:$(gh auth token)@github.com/YJLZSL/Storyloom.git" vX.Y.Z

# 8. 上传资产到 Release
gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."
gh release upload vX.Y.Z \
  "release-vX.Y.Z/Storyloom Setup X.Y.Z.exe" \
  "release-vX.Y.Z/Storyloom Setup X.Y.Z.exe.blockmap" \
  "release-vX.Y.Z/latest.yml" \
  --clobber
```

### 本地磁盘冗余

以下目录都是 gitignored 的旧构建产物，可以安全删除（~2.7 GB）：

| 目录 | 大小 | 说明 |
|------|------|------|
| `release-v2.0.1/` | 692 MB | 已被 v3.0.2 取代 |
| `release-v2.0.2/` | 692 MB | 已被 v3.0.2 取代 |
| `release-v3.0.0/` | 692 MB | 已被 v3.0.2 取代 |
| `out-dist/4.1.0/` | 657 MB | 旧品牌名 "AI Timeline Creator" 的远古构建 |
| `data/timeline-creator.db*` | ~4.5 MB | 旧品牌名数据库 |
| `data/backups/timeline-creator-*` | ~1.9 MB | 10 个旧备份 |

---

## 7. 起步检查清单（接手后请先完成）

- [ ] `cd "D:\AIKFCC\Storyloom"` && `git status` 清洁
- [ ] `git pull origin master` 同步 v3.0.2 commit
- [ ] `npm install` 同步依赖
- [ ] `npm run typecheck && npm run test && npm run build` 三连全绿
- [ ] `npm run dev:electron` 启动 Electron — 首启 logo 正常，设置弹窗背景不透明
- [ ] 新建工作区 — 应成功创建，无 SQLITE_ERROR
- [ ] 读 `app.log` 确认 `[migration]` 日志显示迁移成功
- [ ] 通读前置阅读 4 份文档
- [ ] 通读本文档全部 7 节

完成上述后，正式开干。

---

> v3.0.2 — 把数据库的纬线织实，把色彩的经线校准。织机已就绪，下一匹布看你的。
