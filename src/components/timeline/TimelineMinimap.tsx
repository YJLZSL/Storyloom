import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { TButton } from '@/components/ui-tdesign';
import { ChevronDownIcon } from '@/lib/icons';
import type { Track as TrackType, TimelineEvent } from '../../../shared/types';
import type { VisibleDateRange } from '@/stores/useTimelineStore';

interface TimelineMinimapProps {
  tracks: TrackType[];
  eventsByTrack: Map<string, TimelineEvent[]>;
  dataReferenceDateMs: number;
  dataEndDateMs: number;
  visibleDateRange: VisibleDateRange | null;
  setVisibleDateRange: (range: VisibleDateRange | null) => void;
  scrollLeft: number;
  contentWidth: number;
}

const MINIMAP_WIDTH = 200;
const PADDING = 8;
const INNER_WIDTH = MINIMAP_WIDTH - PADDING * 2;
const TRACK_HEIGHT = 20;
const TRACK_GAP = 4;
const EVENT_HEIGHT = 12;
const MIN_EVENT_WIDTH = 3;

export function TimelineMinimap({
  tracks,
  eventsByTrack,
  dataReferenceDateMs,
  dataEndDateMs,
  visibleDateRange,
  setVisibleDateRange,
  scrollLeft,
  contentWidth,
}: TimelineMinimapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragOriginalStartRef = useRef(0);
  const visibleSpanRef = useRef(0);

  const totalEvents = useMemo(() => {
    let count = 0;
    eventsByTrack.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [eventsByTrack]);

  const totalSpan = Math.max(dataEndDateMs - dataReferenceDateMs, 1);
  const msPerPx = totalSpan / INNER_WIDTH;

  const innerHeight = useMemo(() => {
    const trackCount = Math.max(tracks.length, 1);
    return trackCount * TRACK_HEIGHT + (trackCount - 1) * TRACK_GAP;
  }, [tracks.length]);

  const svgHeight = innerHeight + PADDING * 2;

  const visibleWindow = useMemo(() => {
    if (visibleDateRange) {
      const start = Math.max(visibleDateRange.startMs, dataReferenceDateMs);
      const end = Math.min(visibleDateRange.endMs, dataEndDateMs);
      const x = ((start - dataReferenceDateMs) / totalSpan) * INNER_WIDTH;
      const width = Math.max(((end - start) / totalSpan) * INNER_WIDTH, 2);
      return { x, width };
    }
    // 根据滚动位置计算视口窗口
    const x = (scrollLeft / contentWidth) * INNER_WIDTH;
    const width = Math.max((window.innerWidth / contentWidth) * INNER_WIDTH, 2);
    return { x, width };
  }, [visibleDateRange, dataReferenceDateMs, dataEndDateMs, totalSpan, scrollLeft, contentWidth]);

  const setCenteredRange = useCallback(
    (centerMs: number, spanMs: number) => {
      const half = spanMs / 2;
      let start = centerMs - half;
      let end = centerMs + half;
      if (start < dataReferenceDateMs) {
        start = dataReferenceDateMs;
        end = Math.min(dataReferenceDateMs + spanMs, dataEndDateMs);
      } else if (end > dataEndDateMs) {
        end = dataEndDateMs;
        start = Math.max(dataEndDateMs - spanMs, dataReferenceDateMs);
      }
      setVisibleDateRange({ startMs: start, endMs: end });
    },
    [dataReferenceDateMs, dataEndDateMs, setVisibleDateRange],
  );

  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const target = e.target as Element;
      if (target.closest('[data-minimap-viewport]')) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - PADDING;
      const clampedX = Math.max(0, Math.min(INNER_WIDTH, x));
      const centerMs = dataReferenceDateMs + clampedX * msPerPx;
      const spanMs = visibleDateRange
        ? visibleDateRange.endMs - visibleDateRange.startMs
        : totalSpan;
      setCenteredRange(centerMs, spanMs);
    },
    [dataReferenceDateMs, msPerPx, totalSpan, visibleDateRange, setCenteredRange],
  );

  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const startMs = visibleDateRange
        ? visibleDateRange.startMs
        : dataReferenceDateMs;
      const spanMs = visibleDateRange
        ? visibleDateRange.endMs - visibleDateRange.startMs
        : totalSpan;

      dragStartXRef.current = e.clientX;
      dragOriginalStartRef.current = startMs;
      visibleSpanRef.current = spanMs;
      setIsDragging(true);

      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
    },
    [dataReferenceDateMs, totalSpan, visibleDateRange],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartXRef.current;
      const deltaMs = dx * msPerPx;
      const spanMs = visibleSpanRef.current;
      let newStart = dragOriginalStartRef.current + deltaMs;

      if (newStart < dataReferenceDateMs) {
        newStart = dataReferenceDateMs;
      } else if (newStart + spanMs > dataEndDateMs) {
        newStart = dataEndDateMs - spanMs;
      }

      setVisibleDateRange({ startMs: newStart, endMs: newStart + spanMs });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dataReferenceDateMs, dataEndDateMs, msPerPx, setVisibleDateRange]);

  if (tracks.length === 0 || totalEvents === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-50 flex flex-col rounded-xl border border-border bg-card/90 backdrop-blur-sm shadow-lg overflow-hidden"
      style={{ width: MINIMAP_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60">
        <span className="text-xs font-medium text-foreground">缩略图</span>
        <TButton
          variant="text"
          size="small"
          shape="square"
          icon={
            <ChevronDownIcon
              size={14}
              className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            />
          }
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? '展开' : '折叠'}
        />
      </div>

      {!collapsed && (
        <div className="p-2">
          <svg
            ref={svgRef}
            className={`block w-full ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
            viewBox={`0 0 ${INNER_WIDTH} ${svgHeight}`}
            style={{ height: svgHeight }}
            onPointerDown={handleSvgPointerDown}
          >
            {/* Background */}
            <rect x="0" y="0" width={INNER_WIDTH} height={svgHeight} fill="transparent" />

            {/* Track bands and events */}
            {tracks.map((track, index) => {
              const trackY = PADDING + index * (TRACK_HEIGHT + TRACK_GAP);
              const trackEvents = eventsByTrack.get(track.id) || [];
              const trackColor = track.color || 'rgb(var(--primary))';

              return (
                <g key={track.id}>
                  <rect
                    x="0"
                    y={trackY}
                    width={INNER_WIDTH}
                    height={TRACK_HEIGHT}
                    rx="4"
                    fill={track.color ? `${track.color}14` : 'rgb(var(--muted))'}
                    stroke={track.color ? `${track.color}33` : 'rgb(var(--border))'}
                    strokeWidth={1}
                  />
                  {trackEvents.map((event) => {
                    const startMs = event.startTime
                      ? new Date(event.startTime).getTime()
                      : null;
                    if (startMs === null) return null;
                    const endMs = event.endTime
                      ? new Date(event.endTime).getTime()
                      : startMs;
                    const isInstant = endMs <= startMs;

                    const x = ((startMs - dataReferenceDateMs) / totalSpan) * INNER_WIDTH;
                    const width = isInstant
                      ? MIN_EVENT_WIDTH
                      : Math.max(
                          ((endMs - startMs) / totalSpan) * INNER_WIDTH,
                          MIN_EVENT_WIDTH,
                        );
                    const eventY = trackY + (TRACK_HEIGHT - EVENT_HEIGHT) / 2;
                    const color = event.color || trackColor;

                    return (
                      <rect
                        key={event.id}
                        x={x}
                        y={eventY}
                        width={width}
                        height={EVENT_HEIGHT}
                        rx="2"
                        fill={color}
                        opacity={0.85}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Viewport window */}
            <rect
              data-minimap-viewport
              x={visibleWindow.x}
              y="0"
              width={visibleWindow.width}
              height={svgHeight}
              rx="4"
              fill="rgb(var(--primary) / 0.08)"
              stroke="rgb(var(--primary))"
              strokeWidth={1.5}
              className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerDown={handleViewportPointerDown}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
