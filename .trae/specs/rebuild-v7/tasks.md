# Tasks

> 原则：每个任务必须可执行、可验证。前端大胆设计但严格与后端 API 配合。生产/开发环境分离。

## Phase 1 — 基础设施修复（P0，阻断一切）

- [x] Task 1: 恢复 package.json 与环境分离配置
  - [ ] SubTask 1.1: 从 package-lock.json 推断重建 package.json（name/version/type:module/scripts/dependencies）
  - [ ] SubTask 1.2: 配置 scripts：dev（并行前端+后端）、dev:electron、build、build:server、build:electron、dist
  - [ ] SubTask 1.3: 配置 electron-builder（appId/productName/files/asarUnpack:NSIS oneClick:false）
  - [ ] SubTask 1.4: 配置环境分离：开发用 `./data/dev.db`，生产用 `app.getPath('userData')/timeline.db`
  - [ ] SubTask 1.5: 验证 `npm install` + `npm run dev` 启动成功
  - 验证标准：`npm run dev` 能启动前端 5173 + 后端 3001，`npm run build` 成功

- [x] Task 2: 修复 Electron 启动可靠性
  - [ ] SubTask 2.1: 添加 `app.requestSingleInstanceLock()` 单实例锁
  - [ ] SubTask 2.2: 修复日志序列化——Error 对象提取 message/stack/code（非 JSON.stringify）
  - [ ] SubTask 2.3: `startServer` 的 `process.exit(1)` 改为 `throw err`
  - [ ] SubTask 2.4: 动态 import 改用 `path.join(app.getAppPath(), 'dist-server', 'server', 'index.js')` + `fs.existsSync` 验证
  - [ ] SubTask 2.5: 开发模式加载 `http://localhost:5173`，生产模式 `loadFile(dist/index.html)`
  - [ ] SubTask 2.6: 字体本地化（移除 Google Fonts CDN，打包本地字体）
  - 验证标准：打包后启动无错误对话框，重复启动触发单实例锁

- [x] Task 3: 修复后端关键 Bug
  - [ ] SubTask 3.1: `src/services/api.ts` 修复 204 状态码判断（`if (response.status === 204) return undefined`，移除 `!response.ok` 前置）
  - [ ] SubTask 3.2: `server/index.ts` CORS 按环境：开发 `origin: true`，生产限制 `file://`+`localhost`
  - [ ] SubTask 3.3: `server/index.ts` 全局 bodyLimit 降至 5MB
  - [ ] SubTask 3.4: `server/routes/events.ts` 启用 validateWorkspace 调用（消除死代码）
  - [ ] SubTask 3.5: `server/routes/events.ts` 修复 escapeLike 反斜杠转义
  - [ ] SubTask 3.6: `server/routes/ai.ts` 流式端点添加 `request.raw.on('close')` + AbortController
  - [ ] SubTask 3.7: `server/services/auto-save.ts` recoverFromAutoSave 补全 eventWorldSettings
  - [ ] SubTask 3.8: `server/routes/workspaces.ts` 导入/导出补全 eventWorldSettings
  - [ ] SubTask 3.9: `server/routes/workspaces.ts` 导入策略实现（overwrite 先删后插/merge onConflictDoUpdate/skip 保持）
  - [ ] SubTask 3.10: `server/plugins/error-handler.ts` 500 错误添加 `request.log.error(error)`
  - [ ] SubTask 3.11: `server/services/ai-proxy.ts` 降级响应添加 `degraded:true` + `error` 字段
  - [ ] SubTask 3.12: `shared/types.ts` ExportData 补全 eventWorldSettings 字段
  - 验证标准：`npx tsc -b --noEmit` 无错误，DELETE 操作正常，导入策略生效

## Phase 2 — 设计系统重写（P0，前端基础）

