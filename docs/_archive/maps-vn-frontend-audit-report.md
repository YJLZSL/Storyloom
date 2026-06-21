# Storyloom 前端功能检查报告 — 地图 & VN 剧本编辑器

> 检查时间：2025-06-21
> 检查路径：`D:/AIKFCC/Storyloom`
> 后端 API 状态：✅ 全部已挂载并可用

---

## 一、后端 API 状态总览

| 路由文件 | 挂载路径 | 状态 | CRUD |
|---------|---------|------|------|
| `server/routes/maps.ts` | `/api/workspaces/:workspaceId/maps` | ✅ 已挂载 | GET/POST/PATCH/DELETE |
| `server/routes/scenes.ts` | `/api/workspaces/:workspaceId/scenes` | ✅ 已挂载 | GET/POST/PATCH/DELETE + reorder |
| `server/routes/beats.ts` | `/api/scenes/:sceneId/beats` | ✅ 已挂载 | GET/POST/PATCH/DELETE + reorder |
| `server/routes/choices.ts` | `/api/beats/:beatId/choices` | ✅ 已挂载 | GET/POST/PATCH/DELETE |

数据库表：`scenes`, `beats`, `choices` 已定义（含级联删除和索引）。
共享类型：`Scene`, `Beat`, `Choice`, `Create*Request`, `Update*Request` 已定义。

---

## 二、地图 (Maps) 功能 — 前端实现状态

### ✅ 已找到并完整实现的文件

| # | 文件路径 | 说明 |
|---|---------|------|
| 1 | `src/components/maps/MapView.tsx` | ✅ 地图列表 + 编辑器 + 标记管理（CRUD） |
| 2 | `src/services/api-hooks.ts` | ✅ `useMaps`, `useMap`, `useCreateMap`, `useUpdateMap`, `useDeleteMap` |
| 3 | `src/stores/useUIStore.ts` | ✅ `PanelType` 包含 `'maps'` |
| 4 | `src/components/layout/LeftPanel.tsx` | ✅ 工具列表含 `Maps`（图标 + 标签） |
| 5 | `src/components/layout/ContextPanel.tsx` | ✅ `case 'maps':` 映射到 `<MapView />` |
| 6 | `src/components/layout/AppShell.tsx` | ✅ 上下文菜单含「地图」入口（2处） |

### 地图功能总结

**状态：🟢 完全可用**

- 左侧面板点击「Maps」可打开右侧地图面板
- 支持创建/删除地图
- 支持地图内点击放置标记
- 标记可关联事件（点击标记定位到时间轴事件）
- 支持保存标记坐标
- 移动端上下文菜单也支持打开地图

---

## 三、VN / 剧本编辑器 (Visual Novel / Script Editor) 功能 — 前端实现状态

### ❌ 未找到的组件目录

| 预期目录 | 状态 | 说明 |
|---------|------|------|
| `src/components/script-editor/` | ❌ 不存在 | 剧本编辑器主组件 |
| `src/components/vn/` | ❌ 不存在 | 视觉小说相关组件 |
| `src/components/visual-novel/` | ❌ 不存在 | 视觉小说相关组件 |
| `src/components/scenes/` | ❌ 不存在 | 场景管理组件 |
| `src/components/beats/` | ❌ 不存在 | 节拍编辑组件 |
| `src/components/choices/` | ❌ 不存在 | 选项编辑组件 |
| `src/components/vn-preview/` | ❌ 不存在 | VN 预览/播放器组件 |

### ❌ 未找到的前端 API Hooks

`src/services/api-hooks.ts` 中 **不存在** 以下 hooks：

