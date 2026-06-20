# Hotfix 与全新版本发布 计划（v3.0.1 · clean slate）

> 计划文件：`.trae/documents/hotfix-and-clean-release-v3_0_1-plan.md`
> 起草时间：2026-06-20
> 触发：用户 v2.0.2 实测「服务器内部错误」无法新建工作区 + 左上角 logo 显示破碎图片
> 决策：
> - **多绿修复**（不抹哈，把所有可能根因一次性装上护栏）
> - **撤回所有现有 GitHub Releases**，发布全新干净的版本（精简 description，砍掉所有冗余）
> - 在 EmptyShell「关于」Drawer 内加「查看日志」按钮
> - logger 改造取最高档：5xx 兜底 console.error + Electron prod 开 fastify logger + toast 附 error.code

---

## 1. 摘要

| 维度 | 状态 |
|---|---|
| 目标版本 | **v3.0.1**（patch；不变 schema、不变 appId） |
| 主分支 commit 起点 | `55e3f2b docs(v3.0.0): finalize spec/tasks/checklist (post-release)` |
| 修复范围 | 2 个真实 bug + 4 处护栏（防御性 hotfix） |
| 文档变更 | 重写 GitHub repo description；新增 release-notes-v3_0_1.md；新增 handoff-next-v3_0_1.md（"现场排查指南"含 app.log 取法、DevTools 抓包、PRAGMA 校验） |
| 远端清理 | **撤回**全部 9 个现存 GitHub Releases，仅保留 v3.0.1 一条干净的 |
| Tag 处理 | git tags（v1.0.0 ~ v3.0.0 共 9 个）保留不动，只清 release 物料；tags 是 git 历史不删 |

## 2. 现状分析

### 2.1 用户截图复现的真因（含 app.log 现场证据）

抓到的 `%APPDATA%\Storyloom\app.log` 关键行：

```
[2026-06-19T16:49:34.738Z] Version: 2.0.2
[2026-06-19T16:49:35.406Z] DATA_DIR: C:\Users\23501\AppData\Roaming\storyloom\data
[2026-06-19T16:49:36.138Z] [DB] Data directory: ...
[2026-06-19T16:49:36.148Z] [DB] Backup created: ...storyloom-2026-06-19T16-49-36-148Z.db
[2026-06-19T16:49:36.300Z] Loading frontend from dist/index.html
... (再无任何错误日志)
```

