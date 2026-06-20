# 移交说明 · v3.0.1（含全面排查指南）

> 交接时间：2026-06-20
> 交接对象：下一位维护者 / 下一段对话的 AI
> 前置状态：Storyloom v3.0.1 已发布，撤回了所有 9 个老 Release，唯一干净 release 即 v3.0.1

> 前置阅读（按顺序）：
> 1. [`README.md`](../../README.md) — 项目门面
> 2. [`CHANGELOG.md`](../../CHANGELOG.md) — v3.0.1 顶部摘要
> 3. [`docs/release-notes-v3_0_1.md`](../../docs/release-notes-v3_0_1.md) — 本版详细说明
> 4. [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) / [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md) / [`docs/RELEASING.md`](../../docs/RELEASING.md) — 三大核心参考

---

## 1. 本轮（v3.0.1）做了什么

### 修了两个 bug

- **Bug 1**：v2.x → v3.x 老库覆盖升级时，新建工作区 5xx 静默 → 多绿修复（5xx console.error 兜底 / Electron 开 fastify logger / toast 附 error.code / 老库缺列 PRAGMA 兜底 / migration ENOENT 容错）
- **Bug 2**：Electron `file://` 下 `/favicon.svg` 解析到驱动器根 → 改用 Vite import + `./xxx` 相对路径

### 加了一个调试入口

- EmptyShell 关于 Drawer 内的「查看日志」按钮 → `shell.showItemInFolder(app.getPath('userData')/app.log)`

### 整理了远端

- 撤回 9 个老 Release（v1.x / v2.x / v3.0.0 / v4.x），git tag 全部保留
- v3.0.1 是唯一对外发布的干净版本
- GitHub repo description 简化为 80 字符内、不带版本号

---

## 2. 全面排查指南（**用户反馈类似问题时按顺序跑**）

### 三件套快速诊断

#### 第一件：取最近 200 行 app.log

让用户跑（PowerShell）：

```powershell
$log = Join-Path $env:APPDATA 'Storyloom\app.log'
if (Test-Path $log) {
  Get-Content $log -Tail 200 | clip
  Write-Host "已复制到剪贴板"
} else {
  Write-Host "$log 不存在"
}
```

或者最简单：让用户在应用空状态下点「关于 → 查看日志」。

**关键搜索词**：`[5xx]`、`SQLITE_`、`ENOENT`、`EACCES`、`Failed`、`Startup failed`。

#### 第二件：DevTools Network 抓 API 响应

让用户在应用窗口按 `Ctrl+Shift+I` → 切到 Network 面板 → 重现操作 → 找失败的请求（如 `POST /api/workspaces`）→ 看 Response 标签 → 截图。