| Hook 名称 | 对应后端 API | 状态 |
|-----------|-----------|------|
| `useScenes` | `GET /api/workspaces/:workspaceId/scenes` | ❌ 缺失 |
| `useCreateScene` | `POST /api/workspaces/:workspaceId/scenes` | ❌ 缺失 |
| `useUpdateScene` | `PATCH /api/workspaces/:workspaceId/scenes/:sceneId` | ❌ 缺失 |
| `useDeleteScene` | `DELETE /api/workspaces/:workspaceId/scenes/:sceneId` | ❌ 缺失 |
| `useReorderScenes` | `POST /api/workspaces/:workspaceId/scenes/reorder` | ❌ 缺失 |
| `useBeats` | `GET /api/scenes/:sceneId/beats` | ❌ 缺失 |
| `useCreateBeat` | `POST /api/scenes/:sceneId/beats` | ❌ 缺失 |
| `useUpdateBeat` | `PATCH /api/scenes/:sceneId/beats/:beatId` | ❌ 缺失 |
| `useDeleteBeat` | `DELETE /api/scenes/:sceneId/beats/:beatId` | ❌ 缺失 |
| `useReorderBeats` | `POST /api/scenes/:sceneId/beats/reorder` | ❌ 缺失 |
| `useChoices` | `GET /api/beats/:beatId/choices` | ❌ 缺失 |
| `useCreateChoice` | `POST /api/beats/:beatId/choices` | ❌ 缺失 |
| `useUpdateChoice` | `PATCH /api/beats/:beatId/choices/:choiceId` | ❌ 缺失 |
| `useDeleteChoice` | `DELETE /api/beats/:beatId/choices/:choiceId` | ❌ 缺失 |

### ❌ 未找到的路由/页面集成

| 位置 | 缺失内容 |
|------|---------|
| `src/stores/useUIStore.ts` | `PanelType` 中无 `script-editor` / `vn` / `scenes` 等面板类型 |
| `src/components/layout/LeftPanel.tsx` | `ToolItem` 列表中无 VN/剧本编辑器入口 |
| `src/components/layout/ContextPanel.tsx` | `PANEL_TITLES` 和 `switch` 语句中无 VN 面板映射 |
| `src/components/layout/AppShell.tsx` | `PageId` 无 VN 相关页面；`MainCanvas` 无 VN 视图渲染；上下文菜单无 VN 入口 |

---

## 四、缺失清单汇总

### 地图功能
> **无缺失项。** 前端地图功能完整，与后端 API 完全对接。

### VN / 剧本编辑器功能

| 类别 | 缺失项 | 优先级 |
|------|--------|--------|
| **API Hooks** | `useScenes`, `useCreateScene`, `useUpdateScene`, `useDeleteScene`, `useReorderScenes` | P0 |
| **API Hooks** | `useBeats`, `useCreateBeat`, `useUpdateBeat`, `useDeleteBeat`, `useReorderBeats` | P0 |
| **API Hooks** | `useChoices`, `useCreateChoice`, `useUpdateChoice`, `useDeleteChoice` | P0 |
| **UI Store** | 在 `PanelType` 中增加 `'script-editor'` | P0 |
| **Left Panel** | 在 `UTILITY_TOOLS` 中增加「剧本编辑器」工具项 | P0 |
| **Context Panel** | 在 `PANEL_TITLES` 和 `switch` 中增加 `script-editor` 映射 | P0 |
| **App Shell** | 在 `PageId` 中增加 `'script-editor'`；在 `MainCanvas` 中增加渲染分支；上下文菜单增加入口 | P1 |
| **组件** | `SceneList.tsx` — 场景列表与管理 | P0 |
| **组件** | `SceneEditor.tsx` — 场景编辑器（背景、BGM、设置） | P0 |
| **组件** | `BeatEditor.tsx` — 节拍编辑器（台词、立绘、音效） | P0 |
| **组件** | `ChoiceEditor.tsx` — 选项编辑器（标签、条件、跳转） | P0 |
| **组件** | `ScriptEditorView.tsx` — 剧本编辑器总装视图 | P0 |
| **组件** | `VNPreview.tsx` — VN 预览/播放器（可选） | P2 |

---

## 五、最小实现方案

### 5.1 文件结构（新增）

```
src/
├── components/
│   └── script-editor/
│       ├── ScriptEditorView.tsx      # 主入口：左侧场景列表 + 右侧节拍编辑
│       ├── SceneList.tsx             # 场景列表（可排序、增删改）
│       ├── SceneEditor.tsx           # 场景属性编辑（名称、背景、BGM）
│       ├── BeatList.tsx              # 节拍列表（可排序、增删改）
│       ├── BeatEditor.tsx            # 节拍编辑器（kind、角色、文本、元数据）
│       ├── ChoiceList.tsx            # 选项列表（仅 kind='choice' 时显示）
│       └── ChoiceEditor.tsx          # 选项编辑器（标签、跳转、条件）
├── services/
│   └── api-hooks.ts                  # 追加 scene/beat/choice hooks（见下方）
└── stores/
    └── useUIStore.ts                 # PanelType 追加 'script-editor'
```

