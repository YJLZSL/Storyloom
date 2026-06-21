# Storyloom v1.1.0 开发交接文档

> 生成时间：2026-06-22
> 状态：**P0 Bug 已修复，前端重构进行中（被中断）**
> 目的：让下一个 AI 无缝接手，继续推进前端重构和美术提升

---

## 一、本轮已完成的工作

### 1.1 项目文档大整理 ✅

**根目录清理**：从 15 个 markdown 文件精简到 3 个（CHANGELOG / README / 更新日志）。

**docs 目录清理**：21 个过时文档归档至 `docs/_archive/`，包括：
- 11 个旧版本更新日志（v1.1.5 — v1.5.0）
- 2 个旧交接文档（交接-v1.2.0、工作区与时间轴重构蓝图）
- 旧路线图（路线图-v1.3+.md）、旧重构方案（重构方案-v1.5.0.md）
- 3 个根目录 release-notes 文件
- 5 套冗余签名密钥（归档至 `docs/_archive/signing-keys/`）

**新建文档**：
- `docs/路线图.md` — 全新的 v1.1.0+ 版本规划
- `docs/agents.md` — 完全重写，准确反映当前三进程架构

**GitHub 清理**：
- 删除 15 个旧 GitHub Release
- 删除 14 个旧 remote + local git tag
- 仅保留 v1.0.0 一个 release 和 tag

### 1.2 P0 Bug 修复 ✅（代码已改，未构建验证）

**Bug 1: "Failed to fetch" — 3 个根因全部修复**

| 根因 | 文件 | 修复内容 |
|------|------|----------|
| Store 使用原始 `fetch('/api/...')` 绕过 API 层 | `src/stores/useWorkspaceStore.ts` | 4 处 raw fetch 替换为 `api` 对象 |
| `api.ts` 模块级竞态 + 硬编码 3001 回退 | `src/services/api.ts` | 移除模块级 `getServerPort()`，添加 `API_NOT_READY` 守卫 |
| App.tsx 5 秒超时不等 API 就绪就显示 UI | `src/App.tsx` | 超时增至 15 秒 + 超时前重试 `getServerPort()` + AppShell 仅在 `!booting` 时渲染 |

**Bug 2: 白屏 — 2 个根因全部修复**

| 根因 | 文件 | 修复内容 |
|------|------|----------|
| 全应用零 ErrorBoundary | `src/components/system/ErrorBoundary.tsx`（新建）+ `src/main.tsx` | 新建 `AppErrorBoundary` 类组件，包裹整个应用 |
| AppShell 在 booting 期间就渲染并触发 API 查询 | `src/App.tsx` | `{!booting && (<AppShell/>)}` 条件渲染 |

### 1.3 后端修复 ✅

| 问题 | 文件 | 修复内容 |
|------|------|----------|
| 工作区删除不清理 notes/note_folders/note_tags | `server/routes/workspaces/crud.ts` | 3 表加入 Drizzle 清理列表；移除 beats/choices 的错误 SQL |
| 健康检查只检 21/27 表 | `server/routes/health.ts` | 补全 6 张缺失表到 essentialTables |
| Sidecar 端口范围太窄（10个） | `server/sidecar-entry.ts` | MAX_PORT 从 3010 扩至 3050 |

### 1.4 代码注释清理 ✅

- `shared/types.ts` — 移除 `(v1.5)` / `(v1.2)` 版本注释
- `src/services/api-hooks.ts` — 移除 `(v1.5)` / `(v1.2)` 版本注释
- 多个 docs 文件的版本引用同步更新

---

## 二、前端重构 — 已诊断但未执行（被中断）

### 2.1 全面审计已完成，发现 47 个可操作问题

按严重度分类：

**Critical（5 个）：**
1. `TopToolbar.tsx` — 导航 Tab 溢出时无 `no-scrollbar` 类可用，导致内容被截断
2. `EmptyShell.tsx` — 工作区卡片网格没有响应式断点，小窗口下布局崩塌
3. `OutlineView.tsx` — 948 行单文件巨石组件，待拆分
4. `index.css` — 2921 行含 6 层重叠主题定义，大量死代码
5. 主题系统存在重复/冲突的 CSS 变量定义