- [x] Task 4: 重写设计令牌系统
  - [ ] SubTask 4.1: 重写 `src/index.css`，Tailwind v4 `@theme` 定义颜色/圆角/阴影/间距令牌
  - [ ] SubTask 4.2: 定义 2 主题 CSS 变量（素纸亮色/墨黑暗色），使用 RGB 通道格式（如 `--card: 250 248 245`）
  - [ ] SubTask 4.3: 定义专注模式工具类（`.focus-mode .hide-on-focus { display: none }`）
  - [ ] SubTask 4.4: 移除全部 12 主题 + 3 视觉模式 CSS
  - [ ] SubTask 4.5: 添加 View Transitions API 圆形扩散主题切换样式
  - [ ] SubTask 4.6: 本地化字体（思源宋体/思源黑体/JetBrains Mono 打包到 `src/assets/fonts/`）
  - 验证标准：CSS 变量类型正确（`rgba(var(--card), 0.7)` 生效），2 主题切换正常

- [x] Task 5: 完整集成 shadcn/ui
  - [ ] SubTask 5.1: 初始化 shadcn/ui（components.json + `cn()` 工具确认）
  - [ ] SubTask 5.2: 添加基础组件：Button、Input、Textarea、Label、Badge
  - [ ] SubTask 5.3: 添加反馈组件：Dialog、Sheet、Tooltip、Sonner（toast）
  - [ ] SubTask 5.4: 添加 Command 组件（命令面板基础）
  - [ ] SubTask 5.5: 添加表单组件：Select、Checkbox、Switch、Slider
  - [ ] SubTask 5.6: 添加数据组件：ScrollArea、Separator、Tabs
  - 验证标准：所有 shadcn 组件可导入使用，`npx tsc -b --noEmit` 无错误

## Phase 3 — 前端架构重写（P0，与后端严格配合）

- [x] Task 6: 重组状态管理
  - [ ] SubTask 6.1: 创建 `useWorkspaceStore`（currentWorkspaceId、workspaces 列表由 TanStack Query 管理）
  - [ ] SubTask 6.2: 创建 `useTimelineStore`（viewMode、zoom、selectedEventId、scrollToEventId）
  - [ ] SubTask 6.3: 创建 `useUIStore`（activePanel、panelWidth、focusMode、commandPaletteOpen）
  - [ ] SubTask 6.4: 保留 `useHistoryStore`（撤销重做）
  - [ ] SubTask 6.5: 迁移旧 store 逻辑，删除 appStore/panelStore/themeStore
  - 验证标准：状态按域拆分，无跨 store 耦合，`npx tsc -b --noEmit` 无错误

- [x] Task 7: 重写工作台布局
  - [ ] SubTask 7.1: 重写 `AppShell`：CSS Grid 布局，顶部(48px)+左侧(56px)+主画布+右侧(可拖拽)+底部(28px)
  - [ ] SubTask 7.2: 重写 `TopToolbar`：仅核心操作（视图切换/缩放/新建/保存/命令面板入口/主题切换）
  - [ ] SubTask 7.3: 重写 `SideNav`：纯图标（工作区/时间轴/关系图/角色/世界观/伏笔/AI/统计），shadcn Tooltip 显示名称
  - [ ] SubTask 7.4: 重写 `ContextPanel`：上下文感知（selectedEventId→事件编辑器，selectedCharacterId→角色详情）
  - [ ] SubTask 7.5: 重写 `StatusBar`：事件数/字数/保存状态/缩放比例
  - [ ] SubTask 7.6: 右侧面板可拖拽调整宽度（280-480px，使用 react-resizable-panels 或自实现 pointer 事件）
  - [ ] SubTask 7.7: 专注模式（F11）：隐藏工具栏/导航/状态栏，仅主画布+当前面板
  - 验证标准：布局符合工作台模式，右侧面板可拖拽，专注模式正常

