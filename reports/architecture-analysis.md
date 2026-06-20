# Storyloom 架构深度分析报告

> **分析方法**：基于 John Ousterhout《软件设计哲学》的"深模块"原则  
> **分析日期**：2025-07-02  
> **代码库路径**：`D:\AIKFCC\Storyloom\src`  
> **分析工具**：Glob + Read + Grep 深度代码扫描

---

## 1. 代码库概览

### 1.1 目录结构

```
src/
├── stores/          # 9 个 Zustand store（状态管理）
├── services/        # API 层（3 个文件）
├── components/      # 40+ 组件，按功能分目录
├── lib/             # 工具函数、命令/快捷键注册、主题适配
├── hooks/           # 2 个自定义 hooks
├── types/           # 仅 electron.d.ts（类型定义严重缺失）
├── utils/           # 1 个工具文件
├── index.css        # 1075 行设计令牌 + TDesign 覆盖样式
├── App.tsx          # 根组件（极简）
└── main.tsx         # 入口（Provider 包裹）
```

### 1.2 技术栈

| 层级 | 技术 |
|------|------|
| UI 框架 | React 19 + TDesign React + shadcn/ui (radix) |
| 状态管理 | Zustand 5 (9 个独立 store) |
| 服务端状态 | TanStack Query v5 |
| 样式 | Tailwind CSS v4 + 自定义 CSS 变量 |
| 构建 | Vite + TypeScript |
| 测试 | Vitest + Testing Library (3 个测试文件) |
| 后端 | Fastify + better-sqlite3 |
| 桌面 | Electron |

### 1.3 依赖统计

- **生产依赖**: 30 个
- **开发依赖**: 20 个
- **关键风险依赖**: `better-sqlite3` (需要原生模块重建)、`d3` (仅部分组件使用)

---

## 2. 架构摩擦点识别

### 2.1 模块深度评估

| 模块 | 接口数 | 实现复杂度 | 深度比 | 评估 |
|------|--------|-----------|--------|------|
| `useTrackStore` | 2 setters | 2 行 setter | 1:1 | **浅** |
| `useTimelineStore` | 10+ actions | 中等 | 10:71 | 偏浅 |
| `api-hooks.ts` | 30+ hooks | 452 行重复模式 | 1:1 | **浅** |
| `command-registry.ts` | 4 导出 | 161 行 | 尚可 | 中等 |
| `shortcut-registry.ts` | 8 导出 | 373 行 | 尚可 | 中等 |
| `theme-adapter.tsx` | 2 导出 | 190 行 DOM 操作 | 浅 | 偏浅 |
| `timeline.ts` | 3 函数 | 83 行纯函数 | 深 | **深** |
| `icons.ts` | 60+ 导出 | 189 行 wrapper | 浅 | **浅** |

---

## 3. 编号深化机会列表

### **P0 — 严重（阻塞性风险）**

#### 1. Store 间状态重复与双向耦合

- **聚类**: `useTimelineStore`, `useSelectionStore`, `useViewStore`, `useWorkspaceStore`
- **耦合原因**: 
  - `useTimelineStore` 拥有 `selectedEventId` + `selectedCharacterId`
  - `useSelectionStore` 也拥有 `selectedEventId` + `selectedCharacterId` + 更多实体
  - `useSelectionStore.selectEvent()` 直接调用 `useTimelineStore.getState().setSelectedEvent()`
  - `useViewStore` 与 `useTimelineStore` 双向订阅同步（`useViewStore` 初始化读取 timeline，然后 subscribe 双向同步）
  - `useWorkspaceStore.setCurrentWorkspace()` 直接调用 timeline、track、selection store 的 `getState()` 来清理状态
- **依赖类别**: **隐式依赖**（运行时通过 getState() 耦合）+ **循环依赖**（ViewStore ↔ TimelineStore 双向同步）
- **测试影响**: 
  - Store 无法独立测试，必须 mock 其他 store
  - 状态同步 bug 难以定位（多个来源可修改同一概念）
  - Workspace 切换时的集成测试是薄弱环节

