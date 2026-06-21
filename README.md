# 织叙 / Storyloom — 用一根时间线，把故事织成宇宙

> 面向小说作者、编剧、游戏叙事设计师的全功能创作工具

[![Version](https://img.shields.io/badge/version-v1.0.0-amber)](https://github.com/YJLZSL/Storyloom/releases/tag/v1.0.0)
[![Status](https://img.shields.io/badge/status-active-brightgreen)](https://github.com/YJLZSL/Storyloom)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Tauri](https://img.shields.io/badge/tauri-2.11-FFC131)](https://tauri.app/)
[![React](https://img.shields.io/badge/react-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-3178C6)](https://www.typescriptlang.org/)

**织叙（Storyloom）** 是一款面向小说作者、编剧、游戏叙事设计师的本地桌面创作工作台。以「织机」为隐喻，将时间线编织为立体的故事结构——角色、事件、伏笔、世界观在时间轴上经纬交织，最终可一键导出到主流 Visual Novel 引擎。

[English](#english) | [功能特性](#功能特性) | [下载](#下载) | [快速开始](#快速开始) | [技术架构](#技术架构) | [文档](#文档)

---

## 功能特性

### 🎨 全新美术架构 v2.0
- **三层渲染模型** — 交互层 / 内容层 / 渲染层，PixiJS v8 渐进增强
- **动画层架构** — GSAP 引擎 + 10 种预设 + React Hooks
- **主题系统 v2.0** — 8 套完整主题（颜色、字体、动画、材质），运行时动态切换
- **织机启动动画** — LoomSplash SVG 织机动画（GSAP Timeline 驱动）
- **页面过渡** — 10 种过渡预设（淡入淡出、滑动、缩放、旋转、弹性弹出）

### 🧵 多视图时间轴
支持 **7 种视图** 自由切换：时间线（Timeline）、大纲（Outline）、叙事（Narrative）、甘特（Gantt）、树状（Tree）、统计（Stats）、关系图（Relationship）。每个事件都是织机上的节点，角色与伏笔是交织的经纬线。

### 🤖 AI 写作助手
- **对话历史持久化** — 所有 AI 对话存储在本地 SQLite，支持跨会话恢复
- **工作区上下文注入** — 自动将当前工作区的角色、事件、伏笔数据作为 system prompt 注入
- **一键创作功能** — 事件续写、角色对话、伏笔回收、一致性检查
- **KV 缓存优化** — 三段式消息结构，大幅降低 API 调用成本

### 👤 角色与世界观
- 角色卡片系统，支持头像、属性、背景故事
- 关系图（D3 力导向图），可视化角色间关联
- 世界观设定面板，集中管理故事规则
- 伏笔追踪系统，标记→回收完整链路

### 📝 写作与剧本
- **三栏写作布局** — 左章节目录 + 中编辑器 + 右数据面板
- **Zen Mode 专注写作** — 全屏沉浸式编辑，实时字数统计，自动保存
- **剧本编辑器** — 分栏式布局，台词撰写与演出指令编排
- **每日目标字数** — 持久化目标，自动跨天重置，进度条 + 连续达标统计

### 📚 资料库
- 笔记管理、文件夹树、标签系统
- 快速记录（Ctrl+Enter）
- 支持富文本与 Markdown

### 🗺️ 地图与书签
- **地图系统** — 创建地图标记故事地点，标记可关联到事件
- **书签系统** — 为时间轴事件添加书签，快速定位重要节点，支持自定义颜色与名称

### 📤 一键导出
支持导出到 **WebGAL** 等视觉小说引擎，自动生成场景脚本和资产包。

### 🎨 视觉体验
- **8 套主题** — 洛生、子夜、森林、水墨、高对比、桜、深海、极光
- **Zen Mode 专注写作** — 全屏沉浸式编辑，对标 novelWriter
- **织机隐喻界面** — 织机 SVG 动画、织线卡片设计、毛玻璃背景
- **流畅动效** — Framer Motion 视图切换、骨架屏 shimmer、Spotlight 命令面板

### 🔒 离线优先
- 数据完全本地存储（SQLite），无需联网
- 自动备份与崩溃恢复
- 工作区导入 / 导出（JSON + ZIP）

### 🔄 自动更新
Tauri 内置自动更新机制（`tauri-plugin-updater`），新版本自动推送。

---

## 下载

📥 [**下载最新版**](https://github.com/YJLZSL/Storyloom/releases/latest)

| 平台 | 文件 | 体积 |
|------|------|------|
| Windows (x64) | `Storyloom_1.0.0_x64-setup.exe` | ~27 MB |

> 旧版本：v1.2.x 及更早版本为 Electron 构建，产物约 125MB。v1.3.0 起全面迁移至 Tauri，体积缩减 80%。

---

## 快速开始

### 环境要求

- **Node.js** 20.x LTS 或更高
- **Rust** 1.77+（Tauri 需要）
- **VS BuildTools 2022**（含 "Desktop development with C++" 工作负载）

详见 [`docs/环境配置指南.md`](./docs/环境配置指南.md)。

### 安装与启动

```bash
# 1. 克隆项目
git clone https://github.com/YJLZSL/Storyloom.git
cd Storyloom

# 2. 安装依赖
npm install

# 3. 桌面开发模式（推荐）
npm run tauri:dev

# 4. 构建桌面应用
npm run tauri:build
```

### 常用命令

```bash
npm run dev              # 浏览器开发模式（Vite + Fastify）
npm run tauri:dev        # Tauri 桌面开发模式（推荐）
npm run build            # 前端构建
npm run tauri:build      # 完整桌面应用构建
npm run typecheck        # TypeScript 类型检查
npm run test             # 运行单元测试（193 用例）
```

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│  Tauri 2.x Rust 主进程                        │
│  ├── 窗口管理 · 系统 API · IPC 安全桥接        │
│  └── Sidecar 生命周期管理                      │
├─────────────────────────────────────────────┤
│  Sidecar 子进程（Node.js）                     │
│  ├── Fastify 5 HTTP 服务器                   │
│  ├── Drizzle ORM → SQLite                    │
│  └── 业务路由 / 服务 / 插件                   │
├─────────────────────────────────────────────┤
│  WebView2 渲染进程（React 19）                │
│  ├── Zustand 全局状态                        │
│  ├── TanStack Query 服务端状态               │
│  ├── TDesign + shadcn/ui 组件库              │
│  └── Tailwind CSS v4 原子化样式               │
└─────────────────────────────────────────────┘
```

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面壳 | **Tauri 2.x** (Rust) | 跨平台桌面应用，产物 < 30MB |
| 前端 | **React 19** + **Vite 6** | UI 渲染，WebView2 |
| 后端 | **Fastify 5** + **SQLite** | Node.js sidecar 子进程 |
| ORM | **Drizzle ORM** | 类型安全的 SQLite 操作 |
| 状态 | **Zustand** + **TanStack Query** | 全局状态 + 服务端状态缓存 |
| 样式 | **Tailwind CSS v4** + **TDesign** | 原子化 CSS + 企业级组件 |
| 动画 | **GSAP** + **Framer Motion** | GSAP 复杂时间线动画，Framer Motion DOM 过渡 |
| 渲染 | **PixiJS v8** | 背景粒子特效层（渐进增强） |

---

## 文档

| 文档 | 说明 | 目标读者 |
|------|------|----------|
| 📖 [`docs/快速开始.md`](./docs/快速开始.md) | 5 分钟上手指南 | 新成员 |
| 🏗️ [`docs/架构设计.md`](./docs/架构设计.md) | 技术架构与模块设计 | 开发者、AI |
| 🛠️ [`docs/开发指南.md`](./docs/开发指南.md) | 本地开发环境、调试、常见问题 | 开发者 |
| 🚀 [`docs/发版指南.md`](./docs/发版指南.md) | 标准发版 10 步流程 | 发布者 |
| 🤖 [`docs/agents.md`](./docs/agents.md) | 智能体编码指南 | AI 协作者 |
| 📝 [`docs/更新日志-v1.4.0.md`](./docs/更新日志-v1.4.0.md) | v1.4.0 美术架构升级 | 所有人 |
| 📝 [`CHANGELOG.md`](./CHANGELOG.md) | 全版本历史记录 | 所有人 |
| 📚 [`docs/README.md`](./docs/README.md) | 文档导航大全 | 所有人 |

---

## 贡献指南

我们欢迎所有形式的贡献——Bug 反馈、功能建议、代码提交、文档改进。

1. **Fork** 本仓库
2. **创建分支** `git checkout -b feat/your-feature`
3. **提交更改** `git commit -am 'Add some feature'`
4. **推送分支** `git push origin feat/your-feature`
5. **创建 Pull Request**

提交前请确保：
- `npm run typecheck` 无错误
- `npm run test` 全部通过
- `npm run lint` 无警告

---

## English

**Storyloom** is a local desktop authoring workbench for visual novel, novel, and screenplay writers. Built on the metaphor of a **loom**, it weaves timelines into three-dimensional story structures—characters, events, foreshadowing, and worldbuilding interlace on the timeline like warp and weft threads, ultimately exportable to mainstream Visual Novel engines.

### Core Features

- **7 Timeline Views** — Timeline / Outline / Narrative / Gantt / Tree / Stats / Relationship
- **AI Writing Assistant** — Persistent conversation history, workspace context injection, event continuation, character dialogue, foreshadowing resolution, consistency checks
- **Character & Worldbuilding** — Character cards, relationship graph (D3 force-directed), world settings, foreshadowing tracking
- **Writing & Screenplay** — Three-column writing layout, Zen Mode, screenplay editor, daily word goal
- **Knowledge Base** — Notes, folder tree, tag system, quick capture
- **Maps & Bookmarks** — Location maps, event bookmarks with colors
- **One-Click Export** — Export to WebGAL and other visual novel engines
- **Offline-First** — All data stored locally (SQLite), no internet required
- **Auto-Update** — Built-in Tauri updater
- **8 Themes** — Preset themes + custom color palette
- **Zen Mode** — Full-screen immersive writing

### Tech Stack

**Tauri 2.x** + **React 19** + **Fastify 5** + **SQLite** + **Drizzle ORM**

---

## License

MIT © Storyloom Team · 2026
