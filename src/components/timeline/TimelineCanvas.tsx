import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useEvents, useTracks, useConnections, useUpdateEvent } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack, TRACK_HEIGHT, TRACK_GAP, HEADER_WIDTH } from './TimelineTrack';
import { TimelineConnections } from './TimelineConnections';
import type { Track as TrackType, TimelineEvent } from '../../../shared/types';

const BASE_PIXELS_PER_DAY = 80;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PADDING_MS = MS_PER_DAY; // 1 day padding on each side

export function TimelineCanvas() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const zoom = useTimelineStore((s) => s.zoom);
  const showConnectionLines = useTimelineStore((s) => s.showConnectionLines);
  const scrollToEventId = useTimelineStore((s) => s.scrollToEventId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);

  const { data: eventsData } = useEvents(workspaceId);
  const { data: tracks } = useTracks(workspaceId);
  const { data: connections } = useConnections(workspaceId);
  const updateEventMutation = useUpdateEvent();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollLeft: 0, width: 0, scrollTop: 0, height: 0 });
  const rafRef = useRef<number | null>(null);

  const events = eventsData?.items || [];
  const allTracks: TrackType[] = tracks || [];

  // Calculate reference date (earliest event time with padding)
  const referenceDateMs = useMemo(() => {
    const times = events
      .map((e) => e.startTime)
      .filter((t): t is Date => t !== null)
      .map((t) => new Date(t).getTime());
    if (times.length === 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now.getTime() - 30 * MS_PER_DAY;
    }
    return Math.min(...times) - PADDING_MS;
  }, [events]);

  // Calculate end date (latest event time with padding)
  const endDateMs = useMemo(() => {
    const times = events
      .map((e) => {
        const start = e.startTime ? new Date(e.startTime).getTime() : null;
        const end = e.endTime ? new Date(e.endTime).getTime() : null;
        return end ?? start;
      })
      .filter((t): t is number => t !== null);
    if (times.length === 0) {
      return referenceDateMs + 60 * MS_PER_DAY;
    }
    return Math.max(...times) + PADDING_MS;
  }, [events, referenceDateMs]);

  // pixelsPerMs: zoom truly changes pixelsPerUnit (not CSS scale)
  const pixelsPerMs = useMemo(() => {
    return (BASE_PIXELS_PER_DAY * zoom) / MS_PER_DAY;
  }, [zoom]);

  // Content dimensions
  const contentWidth = useMemo(() => {
    return Math.max((endDateMs - referenceDateMs) * pixelsPerMs, 800);
  }, [endDateMs, referenceDateMs, pixelsPerMs]);

  const tracksHeight = useMemo(() => {
    const trackCount = Math.max(allTracks.length, 1);
    return trackCount * (TRACK_HEIGHT + TRACK_GAP);
  }, [allTracks.length]);

  // Group events by track
  const eventsByTrack = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const track of allTracks) {
      map.set(track.id, []);
    }
    for (const event of events) {
      const trackId = event.trackId || 'default';
      if (!map.has(trackId)) map.set(trackId, []);
      map.get(trackId)!.push(event);
    }
    return map;
  }, [events, allTracks]);

  // Viewport tracking with rAF throttling
  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (el) {
        setViewport({
          scrollLeft: el.scrollLeft,
          width: el.clientWidth,
          scrollTop: el.scrollTop,
          height: el.clientHeight,
        });
      }
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewport({
      scrollLeft: el.scrollLeft,
      width: el.clientWidth,
      scrollTop: el.scrollTop,
      height: el.clientHeight,
    });
    el.addEventListener('scroll', handleScroll, { passive: true });
    const ro = new ResizeObserver(() => handleScroll());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [handleScroll]);

  // Handle event resize via API
  const handleResizeEnd = useCallback(
    (eventId: string, startTime: number | null, endTime: number | null) => {
      if (!workspaceId) return;
      const data: { startTime?: number | null; endTime?: number | null } = {};
      if (startTime !== null) data.startTime = startTime;
      if (endTime !== null) data.endTime = endTime;
      updateEventMutation.mutate({ workspaceId, eventId, data });
    },
    [workspaceId, updateEventMutation],
  );

  // Build tracks list (include default track if needed)
  const renderTracks = useMemo(() => {
    const result: TrackType[] = [...allTracks];
    if (eventsByTrack.has('default') && eventsByTrack.get('default')!.length > 0) {
      result.push({
        id: 'default',
        workspaceId: workspaceId || '',
        name: '未分类',
        color: '#9ca3af',
        orderIndex: 999,
        isVisible: true,
      });
    }
    return result;
  }, [allTracks, eventsByTrack, workspaceId]);

  // 滚动定位到指定事件（优先 DOM 元素，回退到计算坐标）
  useEffect(() => {
    if (!scrollToEventId) return;
    const el = scrollRef.current;
    if (!el) return;
    const event = events.find((e) => e.id === scrollToEventId);
    if (!event) return;

    const raf = requestAnimationFrame(() => {
      const target = el.querySelector(`[data-event-id="${scrollToEventId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } else {
        const startMs = event.startTime ? new Date(event.startTime).getTime() : null;
        const trackId = event.trackId || 'default';
        const trackIndex = renderTracks.findIndex((t) => t.id === trackId);
        const topPx = trackIndex >= 0 ? trackIndex * (TRACK_HEIGHT + TRACK_GAP) : 0;
        const leftPx = startMs ? (startMs - referenceDateMs) * pixelsPerMs : 0;
        el.scrollTo({
          left: Math.max(0, leftPx - el.clientWidth / 2 + HEADER_WIDTH),
          top: Math.max(0, topPx - el.clientHeight / 2),
          behavior: 'smooth',
        });
      }
      scrollToEvent(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollToEventId, events, renderTracks, referenceDateMs, pixelsPerMs, scrollToEvent]);

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-auto bg-background relative"
      onClick={() => {
        // Click on empty area deselects
        useTimelineStore.getState().setSelectedEvent(null);
      }}
    >
      <div
        className="relative"
        style={{
          width: contentWidth + HEADER_WIDTH,
          minHeight: '100%',
        }}
      >
        {/* Ruler (sticky top) */}
        <div className="sticky top-0 z-30">
          <TimelineRuler
            pixelsPerMs={pixelsPerMs}
            referenceDateMs={referenceDateMs}
            contentWidth={contentWidth}
            viewportLeft={viewport.scrollLeft}
            viewportWidth={viewport.width}
          />
        </div>

        {/* Tracks area */}
        <div
          className="relative"
          style={{
            width: contentWidth + HEADER_WIDTH,
            height: tracksHeight,
          }}
        >
          {renderTracks.map((track, index) => (
            <TimelineTrack
              key={track.id}
              track={track}
              events={eventsByTrack.get(track.id) || []}
              allTracks={allTracks}
              trackIndex={index}
              pixelsPerMs={pixelsPerMs}
              referenceDateMs={referenceDateMs}
              contentWidth={contentWidth}
              viewportLeft={viewport.scrollLeft}
              viewportWidth={viewport.width}
              onResizeEnd={handleResizeEnd}
            />
          ))}

          {/* Connection lines overlay */}
          {showConnectionLines && (
            <TimelineConnections
              connections={connections || []}
              events={events}
              tracks={renderTracks}
              pixelsPerMs={pixelsPerMs}
              referenceDateMs={referenceDateMs}
              contentWidth={contentWidth}
              contentHeight={tracksHeight}
              viewportLeft={viewport.scrollLeft}
              viewportWidth={viewport.width}
            />
          )}
        </div>
      </div>
    </div>
  );
}
