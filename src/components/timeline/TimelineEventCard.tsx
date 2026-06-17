import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Tag } from 'lucide-react';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import type { TimelineEvent } from '../../../shared/types';

const MIN_DURATION_MS = 60 * 60 * 1000; // 1 hour minimum duration

interface ResizeState {
  edge: 'left' | 'right';
  startPointerX: number;
  originalStartMs: number;
  originalEndMs: number;
}

export interface TimelineEventCardProps {
  event: TimelineEvent;
  left: number;
  width: number;
  top: number;
  height: number;
  pixelsPerMs: number;
  onResizeEnd: (eventId: string, startTime: number | null, endTime: number | null) => void;
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
  onResizeEnd,
}: TimelineEventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const selectedEventId = useTimelineStore((s) => s.selectedEventId);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [liveStartMs, setLiveStartMs] = useState<number | null>(null);
  const [liveEndMs, setLiveEndMs] = useState<number | null>(null);

  const isSelected = selectedEventId === event.id;

  const startMs = event.startTime ? new Date(event.startTime).getTime() : null;
  const endMs = event.endTime ? new Date(event.endTime).getTime() : null;

  const tags = (() => {
    try {
      return JSON.parse(event.tagsJson || '[]') as string[];
    } catch {
      return [];
    }
  })();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event.id);
  }, [event.id, setSelectedEvent]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event.id);
    setActivePanel('event-editor');
  }, [event.id, setSelectedEvent, setActivePanel]);

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
        // Min duration constraint
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

  const displayStart = liveStartMs ?? startMs;

  const baseShadow = '0 1px 2px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)';
  const selectedShadow = '0 0 0 2px var(--primary), 0 4px 12px rgba(0,0,0,0.12), 0 12px 28px rgba(0,0,0,0.10)';

  return (
    <motion.div
      data-event-id={event.id}
      ref={cardRef}
      className="absolute rounded-lg border p-2 cursor-pointer select-none overflow-hidden"
      style={{
        left,
        top,
        width: Math.max(width, 40),
        height,
        backgroundColor: 'var(--card)',
        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
        boxShadow: isSelected ? selectedShadow : baseShadow,
        zIndex: isSelected ? 30 : 10,
      }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: event.color || 'var(--primary)' }}
      />

      {/* Resize handle - left */}
      {startMs && endMs && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity bg-primary/20"
          onPointerDown={(e) => handleResizeStart(e, 'left')}
          style={{ zIndex: 40 }}
        />
      )}

      {/* Resize handle - right */}
      {startMs && endMs && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity bg-primary/20"
          onPointerDown={(e) => handleResizeStart(e, 'right')}
          style={{ zIndex: 40 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 pl-1.5 h-full flex flex-col">
        <h4 className="font-serif text-xs font-semibold truncate leading-tight">{event.title}</h4>
        {width > 100 && event.summary && (
          <p className="text-[10px] text-muted-foreground/90 mt-0.5 line-clamp-1 leading-tight">{event.summary}</p>
        )}
        {width > 80 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-auto">
            {displayStart && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-mono">
                <Clock className="w-2.5 h-2.5" />
                {formatTime(displayStart)}
              </span>
            )}
            {event.location && width > 140 && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/80">
                <MapPin className="w-2.5 h-2.5" />
                {event.location}
              </span>
            )}
          </div>
        )}
        {tags.length > 0 && width > 120 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] bg-accent/80 text-accent-foreground font-medium"
              >
                <Tag className="w-2 h-2" />
                {tag}
              </span>
            ))}
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
    </motion.div>
  );
}
