# 仓库冗余审计报告

> 最后更新：v3.0.0
> 范围：v2.0 时点抓取的冗余清单；v3.0 已完成大量目录归档与文档重写，但代码层冗余仍以本文记录为准

抓取时间：2026-06-19
执行者：Spec-Mode 维护代理（rebrand-finalize-handoff-v2_0 Task 3）
关联文档：[`baseline-v2_0.md`](../_archive/audit-baseline.md)、[`brand-decision-v2_0.md`](./brand-decision.md)

## 审计范围

1. 仓库根目录散落的临时/调试 PNG（v1.4 TDesign 打磨阶段产物）
2. `tmp/screenshots/v1.4-fix*` 调试快照目录（最终版已迁入 `docs/screenshots/v1.4-tdesign/`）
3. `src/` 候选源码文件的引用情况（抽查 5–10 个 .ts/.tsx）
4. `docs/` 多版本「接手指南」/历史报告的冗余度
5. 构建产物（`dist/` / `electron-out/` / `release/`）、日志（`*.log` / `error_dump_*` / `*.bak`）

---

## ① 可安全删除（safe to delete）

下列条目为本轮 Task 3 自动删除目标。其内容已被规范版本覆盖，且未被任何代码/文档/构建脚本引用。

| # | 路径 | 数量/估算 | 删除理由 |
|---|---|---|---|
| 1 | `ai-panel-after-click.png` / `ai-panel-click2.png` / `ai-panel-find.png` / `ai-panel-open.png` / `ai-panel-open2.png` / `ai-panel-wide.png` / `ai-workspace-selection.png` | 7 个，根目录 PNG | v1.4 AI 面板调试时的散落截图，最终版已存于 `docs/screenshots/v1.4-tdesign/17-ai-panel.png`；根目录无任何 .md / .ts / .json 引用 |
| 2 | `characters-panel.png` / `characters-with-card.png` | 2 个，根目录 PNG | 角色面板调试快照，正式版已并入 v1.4-tdesign 截图集；根目录引用为 0 |
| 3 | `worldview-panel.png` / `worldview-with-card.png` | 2 个，根目录 PNG | 世界观面板调试快照，同上 |
| 4 | `foreshadowing-panel.png` | 1 个，根目录 PNG | 伏笔面板调试快照，同上 |
| 5 | `tmp/screenshots/v1.4-fix/` | 23 个 PNG | v1.4 TDesign 打磨第 1 轮调试快照，最终采用版已迁入 `docs/screenshots/v1.4-tdesign/` |
| 6 | `tmp/screenshots/v1.4-fix2/` | 23 个 PNG | v1.4 TDesign 打磨第 2 轮调试快照，同上 |
| 7 | `tmp/screenshots/v1.4-fix3/` | 31 个 PNG（含 `*-crop.png` / `*-crop2.png` 等多次裁切） | v1.4 TDesign 打磨第 3 轮调试快照，含裁切实验稿，已被最终版替代 |

> 备注：`error_dump_*` / `*.log` / `*.bak` 经全仓扫描均不存在；`.gitignore` 已将 `*.log` / `dist/` / `electron-out/` / `release/` / `*.blockmap` 等列入忽略名单，本轮无需处理。

**条目数：7 类，共 89 个文件**（不含已不存在的日志/dump/bak）。

## ② 待二次确认（needs confirmation）

下列条目可能仍有价值，**本轮不删除**，建议下一位维护者根据交付节奏再决定。

| # | 路径 | 数量/估算 | 待确认理由 |
|---|---|---|---|
| 1 | `docs/AI接手开发指南.md` | 单文件，约 10 KB+ | 仍被 v1.2 / v1.3 指南引用为「代码导航 / 状态管理 / 构建陷阱 / 6 主题」通用参考；其文首已声明「v1.2 起请优先阅读 v1.2 指南」。**v2.0 完成后**若已写出统一的 v2.0 指南，则此文件可整段并入并删除；当前仍是有效底座，暂保留 |
| 2 | `docs/接手开发指南 v1.2-roadmap-backend-and-frontend.md` | 单文件 | v1.2 后端实施已完成，v1.3 已接管剩余任务。文件本身仍被 v1.3 指南 §1.1 列为「上游必读」。**若 v2.0 指南落地并显式覆盖 §2.1–§2.7 全部内容**，可在 v2.0 发布后归档/删除；当前不动 |
| 3 | `docs/测试报告 v1.1.0.md` | 单文件 | v1.1.0 已发布为 GitHub Release，但报告内的测试数据可能在 v2.0 测试报告中被合并。建议在 v2.0 测试报告写出后再归档 |
| 4 | `docs/screenshots/luosheng-research/`（约 50 个 bili_*.png + 2 个 .json + 2 个洛笙截图） | 50+ 文件 | 视觉对标素材库（B 站洛笙时间轴/世界观/伏笔等截图），v1.4 TDesign 已落地核心交互；若后续视觉迭代不再对标洛笙可一次性清理；当前保留作为视觉决策证据 |

