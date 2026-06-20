# Storyloom 前端全面重构计划 · v1.0

> 目标：基于 `handoff-frontend-aesthetics.md` 的系统性调研，对前端进行彻底重构，统一设计系统、消除组件库混用、提升视觉品质，同时确保后端 API 契约不变，功能完整正常。

---

## 项目基线（当前 v3.0.4）

- `typecheck`: 0 错误
- `test`: 12/12 通过
- 技术栈：Electron + React 19 + TS + Vite 6 + Tailwind v4 + TDesign + shadcn（双组件库混用）
- 核心问题：3 套弹窗、3 套按钮、3 套输入框、68 处硬编码颜色、14 个文件直接引 lucide、无统一空状态/Skeleton

---

## 重构策略

**核心原则**：统一而非重绘。选定 TDesign 作为唯一组件库（因业务面板已全面使用），逐步将 shadcn 孤岛迁移到 TDesign 或薄封装，所有颜色走设计令牌或 `lib/colors.ts` 常量。

**组件库统一路线**：
- 弹窗：全部使用 TDesign Dialog/DialogPlugin（已大量覆盖）+ 迁移 5 处手写 `bg-black/30` 模态
- 按钮：全部使用 TDesign TButton（统一补丁在 `index.css`）
- 输入框：全部使用 TDesign TInput/TSelect/TTexarea
- 图标：全部使用 `@icon-park/react`（已统一在 `src/lib/icons.ts`）
- 移除 shadcn ui 依赖：待迁移完成后删除 `src/components/ui/`

---

## Stage 1: 地基 — 设计令牌 + 共享组件 + 调色板集中

**目标**：建立统一的底层基础设施，让后续组件重构有章可循。

### 1.1 新建 `src/lib/colors.ts`
集中所有业务调色板：
- 轨道 8 色（当前重复定义在 `EventEditorDialog.tsx` / `CreateTrackDialog.tsx` / `TimelineTrack.tsx`）
- 连线色（`TimelineConnections.tsx` / `TreeTimelineView.tsx`）
- 关系图色（`RelationshipGraph.tsx` / `RelationshipView.tsx`）
- 伏笔状态色（`ForeshadowingGraph.tsx`）

### 1.2 新建 `src/components/_shared/EmptyState.tsx`
统一空状态组件：icon + title + desc + action props。替换全站 4+ 种空状态风格。

### 1.3 新建 `src/components/_shared/LoadingState.tsx`
基于 TDesign 的 Loading 或 lucide Loader2 封装统一加载态。替换 3 处零散 spin。

### 1.4 新建 `src/components/_shared/SettingsRow.tsx`
label + description + control 的标准设置行。替换所有 Settings Tab 中自写的 label+span 结构。

### 1.5 `src/index.css` 优化
- 删除死令牌 `--theme-radius`（Grep 确认零消费）
- 补 `::selection` 全局选区配色
- 补全局 `:focus-visible` 聚焦环（替代零散在各组件内的实现）
- 确认 `--color-*` 桥接保留
- 确认 `.locate-highlight` / `.search-highlight` 不动

### 1.6 `sonner.tsx` 主题同步
传入 `theme` 读 `useThemeStore` resolved 值，替代跟随 `prefers-color-scheme`。

---

## Stage 2: 弹窗/按钮/输入框统一（P0 核心）

### 2.1 弹窗统一
- 5 处手写 `bg-black/30` z-40 模态 → 迁移到 TDesign Dialog
  - `CharacterPanel.tsx` L380/L468
  - `WorldBuildingPanel.tsx` L424/L468
  - `AIConfigPanel.tsx` L118
- `CommandPalette.tsx`：Radix Dialog 外壳 → TDesign Dialog（或保持 Radix 但统一遮罩/圆角风格）
- `SettingsDialog.tsx`：Radix Dialog → TDesign Dialog（或统一视觉风格）
- `ShortcutSettings.tsx`：3 套弹窗 → 统一为 TDesign DialogPlugin 或 TDesign Dialog
- `EventDetailView.tsx`：TDesign Dialog（检查与全局一致）
- `CreateWorkspaceDialog.tsx`：TDesign Dialog（已是）但内部 shadcn Input/Label → TDesign
- `ExportDialog.tsx` / `ImportDialog.tsx`：同上
- `CreateTrackDialog.tsx`：同上

