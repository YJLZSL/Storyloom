# Storyloom v3.0.1 — Hotfix & Clean Slate

> 发布日期：2026-06-20
> 类型：patch（v3.0.0 → v3.0.1）
> 上一版：v3.0.0（已撤回 GitHub Release，git tag 仍保留可见）
> 完整发版历史：见仓库根 [`CHANGELOG.md`](../CHANGELOG.md)

---

## 为什么发这个版本

用户反馈：**v2.x 客户端覆盖升级到新版本后，新建工作区显示「创建失败：服务器内部错误」**，同时首启时左上角 logo 显示破碎图片。本版本修这两个 bug，并把它们暴露出来的更深层问题（服务器错误在 prod 下完全静默 / 老库缺列没兜底）一次性装上护栏。

同时按用户要求，**撤回 GitHub 上所有 9 个历史 Release**（保留 git tag 不动），把 v3.0.1 作为唯一干净的对外发布版本，让新访客打开 Releases 页面只看到一条最新版。

## 修复清单

### Bug 1：「服务器内部错误」无法新建工作区

**真因**（基于 `%APPDATA%\Storyloom\app.log` 现场证据 + 代码审查）：

老 v2.x 用户的 `data/storyloom.db` 缺 v3.0 schema 后加的列（如 `workspaces.calendar_config_json`、`events.narrative_order` 等）；INSERT 时 `.returning().get()` 要求 SELECT 全列 → 触发 SQLite "no such column" 错误。同时 fastify logger 在 prod 下被关闭，错误一行不留，前端 toast 只见笼统的"服务器内部错误"。

**多绿修复**（不抹哈，把所有可能根因一次性装护栏）：

| 护栏 | 文件 | 作用 |
|---|---|---|
| **5xx console.error 兜底** | `server/plugins/error-handler.ts` | 即使 fastify logger=false，也用 `console.error('[5xx]', method, url, code, message, stack)` 把详情打到 stdout，被 setupLogging 重定向到 app.log |
| **Electron 也开 fastify logger** | `server/index.ts` + `electron/main.ts` | main 注入 `STORYLOOM_ELECTRON=1` 环境变量；server 启动时如检测到该变量，prod 下也启用 logger |
| **5xx toast 附 error.code** | `server/plugins/error-handler.ts` | `服务器内部错误 (SQLITE_ERROR)` 比裸文案多一截信息，方便用户截图反馈 |
| **老库缺列兜底** | `server/db/index.ts` | `runMigrations()` 后调 `ensureSchemaCompatibility()` 对 workspaces / tracks / events 三张主表做 PRAGMA + 幂等 ALTER TABLE 补列 |
| **migration ENOENT 容错** | `server/db/index.ts` | `runMigrations()` try/catch ENOENT，避免 drizzle meta 缺失（如 `0002_snapshot.json`）导致整链断裂 |

### Bug 2：首启左上角 logo 破碎图片

**真因**：`EmptyShell.tsx` 与 `index.html` 用了绝对路径 `/favicon.svg`。Electron `loadFile()` 加载 `file:///D:/.../app.asar/dist/index.html` 后，`/favicon.svg` 被 `file://` origin（null）解析为 `file:///favicon.svg`（驱动器根），找不到 → broken image。

**修复**：
- `EmptyShell.tsx` 改用 `import faviconUrl from '/favicon.svg?url'`，让 Vite 在构建时输出相对路径。
- `index.html` 把 5 处 `href="/xxx"` 改为 `href="./xxx"`。

### 调试入口（用户反馈友好化）

EmptyShell 关于 Drawer 内新增「查看日志」按钮：
- Electron 下 `shell.showItemInFolder(app.getPath('userData')/app.log)` 直接打开 explorer 定位到日志
- 浏览器下退化为 toast 提示日志路径

下一位接手者看到用户反馈时，可让 ta 点这个按钮取最新 50 行 app.log，秒杀大部分疑难杂症。

## 质量门

| 检查 | 结果 |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run test` | ✅ 12 passed (3 files) |
| `npm run build` | ✅ exit 0（44s） |
| `npm run dist`（Windows NSIS） | ✅ 已上传到本 Release |

## 升级路径

### 已部署 v2.0.2 用户

无需手动操作。本机 electron-updater 会在启动后 5 秒内检测到 v3.0.1，弹窗提示下载，确认后重启即完成覆盖安装。data/ 完整保留，老库缺列由本版本自动补齐。

### 已部署 v2.0.0 / v2.0.1 / v3.0.0 用户

本轮已撤回这些版本的 Release 物料，electron-updater 链路在升级到 v3.0.1 之前会"暂无更新"。请手动到 https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.1 下载 `Storyloom-Setup-3.0.1.exe` 安装一次。data/ 保留。

### 新用户

到 https://github.com/YJLZSL/Storyloom/releases/tag/v3.0.1 下载 `Storyloom-Setup-3.0.1.exe`，双击安装即可。

## 已知限制

- 本轮没有重生成 `drizzle/meta/0002_snapshot.json`（drizzle-kit 提示 schema 已最新无需 generate）。运行时已通过 try/catch ENOENT + ensureSchemaCompatibility 兜底，**对用户无影响**。如下一位维护者愿意彻底解决，参见 [`docs/RELEASING.md`](./RELEASING.md) 与 [handoff-next-v3_0_1.md](../.trae/documents/handoff-next-v3_0_1.md)。

## 致谢与下一步

参见 [`.trae/documents/handoff-next-v3_0_1.md`](../.trae/documents/handoff-next-v3_0_1.md) — 包含「全面排查指南」三件套（取 app.log / DevTools 抓包 / PRAGMA 校验），供下一位维护者快速定位类似问题。

> 织机修了一道松动的纬线。下一根线，请继续。