### 5.2 API Hooks 追加代码（`src/services/api-hooks.ts`）

在现有 `api-hooks.ts` 末尾追加以下内容：

```typescript
// ─── Scene ───
const sceneHooks = createNestedHooks<Scene, CreateSceneRequest, UpdateSceneRequest, 'sceneId'>(
  'scenes',
  'scenes',
  { idFieldName: 'sceneId' },
);

export const useScenes = sceneHooks.useList;
export const useScene = sceneHooks.useOne;
export const useCreateScene = sceneHooks.useCreate;
export const useUpdateScene = sceneHooks.useUpdate;
export const useDeleteScene = sceneHooks.useDelete;

export function useReorderScenes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, items }: { workspaceId: string; items: { id: string; order: number }[] }) =>
      api.post<{ updated: number }>(`/api/workspaces/${workspaceId}/scenes/reorder`, { items }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['scenes', vars.workspaceId] });
    },
  });
}

// ─── Beat ───
const beatHooks = createNestedHooks<Beat, CreateBeatRequest, UpdateBeatRequest, 'beatId'>(
  'beats',
  'beats',
  { idFieldName: 'beatId' },
);

export const useBeats = beatHooks.useList;
export const useBeat = beatHooks.useOne;
export const useCreateBeat = beatHooks.useCreate;
export const useUpdateBeat = beatHooks.useUpdate;
export const useDeleteBeat = beatHooks.useDelete;

export function useReorderBeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sceneId, items }: { sceneId: string; items: { id: string; order: number }[] }) =>
      api.post<{ updated: number }>(`/api/scenes/${sceneId}/beats/reorder`, { items }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['beats', vars.sceneId] });
    },
  });
}

// ─── Choice ───
const choiceHooks = createNestedHooks<Choice, CreateChoiceRequest, UpdateChoiceRequest, 'choiceId'>(
  'choices',
  'choices',
  { idFieldName: 'choiceId' },
);

export const useChoices = choiceHooks.useList;
export const useChoice = choiceHooks.useOne;
export const useCreateChoice = choiceHooks.useCreate;
export const useUpdateChoice = choiceHooks.useUpdate;
export const useDeleteChoice = choiceHooks.useDelete;
```

> ⚠️ 注意：`createNestedHooks` 的 `listUrl` 需要自定义，因为 beats 挂在 `/api/scenes/:sceneId/beats`，choices 挂在 `/api/beats/:beatId/choices`。需要检查 `createNestedHooks` 的 factory 实现是否支持自定义 `listUrl`。如果不支持，需手写 `useQuery` / `useMutation` 版本。

### 5.3 UI Store 修改（`src/stores/useUIStore.ts`）

```typescript
// 修改前
type PanelType = 'properties' | 'event-editor' | 'ai' | ... | 'maps' | null;
// 修改后
type PanelType = 'properties' | 'event-editor' | 'ai' | ... | 'maps' | 'script-editor' | null;
```

### 5.4 LeftPanel 修改（`src/components/layout/LeftPanel.tsx`）

在 `UTILITY_TOOLS` 数组中追加：

```typescript
import { BookOpenIcon } from '@/lib/icons'; // 或其他合适图标

const UTILITY_TOOLS: ToolItem[] = [
  // ... 现有项
  { id: 'maps', label: 'Maps', icon: MapIcon, panelId: 'maps' },
  { id: 'script-editor', label: 'Script Editor', icon: BookOpenIcon, panelId: 'script-editor' },
];
```

在 `getToolLabel` 的 `keyMap` 中追加：

```typescript
'script-editor': 'panels.scriptEditor',
```

### 5.5 ContextPanel 修改（`src/components/layout/ContextPanel.tsx`）

1. 导入 `ScriptEditorView`：
```typescript
import { ScriptEditorView } from '@/components/script-editor/ScriptEditorView';
```

2. 在 `PANEL_TITLES` 中追加：
```typescript
'script-editor': '剧本编辑器',
```