### 2.2 按钮统一
- `WorkspaceSelector.tsx` / `WorkspaceCard.tsx` 中的 shadcn Button → TDesign TButton
- `TopToolbar.tsx` / `SideNav.tsx` / `EmptyShell.tsx`：已是 TButton，检查高度统一
- `EventEditorDialog.tsx` / `ExportDialog.tsx` / `ImportDialog.tsx` / `CreateTrackDialog.tsx` 中的原生 `<button>` → TDesign TButton
- 统一所有 TButton 使用 `size="small"` 或 `size="medium"`，消除 28/36/40px 混排

### 2.3 输入框统一
- `CreateWorkspaceDialog.tsx`：shadcn Input/Label/Textarea → TDesign TInput/TTextarea
- `CommandPalette.tsx`：TInput（已是）
- `EventEditorDialog.tsx`：原生 input/select/textarea → TDesign TInput/TSelect/TTextarea
- `CreateTrackDialog.tsx`：原生 → TDesign
- 统一聚焦环：`box-shadow: 0 0 0 2px rgb(var(--primary) / 0.15)`（已在 index.css 补丁中）

---

## Stage 3: 面板规范化与代码复用（P1）

### 3.1 三大实体面板抽象（Character / WorldBuilding / Foreshadowing）
- 抽 `EntityPanel<T>` 通用组件，覆盖 `STATUS_FILTERS`、listRef scroll、ContextMenu、create/edit state 模式
- 预计减少 ~600 行重复代码

### 3.2 `OutlineView.tsx` 拆分（948 行 → 多文件）
- 拆 `OutlineEditorDrawer.tsx`
- 拆 `OutlineFilters.tsx`
- 拆 `useOutlineQueries.ts`

### 3.3 `EventEditorDialog.tsx` 拆分（698 行）
- 拆 `EventBasicForm.tsx`
- 拆 `EventLinksTab.tsx`
- 拆 `EventChapterTab.tsx`

### 3.4 `ForeshadowingPanel.tsx` 清理
- 原生 HTML 表单 → TDesign 组件
- 手写下拉 → TSelect
- `text-[10px]` → `text-xs`
- 移除全局 `document.addEventListener`（改用 React ref 事件）

---

## Stage 4: 布局优化与主题完善（P2）

### 4.1 `AppShell.tsx` / `EmptyShell.tsx`
- `EmptyShell`：消除三套浮层同时挂载问题；统一按钮高度；图标统一
- `AppShell`：`ContextPanel` 手写拖拽分割条 → 考虑 TDesign Splitter 或优化现有实现

### 4.2 `ThemeSelector.tsx`
- 6 主题预览 hex 硬编码 → 改为读 CSS 变量 `--primary` 等动态生成
- 消除与 `index.css` / `theme-adapter.tsx` 的 3 处重复维护

### 4.3 `SideNav.tsx`
- 第二套暗色判定 `useDarkMode` MutationObserver → 改为读 `useThemeStore`
- 确保非 midnight/contrast 的暗色主题时判断正确

### 4.4 图标统一
- 14 个文件直接引 `lucide-react` → 迁移到 `@/lib/icons`（icon-park）
- 文件列表：EmptyShell、EventEditorDialog、CreateWorkspaceDialog、WorkspaceCard、WorkspaceSelector、NarrativeView、GanttTimelineView、StatsView、ExportDialog、ImportDialog、ConsistencyPanel、ForeshadowingBoard 等

### 4.5 字体落地（P3）
- 引入 `@fontsource/noto-sans-sc` + `@fontsource/noto-serif-sc`（可选，若包大小影响大则延迟）

### 4.6 `UpdateTab.tsx` 修复
- `text-red-500` → `text-destructive`
- AboutTab 2 个 TODO：用 `window.electronAPI` 读 userData 路径替代硬编码

---

## Stage 5: 测试打磨与修复回归

### 5.1 质量门禁（每阶段必做）
```bash
npm run typecheck   # 0 错误
npm run test        # 12/12 通过
npm run build       # 0 错误
```

### 5.2 视觉回归
- 复跑 `audit_frontend.py`（如有 Playwright）
- 手动检查关键界面：EmptyShell、Settings 7 Tab、CreateWorkspace、WorkspaceMain、各面板

### 5.3 功能测试
- 新建/删除工作区
- 创建/编辑/删除事件
- 时间轴各视图切换（timeline/gantt/tree/narrative/stats/relationship）
- 角色/世界观/伏笔 CRUD
- 导出/导入
- 设置保存与主题切换
- 快捷键设置
- AI 面板对话
- 自动更新链路（仅打包版，开发环境检查 UI 不崩即可）