> **推荐接口设计**: 将 "选区" 概念统一为一个深模块，提供 `select(entity, id)` 单一入口，`getSelection()` 读取，内部处理所有跨 store 的副作用。

---

#### 2. API Hooks 层过度重复（452 行机械代码）

- **聚类**: `services/api-hooks.ts` + 所有调用组件
- **耦合原因**: 
  - 每个 CRUD 资源（Workspace/Event/Track/Character/Connection/Foreshadowing/WorldSetting/OutlineVersion）重复同样的模式：`useQuery` + `useMutation` + `invalidateQueries`
  - 只有 `useUpdateEvent` 实现了乐观更新，其他 7 个更新操作没有
  - 每个 mutation 都独立 `const qc = useQueryClient()`，然后手动调用 `invalidateQueries`
- **依赖类别**: **过度依赖**（每个组件都依赖 api-hooks 的 30+ 个导出）
- **测试影响**: 
  - 没有 api-hooks 的单元测试
  - 乐观更新逻辑只有 event 有，其他 bug 风险高
  - 集成测试中需要 mock 大量独立 hook

> **推荐接口设计**: 创建 `useEntityQuery(entityType)` 和 `useEntityMutation(entityType, action)` 工厂函数，将 CRUD 模式抽象到单个接口后，内部生成对应的 query/mutation hooks。

---

### **P1 — 高优先级**

#### 3. 命令面板与快捷键系统的紧耦合

- **聚类**: `lib/command-registry.ts` + `lib/shortcut-registry.ts` + `components/command-palette/`
- **耦合原因**: 
  - `shortcut-registry.ts` 导入 `getAllCommands()` 和 `getCommand()`，依赖 command 的定义
  - `CommandContext` 接口包含 17 个函数签名，任何新功能都要同时修改命令注册表和 context 接口
  - `getCurrentContext()` 在工具函数中直接调用 `useUIStore.getState()` 和 `useTimelineStore.getState()`
- **依赖类别**: **隐式依赖**（shortcut 在工具函数中直接访问 store 状态）
- **测试影响**: 
  - `shortcut-registry` 无法在浏览器外测试（依赖 `window` 和 `document`）
  - `getCurrentContext` 的测试需要 mock 两个 store
  - 命令 handler 的集成测试需要 mock 整个 CommandContext

> **推荐接口设计**: 将 `CommandContext` 缩小为 3-4 个核心操作（`dispatch(action)`, `navigate(view)`, `openPanel(panel)`），用 action 对象替代 17 个独立函数。

---

#### 4. 双 UI 系统维护负担（shadcn/ui + TDesign）

- **聚类**: `components/ui/` (shadcn/radix) + `components/ui-tdesign/` (TDesign 封装) + `index.css` (TDesign 覆盖)
- **耦合原因**: 
  - 项目同时维护两套 UI 组件：`components/ui/button.tsx` (shadcn) 和 `components/ui-tdesign/index.tsx` (TDesign 封装)
  - `index.css` 中 400+ 行是 TDesign 的覆盖样式，需要随 TDesign 升级而维护
  - `theme-adapter.tsx` 需要手动将 CSS 变量映射到 TDesign 的 `--td-*` 令牌
- **依赖类别**: **过度依赖**（两套组件库都依赖）
- **测试影响**: 
  - TDesign 覆盖样式没有视觉回归测试
  - theme-adapter 的 DOM 操作难以单元测试

> **推荐接口设计**: 统一为单一 UI 层（建议保留 TDesign 作为主力，用少量 shadcn 组件补充），将 `theme-adapter` 的 DOM 操作封装为 "ThemeBridge" 深模块，只暴露 `applyTheme(themeId)` 一个接口。

---

### **P2 — 中等优先级**

#### 5. useTrackStore 过于浅（15 行，接口≈实现）

- **聚类**: `stores/useTrackStore.ts` + 所有使用它的组件
- **耦合原因**: 
  - 只有 `selectedTrackId` + `editingTrackId` 两个状态
  - 两个 setter 几乎没有逻辑，只是直接 `set({ selectedTrackId: id })`
  - 这个 store 的存在增加了理解成本（为什么它不放在 TimelineStore 或 UIStore？）
