# V7 全面重构 Spec

## Why
项目经历多轮迭代后累积大量技术债：`package.json` 丢失导致项目无法运行、CSS 变量类型错误导致样式失效、12 主题+3 视觉模式系统导致代码爆炸、动画过度工程化、布局与设计文档严重不符。用户反馈"前端问题非常大，看着很不舒服"，且"计划写的很多但实际没实现"。本次重构聚焦**可执行性**：精简任务范围，确保每个任务都能落地，前端大胆设计但严格与后端配合，生产/开发环境明确分离。

## 环境分离策略

### 开发环境
- **前端**：Vite dev server（`http://localhost:5173`），HMR 热更新，React DevTools 自动打开
- **后端**：Fastify 直接运行 TS（`tsx server/index.ts`），端口 3001，CORS 允许 localhost
- **数据库**：`./data/dev.db`（项目目录，开发用）
- **Electron**：`electron .` 启动，加载 `http://localhost:5173`，DevTools 自动打开
- **脚本**：`npm run dev`（并行启动前端+后端）、`npm run dev:electron`（启动 Electron）

### 生产环境
- **前端**：Vite 构建到 `dist/`，Electron 通过 `loadFile` 加载本地 HTML
- **后端**：TS 编译到 `dist-server/`，Electron 主进程动态 import
- **数据库**：`app.getPath('userData')/timeline.db`（用户目录，生产用）
- **CORS**：仅允许 `file://` 协议
- **脚本**：`npm run build`（前端）、`npm run build:server`（后端）、`npm run build:electron`（Electron）、`npm run dist`（打包）
- **环境检测**：`app.isPackaged`（Electron）、`import.meta.env.PROD`（前端）、`process.env.NODE_ENV`（后端）

## What Changes

### Phase 1：基础设施修复（P0，阻断一切）
- 恢复 `package.json`，含完整 scripts/dependencies/electron-builder 配置
- 配置开发/生产环境分离（dev.db vs userData/timeline.db）
- 修复 Electron 单实例锁、错误日志序列化、动态 import 绝对路径
- 修复后端关键 Bug（204 状态码、CORS、bodyLimit、工作区验证、AI 流断开、eventWorldSettings 补全）

### Phase 2：设计系统重写（P0，前端基础）
- **BREAKING** 砍掉 12 主题+3 视觉模式，改为 2 主题（素纸亮色/墨黑暗色）+ 专注模式
- 重写 `src/index.css`，Tailwind v4 `@theme` 设计令牌，CSS 变量用 RGB 通道格式
- 完整集成 shadcn/ui（Button/Dialog/Input/Command/Sheet 等基础组件）

### Phase 3：前端架构重写（P0，与后端严格配合）
- **BREAKING** 重写布局为工作台模式：顶部(48px)+左侧图标(56px)+主画布+右侧上下文面板(可拖拽)+底部(28px)
- 重组状态管理（useWorkspaceStore/useTimelineStore/useUIStore/useHistoryStore）
- 重写时间轴核心：绝对像素定位（修复缩放）、SVG 连线、拖拽改时长
- 重写 AI 面板：textarea+Markdown+对话管理+走后端代理
- 替换 anime.js 微交互为 Framer Motion + CSS transitions

### Phase 4：新增高价值功能（P1，精简聚焦）
- 命令面板（Ctrl+K，融合搜索+命令，基于 shadcn Command）
- 快捷键系统升级（when 上下文+命令注册表）
- 关系图谱视图（D3 force，人物-事件-地点网络）
- 故事结构模板库（英雄之旅/三幕式等，新建工作区时选择）

### Phase 5：测试与验证
- TypeScript 编译验证
- 打包与启动验证（开发模式+生产模式分别验证）

## 前端设计原则（大胆设计，与后端配合）

1. **视觉层次**：3 层 z-index（背景画布/内容卡片/悬浮面板），分层投影而非扁平
2. **动效体系**：Framer Motion 声明式（面板/列表/模态过渡）+ CSS transitions（hover/focus 微交互），统一 duration/easing 令牌
3. **配色**：素纸主题（暖白底#FAF8F5 + 墨色文字#1A1A1A + 靛青强调#3B5BDB）/ 墨黑主题（深灰底#1A1A1A + 暖白文字#E8E6E1 + 靛青强调#6B8AFF）
4. **排版**：标题用思源宋体（本地化），正文用思源黑体，代码用 JetBrains Mono
5. **间距**：4px 基准网格，组件内 8/12/16/24px，组件间 16/24/32px
6. **与后端配合**：所有数据通过 TanStack Query 获取，乐观更新+失效重取，API 路径与 `shared/types.ts` 类型严格一致

