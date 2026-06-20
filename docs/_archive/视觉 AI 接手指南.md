# Storyloom · 絮织 — 视觉 AI 接手指南

> 适用对象：具备**视觉/截图阅读能力**的下一位 AI 接手者
> 编写日期：2026-06-19（v1.1.4 改名 Storyloom + 视觉小说专属能力 + v1.2 前端缺陷协同）
> 编写者：Trae AI
>
> **🚦 v1.2 起请先读总入口**：[`接手开发指南 v1.2-roadmap-backend-and-frontend.md`](./接手开发指南%20v1.2-roadmap-backend-and-frontend.md)。后端任务由后端 AI 承担；本指南专注**视觉对标 + 前端缺陷打磨**两件事。
>
> **✅ v1.3-continue 视觉 AI 已完成**
>
> 本轮由视觉 AI 完成前端缺陷打磨剩余项（F-1 / F-3 / F-4 / F-5），并与后端 v1.3-continue 能力汇合。
>
> - **Settings 入口与教程**：`TopToolbar` 新增齿轮按钮；`SettingsDialog` 含 5 Tab（偏好、主题、快捷键、教程、关于与数据）；教程 Tab 已加载 `public/tutorials/*.md` 并渲染左侧目录。
> - **缩放重设计**：`useTimelineStore` 改为连续 zoom `[0.5, 3.0]`；`Ctrl+=/-` 与 `Ctrl+0` 全局缩放；`TimelineCanvas` 支持 `Ctrl+滚轮`；轨道高度 / 事件卡片字号 / 标尺刻度按 `--zoom` CSS 变量联动；`TopToolbar` 显示 `Zoom: 120%` + Slider。
> - **视图与面板协同**：新建 `useSelectionStore` 统一管理跨视图选中；各视图订阅高亮并自动滚动；右侧面板按选择对象切换详情；命令面板 `onSelect` 统一走 `selectXxx` + `revealInBestView`。
> - **命令面板 6 主题截图验证**：对 `luosheng / midnight / forest / ink-wash / contrast / system` 截图，确认命令面板框体不透明、文字清晰、无黑屏。
> - **浏览器真实点击测试**：脚本 `scripts/v1_3_visual_regression.py` 覆盖首页 → 创建工作区 → 时间轴/大纲视图 → Settings 入口 → 主题切换 → 命令面板 → 缩放 +/- → 右栏面板切换；每步截图保存到 `docs/screenshots/v1.3-continue-after/`，失败时导出 `error-dump.html` 与 `99-error-state.png`。
>
> 关键存档：
> - 截图目录：`docs/screenshots/v1.3-continue-after/`
> - 回归脚本：`scripts/v1_3_visual_regression.py`

