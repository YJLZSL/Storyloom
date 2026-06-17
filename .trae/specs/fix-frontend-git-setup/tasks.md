# Tasks

## Phase 1 — 修复编译错误（阻塞性）

- [x] Task 1: 删除无引用的死代码 lib 文件
  - [x] SubTask 1.1: 删除 `src/lib/micro-interactions.ts`（无活跃引用，import 已删除的 themeStore + animejs）
  - [x] SubTask 1.2: 删除 `src/lib/animations.ts`（无活跃引用，import animejs）
  - 验证标准：删除后 `npx tsc -b --noEmit` 错误数减少

- [x] Task 2: 迁移或删除 auto-save 组件
  - [x] SubTask 2.1: 删除 `src/components/auto-save/` 整个目录（StatusBar 已硬编码"已保存"，auto-save 暂不接入）
  - 验证标准：auto-save 相关文件无编译错误

- [x] Task 3: useHistoryManager 处理
  - 说明：useHistoryManager 已删除，undo/redo 逻辑直接在 commands.ts 的 handleUndo/handleRedo 中实现（根据 HistoryRecord 调用反向 API）
  - 验证标准：undo/redo 无编译错误，AppShell 正常渲染

- [x] Task 4: 验证编译通过
  - 验证标准：`npx tsc -b --noEmit` 退出码 0，无错误

## Phase 2 — 接入视图与面板（P0 修复）

- [x] Task 5: 接入 5 个视图到 AppShell MainCanvas
  - [x] SubTask 5.1: 接入 RelationshipView（已用新 store，直接 import 渲染）
  - [x] SubTask 5.2: 接入 OutlineView（已迁移到新 store）
  - [x] SubTask 5.3: 接入 NarrativeView（已迁移到新 store）
  - [x] SubTask 5.4: 接入 GanttTimelineView（已迁移到新 store）
  - [x] SubTask 5.5: 接入 StatsView（已迁移到新 store）
  - 验证标准：6 个视图全部可切换且有实际内容，无占位符

- [x] Task 6: 接入 6 个面板到 ContextPanel
  - [x] SubTask 6.1: 接入 EventEditorDialog（event-editor case）
  - [x] SubTask 6.2: 接入 CharacterPanel（characters case）
  - [x] SubTask 6.3: 接入 WorldBuildingPanel（worldview case）
  - [x] SubTask 6.4: 接入 ForeshadowingPanel（foreshadowing case）
  - [x] SubTask 6.5: 接入 ConnectionPanel（connections case）
  - [x] SubTask 6.6: 接入 ConsistencyPanel（consistency case）
  - [x] SubTask 6.7: 接入 ShortcutSettings（shortcuts case，复用全局 Dialog）
  - 验证标准：7 个面板全部可打开且有实际内容，无占位符

- [x] Task 7: TopToolbar 按钮接线
  - [x] SubTask 7.1: 新建事件按钮 onClick → ctx.createEvent
  - [x] SubTask 7.2: 保存按钮 onClick → ctx.save（调用后端 auto-save API）
  - 验证标准：新建事件按钮打开编辑器，保存按钮调用 API

- [x] Task 8: TimelineCanvas 订阅 scrollToEventId
  - [x] SubTask 8.1: 添加 scrollToEventId 订阅，useEffect 中滚动到对应事件（DOM 命中或坐标计算）
  - 验证标准：命令面板搜索事件后时间轴滚动定位

- [x] Task 9: handleSave 调用实际 API + undo/redo 应用记录
  - [x] SubTask 9.1: handleSave 调用后端 auto-save API
  - [x] SubTask 9.2: handleUndo/handleRedo 根据 HistoryRecord 调用反向 API
  - 验证标准：Ctrl+S 触发实际保存，Ctrl+Z/Y 撤销重做

## Phase 3 — 依赖清理与一致性修复

- [x] Task 10: 移除 animejs 依赖
  - [x] SubTask 10.1: 迁移 ExportDialog/ImportDialog/CalendarConfigDialog 到 framer-motion
  - [x] SubTask 10.2: 从 package.json 移除 animejs，移除 d3-force
  - [x] SubTask 10.3: 修复 vite.config.ts manualChunks（移除 anime，添加 motion/d3）
  - 验证标准：`npm install` 成功，`npm run build` 无 anime 引用

- [x] Task 11: 修正 @types/d3 位置
  - [x] SubTask 11.1: 从 dependencies 移到 devDependencies
  - 验证标准：package.json 中 @types/d3 在 devDependencies

- [x] Task 12: 最终编译与构建验证
  - [x] SubTask 12.1: `npx tsc -b --noEmit` 通过
  - [x] SubTask 12.2: `npm run build` 成功
  - [ ] SubTask 12.3: `npm run dev` 启动成功
  - 验证标准：三项全部通过

## Phase 4 — Git 初始化与 GitHub 上传

- [ ] Task 13: 配置 .gitignore
  - [ ] SubTask 13.1: 验证现有 .gitignore 包含 node_modules/dist/dist-server/release/data/*.db
  - [ ] SubTask 13.2: 添加 .env*.local、v7-*.txt 等临时文件排除
  - 验证标准：.gitignore 完整覆盖所有应排除文件

- [ ] Task 14: 初始化 Git 仓库并首次提交
  - [ ] SubTask 14.1: `git init`
  - [ ] SubTask 14.2: `git add .`（排除 .gitignore 文件）
  - [ ] SubTask 14.3: `git commit -m "V7 重构完成：前端架构重写 + 设计系统 + 新功能"`
  - 验证标准：git log 显示首次提交

- [ ] Task 15: 创建 GitHub 仓库并推送
  - [ ] SubTask 15.1: 使用 gh CLI 创建仓库（或提示用户手动创建）
  - [ ] SubTask 15.2: `git remote add origin <url>`
  - [ ] SubTask 15.3: `git push -u origin main`
  - 验证标准：GitHub 上可见完整代码

## Phase 5 — 项目维护

- [ ] Task 16: 添加 LICENSE 文件
  - [ ] SubTask 16.1: 创建 MIT LICENSE 文件
  - 验证标准：项目根目录有 LICENSE 文件

- [ ] Task 17: 验证文档一致性
  - [ ] SubTask 17.1: 确认所有文档反映当前代码状态
  - 验证标准：文档无过时信息

# Task Dependencies
- Task 2, 3 依赖 Task 1
- Task 4 依赖 Task 1, 2, 3
- Task 5, 6 依赖 Task 4
- Task 7, 8, 9 依赖 Task 4
- Task 10 依赖 Task 5, 6（迁移完成后才能移除 animejs）
- Task 12 依赖 Task 10, 11
- Task 14 依赖 Task 12
- Task 15 依赖 Task 14
- Task 16, 17 依赖 Task 15
