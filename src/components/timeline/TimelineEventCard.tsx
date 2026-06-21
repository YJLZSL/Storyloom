import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TTag } from '@/components/ui-tdesign';
import { TimeIcon, LocalTwoIcon, TagIcon, EditIcon, LinkIcon, FileTextIcon } from '@/lib/icons';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { safeJsonArray } from '@/lib/utils';
import type { TimelineEvent } from '../../../shared/types';

const MIN_DURATION_MS = 60 * 60 * 1000; // 1 hour minimum duration
const DRAG_THRESHOLD_PX = 4;

interface ResizeState {
  edge: 'left' | 'right';
  startPointerX: number;
  originalStartMs: number;
  originalEndMs: number;
}

interface DragState {
  startPointerX: number;
  originalStartMs: number;
  originalEndMs: number | null;
  active: boolean;
}

export interface TimelineEventCardProps {
  event: TimelineEvent;
  left: number;
  width: number;
  top: number;
  height: number;
  pixelsPerMs: number;
  isInstant?: boolean;
  onResizeEnd: (eventId: string, startTime: number | null, endTime: number | null) => void;
  onDragEnd?: (eventId: string, startTime: number, endTime: number | null) => void;
}

function formatTime(ms: number | null): string {
  if (ms === null) return '—';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

export function TimelineEventCard({
  event,
  left,
  width,
  top,
  height,
  pixelsPerMs,
  isInstant = false,
  onResizeEnd,
  onDragEnd,
}: TimelineEventCardProps) {
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const selectedCharacterId = useSelectionStore((s) => s.selectedCharacterId);
  const selectEvent = useSelectionStore((s) => s.selectEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const setDetailEvent = useUIStore((s) => s.setDetailEvent);
  const [isHovered, setIsHovered] = useState(false);

  const isCharacterFilterActive = !!selectedCharacterId;
  const isCharacterMatched = selectedCharacterId
    ? (event.characterIds ?? []).includes(selectedCharacterId)
    : true;
  const isDimmed = isCharacterFilterActive && !isCharacterMatched;

  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [liveStartMs, setLiveStartMs] = useState<number | null>(null);
  const [liveEndMs, setLiveEndMs] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDeltaMs, setDragDeltaMs] = useState(0);

  const isSelected = selectedEventId === event.id;

  const startMs = event.startTime ? new Date(event.startTime).getTime() : null;
  const endMs = event.endTime ? new Date(event.endTime).getTime() : null;

  const tags = safeJsonArray<string>(event.tagsJson, []);
  const eventColor = event.color || 'rgb(var(--primary))';

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectEvent(event.id);
    setDetailEvent(event.id);
  }, [event.id, selectEvent, setDetailEvent]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectEvent(event.id);
    setActivePanel('event-editor');
  }, [event.id, selectEvent, setActivePanel]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectEvent(event.id);
    setActivePanel('event-editor');
  }, [event.id, selectEvent, setActivePanel]);

  const handleLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectEvent(event.id);
    setActivePanel('connections');
  }, [event.id, selectEvent, setActivePanel]);

  const handleOutline = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectEvent(event.id);
    setActivePanel('properties');
  }, [event.id, selectEvent, setActivePanel]);

  // Resize handle drag
  const handleResizeStart = useCallback((e: React.PointerEvent, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    if (!startMs || !endMs) return;
    setResizeState({
      edge,
      startPointerX: e.clientX,
      originalStartMs: startMs,
      originalEndMs: endMs,
    });
    setLiveStartMs(startMs);
    setLiveEndMs(endMs);
  }, [startMs, endMs]);

  useEffect(() => {
    if (!resizeState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - resizeState.startPointerX;
      const deltaMs = dx / pixelsPerMs;

      if (resizeState.edge === 'left') {
        let newStart = resizeState.originalStartMs + deltaMs;
        if (resizeState.originalEndMs - newStart < MIN_DURATION_MS) {
          newStart = resizeState.originalEndMs - MIN_DURATION_MS;
        }
        setLiveStartMs(newStart);
      } else {
        let newEnd = resizeState.originalEndMs + deltaMs;
        if (newEnd - resizeState.originalStartMs < MIN_DURATION_MS) {
          newEnd = resizeState.originalStartMs + MIN_DURATION_MS;
        }
        setLiveEndMs(newEnd);
      }
    };

    const handlePointerUp = () => {
      if (resizeState.edge === 'left' && liveStartMs !== null) {
        onResizeEnd(event.id, liveStartMs, resizeState.originalEndMs);
      } else if (resizeState.edge === 'right' && liveEndMs !== null) {
        onResizeEnd(event.id, resizeState.originalStartMs, liveEndMs);
      }
      setResizeState(null);
      setLiveStartMs(null);
      setLiveEndMs(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizeState, liveStartMs, liveEndMs, pixelsPerMs, event.id, onResizeEnd]);

  // Card body drag (move event in time)
  const handleCardPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (!onDragEnd) return;
    if (!startMs) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle="true"]')) return;
    if (target.closest('[data-quick-action="true"]')) return;
    e.stopPropagation();
    setDragState({
      startPointerX: e.clientX,
      originalStartMs: startMs,
      originalEndMs: endMs,
      active: false,
    });
    setDragDeltaMs(0);
  }, [onDragEnd, startMs, endMs]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragState.startPointerX;
      if (!dragState.active && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      if (!dragState.active) {
        setDragState({ ...dragState, active: true });
      }
      setDragDeltaMs(dx / pixelsPerMs);
    };

    const handlePointerUp = () => {
      if (dragState.active && onDragEnd) {
        const deltaMs = dragDeltaMs;
        if (Math.abs(deltaMs) > 1) {
          const newStart = dragState.originalStartMs + deltaMs;
          const newEnd = dragState.originalEndMs !== null
            ? dragState.originalEndMs + deltaMs
            : null;
          onDragEnd(event.id, newStart, newEnd);
        }
      }
      setDragState(null);
      setDragDeltaMs(0);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, dragDeltaMs, pixelsPerMs, event.id, onDragEnd]);

  const isDragging = dragState?.active === true;
  const dragOffsetPx = isDragging ? dragDeltaMs * pixelsPerMs : 0;

  const displayStart = liveStartMs ?? (isDragging && startMs !== null ? startMs + dragDeltaMs : startMs);

  // Build border/shadow styles based on state
  const getBorderClass = () => {
    if (isSelected) return 'border-primary/50';
    if (isDragging) return 'border-primary/60';
    return 'border-border/40 hover:border-border/60';
  };

  const getShadowStyle = () => {
    if (isSelected) {
      return `0 0 0 2px ${eventColor}33, 0 0 16px -2px ${eventColor}33`;
    }
    if (isDragging) {
      return `0 12px 32px -4px ${eventColor}33, 0 4px 8px -2px ${eventColor}1a, 0 0 0 1px ${eventColor}40`;
    }
    return undefined;
  };

  const showQuickActions = isHovered && !isDragging && !resizeState && width > 120;

  return (
    <motion.div
      data-event-id={event.id}
      data-instant={isInstant ? 'true' : 'false'}
      className={`timeline-glow absolute rounded-xl border select-none overflow-hidden backdrop-blur-sm transition-all duration-200 ease-out ${getBorderClass()} ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${isSelected ? 'selected' : ''} ${isDragging ? 'drag-ghost' : ''}`}
      style={{
        left: left + dragOffsetPx,
        top,
        width: Math.max(width, 40),
        height,
        zIndex: isDragging ? 20 : isSelected ? 5 : isHovered ? 3 : 1,
        opacity: isDragging ? 0.88 : isDimmed ? 0.3 : 1,
        boxShadow: getShadowStyle(),
        backgroundColor: event.color
          ? `${event.color}18`
          : 'rgb(var(--card) / 0.9)',
        transform: isSelected ? 'scale(1.01) translateY(-1px)' : isDragging ? 'rotate(1deg)' : undefined,
      }}
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: isDimmed ? 0.3 : 1, scale: isSelected ? 1.01 : 1, y: isSelected ? -1 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      whileHover={!isDragging && !isSelected ? { scale: 1.005, y: -1, transition: { duration: 0.15 } } : undefined}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handleCardPointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left accent bar — 渐变 + 动态光晕 */}
      <div
        className="absolute left-0 top-0 bottom-0 rounded-l-xl transition-all duration-300"
        style={{
          width: isSelected ? 4 : isHovered ? 3.5 : 3,
          background: `linear-gradient(to bottom, ${eventColor}, ${eventColor}66)`,
          boxShadow: isHovered || isSelected ? `3px 0 12px -1px ${eventColor}50` : 'none',
          transition: 'width 0.3s ease, box-shadow 0.3s ease',
        }}
      />

      {/* 选中状态顶部光条 */}
      {isSelected && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl transition-opacity duration-300"
          style={{
            background: `linear-gradient(to right, ${eventColor}, ${eventColor}80, transparent)`,
          }}
        />
      )}

      {/* 织线边框效果（伪元素模拟） */}
      <div
        className="absolute left-1 top-2 bottom-2 w-px pointer-events-none transition-opacity duration-200"
        style={{
          background: `repeating-linear-gradient(to bottom, ${eventColor}20 0px, ${eventColor}20 4px, transparent 4px, transparent 8px)`,
          opacity: isHovered ? 0.6 : 0,
        }}
      />

      {/* Hover 背景扫光效果 */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${eventColor}08 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Resize handle - left */}
      {startMs && endMs && (
        <div
          data-resize-handle="true"
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity bg-primary/20"
          onPointerDown={(e) => handleResizeStart(e, 'left')}
          style={{ zIndex: 40 }}
        />
      )}

      {/* Resize handle - right */}
      {startMs && endMs && (
        <div
          data-resize-handle="true"
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity bg-primary/20"
          onPointerDown={(e) => handleResizeStart(e, 'right')}
          style={{ zIndex: 40 }}
        />
      )}

      {/* Content */}
      <div
        className={`relative z-10 h-full flex flex-col ${isInstant ? 'pl-2' : 'pl-2'}`}
        style={{ fontSize: 'calc(var(--timeline-base-font-size) * var(--zoom))' }}
      >
        <h4 className="font-serif text-[1.08em] font-semibold truncate leading-tight text-card-foreground tracking-[0.01em]">
          {event.title}
        </h4>
        {width > 100 && event.summary && (
          <p className="text-[0.83em] text-muted-foreground/90 mt-0.5 line-clamp-1 leading-tight">{event.summary}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto">
          {displayStart && (
            <span className="flex items-center gap-1 text-[0.75em] text-muted-foreground font-mono">
              <TimeIcon size={10} />
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              {formatTime(displayStart)}
            </span>
          )}
          {event.location && width > 100 && (
            <span className="flex items-center gap-1 text-[0.75em] text-muted-foreground/80">
              <LocalTwoIcon size={10} />
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              {event.location}
            </span>
          )}
        </div>
        {tags.length > 0 && width > 90 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {tags.slice(0, width > 140 ? 2 : 1).map((tag, i) => {
              const theme = i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'warning' : 'default';
              return (
                <TTag
                  key={i}
                  theme={theme}
                  variant="light"
                  size="small"
                  icon={<TagIcon size={10} />}
                >
                  {tag}
                </TTag>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover 快速操作 */}
      {showQuickActions && (
        <div
          className="absolute top-1.5 right-1.5 flex gap-1 z-20"
          data-quick-action="true"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { icon: <EditIcon size={12} />, onClick: handleEdit, title: '编辑' },
            { icon: <LinkIcon size={12} />, onClick: handleLink, title: '关联' },
            { icon: <FileTextIcon size={12} />, onClick: handleOutline, title: '大纲' },
          ].map((btn, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
              onClick={btn.onClick}
              className="ripple-btn w-6 h-6 rounded-full bg-background/90 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-150 shadow-sm hover:shadow-md"
              title={btn.title}
            >
              {btn.icon}
            </motion.button>
          ))}
        </div>
      )}

      {/* Resize tooltip */}
      {resizeState && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover border border-border text-[10px] font-mono shadow-lg whitespace-nowrap z-50"
        >
          {resizeState.edge === 'left' ? '起: ' : '止: '}
          {formatTime(resizeState.edge === 'left' ? liveStartMs : liveEndMs)}
        </div>
      )}

      {/* Drag tooltip */}
      {isDragging && startMs !== null && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover border border-border text-[10px] font-mono shadow-lg whitespace-nowrap z-50"
        >
          移至: {formatTime(startMs + dragDeltaMs)}
        </div>
      )}
    </motion.div>
  );
}
