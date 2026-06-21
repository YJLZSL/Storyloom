## Storyloom v1.3.0 更新说明

### 架构重构：Electron → Tauri 2.x

本次版本完成了从 Electron 到 Tauri 2.x 的核心架构重构，这是 Storyloom 底层技术栈的重大升级：

- **桌面壳框架**：Electron 42.x → **Tauri 2.11.x（Rust）**
  - 产物体积从 ~131MB NSIS 安装程序 → **~50MB 单 EXE 自包含**
  - 内存占用显著降低，启动速度提升
  - 安全模型升级：CSP 策略 + 能力（Capabilities）机制
- **后端运行模式**：独立进程 → **Tauri Sidecar（子进程）**
  - Fastify 后端作为 `storyloom-sidecar` 由 Rust 主进程管理
  - 通过 stdout JSON 协议进行父子进程通信（`{"type":"ready","port":3001}`）
  - 环境变量注入：`DATA_DIR`、`MIGRATIONS_DIR`、`NODE_ENV`
- **前端 API 迁移**：`window.electron` IPC → **Tauri API + 自定义 Commands**
  - 新增 `src/lib/tauri-api.ts`：统一封装 `@tauri-apps/api` 调用
  - 文件操作、端口管理、日志、对话框、自动更新均通过 Tauri 插件实现
  - 插件清单：`@tauri-apps/plugin-shell`、`plugin-dialog`、`plugin-fs`、`plugin-updater`、`plugin-log`
- **构建系统**：electron-builder → **Tauri 构建系统**
  - 新增 `src-tauri/` 目录：Rust 源码 + `Cargo.toml` + `tauri.conf.json`
  - 删除 `electron/` 目录、`electron-out/` 目录、`tsconfig.electron.json`
  - 新增 `server/sidecar-entry.ts`：sidecar 专用入口点
  - 新增构建命令：`npm run tauri:dev`、`npm run tauri:build`、`npm run build:sidecar`
- **自动更新**：`electron-updater` → **`tauri-plugin-updater`**
  - 更新事件通过 `listen('update:event')` 分发
  - 支持增量下载 + 后台安装
  - GitHub Release 产物简化为单 `.exe` + `.sig`（无需 `latest.yml` + `.blockmap`）
- **开发环境新增要求**：Rust 工具链（`rustc` + `cargo`）
  - 推荐通过 `rustup` 安装
  - Windows 需要 Visual Studio Build Tools 2022（含 "Desktop development with C++" 工作负载）

### 新功能

- **AI 对话历史持久化**：对话数据从浏览器 localStorage 迁移到 SQLite 数据库
  - 支持跨工作区隔离、大量对话存储、持久化搜索
  - 后端新增完整 CRUD 路由：`/api/ai/conversations`
  - 前端对话列表支持搜索过滤和重命名
- **AI 工作区上下文注入**：AI 助手现在了解你的故事世界
  - 自动加载当前工作区的角色、事件、伏笔、世界观作为对话上下文
  - 采用三段式消息结构，支持 DeepSeek KV 缓存优化，大幅降低 API 成本
- **AI 辅助创作增强**：新增 4 个一键创作功能
  - **事件续写**：基于事件上下文自动扩展描述
  - **角色对话**：生成两个角色之间的自然对话
  - **伏笔回收**：检测未回收伏笔并建议回收方式
  - **一致性检查**：检测时间矛盾、角色行为不一致等逻辑漏洞

### 技术改进

- 新增 `ai-context.ts`：AI 上下文构建工具 + Prompt 模板系统
- 后端 `ai_conversations` 表自动创建（DDL 兜底），老版本升级无感知
- 代码规范：新增 `docs/agents.md` 智能体编码指南

### 老版本更新

- v1.2.x 用户可正常自动更新到 v1.3.0
- 首次更新后，原有的 localStorage 对话数据会保留，新对话自动存入数据库

---

**完整更新日志**：[`更新日志.md`](./更新日志.md)