应该能看到完整 JSON：
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "服务器内部错误 (SQLITE_ERROR)"
  }
}
```

错误 code 揭示真正问题（SQLITE_ERROR / SQLITE_CONSTRAINT / VALIDATION_ERROR / INTERNAL_ERROR）。

#### 第三件：PRAGMA 检查老库缺列

让用户在 PowerShell（如系统装了 sqlite3 命令行）跑：

```powershell
$db = Join-Path $env:APPDATA 'Storyloom\data\timeline.db'
sqlite3 $db "PRAGMA table_info(workspaces);"
sqlite3 $db "PRAGMA table_info(events);"
sqlite3 $db "PRAGMA table_info(tracks);"
```

或更简单：在应用启动后看 app.log 里是否出现 `[compat] added missing column` 行（这是 v3.0.1 起 ensureSchemaCompatibility 自动补列时的输出）。

---

## 3. v3.0.1 已加的所有护栏（让下一位 AI 不再踩同坑）

| 位置 | 护栏 | 防什么 |
|---|---|---|
| `server/plugins/error-handler.ts` | 5xx 时 `console.error('[5xx]', method, url, code, message, stack)` 兜底 | fastify logger 被关导致错误失踪 |
| `server/plugins/error-handler.ts` | toast message 拼 `error.code` | 用户看到笼统"服务器内部错误"无法反馈 |
| `server/index.ts` | Electron 进程下 fastify logger 默认开 | prod 下 logger=false |
| `server/db/index.ts` | `runMigrations()` 内 try/catch ENOENT | drizzle meta 缺文件 |
| `server/db/index.ts` | `ensureSchemaCompatibility()` 跑 PRAGMA + 幂等 ALTER TABLE | 老库覆盖升级缺列 |
| `electron/main.ts` | `process.env.STORYLOOM_ELECTRON='1'` | server 知道自己在 Electron 里跑 |
| `electron/main.ts` | `ipcMain.handle('open-log-folder')` | 用户反馈不便 |
| `electron/preload.ts` | `electronAPI.openLogFolder` | renderer 调用主进程能力 |
| `src/components/layout/EmptyShell.tsx` | `import faviconUrl from '/favicon.svg?url'` | file:// 解析失败 |
| `index.html` | 5 处 `/xxx` → `./xxx` | 同上 |

---

## 4. 升级路径 vs 全新安装的预期差异（兼容矩阵）

| 用户起点 | 升级到 v3.0.1 | 数据兼容 | 老库列补齐 |
|---|---|---|---|
| 全新安装 | 直接装 `Storyloom-Setup-3.0.1.exe` | N/A | N/A |
| v2.0.2 | electron-updater 自动到 v3.0.1 | ✅ | ✅ ensureSchemaCompatibility |
| v2.0.0 / v2.0.1 / v3.0.0 | **手动**下载 v3.0.1 安装包覆盖（这些 release 已撤回，electron-updater 暂无更新） | ✅ | ✅ |
| v4.x / v1.x | **手动**重装；DB schema 差异较大，建议清空 data/ 重来 | ⚠️ 部分 | 不保证 |

---

## 5. 用户自测 v3.0.1 仍未解决的已知问题（本轮交给下一位 AI 的首要任务）

> ⚠️ 以下问题来自用户在真实环境（Windows 安装版）自测截图，不要重复 v3.0.1 已做的修复，要深入查根因。

### 问题 A：新建工作区仍然报错 `创建失败：服务器内部错误 (SQLITE_ERROR)`

- 现象：首启 → 打开「新建工作区」弹窗 → 输入名称 → 点创建 → 右上角 toast 出现 `创建失败：服务器内部错误 (SQLITE_ERROR)`
- 已确认：v3.0.1 已经加了 `ensureSchemaCompatibility` 和 5xx 兜底，但用户机器上仍然复现
- 关键排查点：
  1. 必须拿到该机器的 `app.log` 中 `[5xx]` 行的完整 stack（见三件套第一件）
  2. 确认 `error.code` 是 `SQLITE_ERROR` 还是 `SQLITE_CONSTRAINT` / `SQLITE_MISMATCH` 等子类型
  3. 跑 `PRAGMA table_info(workspaces);` 和 `PRAGMA table_info(events);` 对比 v3.0 schema（见三件套第三件）
  4. 检查 `data/timeline.db` 是否同时存在旧 migration 留下的 `.journal` / `.wal` 导致启动时 migration 部分失败
  5. 检查 `server/db/index.ts` 里 `ensureSchemaCompatibility()` 是否在 migration 失败/异常后**根本没执行**
  6. 检查用户是否真的是 v3.0.1 安装包（Electron 窗口标题 / 关于页版本 / `app.log` 首行版本）

### 问题 B：设置弹窗背景透明，内容透出难以辨认

- 现象：打开「设置」→ 弹窗背景半透明 / 透明，底层 EmptyShell 主界面直接透出，文字重叠看不清（见用户截图）
- 可能方向（按优先级）：
  1. `Dialog` / `Modal` 组件的 overlay 或 content 背景色使用了 `bg-background/80`、`bg-opacity-0` 或 CSS 变量缺失
  2. 主题 token 里 `--background` 被设成透明，或弹窗单独用了 `bg-transparent`
  3. Electron 生产构建后 Tailwind 类名被 purge，导致部分背景类未生效（对比 dev 与 prod）
  4. 检查 `src/components/settings/SettingsDialog.tsx` 及 shadcn/ui `Dialog` 组件的 overlay 实现
- 建议：先锁定是 dev 正常、prod 异常，还是两种环境都异常。

---

## 6. 如果 v3.0.1 hotfix 还没解决，下一步排查方向

### 假设 1：错误依然显示"服务器内部错误"但没 code

- 检查 `app.log` 是否有 `[5xx]` 行 — 如**没有**则 server 进程根本没挂在 Electron 里跑（或没用本版本的 error-handler）
- 检查 `package.json#version` 是否真的 ≥ 3.0.1（防回滚）
- 检查 dist-server/server/plugins/error-handler.js 是否包含 `[5xx]` 字面量（防 build 漏更新）

