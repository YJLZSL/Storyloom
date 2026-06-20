## Storyloom v3.0.1 全面排查报告

> 排查时间：2026-06-20
> 排查范围：代码仓库 + 生产运行环境 (v3.0.1 安装版, Electron 42, Windows 10)
> 编译状态：TypeScript 零错误, Vitest 12/12 全绿

---

### 一、致命问题（Critical）

#### C-1：生产环境迁移完全失败 —— "no such table: workspaces"

**现象**：v3.0.1 安装版启动后，所有 API 请求均返回 `SQLITE_ERROR - no such table: workspaces`，应用完全不可用（无法创建工作区、无法加载任何数据）。

**实勘证据**：

| 检查项 | 结果 |
|--------|------|
| app.log `[5xx]` 行 | 连续出现 15+ 次 `no such table: workspaces` |
| 生产 DB (`timeline.db`) 表清单 | **仅 1 张** `__drizzle_migrations`，无任何业务表 |
| `__drizzle_migrations` 行数 | **0 行**（迁移记录为空） |
| 开发 DB (`dev.db`) 表清单 | 12 张表，全部正常 |
| `runMigrations()` 日志 | app.log 中**无** `[DB] Migrations applied` 也**无** `[DB] Migration warning` |

**根因分析**：

`server/db/index.ts` 的 `runMigrations()` 调用 drizzle-orm 的 `migrate(db, { migrationsFolder })` ，`migrationsFolder` 在生产环境被设为 `E:\新建文件夹 (9)\Storyloom\resources\app.asar\drizzle`。drizzle 的迁移器使用 `fs.readdirSync` 读取 SQL 文件——虽然 Electron 的 asar 补丁理论上支持此操作，但实际上迁移器可能无法正确解析 asar 内的文件路径（特别是路径含中文 + 空格时），导致迁移静默失败。

`initDatabase()` 中的 try/catch 将迁移错误降级为 warn（`[DB] Migration warning: ...`），但该 warn 可能未被 Electron 的日志重定向捕获，因此 app.log 中完全没有迁移相关的输出。

**修复方向**：

1. 在 `runMigrations()` 中添加显式日志：迁移前 `dbLog.info('Starting migrations from: ' + migrationsPath)`，迁移后 `dbLog.info('Migrations complete')`
2. 在 `ensureSchemaCompatibility()` 中增加"表不存在则 CREATE TABLE"的兜底——目前只处理"表存在但缺列"，对"表根本不存在"的情况直接跳过（line 123: `if (cols.length === 0) return`）
3. 考虑将 drizzle 迁移 SQL 文件从 asar 中解压到临时目录再执行，避免 asar 路径兼容问题
4. `initDatabase()` 的 catch 块应在迁移失败时阻塞启动（至少显示明确的用户提示），而不是静默继续

#### C-2：Tailwind v4 CSS 变量命名不匹配 —— 设置弹窗背景透明（问题 B）

**现象**：打开设置弹窗后，Dialog 内容区背景完全透明，底层 EmptyShell 直接透出，文字重叠无法辨认。

**根因**：项目使用 Tailwind CSS v4（`tailwindcss@^4.3.1` + `@tailwindcss/vite`），但 CSS 变量仍使用 shadcn v3 的裸名约定（`--background`、`--foreground`）。Tailwind v4 要求颜色变量使用 `--color-` 前缀：

- `bg-background` 在 v4 下生成 `background-color: var(--color-background)`
- 项目的 `index.css` 只定义了 `--background`（裸名），没有 `--color-background`
- `var(--color-background)` 未定义 → 背景透明

**受影响范围**：所有使用 shadcn 主题色 utility class 的组件：
- `src/components/ui/dialog.tsx` (line 39: `bg-background`)
- `src/components/layout/AppShell.tsx` (lines 132, 153)
- `src/components/layout/EmptyShell.tsx` (line 36)
- 所有 `bg-card`、`bg-muted`、`text-foreground`、`border-border` 等 utility

**修复方向**：在 `index.css` 的 `@theme` 块中添加 `--color-*` 别名：

```css
@theme {
  --color-background: rgb(var(--background));
  --color-foreground: rgb(var(--foreground));
  --color-card: rgb(var(--card));
  --color-border: rgb(var(--border));
  /* ... 所有 shadcn 主题色变量 */
}
```

---

### 二、严重问题（High）

#### H-1：`ensureSchemaCompatibility()` 覆盖不足

`server/db/index.ts` line 111-150 的 `ensureSchemaCompatibility()` 仅覆盖 3 张主表（workspaces/tracks/events）的缺列场景。对 v3.0 schema 中新增的约 9 张表（characters, connections, foreshadowings, world_settings, outline_versions, auto_saves, event_characters, event_world_settings 以及 v1.2 新增的 scenes/beats/choices/flags/maps/assets/revisions）**完全没有兜底**。

当迁移失败时（如 C-1），这些表根本不存在，`ensureColumn` 直接 return，无任何修复效果。

#### H-2：`initDatabase()` 错误处理过于宽松

`server/db/migrate.ts` line 14-20：迁移失败仅 `console.warn` 后继续启动。在 C-1 场景下，这意味着应用带着空数据库启动，所有后续 API 请求全部 5xx，用户看到的是一连串无意义的 toast 错误。

#### H-3：生产环境 Fastify logger 输出未完整落入 app.log

v3.0.1 在 `server/index.ts` line 37-39 中为 Electron 模式启用了 fastify logger，但 app.log 中看不到 fastify 的标准输出（如请求日志、插件注册日志）。可能 `setupLogging`（electron/main.ts）的重定向机制与 fastify 的 pino logger 未完全对接。

---

### 三、代码质量问题（Medium）

#### M-1：大文件仍在膨胀