3. 在 `switch` 语句中追加：
```typescript
case 'script-editor':
  return { title: PANEL_TITLES['script-editor'], content: <ScriptEditorView /> };
```

### 5.6 AppShell 修改（`src/components/layout/AppShell.tsx`）

1. 在 `PageId` 中追加：
```typescript
export type PageId = 'timeline' | ... | 'relationship' | 'script-editor';
```

2. 在 `MainCanvas` 的 `renderView` 中追加 `case 'script-editor':` 分支：
```typescript
case 'script-editor':
  return <ScriptEditorView />;
```

3. 在上下文菜单中追加「剧本编辑器」入口（可选）。

### 5.7 核心组件设计（`ScriptEditorView.tsx`）

```typescript
// 最小 viable 结构：三栏布局
// ┌──────────┬─────────────┬──────────┐
// │ 场景列表  │  节拍列表    │ 节拍编辑  │
// │          │  (+选项列表) │ (+选项)   │
// └──────────┴─────────────┴──────────┘

// 状态设计：
// - selectedSceneId: string | null
// - selectedBeatId: string | null
// - 当选择 scene 时加载 beats
// - 当选择 beat 且 kind='choice' 时加载 choices
```

---

## 六、后端 ↔ 前端 API 对照表

| 后端路由 | 前端 Hook | 状态 |
|---------|----------|------|
| `GET /api/workspaces/:workspaceId/maps` | `useMaps` | ✅ 已实现 |
| `POST /api/workspaces/:workspaceId/maps` | `useCreateMap` | ✅ 已实现 |
| `PATCH /api/workspaces/:workspaceId/maps/:mapId` | `useUpdateMap` | ✅ 已实现 |
| `DELETE /api/workspaces/:workspaceId/maps/:mapId` | `useDeleteMap` | ✅ 已实现 |
| `GET /api/workspaces/:workspaceId/scenes` | `useScenes` | ❌ 未实现 |
| `POST /api/workspaces/:workspaceId/scenes` | `useCreateScene` | ❌ 未实现 |
| `PATCH /api/workspaces/:workspaceId/scenes/:sceneId` | `useUpdateScene` | ❌ 未实现 |
| `DELETE /api/workspaces/:workspaceId/scenes/:sceneId` | `useDeleteScene` | ❌ 未实现 |
| `POST /api/workspaces/:workspaceId/scenes/reorder` | `useReorderScenes` | ❌ 未实现 |
| `GET /api/scenes/:sceneId/beats` | `useBeats` | ❌ 未实现 |
| `POST /api/scenes/:sceneId/beats` | `useCreateBeat` | ❌ 未实现 |
| `PATCH /api/scenes/:sceneId/beats/:beatId` | `useUpdateBeat` | ❌ 未实现 |
| `DELETE /api/scenes/:sceneId/beats/:beatId` | `useDeleteBeat` | ❌ 未实现 |
| `POST /api/scenes/:sceneId/beats/reorder` | `useReorderBeats` | ❌ 未实现 |
| `GET /api/beats/:beatId/choices` | `useChoices` | ❌ 未实现 |
| `POST /api/beats/:beatId/choices` | `useCreateChoice` | ❌ 未实现 |
| `PATCH /api/beats/:beatId/choices/:choiceId` | `useUpdateChoice` | ❌ 未实现 |
| `DELETE /api/beats/:beatId/choices/:choiceId` | `useDeleteChoice` | ❌ 未实现 |

---

## 七、结论

| 功能 | 前端实现 | 后端 API | 可用性 |
|------|---------|---------|--------|
| **地图 (Maps)** | ✅ 完整 | ✅ 完整 | 🟢 可用 |
| **场景 (Scenes)** | ❌ 无 | ✅ 完整 | 🔴 不可用 |
| **节拍 (Beats)** | ❌ 无 | ✅ 完整 | 🔴 不可用 |
| **选项 (Choices)** | ❌ 无 | ✅ 完整 | 🔴 不可用 |
| **VN 预览/播放器** | ❌ 无 | 后端无专用路由 | 🔴 不可用 |

**后端已经为 VN 剧本编辑器提供了完整的 REST API 支持，但前端完全缺失对应的组件、hooks 和 UI 集成。** 最小实现需要约 **7 个新组件 + 14 个 API hooks + 4 处 UI 集成修改**。
