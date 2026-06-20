# 移交说明 · v3.0 → v3.x 起点

> 交接时间：2026-06-20
> 交接对象：下一位维护者 / 下一段对话的 AI
> 前置状态：Storyloom v3.0.0 已发布 — 仓库整理 / 首启 UX / 创建工作区 bug 全部完成
> 前置阅读（按顺序）：
> 1. [`README.md`](../../README.md) — 项目定位
> 2. [`CHANGELOG.md`](../../CHANGELOG.md) — 全部版本历史
> 3. [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — 四大模块拓扑
> 4. [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md) — 本地起步与常见坑
> 5. [`docs/RELEASING.md`](../../docs/RELEASING.md) — 发版流程
> 6. [`docs/release-notes-v3_0.md`](../../docs/release-notes-v3_0.md) — v3.0 详细说明

---

## 1. 项目当前状态

| 维度 | 状态 |
|---|---|
| 版本 | v3.0.0（已发布，含 NSIS 安装包 + electron-updater 链路） |
| 主分支 | `master` 与 `origin/master` 同步 |
| 质量门 | `npm run typecheck` / `test` / `build` 全部 ✅ |
| 文档 | 主线 4 份参考文档活跃；其余历史文档全部归档至 `_archive/` |
| Releases | v3.0.0 (Latest) + v2.0.2 + 8 个 `[ARCHIVED]` 老 release |
| GitHub repo | `YJLZSL/Storyloom`，description / topics 已同步 v3.0 |
| 数据兼容 | `data/storyloom.db` schema 不变；v2.x 用户平滑升级 |

---

## 2. 本轮（v3.0.0）成果速览

详见 [release-notes-v3_0.md](../../docs/release-notes-v3_0.md)。一句话：**两个真 bug 修了 + 文档大清洗 + 重写参考文档 + 把 Releases 列表整理清爽**。

---

## 3. 你接下来该做什么

### P0 — 必须先确认的环境

```bash
git pull origin master         # 同步 v3.0.0 commit + tag
npm install                    # 同步 lockfile
npm run typecheck && npm run test && npm run build  # 三连必须全绿
npm run dev:electron           # 实测启动一次 Electron 看看首启 UX
```

### P1 — v3.x 主菜单候选

按价值/成本排序，建议从上往下挑：

#### 候选 A：抽 `EntityPanel<T>`（来自 `docs/audit/code-smells.md` #2，**强烈推荐**）

`CharacterPanel` (491 行) / `WorldBuildingPanel` (462 行) / `ForeshadowingPanel` (697 行) 三者高度同构（搜索/过滤/CRUD/卡片 grid/右键菜单/selection store 联动），但被抄了三份。

- 建立 `src/components/_shared/EntityPanel/`
- 通用 `EntityPanel<T>` 骨架 + `useEntityFilters<T>` Hook
- 三个面板都改成调用骨架
- 预计减少 ~600 行重复代码，统一未来"再加新领域面板"的成本

#### 候选 B：拆分 OutlineView.tsx（来自 code-smells #1）

`OutlineView.tsx` 904 行单文件承担 5 件事。建议拆为：
- `OutlineEditorDrawer.tsx`
- `OutlineFilters.tsx`
- `useOutlineQueries.ts`
- 主 `OutlineView.tsx` 收敛到 < 300 行编排

#### 候选 C：AI 配置入库

当前 AI 配置（OpenAI / Anthropic API key 等）只存在 `useSettingsStore` 的 localStorage 中。计划：
- 新增 server `/api/ai-config` 路由
- drizzle migration 加 `ai_configs` 表
- 前端 settings dialog 改成读写 server

#### 候选 D：体验性增强

- 主题选择卡片增加预览文字对比度
- 命令面板 fuzzy 权重
- TimelineMinimap 空状态提示
- ImportDialog / ExportDialog 接入 TDesign `TUpload` 拖放区

---

## 4. 关键文件索引（v3.0 增量）

### 新增

| 用途 | 路径 |
|---|---|
| EmptyShell 极简首启布局 | [`src/components/layout/EmptyShell.tsx`](../../src/components/layout/EmptyShell.tsx) |
| v3.0 spec | [`.trae/specs/cleanup-and-firstrun-fix-v3_0_0/`](../specs/cleanup-and-firstrun-fix-v3_0_0/) |
| v3.0 release-notes | [`docs/release-notes-v3_0.md`](../../docs/release-notes-v3_0.md) |
| 项目 README（重写） | [`README.md`](../../README.md) |
| 全部版本 CHANGELOG | [`CHANGELOG.md`](../../CHANGELOG.md) |
| 架构与代码地图 | [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) |
| 本地开发指南 | [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md) |
| 发版指南 | [`docs/RELEASING.md`](../../docs/RELEASING.md) |

### 修改

| 路径 | 变更 |
|---|---|
| `src/components/layout/AppShell.tsx` | 在 hooks 之后增加 `if (!currentWorkspaceId) return <EmptyShell />` 早返；`MainCanvas` 内部 if 移除 |
| `src/components/workspace/CreateWorkspaceDialog.tsx` | catch 改为显式 `toast.error`；finally 复位 applying；onConfirm 包 void |
| `package.json` | version 2.0.2 → 3.0.0 |
| `docs/audit/*.md` | 4 份去 `-v2_0` 后缀；加最后更新元信息；code-smells 加 v3.0 状态段 |
| `scripts/generate-storyloom-icons.py` | docstring 加 "replaces legacy generate-icon.py removed in v3.0" |

### 删除

| 路径 | 原因 |
|---|---|
| `scripts/generate-icon.py` | v1.x 视觉脚本，已被 generate-storyloom-icons.py 取代 |

### 归档（不删，仅移位）

| 区域 | 数量 |
|---|---:|
| `.trae/specs/_archive/` | 20 个老 spec |
| `.trae/documents/_archive/` | 8 份历史 handoff / plan |
| `docs/_archive/` | 15 份历史 .md |
| `docs/_archive/release-notes/` | 3 份 v2.x release-notes |
| `docs/screenshots/_archive/` | luosheng-research / v1.3 / v1.4 历史截图 |

---

## 5. 已知保留事项（v3.0 仍故意没改）

继承自 v2.0：

| 位置 | 现值 | 为什么保留 | 何时迁移 |
|---|---|---|---|
| `package.json#build.appId` | `com.ai.timeline-creator` | electron-updater 用此 ID 识别老版本，**永久保留** | 无 — 已成为约定 |

新出现的：

| 位置 | 现值 | 为什么保留 |
|---|---|---|
| OutlineView.tsx 内 3 处对象 JSON.parse | 就地写法 | 抽 OutlineView 时一并治理更稳妥（候选 B） |

---

## 6. 起步检查清单

接手第一天，请按顺序完成：

- [ ] `cd "d:\AIKFCC\Storyloom"`，`git status` 清洁
- [ ] `git pull origin master` 同步 v3.0.0 commit + tag
- [ ] `npm install` 同步依赖
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 通过（3 文件 12 用例）
- [ ] `npm run build` 通过
- [ ] `npm run dev:electron` 启动 Electron — 首启时只看到品牌条 + WorkspaceSelector，无 toolbar/sidenav/statusbar
- [ ] 通读上面"前置阅读"6 份文档
- [ ] 阅读 `docs/audit/code-smells.md` Top 5 表，挑一个 v3.x 主菜单（推荐候选 A）

完成上述后，正式开干。

---

> v3.0 — 一团乱后的重新出发。第三根纬线已经穿好，下一根经线，由你接续。