**High（7 个）：**
6. `index.css` 缺少 `.no-scrollbar` 定义（TopToolbar 引用但不存在）
7. 20+ 组件硬编码颜色绕过主题系统
8. `TButton icon=` 反模式仍在部分组件中使用
9. 多处使用原生 `confirm()` 弹窗（破坏桌面应用体验）
10. 移动端导航完全隐藏（无替代方案）
11. 组件中仍有硬编码中文字符串
12. 主题定义存在重复且值冲突

**Medium（15 个）：**
13. `StatusBar.tsx` 小屏幕截断
14. z-index 硬编码数字而非使用 CSS 变量
15. `--shadow-xl` 未定义但被引用
16. 缺少 Tailwind v4 `--color-*` 桥接别名
17. glassmorphism 系统重复定义
18. `ContextPanel` 未使用共享 `EmptyState` 组件
19. `SettingsDialog` 尺寸过大
20. `TimelineCanvas` 点击/滚轮事件问题
21. 视图切换无过渡动画
22-27. 其他布局/响应式问题

### 2.2 计划的前端重构任务（下一步执行）

**任务 A: CSS 瘦身（index.css: 2921 → ~1800 行）**
- 合并 6 层重叠主题定义为每主题 1 个块
- 删除死 CSS（未使用的类、注释块、冗余工具类）
- 添加 `.no-scrollbar` 工具类
- 整理 z-index 为 CSS 变量体系
- 补全 Tailwind v4 `@theme` 色彩桥接
- 合并重复的 glassmorphism 定义
- 整理 `@keyframes` 动画（删除未用的、分组加注释）

**任务 B: 布局组件修复**
- `TopToolbar.tsx` — 添加 `overflow-x-auto no-scrollbar`、`min-w-0`、响应式折叠
- `AppShell.tsx` — 确认 `flex-1 min-h-0 overflow-hidden` 正确、面板尺寸约束
- `EmptyShell.tsx` — 卡片网格响应式（1/2/3 列）
- `LeftPanel.tsx` — 滚动行为、折叠逻辑
- `StatusBar.tsx` — 小屏幕隐藏次要项、文本截断
- `ContextPanel.tsx` — 使用共享 EmptyState

**任务 C: 视觉精致化**
- 创建 `src/components/_shared/ConfirmDialog.tsx` 替代原生 `confirm()`
- 全局搜索替换所有 `confirm(` / `window.confirm(`
- `WorkspaceCard.tsx` — hover 效果增强、相对时间、色彩左边框
- `EmptyState.tsx` — SVG 动画增强、温暖文案、操作按钮插槽
- `ThemeSelector.tsx` — 主题预览卡片、切换过渡动画
- `SettingsDialog.tsx` — 主题感知、分节视觉分离

**任务 D: OutlineView 拆分**
- 将 948 行拆为 3-4 个子组件 + 1 个 hooks 文件

---

## 三、未变更的文件（当前版本已确认正确）

| 文件 | 版本 | 说明 |
|------|------|------|
| `package.json` | 1.0.0 | ✅ 正确 |
| `src-tauri/Cargo.toml` | 1.0.0 | ✅ 正确 |
| `src-tauri/tauri.conf.json` | 1.0.0 | ✅ 正确（图标配置完整） |
| `src-tauri/icons/` | - | ✅ 16 个图标文件全部存在 |
| `src-tauri/sidecars/` | - | ✅ sidecar exe 存在（95.5MB） |

---

## 四、当前 Git 状态

**已修改（Modified）— 30 个文件：**
- P0 修复：`App.tsx`, `main.tsx`, `api.ts`, `useWorkspaceStore.ts`
- 后端修复：`crud.ts`, `health.ts`, `sidecar-entry.ts`
- 文档清理：`CHANGELOG.md`, `agents.md`, `README.md`, `文档索引.md` 等
- 注释清理：`shared/types.ts`, `api-hooks.ts`
- 品牌修复：`favicon.svg`, `icon-monochrome.svg`

