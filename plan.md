# 工作区管理修复计划

## 问题分析

### 1. TopToolbar 左上角两个工作区管理选项冲突
- **Dropdown（138-157行）**：仅用于工作区快速切换，显示工作区列表
- **齿轮按钮（159-167行）**：打开 `WorkspaceManagerDialog`，包含切换、删除、新建
- **问题**：两个功能重叠，Dropdown 本身也能切换，用户看到两个入口感到困惑

### 2. 工作区不能改名
- `WorkspaceManagerDialog` 中仅有切换和删除，没有重命名功能
- `useUpdateWorkspace` hook 已存在但未在管理对话框中使用

### 3. 工作区删除失败
- 截图显示错误："删除失败：工作区不存在"
- 可能原因：前端尝试删除已不存在的工作区（ stale state）
- 需要添加前端校验 + 错误处理

### 4. 应用启动逻辑
- 当前 `WorkspaceInitializer` 只在工作区数量为1时自动选择
- 用户希望：默认启动时显示工作区选择器（`EmptyShell`），而非直接进入工作区
- 设置中已有 `openLastWorkspace` 字段（默认 false），需要实际生效

### 5. 创建工作区默认名字
- `TopToolbar` 中 `handleCreateWorkspace` 直接创建默认名工作区，没有弹窗让用户输入
- 需要改为打开 `CreateWorkspaceDialog`，允许用户输入自定义名称或使用默认名称

## 修改方案

### 文件 1: `src/components/layout/TopToolbar.tsx`
- **移除**独立的 `Dropdown` 切换组件和 `SettingConfigIcon` 齿轮按钮
- **合并**为一个统一的工作区下拉菜单（`Dropdown`），包含：
  - 工作区列表（可点击切换，带当前选中标记）
  - 分隔线
  - 「新建工作区」→ 打开 `CreateWorkspaceDialog`
  - 「管理工作区」→ 设置 `currentWorkspaceId = null`，回到 `EmptyShell`
- 引入 `CreateWorkspaceDialog` 组件，新建工作区时弹出命名对话框
- 删除按钮显示当前工作区名称（或无选择时的提示）

### 文件 2: `src/components/workspace/WorkspaceManagerDialog.tsx`
- **添加**重命名功能：每个工作区行内显示可编辑的输入框
- **添加**`onRename` 回调 prop
- 修复删除逻辑：删除前确认工作区存在，避免删除已不存在的工作区

### 文件 3: `src/components/workspace/WorkspaceInitializer.tsx`
- 引入 `useSettingsStore` 的 `openLastWorkspace`
- 使用 `useRef` 标记是否已初始化，避免循环
- 如果 `openLastWorkspace` 为 `false`：首次加载时清除 `currentWorkspaceId`，显示选择器
- 如果 `openLastWorkspace` 为 `true`：保持当前行为（自动进入上次工作区）
- 如果只有一个工作区且未设置工作区：自动选择

### 文件 4: `src/components/workspace/CreateWorkspaceDialog.tsx`
- 添加默认名称生成逻辑：如果用户未输入名称，使用默认名称（如 "新工作区 2026/6/21"）
- 确认按钮的禁用逻辑改为：允许空名称（自动生成默认值）

### 文件 5: `src/components/workspace/WorkspaceSelector.tsx`
- 当没有工作区时，自动弹出创建对话框（可选）
- 微调：确保快速操作栏的事件能正确触发创建对话框

### 文件 6: `src/lib/i18n/locales/zh-CN.json` + `en-US.json`
- 添加新翻译键：
  - `workspace.newWorkspace` → "新建工作区"
  - `workspace.manageWorkspace` → "管理工作区"
  - `workspace.rename` → "重命名"
  - `workspace.renameFailed` → "重命名失败"
  - `workspace.renamed` → "已重命名"

## 执行顺序
1. 修改 `WorkspaceInitializer.tsx`（启动逻辑）
2. 修改 `TopToolbar.tsx`（统一选择器）
3. 修改 `WorkspaceManagerDialog.tsx`（重命名 + 删除修复）
4. 修改 `CreateWorkspaceDialog.tsx`（默认名称）
5. 修改翻译文件
6. 验证编译和测试
