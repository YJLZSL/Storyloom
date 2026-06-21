## Storyloom v1.2.0 — 地图与书签

### 新功能
- **书签系统**：为时间轴事件添加书签，快速定位到重要节点。支持自定义颜色、名称，一键跳转到对应事件位置
- **地图系统**：创建地图来标记故事中的地点。支持添加/删除/保存标记点，标记可关联到事件实现快速跳转

### UI/UX 升级
- **全局字体修复**：移除仅限英文的 `Press Start 2P` 像素字体，统一使用 `ZCOOL QingKe HuangYou` 等中文友好字体栈，确保所有界面中文字符统一渲染
- **自适应布局修复**：`SettingsRow` 去掉 `truncate` 截断，改为 `whitespace-normal` + `flex-1` 自适应；番茄钟 MC 风格布局简化，按钮更紧凑
- **图标 DPI 自适应**：图标大小使用 `clamp()` 响应式公式，随窗口宽度自动调整，保证不同屏幕下观感清晰

### 代码优化
- **图标系统补全**：新增 `BookmarkIcon`、`MapIcon`、`PinIcon` 三个 IconPark 图标到统一登记文件
- **类型安全增强**：`as const` 颜色数组与 `useState` 的类型兼容修复

---

**完整变更历史请参阅** [`CHANGELOG.md`](https://github.com/YJLZSL/Storyloom/blob/master/CHANGELOG.md)
