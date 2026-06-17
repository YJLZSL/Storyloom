# Checklist

## Phase 1 — 编译错误修复
- [ ] `src/lib/micro-interactions.ts` 已删除
- [ ] `src/lib/animations.ts` 已删除
- [ ] auto-save 组件无编译错误（迁移或删除）
- [ ] useHistoryManager 无编译错误（重新实现）
- [ ] `npx tsc -b --noEmit` 退出码 0

## Phase 2 — 视图与面板接入
- [ ] MainCanvas 渲染 RelationshipView（relationship 视图）
- [ ] MainCanvas 渲染 OutlineView（outline 视图）
- [ ] MainCanvas 渲染 NarrativeView（narrative 视图）
- [ ] MainCanvas 渲染 GanttTimelineView（gantt 视图）
- [ ] MainCanvas 渲染 StatsView（statistics 视图）
- [ ] ContextPanel 渲染 EventEditorDialog（event-editor 面板）
- [ ] ContextPanel 渲染 CharacterPanel（characters 面板）
- [ ] ContextPanel 渲染 WorldBuildingPanel（worldview 面板）
- [ ] ContextPanel 渲染 ForeshadowingPanel（foreshadowing 面板）
- [ ] ContextPanel 渲染 ConnectionPanel（connections 面板）
- [ ] ContextPanel 渲染 ConsistencyPanel（consistency 面板）
- [ ] ContextPanel 渲染 ShortcutSettings（shortcuts 面板）
- [ ] TopToolbar 新建事件按钮有 onClick
- [ ] TopToolbar 保存按钮有 onClick
- [ ] TimelineCanvas 订阅 scrollToEventId
- [ ] handleSave 调用实际 API

## Phase 3 — 依赖清理
- [ ] package.json 无 animejs 依赖
- [ ] @types/d3 在 devDependencies 中
- [ ] `npx tsc -b --noEmit` 通过
- [ ] `npm run build` 成功
- [ ] `npm run dev` 启动成功

## Phase 4 — Git 与 GitHub
- [ ] .gitignore 包含 node_modules/dist/dist-server/release/data
- [ ] git init 成功
- [ ] 首次提交成功
- [ ] GitHub 仓库创建成功
- [ ] 代码推送到 GitHub 成功

## Phase 5 — 项目维护
- [ ] LICENSE 文件存在
- [ ] 文档无过时信息