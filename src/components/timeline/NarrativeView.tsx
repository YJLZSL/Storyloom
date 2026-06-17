import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GripVertical, Clock, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useEvents, useUpdateEvent, useDeleteEvent } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';

interface DragState {
  eventId: string;
  startY: number;
  currentY: number;
  hasMoved: boolean;
}

export function NarrativeView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const { data: eventsData } = useEvents(workspaceId);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const events = eventsData?.items ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openEventEditor = useCallback((eventId: string) => {
    setSelectedEvent(eventId);
    setActivePanel('event-editor');
  }, [setSelectedEvent, setActivePanel]);

  // 按 narrativeOrder 排序事件（无值视为 0）
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aOrder = a.narrativeOrder ?? 0;
      const bOrder = b.narrativeOrder ?? 0;
      return aOrder - bOrder;
    });
  }, [events]);

  // 拖拽逻辑
  const handleDragStart = useCallback((eventId: string, clientY: number) => {
    setDragState({ eventId, startY: clientY, currentY: clientY, hasMoved: false });
  }, []);

  const handleDragMove = useCallback((e: PointerEvent) => {
    if (!dragState) return;
    const dy = e.clientY - dragState.startY;
    const hasMoved = dragState.hasMoved || Math.abs(dy) > 3;
    setDragState((prev) => prev ? { ...prev, currentY: e.clientY, hasMoved } : null);

    if (hasMoved && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-narrative-id]');
      let targetIndex = sortedEvents.length;
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          targetIndex = i;
          break;
        }
      }
      setDropIndex(targetIndex);
    }
  }, [dragState, sortedEvents.length]);

  const handleDragEnd = useCallback(() => {
    if (!dragState || !workspaceId || !dragState.hasMoved) {
      setDragState(null);
      setDropIndex(null);
      return;
    }

    // 重新计算 narrativeOrder：基于目标位置插入
    const draggedId = dragState.eventId;
    const targetIdx = dropIndex ?? sortedEvents.length;

    // 移除被拖拽的元素，构建新顺序
    const remaining = sortedEvents.filter((e) => e.id !== draggedId);
    const draggedEvent = sortedEvents.find((e) => e.id === draggedId);
    if (!draggedEvent) {
      setDragState(null);
      setDropIndex(null);
      return;
    }

    const newOrder = [...remaining];
    newOrder.splice(Math.min(targetIdx, newOrder.length), 0, draggedEvent);

    // 以步长 10 重新分配 narrativeOrder，避免冲突
    newOrder.forEach((event, idx) => {
      const newNarrativeOrder = idx * 10;
      const currentOrder = event.narrativeOrder ?? 0;
      if (currentOrder !== newNarrativeOrder) {
        updateEvent.mutate({
          workspaceId,
          eventId: event.id,
          data: { narrativeOrder: newNarrativeOrder },
        });
      }
    });

    setDragState(null);
    setDropIndex(null);
  }, [dragState, workspaceId, sortedEvents, dropIndex, updateEvent]);

  useEffect(() => {
    if (!dragState) return;
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  return (
    <div ref={containerRef} className="h-full flex flex-col p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary" />
        <h2 className="font-serif text-2xl font-semibold tracking-tight">叙事顺序</h2>
        <span className="text-xs text-muted-foreground font-sans">
          拖拽调整叙事顺序（独立于时间顺序）
        </span>
      </div>

      <div ref={listRef} className="space-y-2 max-w-3xl">
        {sortedEvents.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12 font-sans">
            暂无事件，请先在时间轴中创建
          </div>
        )}
        {sortedEvents.map((event, index) => {
          const isDragging = dragState?.eventId === event.id && dragState.hasMoved;
          return (
            <div key={event.id}>
              {/* Drop indicator above this item */}
              {dropIndex === index && (
                <div className="h-0.5 bg-primary rounded-full mb-1" />
              )}
              <div
                data-narrative-id={event.id}
                className={`narrative-card group flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-accent/40 hover:translate-x-1 transition-all cursor-pointer ${
                  isDragging ? 'opacity-40' : ''
                }`}
                onClick={() => !dragState?.hasMoved && openEventEditor(event.id)}
              >
                {/* 叙事序号 */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>

                {/* 拖拽手柄 */}
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDragStart(event.id, e.clientY);
                  }}
                  className="mt-1 p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent cursor-grab active:cursor-grabbing transition-colors shrink-0"
                  title="拖拽调整顺序"
                >
                  <GripVertical className="w-4 h-4" />
                </button>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm font-sans leading-snug truncate">
                      {event.title}
                    </h4>
                    {event.startTime && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono tracking-wide shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(event.startTime).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                  {event.summary && (
                    <p className="text-xs text-muted-foreground mt-1 font-sans leading-relaxed line-clamp-2">
                      {event.summary}
                    </p>
                  )}
                  {deletingId === event.id && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-destructive font-sans">确认删除此事件？</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (workspaceId) deleteEvent.mutate({ workspaceId, eventId: event.id });
                          setDeletingId(null);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-sans"
                      >
                        删除
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-accent hover:bg-accent/80 transition-colors font-sans"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEventEditor(event.id);
                    }}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="编辑"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(event.id);
                    }}
                    className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {/* Drop indicator at end */}
        {dropIndex === sortedEvents.length && sortedEvents.length > 0 && (
          <div className="h-0.5 bg-primary rounded-full" />
        )}
      </div>
    </div>
  );
}
