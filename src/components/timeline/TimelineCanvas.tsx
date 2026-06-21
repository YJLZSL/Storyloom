import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { PlusIcon } from '@/lib/icons';
import { TButton } from '@/components/ui-tdesign';
import { TrackManagerDialog } from './TrackManagerDialog';
import { useEvents, useTracks, useConnections, useUpdateEvent, useUpdateTrack } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack, TRACK_HEIGHT, TRACK_GAP, HEADER_WIDTH } from './TimelineTrack';
import { TimelineConnections } from './TimelineConnections';
import { TimelineMinimap } from './TimelineMinimap';
import { CreateTrackDialog } from './CreateTrackDialog';
import { EmptyState } from '@/components/_shared/EmptyState';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineSkeleton } from './TimelineSkeleton';
import { HiddenTracksPanel } from './HiddenTracksPanel';
import { toast } from 'sonner';
import type { Track as TrackType, TimelineEvent } from '../../../shared/types';

const BASE_PIXELS_PER_DAY = 80;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PADDING_MS = MS_PER_DAY;
const WHEEL_ZOOM_STEP = 0.05;
const WHEEL_PAN_FACTOR = 2;

export function TimelineCanvas() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const zoom = useTimelineStore((s) => s.zoom);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const showConnectionLines = useTimelineStore((s) => s.showConnectionLines);
  const toggleConnectionLines = useTimelineStore((s) => s.toggleConnectionLines);
  const scrollToEventId = useTimelineStore((s) => s.scrollToEventId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const visibleDateRange = useTimelineStore((s) => s.visibleDateRange);
  const setVisibleDateRange = useTimelineStore((s) => s.setVisibleDateRange);

  const { data: eventsData, isLoading: isLoadingEvents } = useEvents(workspaceId);
  const { data: tracks, isLoading: isLoadingTracks } = useTracks(workspaceId);
  const { data: connections } = useConnections(workspaceId);
  const updateEventMutation = useUpdateEvent();
  const updateTrack = useUpdateTrack();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollLeft: 0, width: 0, scrollTop: 0, height: 0 });
  const rafRef = useRef<number | null>(null);
  const [createTrackOpen, setCreateTrackOpen] = useState(false);
  const [trackManagerOpen, setTrackManagerOpen] = useState(false);

  const events = eventsData?.items || [];
  const allTracks: TrackType[] = tracks || [];

  const dataReferenceDateMs = useMemo(() => {
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

  const dataEndDateMs = useMemo(() => {
    const times = events
      .map((e) => {
        const start = e.startTime ? new Date(e.startTime).getTime() : null;
        const end = e.endTime ? new Date(e.endTime).getTime() : null;
        return end ?? start;
      })
      .filter((t): t is number => t !== null);
    if (times.length === 0) {
      return dataReferenceDateMs + 60 * MS_PER_DAY;
    }
    return Math.max(...times) + PADDING_MS;
  }, [events, dataReferenceDateMs]);

  const referenceDateMs = visibleDateRange ? visibleDateRange.startMs : dataReferenceDateMs;
  const endDateMs = visibleDateRange ? visibleDateRange.endMs : dataEndDateMs;

  const pixelsPerMs = useMemo(() => {
    return (BASE_PIXELS_PER_DAY * zoom) / MS_PER_DAY;
  }, [zoom]);

  const contentWidth = useMemo(() => {
    return Math.max((endDateMs - referenceDateMs) * pixelsPerMs, 800);
  }, [endDateMs, referenceDateMs, pixelsPerMs]);

  const visibleTracks = useMemo(() => allTracks.filter((t) => t.isVisible), [allTracks]);
  const hiddenTracks = useMemo(() => allTracks.filter((t) => !t.isVisible), [allTracks]);

  const eventsByTrack = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const track of visibleTracks) {
      map.set(track.id, []);
    }
    for (const event of events) {
      const trackId = event.trackId || 'default';
      if (!map.has(trackId)) map.set(trackId, []);
      map.get(trackId)!.push(event);
    }
    return map;
  }, [events, visibleTracks]);

  const tracksHeight = useMemo(() => {
    const trackCount = Math.max(visibleTracks.length, 1);
    return trackCount * (TRACK_HEIGHT * zoom + TRACK_GAP);
  }, [visibleTracks.length, zoom]);

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

  const handleDragEnd = useCallback(
    (eventId: string, startTime: number, endTime: number | null) => {
      if (!workspaceId) return;
      updateEventMutation.mutate({
        workspaceId,
        eventId,
        data: { startTime, endTime },
      });
    },
    [workspaceId, updateEventMutation],
  );

  const renderTracks = useMemo(() => {
    const result: TrackType[] = [...visibleTracks];
    if (eventsByTrack.has('default') && eventsByTrack.get('default')!.length > 0) {
      result.push({
        id: 'default',
        workspaceId: workspaceId || '',
        name: '未分类',
        color: 'rgb(var(--muted-foreground))',
        orderIndex: 999,
        isVisible: true,
      });
    }
    return result;
  }, [visibleTracks, eventsByTrack, workspaceId]);

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
        const topPx = trackIndex >= 0 ? trackIndex * (TRACK_HEIGHT * zoom + TRACK_GAP) : 0;
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
  }, [scrollToEventId, events, renderTracks, referenceDateMs, pixelsPerMs, scrollToEvent, zoom]);

  const showEmptyState = allTracks.length === 0;

  const handleRestoreTrack = useCallback(
    (trackId: string) => {
      if (!workspaceId) return;
      updateTrack.mutate(
        { workspaceId, trackId, data: { isVisible: true } },
        {
          onSuccess: (_: unknown, vars: { trackId: string }) => {
            const track = allTracks.find((t) => t.id === vars.trackId);
            toast.success(`轨道「${track?.name || '未知'}」已恢复显示`);
          },
          onError: (err: Error) => {
            toast.error(`恢复轨道失败: ${err.message}`);
          },
        }
      );
    },
    [workspaceId, updateTrack, allTracks]
  );

  const canvasStyle = {
    '--zoom': zoom,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full w-full zoom-smooth" style={canvasStyle}>
      <TimelineToolbar
        workspaceId={workspaceId}
        visibleDateRange={visibleDateRange}
        onDateRangeChange={setVisibleDateRange}
        onCreateTrack={() => setCreateTrackOpen(true)}
        onOpenTrackManager={() => setTrackManagerOpen(true)}
      />

      {(isLoadingEvents || isLoadingTracks) && <TimelineSkeleton />}

      {!isLoadingEvents && !isLoadingTracks && (
        <div
          ref={scrollRef}
          tabIndex={0}
          className="flex-1 overflow-auto bg-background relative outline-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(var(--border) / 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(var(--border) / 0.04) 1px, transparent 1px),
              linear-gradient(to right, rgb(var(--border) / 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(var(--border) / 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px, 20px 20px, 40px 40px, 40px 40px',
          }}
          onClick={() => {
            useSelectionStore.getState().clear();
          }}
          onWheel={(e) => {
            e.preventDefault();
            const el = scrollRef.current;
            if (!el) return;
            if (e.ctrlKey || e.metaKey) {
              const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
              const newZoom = Math.max(0.5, Math.min(3.0, zoom + delta));
              setZoom(newZoom);
            } else {
              el.scrollLeft += e.deltaY * WHEEL_PAN_FACTOR;
            }
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage: 'var(--theme-texture)',
              backgroundSize: 'var(--theme-texture-size)',
            }}
          />
          {showEmptyState ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 empty-state-refined">
              <EmptyState
                size="lg"
                icon={<PlusIcon size={36} className="text-primary/70" />}
                title="还没有轨道"
                description='点击上方"新建轨道"创建第一条轨道，开始组织你的故事时间线'
                action={
                  <TButton
                    theme="success"
                    size="small"
                    icon={<PlusIcon size={16} />}
                    onClick={() => setCreateTrackOpen(true)}
                    disabled={!workspaceId}
                  >
                    新建轨道
                  </TButton>
                }
                className="max-w-md w-full card-hover-shadow"
              />
            </div>
          ) : (
            <div
              className="relative"
              style={{
                width: contentWidth + HEADER_WIDTH,
                minHeight: '100%',
              }}
            >
              <div className="sticky top-0 z-30">
                <TimelineRuler
                  pixelsPerMs={pixelsPerMs}
                  referenceDateMs={referenceDateMs}
                  contentWidth={contentWidth}
                  viewportLeft={viewport.scrollLeft}
                  viewportWidth={viewport.width}
                />
              </div>

              <div
                className="relative"
                style={{
                  width: contentWidth + HEADER_WIDTH,
                  height: tracksHeight,
                }}
              >
: 338                {renderTracks.map((track, index) => (
                  <TimelineTrack
                    key={track.id}
                    track={track}
                    events={eventsByTrack.get(track.id) || []}
                    trackIndex={index}
                    pixelsPerMs={pixelsPerMs}
                    referenceDateMs={referenceDateMs}
                    contentWidth={contentWidth}
                    viewportLeft={viewport.scrollLeft}
                    viewportWidth={viewport.width}
                    workspaceId={workspaceId}
                    isReadOnly={track.id === 'default'}
                    onCreateTrack={() => setCreateTrackOpen(true)}
                    onResizeEnd={handleResizeEnd}
                    onDragEnd={handleDragEnd}
                  />
                ))}

: 356                {showConnectionLines && (
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
                    zoom={zoom}
                  />
                )}

                {events.length === 0 && <TimelineEmptyState />}

              </div>

              <HiddenTracksPanel
                hiddenTracks={hiddenTracks}
                workspaceId={workspaceId}
                contentWidth={contentWidth + HEADER_WIDTH}
                onRestoreTrack={handleRestoreTrack}
                isPending={updateTrack.isPending}
              />
            </div>
          )}

: 384          <TimelineMinimap
            tracks={renderTracks}
            eventsByTrack={eventsByTrack}
            dataReferenceDateMs={dataReferenceDateMs}
            dataEndDateMs={dataEndDateMs}
            visibleDateRange={visibleDateRange}
            setVisibleDateRange={setVisibleDateRange}
            scrollLeft={viewport.scrollLeft}
            contentWidth={contentWidth + HEADER_WIDTH}
          />
        </div>
      )}

      {workspaceId && (
        <CreateTrackDialog
          open={createTrackOpen}
          workspaceId={workspaceId}
          onClose={() => setCreateTrackOpen(false)}
        />
      )}
      {workspaceId && (
        <TrackManagerDialog
          open={trackManagerOpen}
          onClose={() => setTrackManagerOpen(false)}
          workspaceId={workspaceId}
          tracks={allTracks}
          showConnectionLines={showConnectionLines}
          onToggleConnectionLines={toggleConnectionLines}
          visibleDateRange={visibleDateRange}
          onResetDateRange={() => setVisibleDateRange(null)}
        />
      )}
    </div>
  );
}

