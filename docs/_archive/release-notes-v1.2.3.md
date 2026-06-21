## Storyloom v1.2.3 更新说明

### 新功能

- **工作区重命名**：在工作区选择界面（EmptyShell），将鼠标悬停在工作区卡片上即可看到「编辑」按钮，点击后可直接修改工作区名称，按 Enter 确认、Esc 取消。
- **启动行为可控**：设置中的「打开上次工作区」选项已实际生效。关闭此选项后，应用启动时将直接进入工作区选择器，方便在多项目间切换。
- **创建时默认名称**：新建工作区对话框中，如果留空名称，系统将自动填充默认格式（如「新工作区 2026/6/21」），无需手动输入即可快速创建。

### 修复

- **左上角工作区入口冲突**：之前 TopToolbar 同时存在「下拉切换」和「齿轮管理」两个工作区入口，功能重叠且容易混淆。现已合并为单一综合下拉菜单，包含工作区列表、新建工作区、管理工作区三项操作。
- **工作区删除失败（已不存在）**：当尝试删除一个已被其他方式删除的工作区时，前端会提前校验存在性并给出友好提示，不再触发「工作区不存在」的错误弹窗。

### 技术细节

- `TopToolbar`：移除独立的 `WorkspaceManagerDialog` 触发按钮，将 `Dropdown` 扩展为统一菜单（工作区列表 + `action:new` + `action:manage`）
- `WorkspaceCard`：新增 `isEditing` 状态 + 内联 `<input>` 编辑，支持 blur/Enter 提交，Esc 取消
- `WorkspaceSelector`：引入 `useUpdateWorkspace` + `handleRename`，删除前增加 `workspaces?.find()` 存在性校验
- `WorkspaceInitializer`：根据 `openLastWorkspace` 设置决定是否清除 `currentWorkspaceId`，首次启动时强制显示选择器
- `CreateWorkspaceDialog`：`handleSubmit` 中允许空名称，自动调用 `getDefaultName()` 填充
- `WorkspaceManagerDialog`：新增 `onRename` prop + 内联编辑输入框，支持 Dialog 内重命名

---

**完整更新日志**：[`更新日志.md`](./更新日志.md)
