# Storyloom 项目文档索引

> **仓库地址**：`https://github.com/YJLZSL/Storyloom`
> **版本**：v1.1.7
> **最后更新**：2026-06-22

---

## 快速导航

| 文档 | 说明 | 路径 |
|------|------|------|
| **快速开始** | 新成员上手指南 | [`docs/QUICKSTART.md`](./QUICKSTART.md) |
| **开发指南** | 本地开发环境搭建与调试 | [`docs/DEVELOPMENT.md`](./DEVELOPMENT.md) |
| **发版指南** | 标准发版流程（10步） | [`docs/RELEASING.md`](./RELEASING.md) |
| **更新日志** | v1.1.7 完整更新内容 | [`docs/CHANGELOG-v1.1.7.md`](./CHANGELOG-v1.1.7.md) |
| **总更新日志** | 全版本历史记录 | [`CHANGELOG.md`](../CHANGELOG.md) |
| **系统架构** | 技术栈与模块架构 | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **交接文档** | 项目交接给下一个 AI 的说明 | [`docs/HANDOVER.md`](./HANDOVER.md) |

---

## 文档分类

### 开发相关
- `docs/QUICKSTART.md` — 新成员快速上手，5 分钟了解项目
- `docs/DEVELOPMENT.md` — 本地开发环境、调试命令、常见问题
- `docs/ARCHITECTURE.md` — 技术栈、目录结构、数据流、状态管理
- `docs/RELEASING.md` — 标准发版流程（10步），含自动更新调试指南

### 版本记录
- `CHANGELOG.md` — 全版本历史（根目录）
- `docs/CHANGELOG-v1.1.7.md` — v1.1.7 详细更新日志（当前版本）
- `docs/CHANGELOG-v1.1.6.md` — v1.1.6 详细更新日志
- `docs/CHANGELOG-v1.1.5.md` — v1.1.5 详细更新日志

### 教程文档（应用内置）
应用通过 `import.meta.glob('/public/tutorials/*.md')` 读取教程文件，所有教程存放在 `public/tutorials/` 目录：

- `public/tutorials/getting-started.md` — 入门指南
- `public/tutorials/timeline-view.md` — 时间轴视图
- `public/tutorials/outline-view.md` — 大纲视图
- `public/tutorials/tree-view.md` — 树状视图
- `public/tutorials/relationship-graph.md` — 关系图
- `public/tutorials/script-editor.md` — 剧本编辑器
- `public/tutorials/branch-map.md` — 分支地图
- `public/tutorials/ai-panel.md` — AI 面板
- `public/tutorials/command-palette.md` — 命令面板
- `public/tutorials/themes-and-focus.md` — 主题与专注模式
- `public/tutorials/auto-backup-and-export-webgal.md` — 自动备份与导出 WebGAL
- `public/tutorials/shortcuts.md` — 快捷键参考
- `public/tutorials/workspace.md` — 工作区管理

> **注意**：`docs/tutorials/` 目录已删除（与 `public/tutorials/` 重复）。`public/tutorials/` 是唯一的权威源。

---

## 关键配置检查清单

每次发版前必须确认以下配置：

1. `package.json#version` — 版本号递增
2. `package.json#build.publish.owner` — 必须是 `"YJLZSL"`（⚠️ 曾错误改为 `liteli1987gmail`，已修正）
3. `package.json#build.publish.repo` — 必须是 `"Storyloom"`
4. `src/components/settings/UpdateTab.tsx#REPO_RELEASES_URL` — 必须指向 `https://github.com/YJLZSL/Storyloom/releases`
5. `docs/RELEASING.md` — 所有 URL 必须指向 `YJLZSL/Storyloom`

---

## 已清理的过期文件（v1.1.5 清理记录）

### 删除的文档
- `docs/CHANGELOG-v1.1.2.md` — 已合并到 v1.1.5
- `docs/CHANGELOG-v1.1.3.md` — 已合并到 v1.1.5
- `docs/KNOWN_ISSUES.md` — 基于 v1.1.0 分析，已过时
- `docs/plan-v1.1.5.md` — 临时计划文档
- `docs/design-v2.md` — 临时设计文档
- `plan-v2.md` / `plan-v3.5.md` / `plan.md` — 过时计划文件

### 删除的目录
- `docs/tutorials/` — 与 `public/tutorials/` 重复，已删除
- `reports/` — 过时调研报告（architecture-analysis.md, competitor-analysis.md, project-survey.md）
- `.trae/` — 编辑器配置，已加入 .gitignore
- `D:AIKFCCStoryloomreports/` — 错误路径的目录

### 删除的临时文件
- `test_workspace.json` — 测试数据
- `tsconfig.app.tsbuildinfo` — TypeScript 构建缓存（已加入 .gitignore）
- `tsconfig.temp-check.json` — 临时文件
- `test-npm-list.sh` / `npm-wrapper.sh` — 临时脚本
- `dev.log` / `server.log` — 开发日志（已加入 .gitignore）
- `screenshot-*.png` — 截图文件（已加入 .gitignore）

### 删除的过时测试脚本
- `scripts/comprehensive_v1_0_0_test.py`
- `scripts/capture_console.py`
- `scripts/capture_task2_screenshots.py`
- `scripts/debug_outline_edit.py`
- `scripts/inspect_db.js`
- `scripts/smoke_api_v1_0_1.mjs`
- `scripts/task8_browser_audit.py`
- `scripts/uiux_walkthrough_v1_0_1.py`
- `scripts/v1_0_0_regression.py`
- `scripts/v1_3_visual_regression.py`
- `scripts/v1_4_tdesign_regression.py`
- `scripts/v4_2_regression.py`
- `scripts/visual_browser_smoke.py`

### 保留的构建脚本
- `scripts/build-nsis.cjs` — NSIS 安装包构建
- `scripts/build-release.bat` — 发布构建批处理
- `scripts/clean-release.ps1` — 清理发布目录
- `scripts/cleanup_garbled_workspaces.js` — 修复数据脚本
- `scripts/generate-storyloom-icons.py` — 图标生成

---

## 构建验证

- TypeScript 编译：0 错误
- 单元测试：193/193 通过
- 构建产物：`release/Storyloom-Setup-1.1.7.exe`（已签名）
- `release/latest.yml`：`version: 1.1.7`，`url: Storyloom-Setup-1.1.7.exe`

---

## 历史版本安装包

旧版本安装包已清理，仅保留当前版本：
- `release/Storyloom-Setup-1.1.7.exe` + `.blockmap` + `latest.yml`

---

*本文档是 Storyloom 项目的入口文档，所有其他文档应通过本索引访问。*