--->
> **🎯 你的核心使命**（v1.2 起细化为五条）：
>
> 1. **F-2 命令面板黑屏修复**（**最先做**，立竿见影）—— 详见 v1.2 总指南 §4 F-2
> 2. **F-1 Settings 入口 + F-5 教程骨架** —— 详见 v1.2 总指南 §4 F-1 / F-5
> 3. **F-3 缩放重设计**（连续 zoom + Ctrl+滚轮 + Ctrl+0）—— 详见 v1.2 总指南 §4 F-3
> 4. **F-4 视图与右栏面板协同**（统一 selection store）—— 详见 v1.2 总指南 §4 F-4
> 5. **视觉对标 51mazi + WebGAL 编辑器** —— 截图、对比、写差距分析、做视觉改进（原核心使命）
>
> 同时推进路线图视觉小说能力的**前端表现层**：图片资产能力、剧本编辑器（Beat-by-Beat）、分支地图、地图、导入导出（含 WebGAL）。
>
> **未来大方向（视觉 AI 不必这一阶段做完，但要在 v1.4–v2.0 推进）**：
> - **内置试玩预览** — 让作者在 Storyloom 内直接"播放"剧本，体验视觉小说的真实节奏；分两阶段（v1.4 自研 pixi 渲染基础版 → v2.0 嵌入 WebGAL 完整试玩）
>
> 之前的 AI **没有视觉功能**，无法亲自看截图，所以**视觉对标这件事必须由你来做**。详见 [`超长期开发路线图 v1.1.0+.md`](./超长期开发路线图%20v1.1.0%2B.md)。
>
> **核心定位**：Windows 桌面端 + 单机优先 + 暖色纸感视觉的**视觉小说编剧上游工作台**。**不做引擎、不做云、不做协作、不做 AI 生成图**。
>
> **项目改名（v1.1.4）**：`AI Timeline Creator` → `Timeline Creator` → **`Storyloom · 絮织`**。`appId` / GitHub 仓库 URL 暂保留以维持自动更新链；userData 路径变为 `%APPDATA%\Storyloom\`，**首次启动时需迁移旧数据**（详见路线图 §7）。

---

## 1. 你将看到什么

仓库 `d:\AIKFCC\AI-Timeline-Creator V4.0` 是一个 **Electron + React 19 + TDesign + better-sqlite3 + Fastify** 的桌面端小说创作工具。当前版本 **v1.1.0**：
- ✅ 自动更新链路（electron-updater + GitHub Releases）已闭环
- ✅ 启动 splash + 后台启服务的重构已生效
- ✅ 响应式 SideNav、跨浏览器测试、Vitest 单测、i18n（zh-CN/en-US）已就绪

**没有未解决的 P0 问题**。你可以从「下一阶段路线图」选取一项继续推进。

---

## 2. 项目快速地图

### 入口与关键路径

| 类别 | 文件 | 作用 |
|---|---|---|
| Electron 主进程 | `electron/main.ts` | 单实例锁、splash → 后台启服务 → loadFile，含日志写到 `%APPDATA%\ai-timeline-creator\app.log` |
| Splash 启动页 | `electron/loading.html` | 暖色纸感品牌色、进度文案 `window.updateStatus()` |
| 自动更新 | `electron/updater.ts` | autoDownload=false，GitHub provider，5 秒后首次检查 |
| Preload | `electron/preload.ts` | 暴露 `electronAPI` 与 `updater` |
| 前端入口 | `src/main.tsx` | 含 `tdesign-react/es/_util/react-19-adapter` 与 `import './lib/i18n'` |
| 应用根 | `src/App.tsx` | 挂 `WorkspaceInitializer`、`AppShell`、`UpdateNotifier` |
| 应用框架 | `src/components/layout/AppShell.tsx` | 含响应式 SideNav 自动折叠（`useMediaQuery('(max-width: 1024px)')`） |
| 顶栏 | `src/components/layout/TopToolbar.tsx` | 主题选择器 + 语言选择器 + 视图标签 |
| 后端 | `server/index.ts` | Fastify 启动，端口冲突自动 3001 → 3002…3010 |
| 数据库 | `server/db/*` + `drizzle/*` | better-sqlite3，启动时自动 migrate + 备份 |

### 当前路线图位置

| 已完成 | 下一阶段建议 |
|---|---|
| 启动顺序重构 | **前端功能进化（核心使命）** |
| electron-updater 集成 | i18n 全量翻译（视图、对话、空状态） |
| 响应式 SideNav | Vitest 覆盖率到 30% |
| Vitest 12 用例 | GitHub Actions CI（自动构建+发布） |
| i18n zh-CN/en-US 框架 | 自动更新真实回归（用 staging release 验证） |

---

## 3. 真实浏览器点击测试脚手架

我们准备好了一个 Playwright 真实点击脚本，**强烈推荐你用 headed 模式跑一遍以建立视觉直觉**。

### 前置

```bash
# 后端
npm run dev:server   # 端口 3001

# 前端
npm run dev:web      # 端口 5173

# Python 依赖（如果未装）
pip install playwright
python -m playwright install chromium
```

### 运行

```bash
# 默认 headed Chromium（你能肉眼看到点击与渲染）
npm run test:visual

# 或者直接调用脚本，更多参数
python scripts/visual_browser_smoke.py --help
python scripts/visual_browser_smoke.py --headed --browser firefox
python scripts/visual_browser_smoke.py --headless --shots-dir /tmp/shots
```

脚本流程：
1. 打开首页 → 截图
2. 点击「创建工作区」→ 填名称 → 提交 → 截图
3. 进入工作区主界面 → 截图
4. 切换大纲视图 → 截图
5. 切换时间轴视图 → 截图
6. 切换到子夜主题 → 截图
7. 切回洛圣主题 → 截图

**出错诊断**：脚本失败时会把当前 `page.content()` 写到 `<shots-dir>/error-dump.html` + 截一张 `99-error-state.png`，方便你定位问题。

### 你应该做的视觉判断

- 颜色与 v1.0.1 走查记录中的截图（`docs/screenshots/v1.0.1-uiux-walkthrough/`）保持一致？
- 创建对话框是否提交后立即关闭、列表立即刷新？
- 主题切换时是否有圆形扩散动效？
- 控制台是否出现 `reactRender is not a function`（应该没有）？

---

## 4. 已有测试

| 命令 | 覆盖 |
|---|---|
| `npm run typecheck` | tsc 全项目类型检查 |
| `npm run test` | Vitest 单元测试（12 用例） |
| `npm run test:e2e:chromium` | E2E 全面测试（Chromium） |
| `npm run test:e2e:firefox` | E2E（Firefox） |
| `npm run test:e2e:webkit` | E2E（WebKit） |
| `npm run test:e2e:all` | E2E 三浏览器 |
| `npm run test:visual` | 视觉 AI 真实点击（本指南推荐） |
| `npm run build` | Vite + tsc 前端构建 |
| `npm run dist` | 生成 Windows .exe 安装包（需设 `ATC_DIST_DIR`） |

---

## 5. 下一阶段路线图（精简后）

> **📍 完整版**：详见 [`超长期开发路线图 v1.1.0+.md`](./超长期开发路线图%20v1.1.0%2B.md)。本节列出 P0/P1。

### 5.1 视觉对标 51mazi（视觉 AI 必做的第一件事）

**为什么**：用户明确"视觉上要更像 B 站洛笙创作"。我没有视觉能力，**这件事必须由你来做**。

执行步骤：

1. **下载对手截图**：到 https://github.com/xiaoshengxianjun/51mazi 抓 README 里所有 doubaocdn.com 上的图，保存到 `docs/screenshots/competitor-51mazi/`，按功能命名（bookshelf / editor / timeline / relation-graph / map / character-album / ai-cover / ai-character / ai-scene 等）。
2. **B 站补充**：搜索"洛笙创作 / 51mazi"找 UP 主演示视频，截关键操作画面（注意：自动化访问 B 站可能被反爬限制，必要时手动浏览截屏），保存到 `docs/screenshots/competitor-luosheng/`。
3. **生成自家基线**：跑 `npm run test:visual --headed` 看本项目当前每个视图的真实样子。
4. **写差距分析报告**：新建 `docs/视觉对标报告 v1.2.md`，按维度（书架 / 编辑器 / 时间轴 / 创建对话框 / 顶栏 / 空状态 / AI 面板）逐项放对方截图、我们截图、差距描述、改进建议。
5. **逐项实施**：每实现一项做 before / after 截图，附在报告里。
6. **版权底线**：只借鉴布局与色彩思路，不模仿对方的图标 / 字体 / 插画原图等受保护资源。

重点维度：
- 首页书架卡片密度与封面图位置
- 编辑器左右分栏比例、留白、字号、行高
- 侧栏图标风格、激活态颜色
- 创建对话框的尺寸与字段密度
- AI 面板按钮卡片化方式
- 空状态插画的笔触与色调

### 5.2 图片资产能力（用户明确补充：人物大头像 / 立绘 / 场景图）

P0 模块。视觉小说创作的命脉：**用户需要插入自己的图（来自插画师 / 付费素材 / 自绘），而不是 AI 生成**。

要做的：
- **assets 表 + 关联表**（character_assets、event_assets）；物理存到 `<workspace>/assets/`
- **三种图片类型**：avatar（圆形头像 256×256）/ portrait（竖版立绘 720×1280+）/ scene（横版场景图 1280×720+）
- **三种入口**：拖拽到面板 / 粘贴板 / 文件选择
- **角色档案集成**：更换头像按钮 + 立绘列表（多张，可置顶主图）
- **事件场景图**：事件编辑器右侧"场景图"区域，缩略图列表
- **图库浏览器**：独立面板，按 kind 分类 + 搜索 + tag 过滤
- **Lightbox 预览**：键盘左右切换 + Esc 关闭
- **关系图节点头像 / 时间轴卡片场景图缩略**：复用 avatar/scene
- **导出包含图片**：ZIP 全量带 `assets/`；单项 PNG 时合成场景图

版权底线：默认提示用户自负图片版权；不内置任何受保护素材。**不做 AI 生成图**。

### 5.3 地图功能（用户明确补充）

P0 模块。Konva.js + 内置 SVG 图标库，支持画笔/橡皮/形状/文字标注/资源拖拽/缩放/平移/撤销重做/导出 PNG/**导入图片作为底图**。存到工作区 `maps/` 目录。

### 5.4 导入导出（用户明确补充）

P0 模块：
- **一键全量导出工作区** ZIP（含数据库 JSON + assets 全部图片 + maps + 元信息 README）
- **单项导出**：每个视图右上角加导出按钮 — 时间轴 PNG/Markdown/JSON、大纲 Markdown、角色 Markdown 表格 + portrait/avatar 打包、地图 PNG、关系图 PNG、伏笔/世界观 Markdown、**角色立绘画册 PDF/拼图 PNG**
- **导入**：ZIP 整工作区导入（合并/新建二选一）、Markdown 大纲导入、JSON 时间轴还原

### 5.5 数据安全

P0 — 操作历史 / 时光机 + 自动备份 UI（偏好里能查看备份列表、还原任意一份）。
P1 — 工作区/书籍密码（PBKDF2 + AES-GCM）。

### 5.6 编辑器关键升级（精选）

P0 — 全局 Ctrl+Z/Y、全文搜索+替换、**图片直接粘贴/拖拽到正文**。
P1 — 人物名高亮、段落拖拽排序。
**砍掉**：Markdown 实时预览、禁词提示、AI 续写 120% 字数策略。

### 5.7 不要做的事（明确边界）

- ❌ macOS / Linux / Web / 移动端
- ❌ 云同步 / 多端协作
- ❌ 插件市场 / 模板市场 / AI 模型市场
- ❌ **AI 生成封面 / 人物图 / 场景图**（用户更需要导入自己已有的图）
- ❌ 组织架构图 / 词条字典 / 随机名字生成器（受众太小）
- ❌ 数据洞察大屏 / 字数趋势饼图（够用就好，不做炫酷报表）
- ❌ Vitest 覆盖率硬指标 / GitHub Actions 自动 release（自然推进，不设 KPI）

---

## 6. 你不应该做的事

- ❌ 不要修改 `electron/main.ts` 的启动顺序（已稳定，破坏会导致用户报告"打不开窗口"）
- ❌ 不要把 v4.2.x 撤回的版本重新发布
- ❌ 不要在没有自动更新支持的旧版本上 silent 推送破坏性变更（旧版无法升级）
- ❌ 不要删除 `docs/screenshots/v1.0.1-uiux-walkthrough/`（这是当前主题视觉基准）

---

## 7. v1.4 TDesign / IconPark 使用规范

> v1.4 已完成全量 TDesign React + IconPark 图标改造。后续视觉/前端 AI 修改界面时，必须遵循以下规范，避免重新引入 lucide-react、shadcn Button 等旧依赖，保持 6 主题视觉一致。

### 7.1 组件来源

| 场景 | 应使用 | 不应使用 |
|---|---|---|
| 按钮 | `TButton` from `@/components/ui-tdesign` | shadcn `Button` / lucide-react 图标按钮 |
| 对话框 | `TDialog` / `TDialogPlugin` from `@/components/ui-tdesign` | shadcn `Dialog` / Radix 原生日志 |
| 输入框 | `TInput` / `TTextarea` / `TSelect` | shadcn `Input` / 原生未封装输入 |
| 标签 | `TTag` | shadcn `Badge` / 手写样式 span |
| 卡片 | `TCard` | 手写 `div.rounded-xl.border` |
| 滑块 | `TSlider` | Radix `Slider` |
| 菜单/导航 | `TMenu` / `TMenuItem` / `TMenuGroup` | 手写图标列表 |
| 标签页 | `TTabs` / `TTabPanel` | shadcn `Tabs` |
| 下拉菜单 | `Dropdown` from `tdesign-react` | shadcn `DropdownMenu` |
| 提示/确认 | `TTooltip` / `TPopup` | Radix `Tooltip` |

### 7.2 新增组件的导入路径

```tsx
// ✅ 正确：从 TDesign 适配层导入已主题化组件
import { TButton, TCard, TTag, TInput } from '@/components/ui-tdesign';

// ✅ 正确：TDesign 官方组件（未在适配层时）
import { Dropdown } from 'tdesign-react';

// ❌ 错误：不要直接导入 shadcn Button / lucide-react 图标
import { Button } from '@/components/ui/button';        // 已废弃
import { Settings } from 'lucide-react';                // 已废弃
```

### 7.3 图标登记规范

1. **所有新图标必须先在 `src/lib/icons.ts` 登记**，统一使用 IconPark React 图标。
2. 登记格式：
   ```ts
   export { ZoomInIcon, ZoomOutIcon, SomeNewIcon } from '@icon-park/react';
   export type IconParkIconProps = React.ComponentProps<typeof ZoomInIcon>;
   ```
3. 业务组件导入：
   ```tsx
   import { SomeNewIcon } from '@/lib/icons';
   ```
4. 不要在业务组件里直接 `import { SomeIcon } from '@icon-park/react'`；统一走 `@/lib/icons`，便于后续批量替换与类型约束。

### 7.4 核心布局禁区

以下文件/区域**禁止**再使用 lucide-react / shadcn Button / Radix 原生对话框：

- `src/components/layout/TopToolbar.tsx`
- `src/components/layout/SideNav.tsx`
- `src/components/layout/StatusBar.tsx`
- `src/components/layout/LanguageSelector.tsx`
- `src/components/layout/ContextPanel.tsx`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/command-palette/CommandPalette.tsx`
- `src/components/ai-panel/AIPanel.tsx`
- `src/components/timeline/TimelineToolbar.tsx` / `TimelineMinimap.tsx`

历史视图（`TimelineView` / `NarrativeView` / `GanttView` / `TreeView` / `StatsView` / `RelationshipView`）内部允许逐步迁移，但**新增图标/按钮必须走 IconPark + `TButton`**。

### 7.5 主题变量

TDesign 适配层已读取 `src/index.css` 中的 CSS 变量。新增组件如需颜色，优先使用：

```css
/* 背景 / 文字 */
bg-[rgb(var(--background))]
text-[rgb(var(--foreground))]

