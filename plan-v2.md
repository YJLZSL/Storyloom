# Storyloom 全面重构与发布计划 · v2.0

## 目标

对 Storyloom 进行系统性调研、排查、打磨、重构、测试、构建、发布。涉及：
1. 全面调研与竞品对比
2. 代码架构优化与问题排查
3. 前端 UI/UX 深度打磨
4. 国际化/本地化审计
5. 测试流程建立与执行
6. 构建 NSIS 安装程序
7. 文档更新与 GitHub 仓库刷新

## 阶段划分

### Phase 1: 并行调研（3 个 Agent 同时执行）

| Agent | 角色 | 任务 | 输出 |
|-------|------|------|------|
| **调研员_A** | 项目全面调研员 | 调研 Storyloom 项目的所有方面：技术栈、架构、功能、数据模型、依赖、构建流程、已知问题 | `reports/project-survey.md` |
| **调研员_B** | 竞品对比分析员 | 调研同类开源项目（narrative/timeline/story-planning tools），对比功能、技术栈、UI/UX、社区活跃度 | `reports/competitor-analysis.md` |
| **调研员_C** | 代码架构分析员 | 使用 code-arch-optimizer 方法分析代码库，识别架构摩擦点、深/浅模块、耦合问题、可测试性缺陷 | `reports/architecture-analysis.md` |

**Phase 1 输出**：
- `reports/project-survey.md` — 项目全景图
- `reports/competitor-analysis.md` — 竞品对比报告
- `reports/architecture-analysis.md` — 架构问题诊断

### Phase 2: 并行打磨与重构（4 个 Agent 同时执行）

基于 Phase 1 输出，并行执行：

| Agent | 角色 | 任务 | 输入 | 输出 |
|-------|------|------|------|------|
| **打磨员_A** | UI/UX 设计师 | 基于调研结果，进一步打磨前端 UI/UX：时间轴视图、面板、卡片、动效、空状态、主题系统 | 所有 Phase 1 报告 | 修改后的 .tsx/.css 文件 |
| **打磨员_B** | 架构重构工程师 | 基于 architecture-analysis，执行架构重构：模块拆分、接口设计、代码清理 | `reports/architecture-analysis.md` | 重构后的代码 |
| **打磨员_C** | 国际化工程师 | 使用 locale-guard 审计并修复 i18n 问题：硬编码字符串、翻译键、语言文件覆盖 | 当前代码库 | 修复后的 i18n 代码 |
| **打磨员_D** | 测试工程师 | 使用 software-testing-guide 建立测试流程：测试用例、缺陷追踪、质量指标 | 当前代码库 | 测试文档 + 执行结果 |

### Phase 3: 构建与发布（主代理执行）

1. 构建前端 + 后端 + Electron
2. 修复 NSIS 构建问题（PowerShell 环境）
3. 生成安装程序
4. 更新 README、CHANGELOG、文档
5. 推送到 GitHub
6. 创建 Release 并上传安装程序
7. 更新 GitHub 仓库描述

### Phase 4: 验证与收尾

1. 测试安装程序
2. 验证所有功能
3. 最终文档检查
4. 归档过期文档

## 文件传播（A2A）

```
Phase 1 输出 → Phase 2 输入
  ├── reports/project-survey.md → 所有打磨 Agent
  ├── reports/competitor-analysis.md → 打磨员_A
  └── reports/architecture-analysis.md → 打磨员_B

Phase 2 输出 → Phase 3 输入
  └── 所有修改后的代码文件 → 主代理构建
```

## 当前状态

- 代码已推送到 GitHub master
- Tag v1.0 已创建
- 前端/后端/Electron 构建成功
- NSIS 安装程序构建卡在 PowerShell 环境问题
- 已应用 UI/UX 改进（card-lift, btn-lift, input-glow, weave-border, loom-warp）

## 技能加载计划

| 阶段 | 技能 | 用途 |
|------|------|------|
| Phase 1 | `code-arch-optimizer` | 代码架构分析 |
| Phase 1 | `kimi-skills-finder` | 发现额外有用技能 |
| Phase 2 | `ui-blueprint` | UI/UX 设计系统提取 |
| Phase 2 | `theme-kit` | 主题样式优化 |
| Phase 2 | `interface-design-lab` | 接口设计优化 |
| Phase 2 | `locale-guard` | 国际化审计 |
| Phase 2 | `software-testing-guide` | 测试流程建立 |
| Phase 2 | `humanizer-zh` | 文案去 AI 痕迹 |
| Phase 3 | `github` | 仓库管理 |
| Phase 3 | `kimi-webbridge` | 上传 Release |

## 重要约束

- 所有工作只在 `D:\AIKFCC\Storyloom` 目录
- 每阶段完成后必须 `typecheck + test + build` 全绿
- 并行 Agent 之间不共享输出（使用文件传递）
- 最终交付物：安装程序 + 更新文档 + GitHub Release

---

> 计划制定时间：当前会话
> 执行顺序：Phase 1 → Phase 2 → Phase 3 → Phase 4
> Phase 1 和 Phase 2 内部使用并行 Agent
