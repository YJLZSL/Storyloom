import { useState, useRef, useCallback } from 'react';
import { CautionIcon, LocalTwoIcon } from '@/lib/icons';
import { useForeshadowings, useUpdateForeshadowing, useEvents } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import type { Foreshadowing, ForeshadowingStatus } from '../../../shared/types';

const STATUSES: ForeshadowingStatus[] = ['planted', 'developed', 'resolved', 'abandoned'];
const STATUS_LABELS: Record<string, string> = {
  planted: '已埋下',
  developed: '发展中',
  resolved: '已回收',
  abandoned: '已废弃',
};

// 状态颜色统一使用 CSS 变量，随主题切换
const STATUS_COLOR_VARS: Record<string, string> = {
  planted: '--warning',
  developed: '--info',
  resolved: '--success',
  abandoned: '--muted-foreground',
};

function statusColorStyle(status: string): React.CSSProperties {
  return { backgroundColor: `rgb(var(${STATUS_COLOR_VARS[status] ?? '--muted-foreground'}))` };
}

function statusBorderStyle(status: string): React.CSSProperties {
  return { borderTopColor: `rgb(var(${STATUS_COLOR_VARS[status] ?? '--muted-foreground'}))` };
}

// 未回收伏笔警告阈值（毫秒，默认 14 天）
const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

interface DragState {
  foreshadowingId: string;
  fromStatus: string;
}

export function ForeshadowingBoard() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const { data: foreshadowings } = useForeshadowings(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const updateForeshadowing = useUpdateForeshadowing();

  const events = eventsData?.items ?? [];
  const eventMap = new Map(events.map((e) => [e.id, e.title]));

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((foreshadowingId: string, fromStatus: string) => {
    setDragState({ foreshadowingId, fromStatus });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragState && dropTargetStatus && dropTargetStatus !== dragState.fromStatus && workspaceId) {
      updateForeshadowing.mutate({
        workspaceId,
        foreshadowingId: dragState.foreshadowingId,
        data: { status: dropTargetStatus as ForeshadowingStatus },
      });
    }
    setDragState(null);
    setDropTargetStatus(null);
  }, [dragState, dropTargetStatus, workspaceId, updateForeshadowing]);

  // 按状态分组
  const grouped = STATUSES.map((status) => ({
    status,
    items: (foreshadowings ?? []).filter((f) => f.status === status),
  }));

  return (
    <div ref={boardRef} className="h-full flex flex-col">
      <div
        className="flex-1 grid grid-cols-4 gap-2 overflow-auto"
        onDragOver={(e) => e.preventDefault()}
      >
        {grouped.map(({ status, items }) => (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTargetStatus(status);
            }}
            onDragLeave={() => {
              setDropTargetStatus((prev) => (prev === status ? null : prev));
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropTargetStatus(status);
              handleDragEnd();
            }}
            className={`flex flex-col rounded-md border border-t-2 bg-muted/30 transition-colors ${
              dropTargetStatus === status ? 'bg-primary/10' : ''
            }`}
            style={statusBorderStyle(status)}
          >
            {/* 列头 */}
            <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-border/50 shrink-0">
              <span className="w-2 h-2 rounded-full" style={statusColorStyle(status)} />
              <span className="text-xs font-medium font-sans">{STATUS_LABELS[status]}</span>
              <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                {items.length}
              </span>
            </div>

            {/* 卡片区 */}
            <div className="flex-1 overflow-auto p-1.5 space-y-1.5 min-h-0">
              {items.length === 0 && (
                <div className="text-center text-[10px] text-muted-foreground py-4 font-sans">
                  暂无
                </div>
              )}
              {items.map((f) => {
                const isStale = isForeshadowingStale(f);
                return (
                  <div
                    key={f.id}
                    data-foreshadowing-id={f.id}
                    draggable
                    onDragStart={() => handleDragStart(f.id, f.status)}
                    onDragEnd={handleDragEnd}
                    className={`foreshadow-board-card p-2 rounded border bg-card cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                      isStale ? 'border-destructive/50' : 'border-border'
                    } ${dragState?.foreshadowingId === f.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start gap-1">
                      <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={statusColorStyle(status)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium font-sans truncate">{f.title}</span>
                          {isStale && (
                            <CautionIcon size={12} className="text-destructive shrink-0" />
                          )}
                        </div>
                        {f.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-sans line-clamp-2">
                            {f.description}
                          </p>
                        )}
                        {/* 关联事件 */}
                        {(f.plantedEventId || f.resolvedEventId) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {f.plantedEventId && eventMap.get(f.plantedEventId) && (
                              <button
                                onClick={() => scrollToEvent(f.plantedEventId!)}
                                className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-accent/50 rounded px-1 py-0.5 font-sans hover:bg-accent transition-colors"
                              >
                                <LocalTwoIcon size={8} />
                                {eventMap.get(f.plantedEventId)}
                              </button>
                            )}
                            {f.resolvedEventId && eventMap.get(f.resolvedEventId) && (
                              <button
                                onClick={() => scrollToEvent(f.resolvedEventId!)}
                                className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-accent/50 rounded px-1 py-0.5 font-sans hover:bg-accent transition-colors"
                              >
                                <LocalTwoIcon size={8} />
                                {eventMap.get(f.resolvedEventId)}
                              </button>
                            )}
                          </div>
                        )}
                        {/* 超期警告 */}
                        {isStale && (
                          <div className="text-[9px] text-destructive mt-1 font-sans">
                            未回收已超 {Math.floor(STALE_THRESHOLD_MS / (24 * 60 * 60 * 1000))} 天
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 拖拽提示 */}
      {dragState && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-sans shadow-lg pointer-events-none">
          拖拽到目标列以改变状态
        </div>
      )}
    </div>
  );
}

/** 判断伏笔是否超期未回收（planted/developed 状态超过阈值） */
function isForeshadowingStale(f: Foreshadowing): boolean {
  if (f.status !== 'planted' && f.status !== 'developed') return false;
  const created = new Date(f.createdAt).getTime();
  const updated = new Date(f.updatedAt).getTime();
  const reference = Math.max(created, updated);
  return Date.now() - reference > STALE_THRESHOLD_MS;
}