/* 主色 / 强调 */
bg-[rgb(var(--primary))]
text-[rgb(var(--primary-foreground))]

/* 卡片 / 边框 */
bg-[rgb(var(--card))]
border-[rgb(var(--border))]
```

不要写死颜色值（如 `#fff` / `#000` / `#10b981`），否则在 `midnight` / `forest` / `ink-wash` / `contrast` 下会穿帮。

### 7.6 回归测试

修改界面后必须跑：

```bash
npm run typecheck
npm run build
python scripts/v1_4_tdesign_regression.py
```

回归脚本会自动在 6 主题下截图并检查核心交互。截图目录：`docs/screenshots/v1.4-tdesign/`。

---

## 8. 联系点 & 参考

- 项目状态报告：`docs/项目状态报告.md`
- 完整交接手册：`docs/AI开发完整交接手册.md`
- 快速接手指南：`docs/AI接手开发指南.md`
- 测试报告：`docs/测试报告 v1.1.0.md`
- UI/UX 走查：`docs/UI-UX 走查记录 v1.1.0.md`（仅在 v1.0.1 文件名上更新过；v1.0.1 版本基准）
- v1.4 洛笙调研与实现状态：`.trae/documents/v1_4-tdesign-frontend-polish-luosheng-research.md`

祝顺利。