**已删除（Deleted）— 21 个文件：**
- 13 个旧版本日志和交接文档（已归档到 `docs/_archive/`）
- 6 套冗余签名密钥文件

**新增（Untracked）— 24 个文件：**
- `src/components/system/ErrorBoundary.tsx` — 新建的错误边界组件
- `docs/路线图.md` — 新版路线图
- `docs/_archive/` 下 22 个归档文件

**下一步**：需要先 `git add` 所有变更，然后 commit，再继续前端重构。

---

## 五、接手后的执行顺序

### 第一步：提交当前变更
```bash
git add -A
git commit -m "chore(v1.1.0): P0 Bug修复 + 后端修复 + 文档大整理"
```

### 第二步：前端重构（按上述任务 A → B → C → D 顺序）

**任务 A（CSS 瘦身）影响最大**，建议最先做：
1. 读 `src/index.css` 全文
2. 合并重复主题定义
3. 删除死 CSS
4. 添加 `.no-scrollbar`
5. 整理 z-index 变量
6. 目标：从 2921 行减到 ~1800 行

**任务 B（布局修复）是用户最直接的痛点**：
1. 逐个读取 6 个布局组件
2. 按审计报告的问题逐一修复
3. 重点：TopToolbar 导航溢出、EmptyShell 响应式、StatusBar 截断

**任务 C（视觉精致化）提升品质感**：
1. 先创建 ConfirmDialog 工具组件
2. 全局替换 confirm()
3. 逐一提升 WorkspaceCard、EmptyState、ThemeSelector

**任务 D（OutlineView 拆分）是技术债清理**：
1. 读 948 行的 OutlineView.tsx
2. 识别可拆分的子组件边界
3. 提取 hooks 和子组件

### 第三步：TypeScript 编译验证
```bash
npm run typecheck
```

### 第四步：测试验证
```bash
npm run test
```

### 第五步：构建与发布
```bash
npm run build
npm run build:server
npm run build:sidecar
cd src-tauri && cargo tauri bundle
```
构建完成后上传到 GitHub Release v1.1.0。

---

## 六、关键诊断结论（供参考）

### "Failed to fetch" 根因链
```
Tauri 生产环境 → WebView2 加载 file:// 协议
→ useWorkspaceStore 用 fetch('/api/...') 相对路径
→ 解析为 file:///api/workspaces → 不存在 → Failed to fetch
```
同时 `api.ts` 的模块级 `getServerPort()` 在 sidecar 未就绪时就执行，失败后回退到硬编码 3001 端口。

### "白屏" 根因链
```
App.tsx 在 booting=true 时仍渲染 AppShell
→ WorkspaceInitializer 立即触发 useWorkspaces() 查询
→ API_BASE 尚未设置 → 查询失败
→ 某个组件处理错误数据时 throw → 全应用无 ErrorBoundary
→ React 卸载整棵树 → 白屏
```

### 图标问题
代码层面配置**全部正确**。16 个图标文件都存在，tauri.conf.json 配置正确。如果安装后仍显示默认图标，可能原因：
1. Windows 图标缓存（清除方法：删除 `%LOCALAPPDATA%\IconCache.db` 并重启资源管理器）
2. 构建时 icon.ico 未正确嵌入（需验证 `src-tauri/target/release/bundle/nsis/` 产物）

---

## 七、技术环境

- Node.js: v24.15.1
- Rust: 1.96.0
- Tauri CLI: 2.11.3
- React: 19.2.7
- 构建命令需要 MSVC 环境变量（详见 `docs/环境配置指南.md`）
- Git push 需要：`git push "https://x-access-token:$(gh auth token)@github.com/YJLZSL/Storyloom.git" BRANCH`

---

*本文档是 v1.1.0 开发的交接文件。下一个 AI 接手后，从"第五节"的执行顺序开始。*
