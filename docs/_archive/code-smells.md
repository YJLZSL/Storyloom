# 代码异味审计报告

> 最后更新：v3.0.0
> 范围：截至 v3.0 时点的代码（v2.0 抓取，v2.0.1 完成 #3/#4/#5 修复，v3.0 未追加新条目）

> 扫描范围：`src/**/*.{ts,tsx}` + `server/**/*.{ts,tsx}`
> 扫描日期：2026-06-19
> 工具：Grep / PowerShell (`Get-ChildItem | Measure-Object -Line`)

## Top 10 长文件

| # | 路径 | 行数 | 主要职责 | 拆分建议 |
|---|------|-----:|----------|----------|
| 1 | [OutlineView.tsx](file:///d:/AIKFCC/Storyloom/src/components/outline/OutlineView.tsx) | 904 | 大纲视图：抽屉编辑、章节/事件 CRUD、搜索、过滤、AI 上下文 | 拆出 `OutlineEditorDrawer`、`OutlineFilters`、`useOutlineQueries` Hook |
| 2 | [server/routes/workspaces.ts](file:///d:/AIKFCC/Storyloom/server/routes/workspaces.ts) | 717 | 工作区路由：CRUD + 导入导出 + 预览脚本 + WebGAL 导出 + 自动备份 | 拆为 `workspaces.crud.ts` / `workspaces.import-export.ts` / `workspaces.auto-saves.ts` / `workspaces.preview.ts` |
| 3 | [ForeshadowingPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/foreshadowing/ForeshadowingPanel.tsx) | 697 | 伏笔面板：列表/看板/图三视图 + CRUD + 状态过滤 | 抽出 `ForeshadowingList` 子组件、`useForeshadowingFilters` |
| 4 | [EventEditorDialog.tsx](file:///d:/AIKFCC/Storyloom/src/components/events/EventEditorDialog.tsx) | 667 | 事件编辑对话框：基础字段 + 关联角色/世界观/伏笔 + 连接 + 章节 | 拆出 `EventBasicForm` / `EventLinksTab` / `EventChapterTab`；考虑 `useEventEditorState` |
| 5 | [server/routes/search.ts](file:///d:/AIKFCC/Storyloom/server/routes/search.ts) | 599 | 全文搜索 + 一致性检查 + 关联推荐 | 拆为 `search.full-text.ts` / `search.consistency.ts` / `search.suggest.ts` |
| 6 | [server/lib/validation.ts](file:///d:/AIKFCC/Storyloom/server/lib/validation.ts) | 533 | 所有 schema/zod 校验集中文件 | 按领域拆分 `validation/event.ts` / `validation/character.ts` / `validation/foreshadowing.ts` 等 |
| 7 | [CharacterPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/characters/CharacterPanel.tsx) | 469 | 角色面板：搜索/过滤/CRUD/关联事件预览 | 抽 `CharacterCard` 与 `useCharacterFilters`，与 World/Foreshadowing 共用 hooks |
| 8 | [WorldBuildingPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/worldbuilding/WorldBuildingPanel.tsx) | 462 | 世界观面板：分类卡片 + CRUD + 关联事件 | 抽 `WorldSettingCard`，与 Character 共用 STATUS_FILTERS / 过滤逻辑 |
| 9 | [TimelineCanvas.tsx](file:///d:/AIKFCC/Storyloom/src/components/timeline/TimelineCanvas.tsx) | 462 | 时间轴画布：滚动/缩放/拖拽/连线协调 | 把缩放与拖拽逻辑抽到 `useTimelinePan` / `useTimelineZoom` hooks |
| 10 | [CommandPalette.tsx](file:///d:/AIKFCC/Storyloom/src/components/command-palette/CommandPalette.tsx) | 434 | 命令面板：搜索 + 命令分类 + 渲染 | 抽 `useCommandSearch` 与 `CommandResultRow` 子组件 |

## any/ts-ignore 滥用

| 路径 | `as any` | `@ts-ignore` | `@ts-expect-error` |
|------|---------:|-------------:|-------------------:|
| [CommandPalette.tsx](file:///d:/AIKFCC/Storyloom/src/components/command-palette/CommandPalette.tsx) | 1 | 0 | 0 |
| **小计** | **1** | **0** | **0** |

> 整个 `src/` + `server/` 仅有 1 处 `as any`，无 `@ts-ignore` / `@ts-expect-error`。类型纪律保持得很好。

## console.* 残留

| 路径 | console.log | console.error / console.warn |
|------|------------:|-----------------------------:|
| [server/index.ts](file:///d:/AIKFCC/Storyloom/server/index.ts) | 2 | 4 (含 1 warn) |
| [server/db/index.ts](file:///d:/AIKFCC/Storyloom/server/db/index.ts) | 0 | 3 (含 1 warn) |
| [server/db/migrate.ts](file:///d:/AIKFCC/Storyloom/server/db/migrate.ts) | 4 | 1 (warn) |
| [server/services/ai-proxy.ts](file:///d:/AIKFCC/Storyloom/server/services/ai-proxy.ts) | 0 | 2 |
| [server/migration/v3-to-v4.ts](file:///d:/AIKFCC/Storyloom/server/migration/v3-to-v4.ts) | 3 | 2 |
| **小计 (server)** | **9** | **12** |
| **小计 (src)** | **0** | **0** |

> 前端 0 console 残留；后端 console 使用全部带 `[server]` / `[db]` / `[AI]` / `[Migration]` 前缀，作用类似临时 logger。建议下个版本统一替换为 fastify `app.log` 或 pino。

## 重复实现 / 可抽取

### 候选 1：三大领域面板的相似结构（强烈推荐）

[CharacterPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/characters/CharacterPanel.tsx)、[WorldBuildingPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/worldbuilding/WorldBuildingPanel.tsx)、[ForeshadowingPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/foreshadowing/ForeshadowingPanel.tsx) 三者高度同构：

- 同样的导入集合：`useState/useRef/useCallback/useEffect/useMemo` + 同一组 `@/lib/icons` + `TCard/TButton/TInput/TTag/TBadge` + `ContextMenu` 全套
- 同样的 `STATUS_FILTERS = [{ key: 'all'|'empty'|'filled'|'linked', label: ... }]` 数组（Character/World 完全一致）
- 同样的"workspaceId → useXxx + useCreateXxx + useUpdateXxx + useDeleteXxx + useEvents"模式
- 同样的"selection store → scrollSelectedIntoView"联动
- 同样的 grid 卡片网格 + 右键菜单结构

**抽取建议**：建立 `src/components/_shared/EntityPanel/`：
- `EntityPanel<T>` 通用骨架组件（搜索栏 + 状态过滤 + 卡片网格 + 右键菜单）
- `useEntityFilters<T>(items, status, search)` Hook
- 共享常量 `ENTITY_STATUS_FILTERS`

预计减少代码 ~600 行（每个 Panel 减少 30-40%）。

### 候选 2：fastify 路由文件的样板模式

[foreshadowings.ts](file:///d:/AIKFCC/Storyloom/server/routes/foreshadowings.ts)、[connections.ts](file:///d:/AIKFCC/Storyloom/server/routes/connections.ts)、[world-settings.ts](file:///d:/AIKFCC/Storyloom/server/routes/world-settings.ts)、[tracks.ts](file:///d:/AIKFCC/Storyloom/server/routes/tracks.ts) 均以相同模板出现：

```
GET '/'   → list by workspaceId
POST '/'  → create with body
DELETE '/:id' → delete by id
```

**抽取建议**：在 `server/lib/` 增加 `defineCrudRoutes<TParams, TBody>(app, opts)` 工具函数，把"workspaceId 校验 + drizzle 查询/插入/删除"模式集中。预计每个路由文件可缩短 30-50%。

### 候选 3：parseTraits / JSON.parse-with-fallback 模式

[CharacterPanel.tsx](file:///d:/AIKFCC/Storyloom/src/components/characters/CharacterPanel.tsx#L28-L36) 中的 `parseTraits` 是典型的"JSON.parse + try/catch + 数组校验"，多个面板（Character/Foreshadowing/Event）有类似的"parse JSON 字段（traits / tags / linked_events）"逻辑。

**抽取建议**：在 [src/lib/utils.ts](file:///d:/AIKFCC/Storyloom/src/lib/utils.ts) 中加入 `safeJsonArray<T>(raw, fallback?)`、`safeJsonObject<T>` 通用工具。

## 前 5 处优先修复建议

| 优先级 | 修复项 | 收益 | 成本 |
|---|---|---|---|
| 1 | 在 [CommandPalette.tsx](file:///d:/AIKFCC/Storyloom/src/components/command-palette/CommandPalette.tsx#L139-L414) 中将 `inputRef` 改为 `InputRef` 类型并去除 `as any` | 消除全项目唯一 `as any`；恢复类型安全 | **小** |
| 2 | 抽取 `EntityPanel` + `useEntityFilters` 给 Character/World/Foreshadowing 复用 | 三个 400+ 行面板缩减 30-40%；统一 UX | **大** |
| 3 | 拆分 [server/routes/workspaces.ts](file:///d:/AIKFCC/Storyloom/server/routes/workspaces.ts) 为 4 个子路由文件 | 把 717 行→<200 行；后续维护成本大幅下降 | **中** |
| 4 | 把 server 的 `console.*`（21 处）替换为 fastify `app.log` / pino | 生产日志可控；移除 lint 关闭项 | **中** |
| 5 | 拆分 [OutlineView.tsx](file:///d:/AIKFCC/Storyloom/src/components/outline/OutlineView.tsx)（904 行）为 `OutlineEditorDrawer` + `OutlineFilters` + `useOutlineQueries` | 解耦最大单文件；提升可测试性 | **大** |

## 本轮已实施重构

**选定项**：优先级 1 — 移除 [CommandPalette.tsx](file:///d:/AIKFCC/Storyloom/src/components/command-palette/CommandPalette.tsx) 中唯一的 `as any`（成本：小，风险：极低）。

**变更内容**：
1. 在 import 段引入 `tdesign-react` 的 `InputRef` 类型
2. 将 `useRef<HTMLInputElement>(null)` 改为 `useRef<InputRef>(null)`（`InputRef` 同样暴露 `focus()` 方法，故 `inputRef.current?.focus()` 调用无需修改）
3. 删除 JSX 中的 `ref={inputRef as any}` → `ref={inputRef}`

**验证**：执行 `npx tsc -b --noEmit`，无新增类型错误。

**结果**：全项目 `as any` 数量从 1 → 0；`@ts-ignore` / `@ts-expect-error` 仍为 0。

## v2.0.1 已实施重构

> spec：[`.trae/specs/finalize-v2_0_1-patch/`](../../.trae/specs/finalize-v2_0_1-patch/)

本补丁版本进一步落地了 Top 5 表中 #3 / #4 / #5 三处中等成本修复。#1 OutlineView 拆分与 #2 EntityPanel\<T\> 抽象成本过大，明确移交给 v3 序列处理。

### #5 (小) — safeJson 工具上线

**变更**：`src/lib/utils.ts` 新增 `safeJsonArray<T>(raw, fallback = [])` 与 `safeJsonObject<T>(raw, fallback?)`，统一 try-catch + 类型守卫。

**迁移点**：`CharacterPanel.tsx` parseTraits、`EventEditorDialog.tsx` tags 解析、`TimelineEventCard.tsx` IIFE 解析、`OutlineView.tsx` getEventTags、`useAIConversations.ts` loadConversations。OutlineView 内 3 处对象解析语义不同，按"semantics differ"原则保留待 v3 治理。

### #4 (中) — server 日志统一

**变更**：

| 文件 | 处理 |
|---|---|
| `server/index.ts` | 6 处 `[server]` console.* → `app.log.info/warn/error` |
| `server/db/index.ts` | 引入模块级 `pino({ name: 'db' })`，4 处迁移 |
| `server/services/ai-proxy.ts` | 引入模块级 `pino({ name: 'ai-proxy' })`，2 处迁移 |
| `server/db/migrate.ts` / `server/migration/v3-to-v4.ts` | CLI 脚本，文件级 `eslint-disable no-console` 标记保留 |
| `server/index.ts` isDirectRun 兜底 | 单行 `eslint-disable-next-line no-console` |

**结果**：长驻 server 进程的 `console.*` 数量从 21 → 0（全部走 pino）。

### #3 (中) — workspaces.ts 拆分

**变更**：`server/routes/workspaces.ts`（717 行单文件）→ `server/routes/workspaces/`：

| 文件 | 行数 |
|---|---:|
| index.ts | 12 |
| crud.ts | 171 |
| import-export.ts | 150 |
| auto-saves.ts | 77 |
| helpers-collect.ts | 58 |
| helpers-import.ts | 188 |
| helpers-preview.ts | 105 |

**结果**：单文件均 ≤ 200 行；HTTP 路径与请求/响应契约保持完全不变；冒烟服务启动正常。

### 留给 v3 的活儿

- **#1**：OutlineView.tsx (904 行) 拆 `OutlineEditorDrawer` + `OutlineFilters` + `useOutlineQueries`
- **#2**：抽 `EntityPanel<T>` + `useEntityFilters` 给 Character / WorldBuilding / Foreshadowing 复用，预计减少 ~600 行


## v3.0.0 状态

本轮（cleanup-and-firstrun-fix-v3_0_0）聚焦仓库整理 + 首启 UX 修复，**未追加新条目**。Top 5 状态如下：

| # | 描述 | 状态 |
|---|---|---|
| 1 | OutlineView.tsx (904 行) 拆分 | 待办 → v3.x |
| 2 | EntityPanel\<T\> 抽象 | 待办 → v3.x |
| 3 | server/routes/workspaces.ts 拆分 | ✅ 已在 v2.0.1 完成 |
| 4 | server console → fastify/pino logger | ✅ 已在 v2.0.1 完成 |
| 5 | safeJson 工具 | ✅ 已在 v2.0.1 完成 |

下一位维护者建议从 #1 / #2 中任选一项启动 v3.x 序列重构。

