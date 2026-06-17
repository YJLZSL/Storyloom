# Fix Frontend Issues & Git Setup Spec

## Why
V7 重构完成了新骨架（AppShell/新 store/shadcn/ui），但 P1 清理删除旧 store后遗留 10 个编译错误，且 P0 阻塞性问题未修复（6 个视图占位、7 个面板占位、按钮未接线、undo/redo 断链）。项目尚无 Git 仓库，无法进行版本管理和协作。

## What Changes
- 修复 10 个编译错误：删除无引用的 `micro-interactions.ts`/`animations.ts`，迁移 `AutoSaveStatus`/`useAutoSave`/`useHistoryManager` 到新 store 或删除
- 接入 5 个视图到 AppShell MainCanvas（relationship 直接接入，outline/narrative/gantt/statistics 迁移后接入）
- 接入 6 个面板到 ContextPanel（event-editor/characters/worldview/foreshadowing/connections/consistency 迁移后接入）
- TopToolbar 新建/保存按钮接线
- TimelineCanvas 订阅 scrollToEventId
- 重新实现 useHistoryManager 并挂载到 AppShell
- handleSave 调用实际保存 API
- 移除 animejs 依赖，修正 @types/d3 位置
- 初始化 Git 仓库，配置 .gitignore，首次提交
- 创建 GitHub 仓库并推送
- 项目维护：README 更新、LICENSE 添加

## Impact
- Affected code: AppShell.tsx、ContextPanel.tsx、TopToolbar.tsx、TimelineCanvas.tsx、useHistoryManager.tsx、commands.ts、OutlineView.tsx、NarrativeView.tsx、GanttTimelineView.tsx、StatsView.tsx、EventEditorDialog.tsx、CharacterPanel.tsx、WorldBuildingPanel.tsx、ForeshadowingPanel.tsx、ConnectionPanel.tsx、ConsistencyPanel.tsx、package.json
- New files: .gitignore（已存在需验证）、LICENSE

## ADDED Requirements

### Requirement: Git 版本控制
系统 SHALL 初始化 Git 仓库并推送到 GitHub，使项目具备版本管理能力。

#### Scenario: Git 初始化
- WHEN 执行 git init
- THEN 仓库初始化成功，.gitignore 排除 node_modules/dist/dist-server/release/data

#### Scenario: GitHub 推送
- WHEN 创建 GitHub 仓库并推送
- THEN 代码成功推送到远程仓库，包含完整提交历史

### Requirement: 编译零错误
系统 SHALL 通过 npx tsc -b --noEmit 编译，无任何类型错误。

#### Scenario: 编译验证
- WHEN 执行 npx tsc -b --noEmit
- THEN 退出码 0，无错误输出

## MODIFIED Requirements

### Requirement: MainCanvas 视图渲染
MainCanvas SHALL 根据 viewMode 渲染对应视图组件，不再显示占位符。

#### Scenario: 切换到关系图视图
- WHEN 用户点击关系图视图按钮
- THEN MainCanvas 渲染 RelationshipView

#### Scenario: 切换到大纲视图
- WHEN 用户点击大纲视图按钮
- THEN MainCanvas 渲染 OutlineView（已迁移到新 store）

### Requirement: ContextPanel 面板渲染
ContextPanel SHALL 根据 activePanel 渲染对应面板组件，不再显示占位符。

#### Scenario: 打开角色管理面板
- WHEN 用户点击侧栏角色管理按钮
- THEN ContextPanel 渲染 CharacterPanel（已迁移到新 store）

#### Scenario: 双击事件打开编辑器
- WHEN 用户双击时间轴上的事件卡片
- THEN ContextPanel 渲染 EventEditorDialog（已迁移到新 store）

### Requirement: TopToolbar 按钮功能
TopToolbar 的新建事件和保存按钮 SHALL 具有实际功能。

#### Scenario: 新建事件
- WHEN 用户点击新建事件按钮
- THEN 打开事件编辑器（新建模式）

#### Scenario: 保存
- WHEN 用户点击保存按钮
- THEN 调用后端 auto-save API 保存当前工作区快照

### Requirement: 撤销/重做
系统 SHALL 支持撤销/重做操作，历史栈在 CRUD 操作时填充。

#### Scenario: 撤销事件删除
- WHEN 用户删除事件后按 Ctrl+Z
- THEN 事件恢复到时间轴

## REMOVED Requirements

### Requirement: animejs 动画引擎
Reason: V7 已用 Framer Motion 替代
Migration: 删除 src/lib/animations.ts 和 src/lib/micro-interactions.ts，从 package.json 移除 animejs 依赖