- **依赖类别**: **过度依赖**（单独 store 但价值不足）
- **测试影响**: 可测试但无意义，setters 没有任何行为逻辑

> **推荐接口设计**: 合并到 `useTimelineStore` 或 `useUIStore`。如果保持独立，至少添加 `isTrackEditing(trackId)` 等有逻辑的查询方法。

---

#### 6. 图标封装层过于浅（189 行 wrapper）

- **聚类**: `lib/icons.ts` + 所有使用图标的组件
- **耦合原因**: 
  - 每个图标都是 `withDefaults(Icon)` 的机械包装，60+ 个重复模式
  - 实质上只是设置了 `size: 18, strokeWidth: 2, theme: 'outline'` 默认值
  - 真正的 bug 不在图标本身，而在调用方是否传了正确的图标名
- **依赖类别**: **过度依赖**（大量重复导出）
- **测试影响**: 纯 wrapper 不需要测试，但增加了 bundle 体积和导入复杂度

> **推荐接口设计**: 改为 `export { defaultProps }` + `export function Icon(props) { return createElement(IconMap[props.name], {...defaultProps, ...props}) }`，或用自动生成的 barrel 文件替代手写。

---

#### 7. 测试覆盖严重不足

- **聚类**: 整个代码库
- **耦合原因**: 
  - 仅 3 个测试文件：`useMediaQuery.test.ts` (hook)、`safe-text.test.ts` (lib)、`WorkspaceCard.test.tsx` (component)
  - `stores/` 目录 9 个 store 文件，**0 测试**
  - `services/api-hooks.ts` 452 行，**0 测试**
  - `lib/shortcut-registry.ts` 373 行，**0 测试**
  - `lib/command-registry.ts` 161 行，**0 测试**
  - `lib/timeline.ts` 83 行纯函数，**0 测试**（最适合测试的反而没有）
- **依赖类别**: **缺失测试**（难以验证重构安全性）
- **测试影响**: 任何架构重构都缺乏安全网

> **推荐接口设计**: 优先为 `timeline.ts` 纯函数、`command-registry` 的 register/lookup、`api.ts` 的 request 方法编写边界测试。Store 测试可用 `zustand` 的 `createStore` + 独立测试。

---

#### 8. 多个 localStorage 存储碎片化

- **聚类**: `lib/ai-config.ts`, `lib/shortcut-registry.ts`, `components/ai-panel/useAIConversations.ts`
- **耦合原因**: 
  - 3 个独立的 localStorage 读写逻辑，各自管理 storage key
  - 没有统一的持久化抽象层
  - 各自的序列化/反序列化逻辑重复（`JSON.stringify` / `JSON.parse` + try-catch）
- **依赖类别**: **隐式依赖**（共享 localStorage 但没有统一策略）
- **测试影响**: 每个模块的测试都需要独立 mock `localStorage`

> **推荐接口设计**: 创建 `StorageAdapter` 深模块，提供 `get<T>(key, fallback)`, `set<T>(key, value)`, `remove(key)` 接口，内部统一处理 JSON 序列化、错误处理和类型安全。

---

### **P3 — 低优先级**

#### 9. index.css 过于庞大（1075 行）

- **聚类**: `index.css` + `theme-adapter.tsx`
- **耦合原因**: 
  - 设计令牌（约 100 行）+ 5 个主题定义（约 200 行）+ 基础样式（约 50 行）+ TDesign 覆盖（约 400 行）+ 工具类（约 300 行）全部在一个文件
  - TDesign 覆盖样式需要手动匹配 TDesign 版本升级
  - 部分工具类与 Tailwind 功能重复（如 `.btn-lift`、`.card-lift`）
- **依赖类别**: **隐式依赖**（CSS 与组件逻辑分离但强耦合）
- **测试影响**: 视觉回归测试缺失

