# 洛笙创作 vs Storyloom 架构对比与重构建议

> 调研日期：2026-06-21
> 调研对象：洛笙创作（Tauri 桌面应用，逆向分析产物）
> 当前项目：Storyloom v1.4.0（Tauri 2.x 桌面应用）

---

## 一、洛笙创作架构总览

### 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 桌面壳 | **Tauri 2.10.2**（Rust） | 跨平台桌面框架，Windows PE32+ |
| 运行时 | wry 0.54.2 + tao 0.34.5 + WebView2 | Edge WebView2 渲染前端 |
| 前端框架 | **Vue 3**（`<script setup>`） | SPA，挂载点 `#spa-page-root` |
| 构建 | **Vite** | 代码分割、懒加载、哈希命名 |
| 本地存储 | **Dexie**（IndexedDB）+ rusqlite | 9 张表，含 RAG 向量存储 |
| 后端代理 | reqwest 0.13.2 + rustls | Rust 侧代理 AI 请求 |
| 本地 DB | rusqlite 0.32.1 | `storage_sqlite_exec` 命令暴露 |
| 密码学 | ring + chacha20 + argon2 + minisign | 备份加密 + 更新签名校验 |
| 资产嵌入 | **brotli + phf 完美哈希** | 前端全部静态资源编译进 EXE |
| 编辑器 | **Vditor** + Mermaid + MathJax | Markdown 富文本编辑器 |
| 动画 | **anime.js** + CSS transitions | 流畅动画效果 |
| 单实例 | tauri-plugin-single-instance | 防止多开 |
| 自动更新 | tauri-plugin-updater + minisign | `novelists.cn/releases/tauri/latest.json` |

### 核心特征

- **单 EXE 自包含**：前端 61 个 JS chunk + 1 CSS + index.html + 字体/图片均 brotli 压缩嵌入，运行时 phf 查表 + brotli 解压，无外部 `dist/` 依赖
- **产物体积**：约 41 MB（vs Storyloom 131 MB）
- **前端路由**：11 条路由（总览、角色、世界、情节、章节、条款、资料库、AI 工具、账户、设置、模板管理）
- **数据模型**：9 张表（config, books, book_contents, activities, entities, app_settings, history, rag_chunks, rag_index_meta）
- **AI 集成**：Agent 侧边栏 → 工具调度 → RAG 检索 → AI Chat → 生成内容 → 实体写入 → 增量同步

### 资产实现

- **图标**：2 个 ICO（多分辨率），PNG 引用
- **字体**：15 个 WOFF2（思源黑体/宋体多字重子集化，4 个 ~1.1MB 大文件）
- **图片**：12 个 PNG（UI 元素，652B–5.6KB）+ 9 个 JPG（启动图/背景，~813KB–1.04MB）
- **启动遮罩**：`#app-startup-overlay` 含 spinner +「初始化应用中...」
- **主题引导**：内联脚本从 localStorage 读取 themeMode/themePalette，避免首屏闪烁

### 动画实现

- **anime.js**：用于复杂动画（页面过渡、组件动画）
- **CSS transitions**：用于简单状态过渡（hover、focus、active）
- **CSS animations**：用于循环动画（loading spinner、脉冲效果）
- **Vditor.mermaidRender**：对话内 Mermaid 图表渲染

---

## 二、Storyloom 当前架构

| 层 | 技术 | 说明 |
|----|------|------|
| 桌面壳 | **Electron 42.4.0**（Node.js） | 跨平台桌面框架 |
| 运行时 | Chromium + Node.js | Electron 内置渲染 |
| 前端框架 | **React 19** + TypeScript | SPA |
| 构建 | **Vite** | 代码分割、懒加载 |
| 样式 | **Tailwind CSS 4** + Radix UI + TDesign | 原子化 CSS + 组件库 |
| 本地存储 | **better-sqlite3** + Drizzle ORM | Node.js 侧 SQLite |
| 后端 | **Fastify 5** + Drizzle ORM | 完整 REST API 服务器 |
| 状态管理 | **Zustand** | 全局状态 |
| 数据获取 | **TanStack Query** | 服务端状态 |
| 动画 | **framer-motion** | React 组件动画 |
| 编辑器 | **react-markdown** + remark-gfm | Markdown 渲染 |
| 可视化 | **d3** | 时间轴可视化 |
| 自动更新 | **electron-updater** | GitHub Release |
| 单实例 | `app.requestSingleInstanceLock()` | Electron 原生 |

### 核心特征

- **产物体积**：约 131 MB（NSIS 安装程序）
- **多进程架构**：Electron 主进程 + 渲染进程 + Node.js 后端服务器进程
- **前端路由**：基于 React Router（工作区、时间轴、事件、角色、设置、AI 面板等）
- **数据模型**：workspaces, events, characters, timelines, aiConversations, aiCache 等
- **AI 集成**：Fastify 后端代理 DeepSeek API，前端通过 API 调用