**条目数：4 项**。

## ③ 保留并标注（keep with rationale）

| # | 路径 | 保留理由 |
|---|---|---|
| 1 | `docs/screenshots/v1.3-continue-after/` | v1.3 视觉 AI 完成的最终交付截图，被 `视觉 AI 接手指南.md` §「✅ v1.3-continue 视觉 AI 已完成」与文档变更日志显式引用，作为发布证据保留 |
| 2 | `docs/screenshots/v1.4-tdesign/` | v1.4 TDesign 阶段最终交付截图，含 README 与 6 主题时间轴；为本轮 v2.0 基线快照的视觉证据，必须保留 |
| 3 | `docs/接手开发指南 v1.3-remaining-backend-and-frontend.md` | v1.3 阶段总入口，明确说明剩余后端 §2.6/§2.10/§2.11 + 前端缺陷；在 v2.0 指南尚未取代它之前为唯一权威路线 |
| 4 | `docs/视觉 AI 接手指南.md` | 视觉对标 + 前端缺陷打磨主入口，仍被 README / v1.2 指南 / v1.3 指南交叉引用 |
| 5 | `docs/超长期开发路线图 v1.1.0+.md` | 「8 件事」长期路线图，被三份接手指南引用为定位锚点 |
| 6 | `data/.gitkeep` / `server/db/.gitkeep` 等 | 占位文件，确保空目录入库；不可删 |

**条目数：6 项**。

---

## 已执行的实际删除

本轮按「① 可安全删除」清单全部执行，使用 `DeleteFile` 工具逐项删除，不调用 shell `rm`。

- 根目录 12 个调试 PNG（ai-panel-* / characters-* / worldview-* / foreshadowing-* / ai-workspace-selection.png）
- `tmp/screenshots/v1.4-fix/`：23 个 PNG
- `tmp/screenshots/v1.4-fix2/`：23 个 PNG
- `tmp/screenshots/v1.4-fix3/`：31 个 PNG

**实际删除文件总数：89 个**（目录壳 `tmp/screenshots/v1.4-fix*` 在最后一个文件被删除后由系统自动清理，或保留为空目录待后续 git 提交移除；本工具仅删除文件不删目录）。

---

## 抽查的 src/ 源码引用结论（Task 3 第 3 步）

抽查 10 个候选文件，全部至少被一处引入，**未发现死代码**：

| 候选文件 | 引用方 |
|---|---|
| `src/components/consistency/ConsistencyPanel.tsx` | `src/components/layout/ContextPanel.tsx` |
| `src/components/foreshadowing/ForeshadowingBoard.tsx` | `ForeshadowingPanel.tsx` L35 / L308 |
| `src/components/foreshadowing/ForeshadowingGraph.tsx` | `ForeshadowingPanel.tsx` L36 / L315 |
| `src/components/relationship-graph/RelationshipGraph.tsx` | `RelationshipView.tsx` |
| `src/components/timeline/GanttTimelineView.tsx` | `AppShell.tsx` L16 / L45 |
| `src/components/timeline/TreeTimelineView.tsx` | `AppShell.tsx` L17 / L47 |
| `src/components/workspace/ChapterRail.tsx` | `WorkspaceSelector.tsx` |
| `src/components/connection/ConnectionPanel.tsx` | `ContextPanel.tsx` |
| `src/lib/consistency-check.ts` | `ConsistencyPanel.tsx` |
| `src/lib/apply-template.ts` | `CreateWorkspaceDialog.tsx` |
| `src/lib/word-count.ts` | `StatusBar.tsx` |
| `src/components/stats/StatsView.tsx` | `AppShell.tsx` |
| `src/components/system/UpdateNotifier.tsx` | `App.tsx` |

> 结论：`src/` 当前不存在可直接删除的孤立模块；本轮不修改源码。

---

## 汇总

| 分类 | 条目数 | 说明 |
|---|---|---|
| 可安全删除 | 7 类 / 89 文件 | 已全部执行删除 |
| 待二次确认 | 4 项 | 跨 v2.0 发布节点再评估 |
| 保留并标注 | 6 项 | 写入指南/证据链，不可删 |
| 实际删除文件总数 | **89** | 调试 PNG + tmp 调试快照三轮 |