**确认事实**：
1. 用户**实际安装的是 v2.0.2**（不是 v3.0.0）。v2.0.2 的 `CreateWorkspaceDialog` 还是 `catch {}` 静默吞错；本次 toast 之所以能显示「服务器内部错误」是因为 v2.0.2 的 [server/plugins/error-handler.ts](file:///d:/AIKFCC/Storyloom/server/plugins/error-handler.ts) 5xx 时直接 toast 这个文案。
2. **app.log 没有任何 5xx 详细信息** — 因为 `process.env.NODE_ENV='production'` 让 fastify logger=false（候选 B 完全坐实）。
3. v2.0.2 之前已经有 `data/storyloom.db` + 自动备份目录 `data/backups/` —— 老库覆盖升级路径。

### 2.2 Bug 1 的最高可能根因排序（基于现场数据）

| # | 根因 | 证据 |
|---|---|---|
| C | 老库 schema 缺列（v2.0.2 db 已存在，但 v3.0 drizzle 0003/0004 加了新列） | app.log 无 SQL 错误，但 `crud.ts` 用 `.returning().get()` 要 SELECT 全列 → 旧表缺列即报错 |
| A | drizzle 跑迁移时 `0002_snapshot.json` 缺失 → ENOENT 被静默吞 → 之后所有迁移没跑 | `drizzle/meta/` 实际无 0002_snapshot.json 文件 |
| B | prod fastify logger=false，错误一行不留 | server/index.ts L35；error-handler L51 |

### 2.3 Bug 2 真因（100% 锁定）

[EmptyShell.tsx L25, L67](file:///d:/AIKFCC/Storyloom/src/components/layout/EmptyShell.tsx) 用了绝对路径 `<img src="/favicon.svg">`。Electron `loadFile()` 加载 `file:///D:/.../app.asar/dist/index.html`，此时 origin=null，`/favicon.svg` 被解析为 `file:///favicon.svg`（驱动器根），找不到 → broken image。

**注**：v2.0.2 的 EmptyShell 不存在（v2.0.2 还是老 AppShell 渲染整个 toolbar/sidenav）。但 [index.html L7-L11](file:///d:/AIKFCC/Storyloom/index.html) 也是 `href="/favicon.svg"` —— 浏览器对 `<link rel=icon>` 容错不显示 broken，但 OS 任务栏图标其实就是 Electron `BrowserWindow.icon`（[main.ts L82-L98](file:///d:/AIKFCC/Storyloom/electron/main.ts#L82-L98) `getAppIconPath()`）。所以用户截图里"左上角破碎图片"指的应是窗口标题栏的 favicon link。

### 2.4 远端 Releases 现状

- 9 条 GitHub Release 全部存在：`v3.0.0`、`v2.0.2 (Latest)`、`[ARCHIVED] v2.0.1` … `[ARCHIVED] v4.0.0`
- 用户反馈："撤回目前所有的版本，发布一个全新的版本，目前描述也修改一下，很多描述太冗余"
- 所有 git tags 均已推送 origin，删 tag 会破坏 CHANGELOG 链接 — **保留 tags，只删 release 物料**

---

## 3. 实施计划

### Phase A · 代码修复（src + server + electron）

#### A-1 修 Bug 2（favicon 路径）

**文件**：[`src/components/layout/EmptyShell.tsx`](file:///d:/AIKFCC/Storyloom/src/components/layout/EmptyShell.tsx)

把所有 `src="/favicon.svg"` 改为：

```tsx
import faviconUrl from '/favicon.svg?url';
// ...
<img src={faviconUrl} alt="Storyloom" />
```

Vite 会处理 import，输出相对路径 `./assets/favicon-<hash>.svg`，file:// 下可解析。

**文件**：[`index.html`](file:///d:/AIKFCC/Storyloom/index.html)

L7-L11 把所有 `href="/xxx"` 改为 `href="./xxx"`：
- `/favicon.svg` → `./favicon.svg`
- `/favicon.ico` → `./favicon.ico`
- `/apple-touch-icon.png` → `./apple-touch-icon.png`
- `/icon-192.png` → `./icon-192.png`
- `/icon-512.png` → `./icon-512.png`

#### A-2 修 Bug 1 多绿护栏（按重要性顺序）

**A-2-a：5xx error-handler 兜底 console.error（最关键）**

文件：[`server/plugins/error-handler.ts`](file:///d:/AIKFCC/Storyloom/server/plugins/error-handler.ts)

L43-L53 改造：

```ts
if (statusCode >= 500) {
  // 兜底：即使 fastify logger 被关，也要把错误打到 stdout（被 Electron setupLogging 重定向到 app.log）
  // eslint-disable-next-line no-console
  console.error('[5xx]', request.method, request.url, error);
  request.log.error(error);
}
const message = isDev
  ? error.message
  : `服务器内部错误${error.code ? ` (${error.code})` : ''}`;
```

**A-2-b：Electron prod 也开 fastify logger**

文件：[`server/index.ts`](file:///d:/AIKFCC/Storyloom/server/index.ts)

L33-L37 改造：让 Electron 进程下始终启用 logger（process.env 由 main.ts 注入）：

```ts
const isElectron = process.env.STORYLOOM_ELECTRON === '1';
const enableLogger = options?.logger ?? (process.env.NODE_ENV !== 'production' || isElectron);
const app = Fastify({
  logger: enableLogger,
});
```

文件：[`electron/main.ts`](file:///d:/AIKFCC/Storyloom/electron/main.ts)

L162-L198 startServer 处增加：

```ts
process.env.STORYLOOM_ELECTRON = '1';
```

**A-2-c：兼容老库（PRAGMA 缺列兜底）**

文件：[`server/db/index.ts`](file:///d:/AIKFCC/Storyloom/server/db/index.ts)

新增 `ensureSchemaCompatibility(db)` 函数，在 `runMigrations(db)` 之后调用：

```ts
function ensureSchemaCompatibility(db: BetterSQLite3Database) {
  const ensureColumn = (table: string, column: string, type: string, defaultExpr?: string) => {
    const cols = db.all(sql`PRAGMA table_info(${sql.identifier(table)})`) as Array<{ name: string }>;
    if (!cols.some(c => c.name === column)) {
      const def = defaultExpr ? `DEFAULT ${defaultExpr}` : '';
      db.run(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} ${def}`));
    }
  };
  // workspaces 表 v3.0 新加的列
  ensureColumn('workspaces', 'calendar_config_json', 'text', "'{}'");
  ensureColumn('workspaces', 'settings_json', 'text', "'{}'");
  // 其它新加的列以此类推（按 schema.ts 实际列定义补全）
}
```

**A-2-d：补 0002_snapshot.json**

文件：`drizzle/meta/0002_snapshot.json`（新建）

由 0001 + 0002 SQL 推出对应 snapshot，或最稳妥 — 直接用 `npm run db:generate` 让 drizzle-kit 重新生成完整链。

> **注**：跑 `db:generate` 之前先备份当前 `drizzle/` 目录。如重新生成会破坏现有 0003/0004 顺序，则手工写 0002_snapshot.json。

#### A-3 EmptyShell「关于」Drawer 加「查看日志」按钮

文件：[`src/components/layout/EmptyShell.tsx`](file:///d:/AIKFCC/Storyloom/src/components/layout/EmptyShell.tsx)

在「关于」Drawer 现有版本号 + GitHub 链接段下增加：

```tsx
<TButton
  variant="outline"
  onClick={() => {
    if (window.electronAPI?.openLogFolder) {
      window.electronAPI.openLogFolder();
    } else {
      // 浏览器环境兜底
      toast.info('日志路径：%APPDATA%\\Storyloom\\app.log');
    }
  }}
>
  <IconPark.FolderOpen /> 查看日志
</TButton>
```

文件：[`electron/preload.ts`](file:///d:/AIKFCC/Storyloom/electron/preload.ts)

`contextBridge.exposeInMainWorld('electronAPI', { ..., openLogFolder: () => ipcRenderer.invoke('open-log-folder') })`

文件：[`electron/main.ts`](file:///d:/AIKFCC/Storyloom/electron/main.ts)

```ts
ipcMain.handle('open-log-folder', () => {
  const logPath = path.join(app.getPath('userData'), 'app.log');
  shell.showItemInFolder(logPath);
});
```

### Phase B · 文档全面重写（不冗余）

#### B-1 GitHub repo description 精简

旧（103 字符 + 两段冗长说明）：
```
Storyloom · 絮织 — Weave timelines into living stories. Desktop authoring workbench for visual novels and narrative-driven stories. v3.0 brings clean first-run UX and a stable auto-update pipeline.
```

新（≤ 80 字符）：
```
Storyloom · 絮织 — Desktop authoring workbench for visual novels and narrative-driven stories. Multi-track timeline + outline + character/scene + AI assist + VN engine export.
```

去掉 v3.0 焕新文案（version-specific 内容应在 release-notes，不在 repo description）。

#### B-2 README.md 复核

[`README.md`](file:///d:/AIKFCC/Storyloom/README.md) 已是 v3.0 重写的精简版（36 行），仅需把 version badge 从 `v3.0.0` 改 `v3.0.1`。

#### B-3 CHANGELOG.md 头部追加 v3.0.1 段

文件：[`CHANGELOG.md`](file:///d:/AIKFCC/Storyloom/CHANGELOG.md)

在最顶部插入：

```markdown
## [3.0.1] — 2026-06-20

Hotfix：解决 v2.x → v3.x 老库覆盖升级"无法新建工作区"+ 首启 favicon 破图。
- 修复服务器 5xx 错误在 prod 下完全静默：error-handler 加 console.error 兜底；Electron 下默认开 fastify logger。
- 补 v2.x 老库缺列兜底：initDatabase 后跑 PRAGMA 校验，缺列自动 ALTER TABLE 补齐。
- 补 drizzle/meta/0002_snapshot.json，修复 migration 链断裂。
- 修首启 logo 破碎：EmptyShell 改用 import 形式引用 favicon；index.html 把 `/xxx` 改为 `./xxx`。
- 关于 Drawer 加「查看日志」按钮，方便用户反馈。
- toast 服务器错误附 error.code（如 `服务器内部错误 (SQLITE_ERROR)`）。

[v3.0.1 release →](https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.1)
```

#### B-4 新增 `docs/release-notes-v3_0_1.md`

参照 [release-notes-v3_0.md](file:///d:/AIKFCC/Storyloom/docs/release-notes-v3_0.md) 的结构（≤ 100 行）：
- Why（一句话：v2.x 升级 + 首启回归）
- 修复清单（Bug 1 / Bug 2 / 护栏 / 调试入口）
- 升级路径（v2.0.0/v2.0.1/v2.0.2 → v3.0.1 全部走 auto-update；新用户直装）
- 已知限制（无）

#### B-5 新增 `.trae/documents/handoff-next-v3_0_1.md`（**全面排查指南** — 给下一位 AI）

这是用户特别要求的"全面核查 → 文档交接 → 让下一位 AI 全面排查"。结构：

1. **快速诊断三件套**：
   - 取 `%APPDATA%\Storyloom\app.log` 最后 200 行的 PowerShell 命令
   - Ctrl+Shift+I 打开 DevTools → Network 抓 `POST /api/workspaces` 响应体
   - PRAGMA `table_info(workspaces)` 检查老库缺列方法
2. **本轮已加的所有护栏清单**（让下一位 AI 不再踩同坑）
3. **未覆盖的潜在问题**（根据 `docs/audit/code-smells.md` Top 5 状态）
4. **升级路径 vs 全新安装的预期差异**（数据兼容矩阵）
5. **如果 hotfix 还没完全解决，下一步排查方向**

#### B-6 老 release-notes-v3_0.md 改成「v3.0 → v3.0.1 history」段

文件：[`docs/release-notes-v3_0.md`](file:///d:/AIKFCC/Storyloom/docs/release-notes-v3_0.md)

末尾追加一行："> **2026-06-20 后续**：见 [release-notes-v3_0_1.md](./release-notes-v3_0_1.md)。"

### Phase C · 撤回所有现有 GitHub Releases

按用户要求"撤回目前所有的版本"：

#### C-1 删 release（保留 git tags）

对 9 个 release 全部跑：

```powershell
$tags = @('v3.0.0','v2.0.2','v2.0.1','v2.0.0','v1.1.0','v1.0.1','v1.0.0','v4.2.1','v4.1.0','v4.0.0')
foreach ($t in $tags) {
  gh release delete $t --yes --cleanup-tag=false
}
```

`--cleanup-tag=false` 保 git tag。

#### C-2 发布 v3.0.1 作为唯一干净 release

按 [docs/RELEASING.md](file:///d:/AIKFCC/Storyloom/docs/RELEASING.md) 10 步流程：

1. `package.json#version` 3.0.0 → 3.0.1
2. `npm install --package-lock-only`
3. `npm run typecheck && npm run test && npm run build`
4. `git add -A && git commit -m "fix(v3.0.1): hotfix server 5xx silence + favicon broken + db column compat"`
5. `git tag -a v3.0.1 -m "Storyloom v3.0.1 — Hotfix & Clean Slate"`
6. `git push origin master --tags`
7. `$env:ATC_DIST_DIR = "release-v3.0.1"; npm run dist`
8. `Rename-Item "release-v3.0.1\Storyloom Setup 3.0.1.exe" "Storyloom-Setup-3.0.1.exe"` + blockmap
9. `gh release create v3.0.1 ... --title "Storyloom v3.0.1 — Hotfix & Clean Slate" --notes-file docs/release-notes-v3_0_1.md`
10. `Invoke-WebRequest releases/latest/download/latest.yml` 验证 HTTP 200

#### C-3 重写 GitHub repo description

```powershell
gh repo edit YJLZSL/Storyloom --description "Storyloom · 絮织 — Desktop authoring workbench for visual novels and narrative-driven stories. Multi-track timeline + outline + character/scene + AI assist + VN engine export."
```

### Phase D · 自动更新自检

- `Invoke-WebRequest https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml` HTTP 200 + `version: 3.0.1`
- `gh release list` 仅显示 v3.0.1（Latest）+ 历史 git tags（无 Release 物料）
- 用 v2.0.2 副本（之前未卸载的本机安装）启动 → 5 秒内 UpdateNotifier 提示 v3.0.1
- 升级安装后实测：(a) 首启不再有破碎 logo (b) 新建工作区无 5xx，正常进入

---

## 4. 假设与决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 版本号 | v3.0.1 patch | 不变 schema、不变 appId，符合 SemVer hotfix |
| 是否删 git tag | 不删 | tags 是 git 历史；CHANGELOG/release-notes 仍引用；只清 release 物料 |
| logger 改造档位 | "三项都要" | 用户决策：5xx console.error + Electron 开 logger + toast 附 code |
| 老库兼容策略 | PRAGMA + ALTER TABLE | 比 schema diff 工具更简单；幂等；不破坏现有数据 |
| drizzle/meta/0002 | 重新生成 | drizzle-kit 是真相源；手写 snapshot 可能漏字段 |
| 「查看日志」入口位置 | EmptyShell 关于 Drawer | 用户已选；首启场景最易触达 |
| repo description 风格 | 80 字符内、不带版本号 | 描述应是稳定的项目定位，不是变化的发版文案 |

---

## 5. 验证步骤（执行完后逐条核对）

### 5.1 代码层
- [ ] `npm run typecheck` exit 0
- [ ] `npm run test` 12/12 passed
- [ ] `npm run build` exit 0
- [ ] dev server 启动后 EmptyShell 顶部 logo 显示正常（DevTools Network 看 favicon.svg 200）
- [ ] dev server 创建工作区，故意造个错（如往 `name` 字段塞超长字符串）→ toast 显示 `服务器内部错误 (XXX)` 而非 `服务器内部错误`，app.log 出现 `[5xx]` 行
- [ ] dev server 关于 Drawer「查看日志」按钮能弹出 explorer 定位到 `userData/app.log`

### 5.2 老库兼容
- [ ] 准备一个 v2.0.2 schema 的老 `storyloom.db` 副本（或临时 ALTER TABLE 删一两列模拟）
- [ ] 启动 server，看 app.log 是否打 `[ensureSchemaCompatibility] adding column workspaces.calendar_config_json`
- [ ] 创建工作区成功，无 5xx

### 5.3 打包链路
- [ ] `npm run dist` 产物 `Storyloom-Setup-3.0.1.exe` + `.blockmap` + `latest.yml`
- [ ] latest.yml `version: 3.0.1` + url 字段与 asset 名一致
- [ ] 安装包安装后启动 → 不再有 favicon broken / 创建工作区可成功

### 5.4 GitHub
- [ ] `gh release list` 只剩 v3.0.1（Latest）
- [ ] `gh repo view --json description` 描述精简，无 v3.0 焕新文案
- [ ] `https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml` HTTP 200，含 `version: 3.0.1`
- [ ] `git tag --list "v*"` 仍可见 9 个历史 tag

### 5.5 自动更新
- [ ] 本机 v2.0.2 副本启动后 30s 内提示更新
- [ ] 接受更新 → 下载 → 重启 → 跑到 v3.0.1
- [ ] data/storyloom.db 完整保留，老工作区可见

### 5.6 文档
- [ ] [`README.md`](file:///d:/AIKFCC/Storyloom/README.md) version badge = v3.0.1
- [ ] [`CHANGELOG.md`](file:///d:/AIKFCC/Storyloom/CHANGELOG.md) 顶部新增 v3.0.1 段
- [ ] [`docs/release-notes-v3_0_1.md`](file:///d:/AIKFCC/Storyloom/docs/release-notes-v3_0_1.md) 完整
- [ ] [`.trae/documents/handoff-next-v3_0_1.md`](file:///d:/AIKFCC/Storyloom/.trae/documents/handoff-next-v3_0_1.md) 含三件套快速诊断 + 护栏清单 + 后续排查方向
- [ ] [`docs/release-notes-v3_0.md`](file:///d:/AIKFCC/Storyloom/docs/release-notes-v3_0.md) 末尾加 v3.0.1 后续指针

---

## 6. 文件清单（一览）

### 修改
- `src/components/layout/EmptyShell.tsx` — favicon import + 关于 Drawer 加「查看日志」
- `index.html` — 5 处 `/xxx` → `./xxx`
- `server/plugins/error-handler.ts` — 5xx console.error 兜底 + toast 附 code
- `server/index.ts` — Electron 下也开 fastify logger
- `server/db/index.ts` — 新增 `ensureSchemaCompatibility()` PRAGMA 兜底
- `electron/main.ts` — `process.env.STORYLOOM_ELECTRON='1'` + ipcMain `open-log-folder` handler
- `electron/preload.ts` — 暴露 `openLogFolder`
- `package.json` — version 3.0.0 → 3.0.1
- `README.md` — version badge
- `CHANGELOG.md` — 顶部新增 v3.0.1 段
- `docs/release-notes-v3_0.md` — 末尾加后续指针

### 新增
- `drizzle/meta/0002_snapshot.json`（drizzle-kit 重新生成 OR 手写）
- `docs/release-notes-v3_0_1.md`
- `.trae/documents/handoff-next-v3_0_1.md`

### 不变
- 全部 git tags（v1.0.0 ~ v3.0.0 共 9 个）
- 全部 schema 文件（drizzle/0000~0004.sql 不变；只补 0002_snapshot.json meta）
- 全部 spec 历史归档

### 远端清理（GitHub Releases，不动 tag）
- 删除 9 个旧 release：v3.0.0 / v2.0.2 / v2.0.1 / v2.0.0 / v1.1.0 / v1.0.1 / v1.0.0 / v4.2.1 / v4.1.0 / v4.0.0
- 新建 1 个 release：v3.0.1（Latest）
- 重写 repo description 为精简版

---

## 7. 风险与回滚

| 风险 | 缓解 |
|---|---|
| `npm run db:generate` 重生 0002_snapshot.json 时改动 0003/0004 | 先备份整 `drizzle/` 目录，diff 后只接受 0002 改动；其他文件强制还原 |
| 删除全部 release 后 v2.0.0 ~ v2.0.2 用户的 electron-updater 找不到 latest.yml | 仅 5 秒检测期内表现为"暂无更新"，对老用户无破坏；新发的 v3.0.1 一上线立刻被检测到 |
| `STORYLOOM_ELECTRON` 环境变量泄露到子进程 | 仅在主进程进程级设置，server 同进程跑；不影响外部 |
| 老库 ALTER TABLE 失败 | 包在 try/catch 内单独 log；即使失败也不阻塞 init（让真错误自然抛出 INSERT 时） |

回滚：如 v3.0.1 上线后发现新问题，可立即 `gh release delete v3.0.1 --cleanup-tag=false` 回到无 release 状态；用户继续用本地缓存版本。本仓库 commit 历史全部不删，可随时 `git revert` 后重发 v3.0.2。

---

## 8. 执行顺序（建议拓扑）

```
A-1 favicon 修复 ─┐
A-3 关于 Drawer 加按钮 ─┼─→ B-1~B-6 文档 ─→ Phase C 发版 ─→ Phase D 自检
A-2-a/b/c/d 多绿护栏 ─┘
```

A 阶段四块独立可并行；B 阶段在 A 完成后写；C 阶段在 B 完成后跑；D 在 C 完成后验证。预计：A ≈ 30 min（分四块）+ B ≈ 20 min + C ≈ 20 min（npm run dist 即占 5 min）+ D ≈ 10 min。
