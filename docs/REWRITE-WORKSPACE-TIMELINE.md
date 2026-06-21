# 工作区 + 时间轴系统重写蓝图 — 面向下一个 AI

> 版本基线：v1.2.1
> 创建日期：2026-06-21
> 优先级：P0（核心系统重构）
> 状态：待实施

**⚠️ 本文档是 v1.3.0 重构的唯一实施参考。请通读全文后再动手。**

---

## 目录

- [一、当前问题分析](#一当前问题分析)
- [二、根因诊断](#二根因诊断)
- [三、重构目标](#三重构目标)
- [四、工作区系统重写方案](#四工作区系统重写方案)
- [五、时间轴系统重写方案](#五时间轴系统重写方案)
- [六、已安装技能使用指南](#六已安装技能使用指南)
- [七、实施步骤与验证](#七实施步骤与验证)
- [八、文件变更清单](#八文件变更清单)

---

## 一、当前问题分析

### 1.1 截图证据（v1.2.1 仍存在）

**问题 A：工作区删除失败**
- 截图：「管理工作区」对话框中点击删除 → 报错「删除失败: 工作区不存在」
- 现象：工作区明明显示在列表中，但删除时后端说「不存在」

**问题 B：创建轨道失败**
- 截图：「新建轨道」对话框中点击创建 → 报错「创建轨道失败」
- 现象：输入轨道名称后无法创建

**问题 C（推断）：时间轴 UI 问题太多**
- 用户原话：「目前工作区还有时间轴问题太多，需要你帮他重写工作区和时间轴，包括ui，整体逻辑重构」

### 1.2 已尝试的修复（v1.2.1，不够彻底）

| 修复 | 效果 |
|------|------|
| DDL 兜底添加 bookmarks 表 | 修复了部分场景，但根因未除 |
| ensureSchemaCompatibility 补建表 | 同上 |
| 工作区删除 try-catch 容错 | 只改善了错误信息，核心 bug 仍在 |
| 翻译键补充 | UI 文案已修复 |
| TDesign 字体覆盖 | 字体统一已修复 |
| 右键菜单添加书签/地图 | 已修复 |

**结论：v1.2.1 的修复是「补丁式」的，没有触及根本架构问题。需要全面重写。**

---

## 二、根因诊断

### 2.1 数据库层面

**核心问题：Drizzle 迁移在 asar 内静默失败，兜底机制不完善**

当前架构：
```
drizzle migrate()  →  手动读SQL文件  →  readMigrationFiles API  →  硬编码DDL兜底
     (asar内失败)          (可能也失败)         (可能也失败)              (最终兜底)
```

问题链：
1. `drizzle migrate()` 在 asar 内因路径问题静默失败
2. 4 层兜底虽然存在，但每层都可能部分成功部分失败
3. `ensureSchemaCompatibility()` 只检查列，不检查表是否存在
4. 结果：某些表（如 bookmarks）可能不存在，但 `workspaces` 表存在，系统认为迁移成功

### 2.2 工作区删除失败的根因

```
前端发送 DELETE /api/workspaces/{id}
  ↓
后端检查：SELECT * FROM workspaces WHERE id = ?
  ↓
如果找不到 → 返回 404「工作区不存在」
```

**可能的失败原因：**
1. 前端存储的 workspaceId 与数据库中实际 ID 不一致
2. 数据库文件被锁定或损坏
3. workspaceId 格式问题（UUID 校验失败）
4. 删除事务中某个表操作失败导致整个事务回滚

### 2.3 创建轨道失败的根因

```
前端发送 POST /api/workspaces/{workspaceId}/tracks
  Body: { name, color }
  ↓
后端校验：validateWorkspaceExists(workspaceId)
  ↓
如果工作区不存在 → 返回 404
```

**与删除失败共享同一个根因：工作区在数据库中的状态与前端不一致。**

### 2.4 时间轴系统的问题

1. **TimelineCanvas.tsx 过于庞大**：单文件承载了太多逻辑
2. **事件渲染性能差**：没有虚拟化，大量事件时卡顿
3. **拖拽交互不完善**：事件拖拽、轨道排序等功能不完整
4. **缩放系统复杂**：zoom 状态散落在多个组件中

---

## 三、重构目标

### 3.1 工作区系统

| 目标 | 说明 |
|------|------|
| **可靠性** | 工作区 CRUD 必须 100% 可靠，不能有「不存在」的诡异错误 |
| **数据一致性** | 前端 store 与数据库必须严格同步 |
| **错误恢复** | 数据库损坏时能自动修复或给出明确提示 |
| **UI 清晰** | 工作区管理界面简洁直观 |

### 3.2 时间轴系统

| 目标 | 说明 |
|------|------|
| **性能** | 1000+ 事件不卡顿（虚拟化渲染） |
| **交互完善** | 拖拽创建事件、拖拽排序、拖拽调整时间 |
| **缩放流畅** | zoom 状态集中管理，缩放平滑 |
| **代码可维护** | 拆分为小模块，单一职责 |
| **UI 统一** | 使用项目设计系统，视觉一致 |

---

## 四、工作区系统重写方案

### 4.1 后端重写

#### 4.1.1 数据库初始化重构

**当前问题**：4 层兜底太复杂，难以调试。

**新方案**：简化为 2 层

```typescript
// server/db/init.ts（新文件，替代 migrate.ts）

export function initDatabase(): void {
  const sqlite = getSqlite();
  
  // 第 1 层：直接用 Drizzle 的 schema 生成建表 SQL
  // 使用 CREATE TABLE IF NOT EXISTS，幂等
  const createTableSQL = generateCreateTableSQL(schema);
  sqlite.exec(createTableSQL);
  
  // 第 2 层：ensureSchemaCompatibility（补列 + 补表）
  ensureSchemaCompatibility();
  
  // 验证：核心表必须存在
  verifyEssentialTables();
}
```

**关键改动**：
- 不再依赖 drizzle 的 migrate() 函数（asar 内不可靠）
- 不再读取迁移 SQL 文件（路径问题）
- 直接从 `schema.ts` 生成 CREATE TABLE IF NOT EXISTS 语句
- 所有表都在 schema.ts 中定义，不需要硬编码 DDL

#### 4.1.2 工作区 CRUD 路由重写

**当前问题**：错误处理不够细致，事务可能部分失败。

**新方案**：增强错误处理和日志

```typescript
// server/routes/workspaces/crud.ts（重写）

// 删除工作区 — 增强版
app.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  
  // 1. 详细日志
  app.log.info({ workspaceId: id }, '[DELETE] 开始删除工作区');
  
  // 2. 检查工作区是否存在
  const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  if (!existing) {
    app.log.warn({ workspaceId: id }, '[DELETE] 工作区不存在');
    return reply.status(404).send({
      success: false,
      error: {
        code: 'WORKSPACE_NOT_FOUND',
        message: `工作区不存在 (ID: ${id.slice(0, 8)}...)`,
        debug: { workspaceId: id }
      }
    });
  }
  
  // 3. 逐表删除，每表独立 try-catch
  const tables = [
    { name: 'events', table: events },
    { name: 'tracks', table: tracks },
    { name: 'characters', table: characters },
    // ... 所有表
  ];
  
  for (const { name, table } of tables) {
    try {
      app.db.delete(table).where(eq(table.workspaceId, id)).run();
      app.log.info({ table: name }, '[DELETE] 表已清理');
    } catch (err) {
      // 表可能不存在，记录但不中断
      app.log.warn({ table: name, err: err.message }, '[DELETE] 表清理失败（已忽略）');
    }
  }
  
  // 4. 最后删除工作区本身
  app.db.delete(workspaces).where(eq(workspaces.id, id)).run();
  app.log.info({ workspaceId: id }, '[DELETE] 工作区已删除');
  
  return { success: true, data: { id } };
});
```

**关键改动**：
- 详细的错误信息（包含 workspaceId 片段用于调试）
- 逐表删除而非事务（避免一个表失败导致全部回滚）
- 每步都有日志，方便定位问题

#### 4.1.3 添加数据库健康检查端点

```typescript
// server/routes/health.ts（新文件）

app.get('/api/health/db', async () => {
  const tables = ['workspaces', 'tracks', 'events', 'characters', 'bookmarks', 'maps'];
  const results: Record<string, boolean> = {};
  
  for (const table of tables) {
    results[table] = tableExists(table);
  }
  
  return {
    success: true,
    data: {
      tables: results,
      allHealthy: Object.values(results).every(Boolean)
    }
  };
});
```

### 4.2 前端重写

#### 4.2.1 工作区 Store 重写

**当前问题**：`useWorkspaceStore` 使用 localStorage 持久化，可能与数据库不同步。

**新方案**：

```typescript
// src/stores/useWorkspaceStore.ts（重写）

interface WorkspaceStore {
  // 状态
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  
  // 操作
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string | null) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  switchWorkspace: (id: string) => Promise<void>;
}
```

**关键改动**：
- 每次操作后都重新 fetch 列表，确保与数据库同步
- 添加 loading 和 error 状态
- `switchWorkspace` 做完整的状态重置（清空轨道、事件等缓存）

#### 4.2.2 WorkspaceManagerDialog 重写

**当前问题**：删除逻辑简单，没有足够的错误处理。

**新方案**：

```typescript
// src/components/workspace/WorkspaceManagerDialog.tsx（重写）

function WorkspaceManagerDialog({ open, onClose }) {
  const { workspaces, currentWorkspaceId, deleteWorkspace, switchWorkspace } = useWorkspaceStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    setDeletingId(id);
    try {
      await deleteWorkspace(id);
      MessagePlugin.success('工作区已删除');
      setConfirmDeleteId(null);
    } catch (err) {
      // 显示详细错误信息
      const message = err instanceof APIError
        ? `删除失败: ${err.message} (code: ${err.code})`
        : '删除失败: 未知错误';
      MessagePlugin.error(message);
    } finally {
      setDeletingId(null);
    }
  };
  
  // ... 渲染
}
```

**关键改动**：
- 显示详细错误信息（包含 error code）
- 删除时有 loading 状态，防止重复点击
- 删除成功后自动刷新列表

#### 4.2.3 WorkspaceSelector 重写

```typescript
// src/components/workspace/WorkspaceSelector.tsx（重写）

function WorkspaceSelector() {
  const { workspaces, currentWorkspaceId, switchWorkspace } = useWorkspaceStore();
  const [managerOpen, setManagerOpen] = useState(false);
  
  // 如果没有工作区，显示创建引导
  if (workspaces.length === 0) {
    return <CreateWorkspaceGuide />;
  }
  
  return (
    <div className="workspace-selector">
      <Dropdown>
        <DropdownTrigger>
          <Button>
            {currentWorkspace?.name || '选择工作区'}
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          {workspaces.map(ws => (
            <DropdownItem
              key={ws.id}
              active={ws.id === currentWorkspaceId}
              onClick={() => switchWorkspace(ws.id)}
            >
              {ws.name}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem onClick={() => setManagerOpen(true)}>
            管理工作区
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
      
      <WorkspaceManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
    </div>
  );
}
```

---

## 五、时间轴系统重写方案

### 5.1 架构设计

**当前问题**：TimelineCanvas.tsx 是一个巨型组件（可能超过 1000 行），难以维护。

**新架构**：模块化拆分

```
TimelineView/
├── TimelineView.tsx          # 容器组件，管理 zoom/scroll 状态
├── TimelineRuler/
│   ├── TimelineRuler.tsx     # 时间标尺
│   └── RulerTick.tsx         # 单个刻度
├── TimelineTrack/
│   ├── TimelineTrack.tsx     # 单个轨道
│   ├── TrackHeader.tsx       # 轨道头部（名称、操作按钮）
│   └── TrackContent.tsx      # 轨道内容区（事件卡片容器）
├── TimelineEvent/
│   ├── TimelineEventCard.tsx # 事件卡片
│   ├── EventCardMenu.tsx     # 事件右键菜单
│   └── EventDragHandle.tsx   # 拖拽手柄
├── TimelineGrid/
│   └── TimelineGrid.tsx      # 背景网格线
├── TimelineToolbar/
│   └── TimelineToolbar.tsx   # 时间轴工具栏（缩放、筛选）
└── hooks/
    ├── useTimelineZoom.ts    # 缩放逻辑
    ├── useTimelineScroll.ts  # 滚动逻辑
    └── useEventDrag.ts       # 事件拖拽逻辑
```

### 5.2 虚拟化渲染

**当前问题**：所有事件都渲染到 DOM，大量事件时卡顿。

**新方案**：使用 `react-window` 或 `@tanstack/virtual`

```typescript
// src/components/timeline/hooks/useTimelineVirtualizer.ts

import { useVirtualizer } from '@tanstack/react-virtual';

export function useTimelineVirtualizer({
  tracks,
  events,
  zoom,
  scrollContainerRef,
}) {
  // 轨道虚拟化（垂直方向）
  const trackVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => TRACK_HEIGHT + TRACK_GAP,
    overscan: 3,
  });
  
  // 事件虚拟化（水平方向，每个轨道内）
  const eventVirtualizers = useMemo(() => {
    return tracks.map(track => {
      const trackEvents = events.filter(e => e.trackId === track.id);
      return useVirtualizer({
        count: trackEvents.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => EVENT_CARD_WIDTH,
        overscan: 5,
        horizontal: true,
      });
    });
  }, [tracks, events]);
  
  return { trackVirtualizer, eventVirtualizers };
}
```

### 5.3 缩放系统重写

**当前问题**：zoom 状态散落在多个组件中。

**新方案**：集中到 store

```typescript
// src/stores/useTimelineStore.ts（增强）

interface TimelineStore {
  // ... 现有状态
  
  // 缩放
  zoom: number;           // 0.1 ~ 3.0
  zoomAnchor: 'center' | 'cursor';  // 缩放锚点
  
  // 操作
  setZoom: (zoom: number) => void;
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  resetZoom: () => void;
  
  // 计算属性
  pixelsPerDay: () => number;  // 根据 zoom 计算每天占多少像素
}
```

### 5.4 拖拽系统

**新方案**：使用 `@dnd-kit` 库

```typescript
// src/components/timeline/hooks/useEventDrag.ts

import { useDraggable } from '@dnd-kit/core';

export function useEventDrag(event: TimelineEvent) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });
  
  const updateEvent = useUpdateEvent();
  
  const handleDragEnd = (event: DragEndEvent) => {
    const deltaX = event.delta.x;
    const deltaTime = pixelsToTime(deltaX, zoom);
    
    updateEvent.mutate({
      id: event.id,
      data: {
        startTime: event.startTime + deltaTime,
        endTime: event.endTime ? event.endTime + deltaTime : null,
      }
    });
  };
  
  return { attributes, listeners, setNodeRef, transform, isDragging };
}
```

### 5.5 UI 重写

#### 5.5.1 事件卡片

```typescript
// src/components/timeline/TimelineEvent/TimelineEventCard.tsx

function TimelineEventCard({ event, isSelected, onSelect }) {
  return (
    <div
      className={cn(
        'relative rounded-lg border p-2 cursor-pointer transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      style={{
        backgroundColor: event.color || 'var(--card)',
        width: `${eventWidth}px`,
      }}
      onClick={() => onSelect(event.id)}
    >
      {/* 标题 */}
      <div className="font-medium text-sm truncate">{event.title}</div>
      
      {/* 时间 */}
      <div className="text-xs text-muted-foreground mt-0.5">
        {formatTime(event.startTime)} - {formatTime(event.endTime)}
      </div>
      
      {/* 摘要（如果有空间） */}
      {eventWidth > 150 && event.summary && (
        <div className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
          {event.summary}
        </div>
      )}
      
      {/* 关联角色头像 */}
      {event.characterIds.length > 0 && (
        <div className="flex -space-x-1 mt-1">
          {event.characterIds.slice(0, 3).map(charId => (
            <CharacterAvatar key={charId} characterId={charId} size="xs" />
          ))}
          {event.characterIds.length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              +{event.characterIds.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 5.5.2 轨道头部

```typescript
// src/components/timeline/TimelineTrack/TrackHeader.tsx

function TrackHeader({ track, onEdit, onDelete, onToggleVisibility }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-r bg-card/50">
      {/* 颜色指示器 */}
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: track.color }}
      />
      
      {/* 轨道名称 */}
      <span className="font-medium text-sm truncate flex-1">
        {track.name}
      </span>
      
      {/* 操作按钮（hover 显示） */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          size="xs"
          onClick={() => onToggleVisibility(track.id)}
          title={track.isVisible ? '隐藏轨道' : '显示轨道'}
        >
          {track.isVisible ? <EyeIcon size={12} /> : <EyeOffIcon size={12} />}
        </IconButton>
        <IconButton size="xs" onClick={() => onEdit(track)} title="编辑轨道">
          <EditIcon size={12} />
        </IconButton>
        <IconButton size="xs" onClick={() => onDelete(track)} title="删除轨道">
          <TrashIcon size={12} />
        </IconButton>
      </div>
    </div>
  );
}
```

---

## 六、已安装技能使用指南

### 6.1 electron-dev（Electron 桌面应用开发）

**安装状态**：✅ 已安装

**用途**：
- Electron 安全最佳实践（contextIsolation、sandbox 等）
- 性能优化（懒加载、内存管理）
- IPC 通信模式
- 窗口管理
- 打包和分发

**何时使用**：
- 修改 Electron 主进程代码时
- 处理 IPC 通信问题时
- 优化启动性能时
- 配置打包参数时

**示例调用**：
```
在实现新的工作区管理功能时，请使用 electron-dev 技能确保：
1. 所有 IPC 通信都通过 preload 脚本暴露的 API
2. 渲染进程不直接访问 Node.js API
3. 数据库操作在主进程中进行
```

### 6.2 frontend-design（前端设计）

**安装状态**：✅ 已安装

**用途**：
- 创建高质量的前端界面
- React + Tailwind CSS 组件设计
- 响应式布局
- 动画和交互设计
- 设计系统构建

**何时使用**：
- 重写 WorkspaceManagerDialog 时
- 重写 TimelineEventCard 时
- 设计新的时间轴 UI 时
- 创建新的组件时

**示例调用**：
```
在重写时间轴事件卡片时，请使用 frontend-design 技能确保：
1. 卡片视觉层次清晰（标题 > 时间 > 摘要）
2. 交互反馈明确（hover、selected、dragging 状态）
3. 动画流畅但不干扰操作
4. 与项目整体设计系统一致
```

### 6.3 如何调用技能

在开始实施前，先调用技能获取最佳实践：

```typescript
// 示例：在重写工作区管理对话框前
Skill({ skill: 'frontend-design', args: '为 Storyloom 重写 WorkspaceManagerDialog 组件，需要：工作区列表、切换按钮、删除按钮（带二次确认）、新建工作区入口。使用 TDesign React 组件库。' });

// 示例：在实现拖拽功能前
Skill({ skill: 'electron-dev', args: '在 Electron 应用中实现时间轴事件的拖拽排序功能，需要注意哪些性能和安全性问题？' });
```

---

## 七、实施步骤与验证

### 7.1 阶段划分

**阶段 1：数据库层修复（1-2 天）**
1. 重写 `server/db/init.ts`，简化初始化逻辑
2. 增强 `ensureSchemaCompatibility()`，添加表存在性检查
3. 添加 `/api/health/db` 健康检查端点
4. **验证**：启动应用，检查所有表是否存在

**阶段 2：工作区后端重写（1-2 天）**
1. 重写 `server/routes/workspaces/crud.ts`，增强错误处理
2. 添加详细日志
3. **验证**：使用 Postman/curl 测试所有 CRUD 操作

**阶段 3：工作区前端重写（2-3 天）**
1. 重写 `src/stores/useWorkspaceStore.ts`
2. 重写 `src/components/workspace/WorkspaceManagerDialog.tsx`
3. 重写 `src/components/workspace/WorkspaceSelector.tsx`
4. **验证**：手动测试创建、切换、删除工作区

**阶段 4：时间轴架构重构（3-4 天）**
1. 拆分 TimelineCanvas.tsx 为多个子组件
2. 实现虚拟化渲染
3. 重写缩放系统
4. **验证**：1000+ 事件不卡顿

**阶段 5：时间轴 UI 重写（2-3 天）**
1. 重写事件卡片 UI
2. 重写轨道头部 UI
3. 添加拖拽功能
4. **验证**：视觉走查，确保与设计系统一致

**阶段 6：集成测试 + 构建（1-2 天）**
1. 端到端测试所有核心流程
2. 构建安装包
3. 在真机上验证
4. 上传到 GitHub Release

### 7.2 验证清单

**工作区系统**：
- [ ] 创建工作区 → 成功
- [ ] 切换工作区 → 成功，数据正确加载
- [ ] 删除工作区 → 成功，列表刷新
- [ ] 删除最后一个工作区 → 显示空状态引导
- [ ] 工作区名称过长 → 正确截断显示
- [ ] 网络错误 → 显示友好错误提示

**时间轴系统**：
- [ ] 创建轨道 → 成功
- [ ] 创建事件 → 成功
- [ ] 1000 个事件 → 流畅滚动
- [ ] 缩放时间轴 → 流畅，无跳变
- [ ] 拖拽事件 → 成功，时间正确更新
- [ ] 删除事件 → 成功
- [ ] 切换工作区 → 时间轴数据正确刷新

---

## 八、文件变更清单

### 新增文件

| 路径 | 说明 |
|------|------|
| `server/db/init.ts` | 新的数据库初始化逻辑（替代 migrate.ts） |
| `server/routes/health.ts` | 健康检查端点 |
| `src/components/timeline/TimelineRuler/` | 时间标尺模块 |
| `src/components/timeline/TimelineTrack/` | 轨道模块 |
| `src/components/timeline/TimelineEvent/` | 事件模块 |
| `src/components/timeline/TimelineGrid/` | 网格模块 |
| `src/components/timeline/hooks/` | 时间轴相关 hooks |

### 重写文件

| 路径 | 改动说明 |
|------|----------|
| `server/db/index.ts` | 简化初始化流程 |
| `server/routes/workspaces/crud.ts` | 增强错误处理和日志 |
| `src/stores/useWorkspaceStore.ts` | 增强状态同步 |
| `src/stores/useTimelineStore.ts` | 集中管理 zoom 状态 |
| `src/components/workspace/WorkspaceManagerDialog.tsx` | UI 重写 |
| `src/components/workspace/WorkspaceSelector.tsx` | UI 重写 |
| `src/components/timeline/TimelineCanvas.tsx` | 拆分为多个子组件 |
| `src/components/timeline/TimelineEventCard.tsx` | UI 重写 |

### 删除文件

| 路径 | 说明 |
|------|------|
| `server/db/migrate.ts` | 被 init.ts 替代 |

---

## 附：给下一个 AI 的临别叮嘱

1. **先读文档再动手**：本文档、`HANDOVER-v1.2.0.md`、`AI-INTEGRATION-GUIDE.md`
2. **小步验证**：每改一个模块就测试，不要一口气改完再测
3. **日志是最好的调试工具**：在关键路径加详细日志
4. **数据库问题优先解决**：工作区和轨道的问题根因都在数据库层
5. **使用已安装的技能**：`electron-dev` 和 `frontend-design` 能提供最佳实践
6. **构建命令**：`ATC_DIST_DIR="D:/AIKFCC/Storyloom/release-vX.Y.Z" npx electron-builder --win --publish never`
7. **推送命令**：`git push "https://x-access-token:$(gh auth token)@github.com/YJLZSL/Storyloom.git" master`

---

*本文档是工作区+时间轴系统重写的完整蓝图。严格按此实施，可确保系统可靠性、性能、可维护性全面提升。*