> **推荐接口设计**: 将 index.css 拆分为 `tokens.css`（设计令牌）、`themes.css`（主题变量）、`tdesign-overrides.css`（第三方覆盖）、`utilities.css`（工具类）。

---

#### 10. 类型定义目录空置

- **聚类**: `src/types/`（只有 `electron.d.ts`）
- **耦合原因**: 
  - 所有业务类型（Workspace, Event, Character 等）定义在 `../../shared/types.js`（项目外部路径）
  - 前端代码中大量使用 `import type { ... } from '../../shared/types.js'`
  - 这种跨目录类型引用增加了前端模块的耦合半径
- **依赖类别**: **过度依赖**（前端依赖后端的 shared 类型）
- **测试影响**: 类型共享没有测试

> **推荐接口设计**: 将 shared/types 映射到前端 `src/types/` 目录，或使用 TypeScript project references 建立清晰的类型边界。

---

## 4. 依赖类别分析

### 4.1 循环依赖

| 循环 | 路径 | 严重程度 |
|------|------|----------|
| `useViewStore` ↔ `useTimelineStore` | 双向 subscribe 同步 | P1 |
| `useSelectionStore` → `useTimelineStore` | Selection 直接调用 Timeline setter | P1 |
| `useWorkspaceStore` → `useTimelineStore` + `useTrackStore` + `useSelectionStore` | Workspace 切换时清理其他 store | P2 |

### 4.2 隐式依赖

| 依赖 | 位置 | 严重程度 |
|------|------|----------|
| `shortcut-registry.ts` 直接调用 `useUIStore.getState()` | 工具函数 | P1 |
| `shortcut-registry.ts` 直接调用 `useTimelineStore.getState()` | 工具函数 | P2 |
| `theme-adapter.tsx` 直接读取 `document.documentElement` | 组件外副作用 | P2 |
| 多处 `localStorage` 直接读写 | 多个模块 | P2 |
| `ai-stream.ts` 和 `api.ts` 各自判断 Electron 环境 | 重复逻辑 | P3 |

### 4.3 过度依赖

| 依赖 | 位置 | 严重程度 |
|------|------|----------|
| 30+ 组件直接 import `api-hooks` 的 30+ 个导出 | 组件层 | P2 |
| 双 UI 系统（shadcn + TDesign） | 组件层 | P2 |
| `icons.ts` 60+ 个独立导出 | 工具层 | P3 |
| `command-context` 17 个函数签名 | 命令层 | P2 |

---

## 5. 推荐接口设计方案

### 5.1 方案 A：Store 层统一（针对 P0-1）

```typescript
// 统一的 AppState 深模块
interface AppState {
  // 选区（单一真相源）
  selection: { entity: SelectionEntity; id: string | null };
  select(entity: SelectionEntity, id: string | null): void;
  clearSelection(): void;
  
  // 视图（单一真相源）
  viewMode: ViewMode;
  setViewMode(mode: ViewMode): void;
  
  // 工作区切换（自动清理依赖状态）
  currentWorkspaceId: string | null;
  switchWorkspace(id: string | null): void; // 内部自动清理选区/视图
}
```

**优势**: 消除重复状态，消除双向同步，测试可以在单 store 内完成。  
**劣势**: 需要较大的重构工作量，需要验证所有组件的订阅模式。

### 5.2 方案 B：API 层工厂化（针对 P0-2）

```typescript
// 通用 CRUD 工厂
function createEntityHooks<T, Create, Update>(entity: EntityType) {
  return {
    useList: (workspaceId: string | null) => useQuery({...}),
    useOne: (workspaceId: string | null, id: string | null) => useQuery({...}),
    useCreate: () => useMutation({...}),
    useUpdate: (options?: { optimistic?: boolean }) => useMutation({...}),
    useDelete: () => useMutation({...}),
  };
}

// 使用
export const { useEvents, useEvent, useCreateEvent, useUpdateEvent, useDeleteEvent } = 
  createEntityHooks<TimelineEvent, CreateEventRequest, UpdateEventRequest>('event');
```

**优势**: 减少 80% 的重复代码，乐观更新可以统一配置。  
**劣势**: 类型体操需要仔细设计，需要确保 QueryKey 的推导正确。