## Impact
- Affected code:
  - `package.json` - 恢复+环境分离配置
  - `electron/main.ts` - 单实例锁、日志、路径、环境检测
  - `server/index.ts` - CORS 按环境、bodyLimit、健康检查
  - `server/routes/*.ts` - 验证、导入策略、AI 流、eventWorldSettings
  - `server/db/schema.ts` - 时间戳统一、mediaUrls 字段
  - `src/index.css` - 设计令牌系统重写
  - `src/App.tsx` - 工作台布局重写
  - `src/stores/*.ts` - 状态管理重组
  - `src/components/layout/*` - 全部重写
  - `src/components/timeline/*` - 核心重写
  - `src/components/ai-panel/*` - 重写
  - `src/components/ui/*` - shadcn/ui 集成
  - 新增 `src/components/command-palette/`
  - 新增 `src/components/relationship-graph/`
  - 新增 `src/lib/story-templates.ts`

## ADDED Requirements

### Requirement: 环境分离
系统 SHALL 明确分离开发环境与生产环境，通过 `app.isPackaged`/`import.meta.env.PROD`/`process.env.NODE_ENV` 检测，开发用 `./data/dev.db`，生产用 `app.getPath('userData')/timeline.db`。

#### Scenario: 开发模式启动
- **WHEN** 开发者运行 `npm run dev`
- **THEN** 前端 Vite 5173 + 后端 Fastify 3001 + Electron 加载 localhost:5173，使用 dev.db

#### Scenario: 生产模式启动
- **WHEN** 用户启动打包后的 exe
- **THEN** Electron 加载本地 dist/index.html，后端从 dist-server 加载，使用 userData/timeline.db

### Requirement: 工作台布局
系统 SHALL 采用工作台布局：顶部工具栏(48px)+左侧图标导航(56px)+主画布+右侧上下文感知属性面板(可拖拽 280-480px)+底部状态栏(28px)。

#### Scenario: 选中事件时
- **WHEN** 用户点击时间轴事件
- **THEN** 右侧属性面板自动切换为事件编辑器

### Requirement: 双主题+专注模式
系统 SHALL 提供 2 主题（素纸亮色/墨黑暗色）+ 1 专注模式，主题切换使用 View Transitions API 圆形扩散。

### Requirement: 命令面板
系统 SHALL 提供 Ctrl+K 命令面板，融合搜索+命令+导航。

### Requirement: 时间轴绝对像素定位
系统 SHALL 使用绝对像素定位事件，缩放真正改变事件间距，SVG 绘制连线。

### Requirement: 关系图谱
系统 SHALL 提供关系图谱视图，D3 force 布局展示人物-事件-地点网络。

### Requirement: 故事结构模板
系统 SHALL 提供故事模板库，新建工作区时一键生成预设事件轨道。

## MODIFIED Requirements

### Requirement: AI 面板
AI 面板 SHALL 使用 textarea+Markdown 渲染+对话管理+走后端代理，不直接持有 API Key。

### Requirement: 动画系统
动画 SHALL 使用 Framer Motion+CSS transitions，移除 anime.js 微交互和装饰性效果。

### Requirement: 状态管理
状态 SHALL 按域拆分为 4 个 store，服务端状态交给 TanStack Query。

### Requirement: 后端安全
后端 SHALL 按环境限制 CORS，全局 bodyLimit 5MB，AI 流断开处理，降级透明提示。

## REMOVED Requirements

### Requirement: 12 主题系统
**Reason**: 主题粗糙、设计语言不统一、代码维护成本高
**Migration**: 替换为 2 个精心设计的主题

### Requirement: 3 视觉模式
**Reason**: 每个组件 3 分支条件判断，代码量翻倍
**Migration**: 替换为 1 个专注模式

### Requirement: anime.js 微交互
**Reason**: 每个按钮 50+ 行动画代码，性能隐患
**Migration**: 替换为 Framer Motion+CSS transitions

### Requirement: 装饰性效果（粒子/光晕/胶片颗粒/3D 倾斜）
**Reason**: 过度装饰，增加 GPU 负担
**Migration**: 移除，聚焦内容
