import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TTag } from '@/components/ui-tdesign';
import { TimeIcon, LocalTwoIcon, TagIcon } from '@/lib/icons';
import { useTimelineStore } from '@/stores/useTimelineStore';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const selectedCharacterId = useTimelineStore((s) => s.selectedCharacterId);
  const selectEvent = useSelectionStore((s) => s.selectEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const setDetailEvent = useUIStore((s) => s.setDetailEvent);

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

  return (
    <motion.div
      data-event-id={event.id}
      ref={cardRef}
      data-instant={isInstant ? 'true' : 'false'}
      className={`absolute rounded-xl border select-none overflow-hidden bg-card transition-[transform,box-shadow,colors] duration-200 ease-out ${
        isInstant ? 'p-1.5' : 'p-2'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
        isSelected
          ? 'border-primary shadow-md ring-2 ring-primary ring-offset-1 ring-offset-background'
          : isDragging
            ? 'border-primary shadow-md'
            : 'border-border shadow-sm hover:-translate-y-0.5 hover:shadow-md'
      }`}
      style={{
        left: left + dragOffsetPx,
        top,
        width: Math.max(width, 40),
        height,
        zIndex: isDragging ? 20 : isSelected ? 5 : 1,
        opacity: isDragging ? 0.92 : isDimmed ? 0.3 : 1,
      }}
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: isDimmed ? 0.3 : 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handleCardPointerDown}
    >
      {/* Left accent bar (wider for instant events as a time anchor) */}
      <div
        className={`absolute left-0 top-0 bottom-0 rounded-l-xl ${isInstant ? 'w-[3px]' : 'w-1'}`}
        style={{ backgroundColor: event.color || 'rgb(var(--primary))' }}
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
        className={`relative z-10 h-full flex flex-col ${isInstant ? 'pl-2' : 'pl-1.5'}`}
        style={{ fontSize: 'calc(var(--timeline-base-font-size) * var(--zoom))' }}
      >
        <h4 className="font-serif text-[1.08em] font-semibold truncate leading-tight text-card-foreground">{event.title}</h4>
        {width > 100 && event.summary && (
          <p className="text-[0.83em] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{event.summary}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto">
          {displayStart && (
            <span className="flex items-center gap-0.5 text-[0.75em] text-muted-foreground font-mono">
              <TimeIcon size={10} />
              {formatTime(displayStart)}
            </span>
          )}
          {event.location && width > 100 && (
            <span className="flex items-center gap-0.5 text-[0.75em] text-muted-foreground/80">
              <LocalTwoIcon size={10} />
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
