## v1.1.7 关键修复

### 工作区删除（彻底修复 `FST_ERR_CTP_EMPTY_JSON_BODY`）
- `api.ts` 的 `DELETE` 请求不再设置 `Content-Type` 头，彻底修复 Fastify 报错
- 工作区管理 UI 重构：Dropdown 只保留切换功能，新增「管理」按钮打开 WorkspaceManagerDialog

### 时间轴轨道管理
- TrackManagerDialog 功能完整：显示/隐藏、重命名、改颜色、删除、恢复

### 番茄钟 MC 风格增强
- 20 像素方块经验条、3D 按压按钮、草地/泥土纹理条纹

### 未来路线图重规划
- 去掉多设备协同/协作编辑
- Anime.js 霓虹 → 内敛时间轴动画
- WebGAL/地图/书签 提前到 v1.2.0/v1.3.0