function WeaveIllustration() {
  return (
    <svg
      viewBox="0 0 96 64"
      fill="none"
      className="w-14 h-10 text-primary empty-icon"
      aria-hidden="true"
    >
      <style>{`
        @keyframes weave-draw {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .weave-line {
          stroke-dasharray: 4 4;
          animation: weave-draw 3s ease-out infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) {
          .weave-line { animation: none; }
        }
      `}</style>
      <line x1="4" y1="32" x2="92" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" className="weave-line" />
      <rect x="12" y="10" width="18" height="26" rx="4" fill="currentColor" opacity="0.12" />
      <rect x="12" y="10" width="4" height="26" rx="2" fill="currentColor" />
      <circle cx="12" cy="32" r="4" fill="currentColor" />
      <rect x="42" y="26" width="18" height="26" rx="4" fill="currentColor" opacity="0.12" />
      <rect x="42" y="26" width="4" height="26" rx="2" fill="currentColor" />
      <circle cx="42" cy="32" r="4" fill="currentColor" />
      <rect x="72" y="6" width="18" height="30" rx="4" fill="currentColor" opacity="0.12" />
      <rect x="72" y="6" width="4" height="30" rx="2" fill="currentColor" />
      <circle cx="72" cy="32" r="4" fill="currentColor" />
    </svg>
  );
}

function TimelineEmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 empty-state-refined">
      <EmptyState
        size="lg"
        icon={<WeaveIllustration />}
        title="故事从这里开始编织"
        description="在时间轴中添加事件，让灵感编织成可追溯的故事经纬"
        action={
          <TButton
            theme="success"
            size="medium"
            icon={<PlusIcon size={16} />}
            onClick={() => useUIStore.getState().setActivePanel('event-editor')}
          >
            创建第一个事件
          </TButton>
        }
        className="max-w-md w-full card-hover-shadow"
      />
    </div>
  );
}
