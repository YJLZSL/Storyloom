# Storyloom v1.2.1 更新日志

> 发布日期：2026-06-21

## 修复内容

### P0 — 严重功能故障

**1. 修复工作区删除失败（"工作区不存在"）**
- 根因：`bookmarks` 表未包含在数据库 DDL 兜底逻辑中，当 drizzle 迁移在 asar 打包环境中静默失败时，`bookmarks` 表不存在，导致删除工作区的事务抛出 SQL 错误
- 修复：在 `server/db/index.ts` 硬编码 DDL 兜底中添加 `bookmarks` 表创建；在 `ensureSchemaCompatibility()` 中增加 `bookmarks` 和 `maps` 表的幂等补建逻辑；在工作区删除事务中将 `bookmarks` 表操作包裹为 try-catch 容错

**2. 修复创建轨道失败（间接修复）**
- 同一根因：数据库 DDL 兜底不完整导致表缺失。补全 bookmarks/maps 表后，整体数据库完整性得到保障

**3. 修复翻译键缺失**
- 补充 `workspace.manageTitle`（管理工作区）
- 补充 `panels.bookmarks`（书签）
- 补充 `panels.maps`（地图）
- 同时更新 zh-CN.json 和 en-US.json

### P1 — UI/UX 优化

**4. 修复字体全局适配不彻底**
- 为 TDesign 组件（按钮、输入框、对话框、标签页、菜单等）添加 `font-family: inherit` 覆盖，确保全局字体统一

**5. 右键菜单添加书签和地图入口**
- 在普通模式和专注模式的右键菜单中新增「书签」和「地图」操作项（带图标），点击可切换对应面板

### 版本号更新
- `package.json` 版本从 `1.2.0` 更新至 `1.2.1`

## 文件变更清单

| 文件 | 变更说明 |
|------|----------|
| `server/db/index.ts` | DDL 兜底添加 bookmarks 表 + 索引；ensureSchemaCompatibility 补建 bookmarks/maps 表 |
| `server/routes/workspaces/crud.ts` | 工作区删除事务中 bookmarks 操作添加 try-catch 容错 |
| `src/lib/i18n/locales/zh-CN.json` | 补充 manageTitle / bookmarks / maps 翻译键 |
| `src/lib/i18n/locales/en-US.json` | 补充 manageTitle / bookmarks / maps 翻译键 |
| `src/index.css` | TDesign 组件字体继承覆盖 |
| `src/components/layout/AppShell.tsx` | 右键菜单新增书签/地图入口（普通+专注模式） |
| `package.json` | 版本号 1.2.0 → 1.2.1 |
| `package-lock.json` | 同步更新 |