- [x] Task 8: 重写时间轴核心
  - [ ] SubTask 8.1: 重写 `TimelineCanvas`：绝对像素定位（`left: ${event.startTime * pixelsPerUnit}px`），缩放改变 `pixelsPerUnit`
  - [ ] SubTask 8.2: 重写 `TimelineRuler`：根据 `pixelsPerUnit` 动态生成刻度，支持自定义日历
  - [ ] SubTask 8.3: 连线改用 SVG `<path>` 绘制，基于事件像素坐标计算，虚拟滚动下只渲染可见连线
  - [ ] SubTask 8.4: 完善虚拟滚动：事件/标尺/连线三者基于同一 viewport 计算
  - [ ] SubTask 8.5: 拖拽改时长：事件条左右边缘 handle，拖拽调整 startTime/endTime，调用 `updateEvent` API
  - [ ] SubTask 8.6: 重写 `TimelineEventCard`：Framer Motion 悬浮抬起（`whileHover={{ y: -2 }}`），分层投影，移除 3D 倾斜
  - [ ] SubTask 8.7: `TimelineTrack` 移除内部 `useTracks`，props 传入 allTracks
  - 验证标准：缩放真正改变事件间距，SVG 连线在虚拟滚动下无遗漏，拖拽改时长调用 API 成功

- [x] Task 9: 重写 AI 面板
  - [ ] SubTask 9.1: 输入框改为 `<textarea>`（shadcn Textarea），支持多行+Shift+Enter 换行+Enter 发送
  - [ ] SubTask 9.2: 集成 `react-markdown` + `remark-gfm` 渲染 AI 回复（支持代码块/列表/标题）
  - [ ] SubTask 9.3: 对话管理：新建/切换/删除对话，持久化到 localStorage（`ai-conversations`）
  - [ ] SubTask 9.4: 上下文感知：根据 `useTimelineStore.selectedEventId` 自动注入事件上下文到 prompt
  - [ ] SubTask 9.5: 改走后端代理 `/api/ai/chat?stream=true`，移除 `src/services/ai-stream.ts` 直连逻辑
  - [ ] SubTask 9.6: AI 降级提示：检测响应 `degraded: true`，显示"AI 调用失败，已切换模拟模式"
  - 验证标准：AI 对话多行输入+Markdown 渲染+持久化+走后端代理+降级提示

- [x] Task 10: 重写工作区选择界面
  - [ ] SubTask 10.1: 简化 `WorkspaceSelector`：移除粒子/打字机/3D 倾斜，Framer Motion 入场动画
  - [ ] SubTask 10.2: 卡片网格布局，显示工作区名/事件数/最后修改时间
  - [ ] SubTask 10.3: 新建工作区时显示模板选择（调用 Task 13 的模板库）
  - 验证标准：工作区选择界面简洁专业，无过度动画

## Phase 4 — 新增高价值功能（P1，精简聚焦）

- [x] Task 11: 命令面板（Ctrl+K）
  - [ ] SubTask 11.1: 创建 `src/components/command-palette/CommandPalette.tsx`（基于 shadcn Command）
  - [ ] SubTask 11.2: 搜索功能：查询事件/角色/世界观/伏笔（调用对应 `useQuery` 的数据过滤）
  - [ ] SubTask 11.3: 命令执行：">" 前缀显示命令列表（新建事件/切换视图/导出等）
  - [ ] SubTask 11.4: 绑定 Ctrl+K 全局快捷键，通过 `useUIStore.commandPaletteOpen` 控制开关
  - 验证标准：Ctrl+K 打开命令面板，搜索和命令执行正常

- [x] Task 12: 快捷键系统升级
  - [ ] SubTask 12.1: 创建 `src/lib/command-registry.ts`（命令 id+title+icon+category+handler，命令面板和快捷键共用）
  - [ ] SubTask 12.2: 升级 `shortcut-registry.ts`：支持 `when` 上下文（timelineFocus/editorFocus/modalOpen）
  - [ ] SubTask 12.3: 跨平台适配（`Mod` 元键自动映射 Cmd/Ctrl）
  - [ ] SubTask 12.4: 快捷键设置面板：显示所有快捷键，支持重新绑定+冲突检测
  - 验证标准：快捷键上下文相关，跨平台正常，设置面板可用

