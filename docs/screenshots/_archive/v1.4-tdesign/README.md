# v1.4 TDesign / IconPark 前端改造回归截图

本目录存放 Storyloom v1.4 引入 TDesign 组件与 IconPark 图标后，使用 Playwright 执行前端回归测试时截取的关键页面截图。

## 目录说明

- `01-home.png` 至 `17-ai-panel.png`：按功能路径排序的核心界面回归截图。
- `theme-*.png`：不同主题下的时间轴界面截图，用于验证 TDesign 主题适配层与颜色变量映射。

---

## 核心界面回归截图

| 文件名 | 场景描述 |
|---|---|
| `01-home.png` | 应用首页 / 工作区选择页，展示工作区卡片列表与新建/导入入口。 |
| `02-workspace-main.png` | 进入工作区后的主界面，展示默认视图与整体布局。 |
| `03-sidenav-timeline.png` | 左侧边栏展开状态，当前选中「时间轴」视图。 |
| `04-sidenav-outline.png` | 左侧边栏展开状态，当前选中「大纲」视图。 |
| `05-sidenav-collapsed.png` | 左侧边栏收起后的窄栏状态。 |
| `06-sidenav-expanded.png` | 左侧边栏完全展开后的宽栏状态。 |
| `07-top-toolbar-timeline.png` | 顶部工具栏处于「时间轴」视图下的按钮与标题展示。 |
| `08-top-toolbar-narrative.png` | 顶部工具栏处于「叙事」视图下的按钮与标题展示。 |
| `09-timeline-minimap.png` | 时间轴视图附带缩略图导航（minimap）的完整画面。 |
| `10-zoom-out.png` | 时间轴缩放至较小比例后的全局视图。 |
| `11-zoom-in.png` | 时间轴放大后的局部细节视图。 |
| `12-command-palette.png` | 命令面板（Command Palette）打开状态，展示 TDesign 搜索与列表样式。 |
| `13-settings-open.png` | 设置对话框打开后的首屏。 |
| `14-settings-tab-主题.png` | 设置对话框切换到「主题」标签页，展示主题选择卡片宫格。 |
| `15-settings-tab-快捷键.png` | 设置对话框切换到「快捷键」标签页，展示快捷键绑定列表。 |
| `16-settings-tab-教程.png` | 设置对话框切换到「教程」标签页，展示教程入口列表。 |
| `17-ai-panel.png` | AI 助手面板打开状态，展示 TDesign Card 网格与对话输入区。 |

---

## 主题截图

| 文件名 | 主题说明 |
|---|---|
| `theme-luosheng-timeline.png` | 洛笙主题：温暖羊皮纸色背景，绿/棕双主色按钮，还原洛笙创作软件的视觉风格。 |
| `theme-midnight-timeline.png` | 午夜主题：深色背景，低饱和强调色，适合夜间使用。 |
| `theme-forest-timeline.png` | 森林主题：以绿色系为主，营造自然清新的编辑氛围。 |
| `theme-ink-wash-timeline.png` | 水墨主题：黑白灰为主的水墨风格，强调内容本身。 |
| `theme-contrast-timeline.png` | 高对比主题：增强明暗对比，提升可读性。 |
| `theme-system-timeline.png` | 系统主题：跟随操作系统深浅色设置，使用系统默认色彩偏好。 |