---

## 三、架构对比分析

### 3.1 桌面壳层：Tauri vs Electron

| 维度 | Tauri | Electron |
|------|-------|----------|
| 产物体积 | ~41 MB | ~131 MB |
| 内存占用 | 低（WebView2） | 高（完整 Chromium） |
| 启动速度 | 快 | 较慢 |
| 安全性 | 高（Rust + CSP） | 中（Node.js 集成） |
| 前端框架 | 任意 | 任意 |
| 后端语言 | Rust | Node.js |
| 学习曲线 | 高（Rust） | 低（JavaScript） |
| 生态系统 |  growing | 成熟 |
| 单 EXE | ✅ 原生支持 | ❌ 需 asar |
| 资产嵌入 | ✅ brotli+phf | ❌ 传统文件系统 |

**结论**：Tauri 在体积、性能、安全性方面显著优于 Electron。

### 3.2 前端框架：Vue 3 vs React 19

| 维度 | Vue 3 | React 19 |
|------|-------|----------|
| 学习曲线 | 较低 | 中等 |
| 生态系统 | 成熟 | 最成熟 |
| 性能 | 优秀 | 优秀 |
| 类型支持 | 好 | 最好 |
| 组合式 API | `<script setup>` | Hooks |

**结论**：两者都是现代前端框架，迁移成本极高。Storyloom 已深度使用 React 19，应保留。

### 3.3 本地存储：Dexie/IndexedDB vs better-sqlite3

| 维度 | Dexie (IndexedDB) | better-sqlite3 |
|------|-------------------|----------------|
| 存储位置 | 浏览器沙盒 | 文件系统 |
| 容量限制 | ~50MB（可扩展） | 无限制 |
| 查询能力 | 基础（Dexie 封装） | 完整 SQL |
| 迁移能力 | 复杂 | 简单 |
| ORM 支持 | 有限 | Drizzle 完整支持 |

**结论**：Storyloom 的 better-sqlite3 + Drizzle ORM 更强大，应保留。但可考虑将数据库移到 Rust 侧（rusqlite）以获得更好集成。

### 3.4 后端架构：Rust 命令 vs Fastify 服务器

| 维度 | Rust 命令（Tauri） | Fastify 服务器 |
|------|-------------------|----------------|
| 通信方式 | IPC invoke | HTTP API |
| 性能 | 极高 | 高 |
| 开发效率 | 低（Rust） | 高（Node.js） |
| 生态 | Rust 生态 | npm 生态 |
| 复杂度 | 每个命令独立 | 完整服务器框架 |

**结论**：Fastify 后端已成熟，重写为 Rust 命令成本太高。建议保留 Node.js 后端作为 Tauri sidecar。

### 3.5 编辑器：Vditor vs react-markdown

| 维度 | Vditor | react-markdown |
|------|--------|----------------|
| 功能 | 富文本编辑 + 预览 | 纯渲染 |
| 集成成本 | 高（需配置） | 低 |
| 用户体验 | 专业编辑器 | 简单展示 |
| 体积 | 大（~1MB） | 小 |

**结论**：Storyloom 目前只需要 Markdown 渲染，react-markdown 足够。但未来章节编辑功能可能需要 Vditor。

### 3.6 动画：anime.js vs framer-motion

| 维度 | anime.js | framer-motion |
|------|----------|---------------|
| 框架绑定 | 无 | React 专用 |
| 功能 | 全面 | React 优化 |
| 性能 | 优秀 | 优秀 |
| 声明式 | ❌ | ✅ |

**结论**：framer-motion 与 React 深度集成，声明式 API 更适合 React 项目。应保留。

---

## 四、重构建议

### 4.1 推荐方案：Tauri + React 迁移

保留 React 前端，迁移到 Tauri 壳层，后端保留 Node.js 作为 sidecar。

**保留部分**：
- ✅ React 19 + TypeScript 前端
- ✅ Vite 构建工具
- ✅ Tailwind CSS + Radix UI + TDesign 样式体系
- ✅ Fastify 后端（作为 sidecar）
- ✅ better-sqlite3 + Drizzle ORM
- ✅ framer-motion 动画
- ✅ react-markdown 编辑器
- ✅ d3 可视化

**替换部分**：
- ❌ Electron → Tauri 2.x
- ❌ electron-updater → tauri-plugin-updater
- ❌ 传统 asar 打包 → Tauri 单 EXE 构建