| 文件 | v3.0 审计行数 | 当前行数 | 变化 |
|------|-------------|---------|------|
| `OutlineView.tsx` | 904 | **948** | +44 行（未拆分） |
| `ForeshadowingPanel.tsx` | 697 | **732** | +35 行（未拆分） |
| `EventEditorDialog.tsx` | 667 | **698** | +31 行（未拆分） |

三个文件均有 12-18 个 `useState` 调用，大量内联箭头函数，严重影响可维护性和渲染性能。

#### M-2：死代码

| 文件/模块 | 状态 |
|-----------|------|
| `src/components/settings/CalendarConfigDialog.tsx` (252 行) | **从未被任何文件 import**，完全死代码 |
| `src/components/ui/checkbox.tsx` | 未被 import |
| `src/components/ui/command.tsx` | 未被 import |
| `src/components/ui/popover.tsx` | 未被 import |
| `src/components/ui/select.tsx` | 未被 import |
| `src/components/ui/sheet.tsx` | 未被 import |
| `src/components/ui/slider.tsx` | 未被 import |
| `src/components/ui/switch.tsx` | 未被 import |
| `src/components/ui/tabs.tsx` | 未被 import |
| `src/lib/utils.ts` 中 `safeJsonObject` | 导出但从未被 import |

共 10 个死代码文件/导出，其中 `CalendarConfigDialog.tsx` 最大（252 行）。

#### M-3：三大面板高度同构（~80% 重复）

`CharacterPanel.tsx` (469 行)、`WorldBuildingPanel.tsx` (462 行)、`ForeshadowingPanel.tsx` (732 行) 共享：

- 相同的 `StatusFilter` 类型 + `STATUS_FILTERS` 数组
- 相同的 `listRef` + `scrollSelectedIntoView` + `useEffect` 模式
- 相同的 ContextMenu import + 使用模式
- 相同的 create/edit state 管理模式（`editingId`, `edit*`, `deletingId`）

抽取 `EntityPanel<T>` 通用组件预计可减少 ~600 行重复代码。

#### M-4：shadcn `ui/` 与 TDesign `ui-tdesign/` 并存

`ui/` 目录有 20 个 shadcn 组件，其中 8 个完全未使用。项目已全面转向 TDesign（`ui-tdesign/` 被 26 个文件 import），shadcn 组件仅作为遗留代码存在。应清理未使用的 `ui/` 组件，并评估是否将仍在使用的 12 个 shadcn 组件也迁移到 TDesign。

#### M-5：测试覆盖率极低

整个 `src/` 仅有 3 个测试文件（12 个测试用例），覆盖 `safe-text`、`useMediaQuery`、`WorkspaceCard`。核心业务逻辑（时间轴、事件编辑、工作区管理）无任何测试。

---

### 四、冗余文件（可回收 ~2.7 GB）

| 项目 | 大小 | 说明 |
|------|------|------|
| `release-v2.0.1/` | 692 MB | 老版 Electron 构建产物 |
| `release-v2.0.2/` | 692 MB | 老版 Electron 构建产物 |
| `release-v3.0.0/` | 692 MB | 已被 v3.0.1 取代 |
| `out-dist/4.1.0/` | 657 MB | 旧品牌名 "AI Timeline Creator" 的远古构建 |
| `data/timeline-creator.db*` | ~4.5 MB | 旧品牌名数据库，已被 `dev.db` 取代 |
| `data/backups/timeline-creator-*` | ~1.9 MB | 10 个旧品牌名备份 |
| `tmp/` | 空 | 3 个空子目录 |
| `backend.log` | 0 字节 | 空日志文件 |
| `public/icon.ico` 与 `public/favicon.ico` | 25 KB | 逐字节相同（MD5 `06153c3c...`） |
| `docs/screenshots/v2.0-rebrand/` | 4 KB | 仅含 README，无实际截图 |
| **合计** | **~2,742 MB** | |

---

### 五、低优先级问题（Low）

| 问题 | 位置 |
|------|------|
| `OutlineView.tsx` 直接从 `tdesign-react` import Drawer，绕过 `ui-tdesign` 桶 | line 2 |
| `appId` 仍为 `com.ai.timeline-creator`（旧品牌名） | `package.json` line 104 |
| `publish.repo` 仍为 `Storyloom`（大小写不一致） | `package.json` line 124 |
| 3 个 TODO 注释未处理 | `SettingsTabs.tsx` lines 107/114, `revealInBestView.ts` line 75 |
| server 端 `search.ts` 有 635 行，是最大的路由文件 | `server/routes/search.ts` |
| Git 工作区有 2 个未提交修改 | `handoff-next-v3_0_1.md`, `code-smells.md` |

---

### 六、修复优先级建议

| 优先级 | 问题 | 预计工作量 |
|--------|------|-----------|
| P0 | C-1 迁移失败：修复生产环境 drizzle 迁移在 asar 内的执行问题 | 1-2 天 |
| P0 | C-2 CSS 变量：在 `@theme` 块添加 `--color-*` 别名 | 0.5 天 |
| P1 | H-1 扩展 `ensureSchemaCompatibility` 覆盖所有 ~20 张表 | 0.5 天 |
| P1 | H-2 迁移失败时应阻塞启动或给用户明确提示 | 0.5 天 |
| P2 | M-1 拆分 OutlineView / ForeshadowingPanel / EventEditorDialog | 2-3 天 |
| P2 | M-2 删除 10 个死代码文件/导出 | 0.5 天 |
| P2 | M-3 抽取 EntityPanel<T> | 1-2 天 |
| P3 | 清理 ~2.7 GB 冗余文件 | 0.5 天 |
| P3 | M-4 清理未使用的 shadcn ui/ 组件 | 0.5 天 |
