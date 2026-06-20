# Storyloom · 絮织

> *Weave timelines into living stories.*

[![version](https://img.shields.io/badge/version-v1.0.0-amber)](https://github.com/YJLZSL/Storyloom/releases/tag/v1.0.0)
[![status](https://img.shields.io/badge/status-active-brightgreen)](https://github.com/YJLZSL/Storyloom)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![electron](https://img.shields.io/badge/electron-42-47848F)](https://www.electronjs.org/)
[![react](https://img.shields.io/badge/react-19-61DAFB)](https://react.dev/)

Storyloom（絮织）是一款面向 **视觉小说 / 长篇小说 / 剧本创作者** 的本地桌面创作工作台。它把"故事"看作一台织机：以多视图时间轴（timeline / outline / narrative / gantt / tree / stats / relationship）为经，以角色与世界观、伏笔追踪、AI 写作助手为纬，最终可一键导出到主流 Visual Novel 引擎。整个应用以 Electron 打包，内置 Fastify + SQLite 服务端与 electron-updater 自动更新链路，离线优先、数据本地。本仓库托管完整源码、构建脚本与发版资产。

## v1.0.0 重大更新

- **统一设计系统**：全面整合 TDesign 组件库，消除 3 套弹窗/按钮/输入框混用
- **调色板集中化**：68 处硬编码颜色全部迁移到 `src/lib/colors.ts` 设计令牌
- **图标统一**：14 个文件的 lucide-react 图标全部迁移到 `@icon-park/react`
- **共享组件**：新增 EmptyState、LoadingState、SettingsRow 统一组件
- **主题完善**：动态主题预览、sonner 主题同步、SideNav 暗色判定修复
- **新增 IPC**：`getUserDataPath` API，设置页显示真实用户数据路径
- **教程大全**：完成 13 篇用户教程，覆盖全部核心功能

## Quick Start

```bash
npm install
npm run dev          # 浏览器开发模式
npm run dev:electron # Electron 开发模式
npm run build        # 前端构建
npm run dist         # 完整 Windows 安装包
```

## 文档

- [`CHANGELOG.md`](./CHANGELOG.md) — 全部版本历史与归档说明
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 模块拓扑与代码地图
- [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) — 本地开发与常见坑
- [`docs/RELEASING.md`](./docs/RELEASING.md) — 标准发版流程
- [`docs/tutorials/`](./docs/tutorials/) — 用户教程大全（入门指南、各视图详解、快捷键、AI 助手等）
- [`docs/audit/`](./docs/audit/) — 代码异味、品牌决策等审计资料
- [`.trae/documents/handoff-frontend-aesthetics.md`](./.trae/documents/handoff-frontend-aesthetics.md) — 前端重构交接文档

## License

MIT © Storyloom 团队 · 2026
