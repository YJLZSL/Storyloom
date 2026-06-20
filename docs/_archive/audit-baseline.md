# 仓库基线快照

> 最后更新：v3.0.0
> 范围：截至 v3.0 时点的代码与决策
> 历史定版：本快照源自 v2.0 时点抓取，v3.0 仍延用其结构性结论；如与代码不符以代码为准。

抓取时间：2026-06-19
执行者：Spec-Mode 维护代理（rebrand-finalize-handoff-v2_0）

## Git 状态

| 项 | 值 |
|---|---|
| 远端 | `https://github.com/YJLZSL/AI-Timeline-Creator.git` |
| 默认分支 | `master` |
| HEAD | `04b9d88 2026-06-19 19:29:03 +0800 feat(ui): settings dialog + continuous zoom + selection coherence + tutorial skeleton; test(visual): browser screenshots` |
| 工作区状态 | 28 个文件 modified（v1.4 TDesign 打磨成果，未提交） + 1 个 untracked PNG（`ai-panel-after-click.png`，待清理） |
| `package.json#version` | `1.1.0`（本轮将升至 `2.0.0`） |

## 待提交的修改（v1.4 TDesign 阶段成果）

- `docs/文档变更日志.md`、`docs/视觉 AI 接手指南.md`
- `src/components/ai-panel/*`（5 个文件）
- `src/components/characters/CharacterPanel.tsx`
- `src/components/command-palette/CommandPalette.tsx`
- `src/components/connection/ConnectionPanel.tsx`
- `src/components/foreshadowing/ForeshadowingPanel.tsx`
- `src/components/layout/*`（5 个文件）
- `src/components/outline/OutlineView.tsx`
- `src/components/settings/*`（3 个文件）
- `src/components/timeline/*`（4 个文件）
- `src/components/ui-tdesign/index.tsx`
- `src/components/worldbuilding/WorldBuildingPanel.tsx`
- `src/index.css`、`src/lib/icons.ts`、`src/main.tsx`

## 一级目录概览

```
data/                    SQLite 数据目录（gitkeep）
docs/                    文档（含 screenshots/、audit/）
electron/                Electron 主进程
public/                  静态资源（含 favicon、tutorials/）
scripts/                 工具脚本（含回归测试 .py、build .ps1）
server/                  Fastify 后端（routes/services/plugins）
shared/                  前后端共享类型
src/                     React 前端
  components/            视图组件（按职能分目录）
  hooks/ lib/ services/ stores/ styles/ test/ types/ utils/
tmp/screenshots/         临时调试截图（v1.4-fix / fix2 / fix3） ← 待清理
.trae/specs/             20+ 个历史 spec
.trae/documents/         移交文档
```

## 根目录散落资源（候选清理）

- 11 个未跟踪 PNG（`ai-panel-*.png`、`worldview-*.png`、`characters-*.png` 等）— 早期人工调试截图
- `tmp/screenshots/v1.4-fix*` 三套调试截图（约 70 张），最终成果已迁移到 `docs/screenshots/v1.4-tdesign/`

## 构建状态

- `npm run typecheck`: 上一轮已通过（v1.4 收尾时记录）
- `npm run build`: 上一轮已通过（29.97s）
- 本轮在改名/清理后将重新验证

## Spec 谱系

本 spec 的前置：
- `frontend-polish-luosheng-v1_4`（已完结）→ 给本 spec 提供 TDesign 化的稳定前端
- `cleanup-docs-and-visual-ai-handoff` / `cleanup-repo-descriptions-v4_1_2`（已完结）→ 文档清理基底