### 5.3 方案 C：命令层 Action 化（针对 P1-3）

```typescript
// 将 17 个函数缩减为 3 个核心操作
type AppAction =
  | { type: 'navigate'; view: ViewMode }
  | { type: 'select'; entity: SelectionEntity; id: string | null }
  | { type: 'openPanel'; panel: PanelType | null }
  | { type: 'create'; entity: 'event' | 'character' | 'workspace' }
  | { type: 'toggle'; feature: 'focusMode' | 'sidebar' | 'theme' };

interface CommandContext {
  dispatch(action: AppAction): void;
  getState(): AppState; // 读取权
}
```

**优势**: 命令与快捷键共享同一 action 语言，新增功能只需添加 action type。  
**劣势**: 需要重构所有命令 handler，工作量较大。

### 5.4 混合推荐方案

结合 **方案 A**（Store 统一）+ **方案 B**（API 工厂化）+ **方案 C**（Action 化命令），按以下优先级实施：

1. **Phase 1**: 先实施 **方案 B**（API 工厂化），因为它是纯重构、风险最低，可以立即减少 400+ 行重复代码
2. **Phase 2**: 实施 **方案 A**（Store 统一），解决 P0 状态重复问题
3. **Phase 3**: 实施 **方案 C**（Action 化命令），配合 Store 统一后简化 CommandContext
4. **Phase 4**: 统一 localStorage 为 StorageAdapter，拆分 index.css

---

## 6. 问题严重级别汇总

| 级别 | 问题 | 影响范围 | 重构工作量 | 建议处理顺序 |
|------|------|----------|-----------|-------------|
| **P0** | Store 状态重复与双向耦合 | 全局状态 | 中等 | 第 2 阶段 |
| **P0** | API Hooks 层 452 行重复 | 数据层 | 低 | **第 1 阶段** |
| **P1** | 命令面板与快捷键紧耦合 | 交互层 | 中等 | 第 3 阶段 |
| **P1** | 双 UI 系统维护负担 | 组件层 | 高 | 第 4 阶段 |
| **P2** | useTrackStore 过浅 | 状态层 | 低 | 合并到 Phase 1 |
| **P2** | 图标封装层过浅 | 工具层 | 低 | 可选 |
| **P2** | 测试覆盖严重不足 | 全局 | 中等 | 与重构并行 |
| **P2** | localStorage 碎片化 | 持久层 | 低 | 第 3 阶段 |
| **P3** | index.css 过庞大 | 样式层 | 中等 | 第 4 阶段 |
| **P3** | 类型目录空置 | 类型层 | 低 | 随时 |

---

## 7. 可测试性评估

| 模块 | 当前可测试性 | 边界测试建议 |
|------|-------------|-------------|
| `lib/timeline.ts` | ⭐⭐⭐⭐⭐ 纯函数 | 已最适合测试，却缺少测试 |
| `lib/safe-text.ts` | ⭐⭐⭐⭐ 纯函数 | 已有测试 ✅ |
| `hooks/useMediaQuery` | ⭐⭐⭐⭐ 可 mock | 已有测试 ✅ |
| `stores/historyStore.ts` | ⭐⭐⭐ 纯状态逻辑 | 可独立测试 undo/redo 边界 |
| `services/api.ts` | ⭐⭐ 依赖 fetch | 可 mock fetch 测试 request/response |
| `services/api-hooks.ts` | ⭐ 依赖 QueryClient | 需要工厂化后才能有效测试 |
| `lib/shortcut-registry.ts` | ⭐ 依赖 window + store | 需要解耦 store 后才能测试 |
| `lib/theme-adapter.tsx` | ⭐ 依赖 DOM | 需要抽象 DOM 操作层 |
| `components/` | ⭐⭐ 依赖 hooks | 需要统一 mock 工厂 |

---

> **报告结束**。本报告基于静态代码分析，未包含运行时性能数据。建议在实际重构前，使用 Vitest 为现有代码补充基础测试，作为重构的安全网。