### 假设 2：错误显示 `(SQLITE_ERROR)` 或类似

- 在 app.log 里搜 `[5xx]` 行，会列出具体表名 / 列名
- 如缺的列不在 ensureSchemaCompatibility() 的清单内 → 把表 + 列加到 [`server/db/index.ts`](../../server/db/index.ts) 的 `ensureSchemaCompatibility()` 函数里
- 如是 SQLITE_CONSTRAINT → 看是不是 v3.0 schema 加了 NOT NULL 而老库该列有 NULL

### 假设 3：favicon 还是破碎

- 让用户开 DevTools Network → 看 favicon.svg 实际请求 URL
- 如显示 `file:///favicon.svg` → 说明 import 没生效（dev 路径 vs prod 路径区别）→ 检查 `EmptyShell.tsx` import 是否在构建产物里被正确替换
- 如显示 `file:///D:/.../app.asar/dist/assets/favicon-XXX.svg` HTTP 200 → 说明本身 OK，是其它资源问题

### 假设 4：electron-updater 不工作

- 让用户启动应用 30 秒后看 app.log 是否有 `Update`、`autoUpdater`、`UpdateNotifier` 相关行
- 检查 latest.yml 是否真的可拿：`Invoke-WebRequest https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml`
- 检查 `package.json#build.publish.repo` 是否仍为 `Storyloom`（v3.0.1 不动）

---

## 7. 后续 v3.x 候选路线（继承自 handoff-next-v3_0.md）

按价值/成本排序：

1. **抽 EntityPanel\<T\>** — Character / WorldBuilding / Foreshadowing 三大面板同构（详见 `docs/audit/code-smells.md` #2）
2. **拆分 OutlineView.tsx** — 904 行单文件（详见 `docs/audit/code-smells.md` #1）
3. **AI 配置入库** — 当前 settings 仅 localStorage，应有后端持久化
4. **完善 ensureSchemaCompatibility** — 当前只覆盖 3 张主表，理论上应该覆盖全部 ~20 张表（schema diff 工具值得做）

---

## 8. 起步检查清单（接手后请先完成）

接手第一天，请按顺序完成：

- [ ] `cd "d:\AIKFCC\Storyloom"`，`git status` 清洁
- [ ] `git pull origin master` 同步 v3.0.1 commit + tag
- [ ] `npm install` 同步依赖
- [ ] `npm run typecheck && npm run test && npm run build` 三连必须全绿
- [ ] `npm run dev:electron` 启动 Electron — 首启 logo 正常显示，无破碎图
- [ ] **复现问题 A**：在 prod 安装环境（或把老 `data/timeline.db` 拷到 `%APPDATA%/Storyloom/data/`）新建工作区 → 如复现 `SQLITE_ERROR`，抓 `app.log` 的 `[5xx]` 行定位根因
- [ ] **复现问题 B**：打开设置弹窗 → 检查背景是否透明，对比 dev / prod 行为，定位 Dialog overlay 背景实现
- [ ] 手动造一个 5xx 错误（如 server 路由里临时 throw）→ toast 显示 `服务器内部错误 (XXX)`，app.log 有 `[5xx]` 行
- [ ] 关于 Drawer「查看日志」按钮能弹 explorer
- [ ] 通读上面"前置阅读"4 份文档
- [ ] 通读本文档全部 8 节

完成上述后，正式开干。

---

> v3.0.1 — 修一道松动的纬线，把客户端反馈链路打通。下一根线，请继续。
