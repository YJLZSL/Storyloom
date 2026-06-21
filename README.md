# Storyloom · 絮织

> *Weave timelines into living stories.*

[![version](https://img.shields.io/badge/version-v1.2.0-amber)](https://github.com/YJLZSL/Storyloom/releases/tag/v1.2.0)
[![status](https://img.shields.io/badge/status-active-brightgreen)](https://github.com/YJLZSL/Storyloom)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![electron](https://img.shields.io/badge/electron-42-47848F)](https://www.electronjs.org/)
[![react](https://img.shields.io/badge/react-19-61DAFB)](https://react.dev/)

Storyloom（絮织）是一款面向 **视觉小说 / 长篇小说 / 剧本创作者** 的本地桌面创作工作台。它把"故事"看作一台织机：以多视图时间轴（timeline / outline / narrative / gantt / tree / stats / relationship）为经，以角色与世界观、伏笔追踪、AI 写作助手为纬，最终可一键导出到主流 Visual Novel 引擎。整个应用以 Electron 打包，内置 Fastify + SQLite 服务端与 electron-updater 自动更新链路，离线优先、数据本地。本仓库托管完整源码、构建脚本与发版资产。

## v1.0.0 设计升级

- **织机隐喻界面**：EmptyShell 三栏布局 + 织机 SVG 动画 + 温暖品牌视觉
- **织线卡片设计**：时间轴事件卡片左侧色条 + 织线虚线边框 + 毛玻璃背景
- **沉浸时间轴**：双层网格背景（大格套小格）+ 纹理叠加 + 精致轨道头
- **流畅动效**：Framer Motion 视图切换动画 + 骨架屏 shimmer + 命令面板 Spotlight 风格
- **关系图升级**：节点阴影 + Hover 放大 + 主题色连线
- **统一设计系统**：TDesign 组件库 + 6 套主题 + 集中调色板
- **Zen Mode 专注写作**：全屏沉浸式编辑，对标 novelWriter
- **API Hooks 工厂化**：`createEntityHooks` 工厂函数，消除 452 行重复代码
- **全面测试覆盖**：193 个测试用例，覆盖 Store、Lib 工具、共享组件
- **完整国际化**：en-US / zh-CN 双语言支持，60+ 翻译键
- **架构优化**：Store 状态统一，消除双向耦合

## Quick Start

```bash
npm install
npm run dev          # 浏览器开发模式
npm run dev:electron # Electron 开发模式
npm run build        # 前端构建
npm run dist         # 完整 Windows 安装包
```

## 文档

- [`更新日志.md`](./更新日志.md) — 全部版本历史与归档说明
- [`docs/架构设计.md`](./docs/架构设计.md) — 模块拓扑与代码地图
- [`docs/开发指南.md`](./docs/开发指南.md) — 本地开发与常见坑
- [`docs/发版指南.md`](./docs/发版指南.md) — 标准发版流程
- [`docs/README.md`](./docs/README.md) — 文档导航大全
- [`.trae/documents/handoff-frontend-aesthetics.md`](./.trae/documents/handoff-frontend-aesthetics.md) — 前端重构交接文档

## License

MIT © Storyloom 团队 · 2026