**新增部分**：
- 🆕 Tauri 命令桥接（前端 ↔ 后端通信）
- 🆕 Sidecar 配置（Node.js 后端子进程）
- 🆕 主题引导脚本（避免首屏闪烁）
- 🆕 启动遮罩（优化启动体验）
- 🆕 WOFF2 字体子集化（减小体积）
- 🆕 资产压缩优化

### 4.2 预期收益

| 指标 | 当前 | 预期 | 改善 |
|------|------|------|------|
| 产物体积 | 131 MB | ~50-60 MB | ↓ 55% |
| 内存占用 | 高 | 中 | ↓ 40% |
| 启动速度 | 3-5s | <2s | ↑ 50% |
| 安全性 | 中 | 高 | ↑ 显著 |
| 单文件部署 | ❌ | ✅ | 新能力 |

### 4.3 风险与成本

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Rust 学习曲线 | 高 | 保留 Node.js 后端，减少 Rust 代码量 |
| 迁移周期长 | 高 | 分阶段迁移，保持可运行状态 |
| 第三方库兼容性 | 中 | 验证关键库（d3, framer-motion, better-sqlite3） |
| 测试覆盖 | 中 | 全面测试后再发布 |
| 用户数据迁移 | 低 | 数据库格式不变，路径调整即可 |

---

## 五、实施计划

### Stage 1: 基础架构搭建（1-2 天）

1. 创建 Tauri 项目结构（`src-tauri/`）
2. 配置 Tauri + React + Vite
3. 设置 sidecar（Node.js 后端子进程）
4. 配置 Tauri 命令（文件系统、对话框、外部链接）
5. 验证开发环境可运行

### Stage 2: 后端适配（1-2 天）

1. 修改 Fastify 后端为 sidecar 模式
2. 配置端口发现（动态端口分配）
3. 实现前端 ↔ 后端通信桥接
4. 迁移数据库路径（Tauri 的 userData 目录）
5. 验证数据读写正常

### Stage 3: 前端迁移（2-3 天）

1. 替换 Electron API 为 Tauri API
   - `ipcRenderer` → `invoke`
   - `shell.openExternal` → Tauri shell
   - `dialog` → Tauri dialog
   - `app.getPath` → Tauri path
2. 调整窗口管理（大小、全屏、最小化）
3. 实现启动遮罩和主题引导
4. 验证所有页面功能正常

### Stage 4: 构建优化（1 天）

1. 配置 Tauri 构建流程
2. 优化资产（字体子集化、图片压缩）
3. 配置自动更新（tauri-plugin-updater + GitHub）
4. 验证产物体积和性能

### Stage 5: 测试与发布（1-2 天）

1. 全面功能测试
2. 性能测试（启动速度、内存占用）
3. 更新所有文档
4. 构建并发布 Release

**总工期预估**：6-10 天

---

## 六、洛笙创作可借鉴的具体实现

### 6.1 启动体验优化

洛笙的启动遮罩 + 主题引导脚本值得借鉴：

```html
<!-- 启动遮罩 -->
<div id="app-startup-overlay">
  <span class="startup-loader"></span>
  <div class="startup-text">初始化应用中...</div>
</div>

<!-- 主题引导（避免首屏闪烁） -->
<script>
  (function() {
    var cached = JSON.parse(localStorage.getItem('theme_cache'));
    var mode = cached?.themeMode || 'system';
    var isDark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  })();
</script>
```

### 6.2 字体优化

洛笙使用 WOFF2 子集化字体（15 个文件，4 个 ~1.1MB 大文件为中文主字体），比 Storyloom 当前使用系统字体更可控，但体积增加。建议按需子集化。

### 6.3 资产嵌入

Tauri 的 brotli + phf 机制使单 EXE 成为可能。Storyloom 迁移后应利用此特性。

### 6.4 编辑器选择

洛笙的 Vditor 集成深度较高，但 Storyloom 当前只需要 Markdown 渲染，暂不迁移。未来章节编辑功能再考虑。

### 6.5 动画策略

洛笙使用 anime.js + CSS 混合策略。Storyloom 的 framer-motion 已足够，无需替换。

---

## 七、最终决策

**建议：执行 Tauri + React 迁移**

理由：
1. 产物体积减少 55% 以上（131MB → ~50MB）
2. 内存占用降低 40%
3. 启动速度提升 50%
4. 单 EXE 自包含，用户体验更好
5. 保留 React 前端投资，迁移成本可控
6. 保留 Node.js 后端，功能不受影响

不执行全面重构（Vue 3 + Rust 后端）的理由：
1. React → Vue 迁移成本极高（相当于重写前端）
2. Fastify → Rust 后端迁移成本极高
3. 当前功能已稳定，不需要推倒重来
4. Tauri + React 已能获得主要收益

---

*报告完成。建议启动 Stage 1 实施。*
