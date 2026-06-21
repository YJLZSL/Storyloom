# Storyloom 文档导航

> **Storyloom · 织叙** — 把时间织成故事
>
> 版本：v1.0.0 | 最后更新：2026-06-22
>
> 不知道怎么开始？先看 [`快速开始.md`](./快速开始.md)。

---

## 🚀 我是新成员，第一次接触项目

**阅读顺序**：

1. 📖 [`快速开始.md`](./快速开始.md) — 5 分钟了解项目整体，克隆、安装、启动
2. 🔧 [`环境配置指南.md`](./环境配置指南.md) — 开发环境搭建（Node.js + Rust + VS BuildTools）
3. 🛠️ [`开发指南.md`](./开发指南.md) — 本地开发环境、调试命令、常见问题
4. 🏗️ [`架构设计.md`](./架构设计.md) — 技术栈、目录结构、数据流、状态管理

---

## 📦 我要发版

**阅读顺序**：

1. 🚀 [`发版指南.md`](./发版指南.md) — 标准发版 10 步流程，含自动更新调试
2. ⚠️ **特别提醒**：Tauri 产物为 `.exe` + `.sig`，`.sig` 是 `tauri-plugin-updater` 验证签名必需的！

**关键配置检查清单**（每次发版前必须确认）：

| # | 配置项 | 正确值 |
|---|--------|--------|
| 1 | `package.json#version` | 递增 |
| 2 | `src-tauri/tauri.conf.json#identifier` | `"com.storyloom.app"`（不可变更） |
| 3 | `src-tauri/tauri.conf.json#plugins.updater.endpoints` | `https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.json` |
| 4 | `src/components/settings/UpdateTab.tsx#REPO_RELEASES_URL` | `https://github.com/YJLZSL/Storyloom/releases` |
| 5 | `docs/发版指南.md` | 所有 URL 指向 `YJLZSL/Storyloom` |

---

## 🤖 我是 AI，接手开发任务

**阅读顺序**：

1. 🤖 [`docs/agents.md`](./agents.md) — **智能体编码指南** — 编码规范、项目结构、禁忌清单
2. 📋 [`项目交接.md`](./项目交接.md) — 项目全貌、已知问题、待办事项
3. 🗺️ [`路线图.md`](./路线图.md) — 未来版本规划与优先级
4. 🏗️ [`架构设计.md`](./架构设计.md) — 技术栈和模块架构
5. 🧠 [`AI集成指南.md`](./AI集成指南.md) — AI 深度集成实施指南

> ⚠️ **红线**：不读完 `agents.md` 和 `项目交接.md` 前，禁止修改任何代码。

---

## 📋 我想了解版本历史

- 📝 [`CHANGELOG.md`](../CHANGELOG.md) — v1.0.0 发布说明（根目录）
- 📝 [`更新日志.md`](../更新日志.md) — 全版本历史记录（根目录）
- 📁 `docs/_archive/` — 历史版本更新日志和交接文档归档

---

## 🔮 我想了解未来规划

- 🗺️ [`路线图.md`](./路线图.md) — v1.1.0+ 方向规划（稳定性/导出/体验升级）

---

## 📁 文档清单总览

| 文档 | 说明 | 适用人群 | 状态 |
|------|------|----------|------|
| [`快速开始.md`](./快速开始.md) | 5 分钟上手指南 | 所有新成员 | ✅ 最新 |
| [`环境配置指南.md`](./环境配置指南.md) | 开发环境搭建 | 新成员 / Windows 开发者 | ✅ 最新 |
| [`开发指南.md`](./开发指南.md) | 本地开发环境、调试 | 开发者 | ✅ 最新 |
| [`架构设计.md`](./架构设计.md) | 技术栈、目录结构、数据流 | 开发者、AI | ✅ 最新 |
| [`发版指南.md`](./发版指南.md) | 标准发版 10 步流程 | 发布者 | ✅ 最新 |
| [`项目交接.md`](./项目交接.md) | 项目交接说明 | AI | ✅ 最新 |
| [`agents.md`](./agents.md) | 智能体编码指南 | AI | ✅ 最新 |
| [`路线图.md`](./路线图.md) | 未来版本规划 | 产品、AI | ✅ 最新 |
| [`AI集成指南.md`](./AI集成指南.md) | AI 深度集成指南 | AI | ⚡ 部分已实施 |
| [`美术方案-v2.md`](./美术方案-v2.md) | 视觉架构方案 | 设计、AI | ✅ 最新 |
| [`更新日志.md`](../更新日志.md) | 全版本历史 | 所有人 | ✅ 最新 |

---

## ⚠️ 自动更新重要提醒

**每次发版必须同时上传 `.sig` 签名文件！**

Tauri 使用 `tauri-plugin-updater` 进行自动更新。构建完成后，Tauri 会自动生成 `.exe` 和同名 `.sig` 文件。`.sig` 文件是 updater 验证签名必需的，缺少此文件会导致更新验证失败。

`latest.json` 是 Tauri updater 的元数据文件（Electron 时代的 `latest.yml` 为历史遗留产物，不再使用）。

构建完成后，检查 `src-tauri/target/release/bundle/nsis/` 目录下是否生成了 `.exe` 和 `.sig` 文件，确认内容正确后一起上传到 GitHub Release。

---

## 🏗️ 构建验证

- TypeScript 编译：0 错误
- 单元测试：193 / 193 通过
- 构建产物：`src-tauri/target/release/bundle/nsis/Storyloom_1.0.0_x64-setup.exe`（约 ~27MB，Tauri 产物）
- 签名文件：`src-tauri/target/release/bundle/nsis/Storyloom_1.0.0_x64-setup.exe.sig`

---

*所有文档均为中文命名。本文档基于 v1.0.0，最后更新：2026-06-22。*
