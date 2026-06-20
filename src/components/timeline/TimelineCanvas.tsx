import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { DateRangePicker } from 'tdesign-react';
import type { DateRangeValue } from 'tdesign-react';
import { TButton, TPopup, TSwitch } from '@/components/ui-tdesign';
import { PlusIcon, SettingConfigIcon, LinkIcon, XIcon } from '@/lib/icons';
import { useEvents, useTracks, useConnections, useUpdateEvent } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack, TRACK_HEIGHT, TRACK_GAP, HEADER_WIDTH } from './TimelineTrack';
import { TimelineConnections } from './TimelineConnections';
import { TimelineMinimap } from './TimelineMinimap';
import { CreateTrackDialog } from './CreateTrackDialog';
import type { Track as TrackType, TimelineEvent } from '../../../shared/types';

const BASE_PIXELS_PER_DAY = 80;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PADDING_MS = MS_PER_DAY;

function toDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TimelineCanvas() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const zoom = useTimelineStore((s) => s.zoom);
  const showConnectionLines = useTimelineStore((s) => s.showConnectionLines);
  const toggleConnectionLines = useTimelineStore((s) => s.toggleConnectionLines);
  const scrollToEventId = useTimelineStore((s) => s.scrollToEventId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const visibleDateRange = useTimelineStore((s) => s.visibleDateRange);
  const setVisibleDateRange = useTimelineStore((s) => s.setVisibleDateRange);

  const { data: eventsData } = useEvents(workspaceId);
  const { data: tracks } = useTracks(workspaceId);
  const { data: connections } = useConnections(workspaceId);
  const updateEventMutation = useUpdateEvent();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollLeft: 0, width: 0, scrollTop: 0, height: 0 });
  const rafRef = useRef<number | null>(null);
  const [createTrackOpen, setCreateTrackOpen] = useState(false);

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

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const { zoomIn, zoomOut } = useTimelineStore.getState();
      if (e.deltaY > 0) {
        zoomOut(0.1);
      } else if (e.deltaY < 0) {
        zoomIn(0.1);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('wheel', handleWheel);
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

  const dateRangeValue: DateRangeValue = visibleDateRange
    ? [toDateString(visibleDateRange.startMs), toDateString(visibleDateRange.endMs)]
    : [];

  const handleDateRangeChange = (value: DateRangeValue) => {
    if (!value || value.length !== 2 || !value[0] || !value[1]) {
      setVisibleDateRange(null);
      return;
    }
    const start = value[0] instanceof Date ? value[0] : new Date(String(value[0]));
    const end = value[1] instanceof Date ? value[1] : new Date(String(value[1]));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setVisibleDateRange(null);
      return;
    }
    end.setHours(23, 59, 59, 999);
    setVisibleDateRange({ startMs: start.getTime(), endMs: end.getTime() });
  };

  const showEmptyState = allTracks.length === 0;

  const canvasStyle = {
    '--zoom': zoom,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full w-full" style={canvasStyle}>
      {/* Top toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-card/80">
        <TButton
          theme="success"
          size="small"
          icon={<PlusIcon size={14} />}
          onClick={() => setCreateTrackOpen(true)}
          disabled={!workspaceId}
        >
          新建轨道
        </TButton>

        <TPopup
          trigger="click"
          placement="bottom-left"
          content={
            <div
              className="w-52 p-2 space-y-2"
              style={{
                backgroundColor: 'rgb(var(--popover))',
                border: '1px solid rgb(var(--border))',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-sm text-foreground flex items-center gap-1.5">
                  <LinkIcon size={14} />
                  显示事件关联线
                </span>
                <TSwitch
                  size="small"
                  value={showConnectionLines}
                  onChange={(v) => {
                    if (v !== showConnectionLines) toggleConnectionLines();
                  }}
                />
              </div>
              {visibleDateRange && (
                <TButton
                  theme="default"
                  variant="text"
                  size="small"
                  block
                  icon={<XIcon size={14} />}
                  onClick={() => setVisibleDateRange(null)}
                >
                  重置显示范围
                </TButton>
              )}
            </div>
          }
        >
          <TButton
            theme="default"
            variant="outline"
            size="small"
            icon={<SettingConfigIcon size={14} />}
            disabled={!workspaceId}
          >
            时间线管理
          </TButton>
        </TPopup>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">显示范围：</span>
          <DateRangePicker
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            clearable
            placeholder={['开始日期', '结束日期']}
            size="small"
          />
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-background relative"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(var(--border) / 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(var(--border) / 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
        onClick={() => {
          useSelectionStore.getState().clear();
        }}
      >
        {/* Theme texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage: 'var(--theme-texture)',
            backgroundSize: 'var(--theme-texture-size)',
          }}
        />
        {showEmptyState ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center max-w-md p-8 rounded-2xl border border-border bg-card/95 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <PlusIcon size={24} className="text-primary" />
              </div>
              <div className="text-base font-semibold text-card-foreground mb-2">还没有轨道</div>
              <p className="text-sm text-muted-foreground mb-5">
                点击上方"新建轨道"创建第一条轨道，开始组织你的故事时间线
              </p>
              <TButton
                theme="success"
                size="small"
                icon={<PlusIcon size={16} />}
                onClick={() => setCreateTrackOpen(true)}
                disabled={!workspaceId}
              >
                新建轨道
              </TButton>
            </div>
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
              {renderTracks.map((track, index) => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  events={eventsByTrack.get(track.id) || []}
                  allTracks={visibleTracks}
                  trackIndex={index}
                  pixelsPerMs={pixelsPerMs}
                  referenceDateMs={referenceDateMs}
                  contentWidth={contentWidth}
                  viewportLeft={viewport.scrollLeft}
                  viewportWidth={viewport.width}
                  workspaceId={workspaceId}
                  isReadOnly={track.id === 'default'}
                  onResizeEnd={handleResizeEnd}
                  onDragEnd={handleDragEnd}
                />
              ))}

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

              {events.length === 0 && <TimelineEmptyState />}
            </div>
          </div>
        )}

        <TimelineMinimap
          tracks={renderTracks}
          eventsByTrack={eventsByTrack}
          dataReferenceDateMs={dataReferenceDateMs}
          dataEndDateMs={dataEndDateMs}
          visibleDateRange={visibleDateRange}
          setVisibleDateRange={setVisibleDateRange}
        />
      </div>

      {workspaceId && (
        <CreateTrackDialog
          open={createTrackOpen}
          workspaceId={workspaceId}
          onClose={() => setCreateTrackOpen(false)}
        />
      )}
    </div>
  );
}

function TimelineEmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="text-center max-w-md p-8 rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm">
        <svg
          width="96"
          height="64"
          viewBox="0 0 96 64"
          fill="none"
          className="mx-auto text-primary"
          aria-hidden="true"
        >
          <line x1="4" y1="32" x2="92" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
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
        <div className="text-base font-semibold text-card-foreground mt-5 mb-2">时间轴还是空的</div>
        <p className="text-sm text-muted-foreground mb-5">
          在事件面板中添加事件，或点击下方按钮开始编写第一条时间轴事件
        </p>
        <TButton
          theme="primary"
          size="small"
          icon={<PlusIcon size={16} />}
          onClick={() => useUIStore.getState().setActivePanel('event-editor')}
        >
          创建事件
        </TButton>
      </div>
    </div>
  );
}