- [x] Task 13: 故事结构模板库
  - [ ] SubTask 13.1: 创建 `src/lib/story-templates.ts`：5 个模板（英雄之旅 12 阶段/三幕式/拯救猫咪/编年体/传记体），每个模板定义预设 tracks+events
  - [ ] SubTask 13.2: 新建工作区 UI 添加模板选择步骤
  - [ ] SubTask 13.3: 应用模板：调用 `createWorkspace` + 批量 `createTrack` + 批量 `createEvent` API
  - 验证标准：新建工作区选模板后自动生成预设轨道和事件

- [x] Task 14: 关系图谱视图
  - [ ] SubTask 14.1: 创建 `src/components/relationship-graph/RelationshipGraph.tsx`
  - [ ] SubTask 14.2: 使用 D3 force simulation 力导向布局，节点=人物/事件/地点，边=关联（基于 connections 表 + eventCharacters 表 + eventWorldSettings 表）
  - [ ] SubTask 14.3: 节点按类型颜色区分（人物蓝/事件绿/地点橙），支持拖拽/缩放
  - [ ] SubTask 14.4: 点击节点调用 `useTimelineStore.setSelectedEventId` 跳转
  - [ ] SubTask 14.5: 在 SideNav 添加关系图视图入口
  - 验证标准：关系图正确显示节点和边，可拖拽缩放，点击跳转

## Phase 5 — 测试与验证

- [x] Task 15: 编译与构建验证
  - [ ] SubTask 15.1: `npx tsc -b --noEmit` 无错误
  - [ ] SubTask 15.2: `npm run build` 成功
  - [ ] SubTask 15.3: `npm run build:server` 成功
  - [ ] SubTask 15.4: `npm run build:electron` 成功

- [x] Task 16: 开发模式验证
  - [ ] SubTask 16.1: `npm run dev` 启动前端 5173 + 后端 3001
  - [ ] SubTask 16.2: `npm run dev:electron` 启动 Electron 加载 localhost:5173
  - [ ] SubTask 16.3: API `/api/health` 返回 200 OK
  - [ ] SubTask 16.4: UI 正确显示工作台布局
  - [ ] SubTask 16.5: 双主题切换正常
  - [ ] SubTask 16.6: 时间轴渲染正确，缩放改变间距
  - [ ] SubTask 16.7: 命令面板 Ctrl+K 可用
  - [ ] SubTask 16.8: 关系图谱视图可用

- [x] Task 17: 生产模式打包验证
  - [ ] SubTask 17.1: `npx @electron/rebuild -f -w better-sqlite3` 成功
  - [ ] SubTask 17.2: `npx electron-builder --win --publish never` 成功
  - [ ] SubTask 17.3: 打包后应用启动无错误对话框
  - [ ] SubTask 17.4: API `/api/health` 返回 200 OK
  - [ ] SubTask 17.5: 重复启动触发单实例锁
  - [ ] SubTask 17.6: 使用 userData/timeline.db（非 dev.db）
  - [ ] SubTask 17.7: `npm rebuild better-sqlite3` 恢复 Node.js 环境

# Task Dependencies
- Task 1 是一切基础（无 package.json 无法运行）
- Task 2-3 可并行（Electron + 后端修复，均依赖 Task 1）
- Task 4-5 可并行（设计系统 + shadcn/ui，均依赖 Task 1）
- Task 6 依赖 Task 4（状态管理依赖设计令牌）
- Task 7 依赖 Task 5+6（布局依赖 shadcn 组件 + 状态管理）
- Task 8 依赖 Task 7（时间轴在主画布内）
- Task 9-10 可并行（AI 面板 + 工作区选择，依赖 Task 7）
- Task 11 依赖 Task 5+6（命令面板依赖 shadcn Command + UIStore）
- Task 12 依赖 Task 11（快捷键与命令注册表共用）
- Task 13 依赖 Task 10（模板在工作区新建时选择）
- Task 14 依赖 Task 7（关系图作为视图）
- Task 15 依赖 Task 1-14 全部完成
- Task 16-17 依赖 Task 15