---

## Stage 6: 教程文档编写

基于 `dist/tutorials/` 已有教程，重写/补充为完整用户手册：
- `getting-started.md` — 安装与首次启动
- `workspace.md` — 工作区管理（新建、导入、导出）
- `timeline-view.md` — 时间轴视图详解
- `outline-view.md` — 大纲视图
- `tree-view.md` — 树状视图
- `branch-map.md` — 分支地图
- `relationship-graph.md` — 关系图
- `script-editor.md` — 剧本编辑器
- `ai-panel.md` — AI 助手面板
- `command-palette.md` — 命令面板
- `themes-and-focus.md` — 主题与专注模式
- `auto-backup-and-export-webgal.md` — 自动备份与 WebGal 导出
- `shortcuts.md` — 快捷键大全

输出位置：`docs/tutorials/`（或更新 `dist/tutorials/`）。

---

## Stage 7: 目录整理与 Git v1.0 发布

### 7.1 目录清理
- 删除旧 release 目录（release-v2.0.1/2.0.2/3.0.0/3.0.1/3.0.2/3.0.3/3.0.4）
- 删除 `out-dist/` 旧构建
- 删除旧品牌数据库 `data/timeline-creator.db*` 及备份
- 归档 `.trae/` 中已完成 spec 到 `_archive/`
- 更新 `README.md`：版本徽章 v3.0.4 → v1.0.0，添加重构说明
- 更新 `CHANGELOG.md`：新增 v1.0.0 条目

### 7.2 Git 重写（按用户要求）
用户要求："撤回之前所有的版本，命名为 v1.0"

执行方案：
```bash
# 保存当前完整代码到临时分支
git checkout -b temp-v1.0-all-code
# 提交所有当前文件作为单一快照
git add -A && git commit -m "feat(v1.0.0): comprehensive frontend refactor"

# 回到 master，软重置到初始空状态
git checkout master
git reset --soft $(git rev-list --max-parents=0 HEAD)
# 重新提交所有文件作为 v1.0.0 单一 commit
git add -A && git commit -m "feat(v1.0.0): Storyloom — comprehensive frontend refactor and polish

- Unified design system: single component library (TDesign), consolidated dialogs, buttons, inputs
- Extracted shared components: EmptyState, LoadingState, SettingsRow
- Centralized color palette in lib/colors.ts
- Refactored EntityPanel for Character/World/Foreshadowing
- Split OutlineView and EventEditorDialog into manageable chunks
- Fixed 68 hardcoded colors, unified 14 lucide imports to icon-park
- Synchronized sonner theme, SideNav dark mode, ::selection, :focus-visible
- Completed all tutorials in docs/tutorials/
- All tests passing, typecheck clean, build green"

# 强制推送重写历史（⚠️ 破坏性操作）
git push --force origin master

# 创建 v1.0.0 tag
git tag v1.0.0
git push --force origin v1.0.0
```

> ⚠️ 警告：此操作会重写 GitHub 仓库的全部历史，所有旧 commit 和 PR 关联将丢失。这是用户明确要求的行为。

### 7.3 发布 Release
- 打包并上传 `Storyloom Setup 1.0.0.exe` + `.blockmap` + `latest.yml` 到 GitHub Release v1.0.0

---

## 技能加载计划

| 阶段 | 加载技能 | 说明 |
|---|---|---|
| Stage 1-4 | `swarm-coding` | 多代理并行编码，分模块委托 |
| Stage 5 | 无（内置测试） | `typecheck` + `test` + `build` |
| Stage 6 | `report-writing` | 教程文档结构化写作 |
| Stage 7 | 无（Git 操作） | 手动执行 git 命令 |

---

## 文件传播（A2A）

```
Stage 1 输出 → Stage 2-4 输入
  ├── src/lib/colors.ts
  ├── src/components/_shared/EmptyState.tsx
  ├── src/components/_shared/LoadingState.tsx
  ├── src/components/_shared/SettingsRow.tsx
  └── src/index.css (令牌优化)

Stage 2-4 输出 → Stage 5 输入
  └── 所有重构后的 .tsx 文件

Stage 5 输出 → Stage 6-7 输入
  └── 稳定通过的代码基线
```

---

> 计划制定时间：当前会话
> 执行顺序：Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7
> 每阶段完成后必须 `typecheck + test + build` 全绿才能进入下一阶段。
