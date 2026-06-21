# 后端 P0 修复报告 v2

> 修复时间：基于 `reports/backend-audit-v2.md` 执行  
> 目标：修复所有 P0 级别问题，不破坏后端编译

---

## 修改文件列表

### 1. 删除死代码文件

| 文件 | 原因 | 操作 |
|------|------|------|
| `server/db/init.ts` | 整文件无引用，`verifyEssentialTables()` / `initDatabase()` / `getCreateTableStatements()` 均未被任何文件导入 | 删除 |
| `server/migration/v3-to-v4.ts` | `hasV3Data()` 和 `migrateV3ToV4()` 导出后从未被任何文件导入 | 删除 |

### 2. 移除未使用导入

| 文件 | 移除内容 | 原因 |
|------|----------|------|
| `server/db/migrate.ts` | 从导入中移除 `closeDb` | 文件内从未调用 `closeDb`（`closeDb` 在 `server/index.ts` 和 `server/plugins/database.ts` 中正常使用） |
| `server/routes/assets.ts` | 从 `fs` 导入中移除 `statSync` | 文件内从未调用 `statSync` |
| `server/routes/assets.ts` | 移除整行 `import { pipeline } from 'stream/promises'` | 文件内从未调用 `pipeline` |
| `server/routes/events.ts` | 从 `drizzle-orm` 导入中移除 `like` | 搜索使用 `sql` 模板字符串实现 LIKE，从未调用 `like` |
| `server/routes/foreshadowings.ts` | 从类型导入中移除 `Foreshadowing` | 文件内仅使用 `CreateForeshadowingRequest` 和 `UpdateForeshadowingRequest`，从未使用 `Foreshadowing` |

### 3. 删除死分支

| 文件 | 修改位置 | 说明 |
|------|----------|------|
| `server/index.ts` | 第149-156行 | 删除 `if (!distPath)` 分支。外层 `if (process.env.STATIC_DIR)` 已为真时，`distPath = process.env.STATIC_DIR` 必然有值，该分支永远不会执行。同时 `let distPath` 改为 `const distPath`。 |

### 4. package.json（无需修改）

经确认，`package.json` 中已不存在 `scripts/comprehensive_v1_0_0_test.py` 和 `scripts/visual_browser_smoke.py` 相关的 npm scripts，无需修改。

---

## 编译验证

所有修改完成后，运行以下命令验证：

```bash
node_modules/.bin/tsc -p tsconfig.server.json --noEmit
```

结果：**0 错误，编译通过。**

---

## 修改摘要统计

- 删除死代码文件：2 个
- 移除未使用导入：5 处（6 个导入项）
- 删除死分支：1 处
- 修改文件总数：5 个（`server/db/migrate.ts`, `server/routes/assets.ts`, `server/routes/events.ts`, `server/routes/foreshadowings.ts`, `server/index.ts`）
- 删除文件总数：2 个（`server/db/init.ts`, `server/migration/v3-to-v4.ts`）
- 后端编译状态：✅ 通过

---

## 备注

- 未触及 P1/P2/P3 级别问题（如重复逻辑、超长函数拆分、错误处理等），仅按指令处理 P0 级别。
- 未拆分任何函数，未添加任何 try-catch。
- 所有操作均已确认无其他文件引用被删除内容。
