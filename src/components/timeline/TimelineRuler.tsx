import { useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useWorkspace } from '@/services/api-hooks';
import { parseCalendarConfig, toCustomCalendar, type CalendarConfig, type Tick } from '@/lib/custom-calendar';

const HEADER_WIDTH = 160;
const TARGET_MAJOR_TICK_PX = 100;
const TARGET_MINOR_TICK_PX = 20;

export interface TimelineRulerProps {
  pixelsPerMs: number;
  referenceDateMs: number;
  contentWidth: number;
  viewportLeft: number;
  viewportWidth: number;
}

interface TickInterval {
  ms: number;
  label: string;
}

const INTERVALS: TickInterval[] = [
  { ms: 60 * 1000, label: 'minute' },           // 1 minute
  { ms: 10 * 60 * 1000, label: '10min' },       // 10 minutes
  { ms: 60 * 60 * 1000, label: 'hour' },        // 1 hour
  { ms: 6 * 60 * 60 * 1000, label: '6hour' },   // 6 hours
  { ms: 24 * 60 * 60 * 1000, label: 'day' },    // 1 day
  { ms: 7 * 24 * 60 * 60 * 1000, label: 'week' }, // 1 week
  { ms: 30 * 24 * 60 * 60 * 1000, label: 'month' }, // 1 month
  { ms: 90 * 24 * 60 * 60 * 1000, label: 'quarter' }, // 3 months
  { ms: 365 * 24 * 60 * 60 * 1000, label: 'year' }, // 1 year
];

function chooseInterval(pixelsPerMs: number, targetPx: number): TickInterval {
  for (const interval of INTERVALS) {
    if (interval.ms * pixelsPerMs >= targetPx) {
      return interval;
    }
  }
  return INTERVALS[INTERVALS.length - 1];
}

function formatLabel(date: Date, intervalLabel: string, config: CalendarConfig | null): string {
  if (config) {
    const { year, month, day, hour } = toCustomCalendar(date, config);
    const monthName = config.monthNames && config.monthNames.length >= config.monthCount
      ? config.monthNames[month - 1] ?? `${month}月`
      : `${month}月`;
    switch (intervalLabel) {
      case 'minute':
      case '10min':
        return `${monthName}${day}日 ${String(hour).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      case 'hour':
      case '6hour':
        return `${monthName}${day}日 ${String(hour).padStart(2, '0')}时`;
      case 'day':
      case 'week':
        return `${monthName}${day}日`;
      case 'month':
      case 'quarter':
        return `${config.epochName}${year}年 ${monthName}`;
      case 'year':
        return `${config.epochName}${year}年`;
      default:
        return `${config.epochName}${year}年 ${monthName}${day}日`;
    }
  }
  // Gregorian calendar
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  switch (intervalLabel) {
    case 'minute':
    case '10min':
      return `${m}/${d} ${h}:${min}`;
    case 'hour':
    case '6hour':
      return `${m}/${d} ${h}:00`;
    case 'day':
    case 'week':
      return `${m}/${d}`;
    case 'month':
    case 'quarter':
      return `${y}/${m}`;
    case 'year':
      return `${y}`;
    default:
      return `${y}/${m}/${d}`;
  }
}

export function TimelineRuler({
  pixelsPerMs,
  referenceDateMs,
  contentWidth,
  viewportLeft,
  viewportWidth,
}: TimelineRulerProps) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: workspace } = useWorkspace(workspaceId);

  const calendarConfig = useMemo(
    () => parseCalendarConfig(workspace?.calendarConfigJson ?? null),
    [workspace?.calendarConfigJson],
  );

  const todayLeft = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (today.getTime() - referenceDateMs) * pixelsPerMs;
  }, [referenceDateMs, pixelsPerMs]);

  const { majorTicks, minorTicks } = useMemo(() => {
    if (pixelsPerMs <= 0 || contentWidth <= 0) {
      return { majorTicks: [] as Tick[], minorTicks: [] as Tick[] };
    }

    const majorInterval = chooseInterval(pixelsPerMs, TARGET_MAJOR_TICK_PX);
    const minorInterval = chooseInterval(pixelsPerMs, TARGET_MINOR_TICK_PX);

    // Calculate visible time range (with buffer)
    const buffer = 200;
    const startPx = Math.max(0, viewportLeft - buffer);
    const endPx = Math.min(contentWidth, viewportLeft + viewportWidth + buffer);
    const startMs = referenceDateMs + startPx / pixelsPerMs;
    const endMs = referenceDateMs + endPx / pixelsPerMs;

    // Generate major ticks
    const majors: Tick[] = [];
    const firstMajorMs = Math.ceil(startMs / majorInterval.ms) * majorInterval.ms;
    for (let t = firstMajorMs; t <= endMs; t += majorInterval.ms) {
      const date = new Date(t);
      const left = (t - referenceDateMs) * pixelsPerMs;
      majors.push({
        date,
        label: formatLabel(date, majorInterval.label, calendarConfig),
        major: true,
        position: left,
      });
    }

    // Generate minor ticks (skip if same as major interval)
    const minors: Tick[] = [];
    if (minorInterval.ms < majorInterval.ms) {
      const firstMinorMs = Math.ceil(startMs / minorInterval.ms) * minorInterval.ms;
      for (let t = firstMinorMs; t <= endMs; t += minorInterval.ms) {
        // Skip if this is a major tick
        if (t % majorInterval.ms === 0) continue;
        const date = new Date(t);
        const left = (t - referenceDateMs) * pixelsPerMs;
        minors.push({
          date,
          label: '',
          major: false,
          position: left,
        });
      }
    }

    return { majorTicks: majors, minorTicks: minors };
  }, [pixelsPerMs, referenceDateMs, contentWidth, viewportLeft, viewportWidth, calendarConfig]);

  return (
    <div
      className="flex border-b border-border bg-card/95 backdrop-blur-sm shrink-0"
      style={{ height: 'calc(var(--timeline-ruler-height) * var(--zoom))' }}
    >
      {/* Sticky header spacer (matches track header width) */}
      <div
        className="sticky left-0 z-20 shrink-0 border-r border-border bg-card"
        style={{ width: HEADER_WIDTH, height: 'calc(var(--timeline-ruler-height) * var(--zoom))' }}
      />

      {/* Ruler content */}
      <div
        className="relative flex-1"
        style={{ width: contentWidth, height: 'calc(var(--timeline-ruler-height) * var(--zoom))' }}
      >
        {/* Minor ticks */}
        {minorTicks.map((tick, i) => (
          <div
            key={`minor-${i}`}
            className="absolute bottom-0 w-px bg-border/50"
            style={{ left: tick.position, height: 'calc(var(--timeline-minor-tick-height) * var(--zoom))' }}
          />
        ))}

        {/* Major ticks */}
        {majorTicks.map((tick, i) => (
          <div
            key={`major-${i}`}
            className="absolute bottom-0 flex flex-col items-start"
            style={{ left: tick.position, height: 'calc(var(--timeline-ruler-height) * var(--zoom))' }}
          >
            <div
              className="w-px bg-muted-foreground"
              style={{ height: 'calc(var(--timeline-ruler-tick-height) * var(--zoom))' }}
            />
            <span
              className="whitespace-nowrap mt-0.5 ml-1"
              style={{
                font: 'var(--td-font-body-small)',
                color: 'var(--td-text-color-secondary)',
              }}
            >
              {tick.label}
            </span>
          </div>
        ))}

        {/* Current date highlight */}
        {todayLeft >= 0 && todayLeft <= contentWidth && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
            style={{ left: todayLeft, zIndex: 5 }}
          >
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
              style={{
                backgroundColor: 'rgb(var(--primary) / 0.12)',
                color: 'rgb(var(--primary))',
              }}
            >
              今天
            </span>
            <div
              className="flex-1 w-px"
              style={{ backgroundColor: 'rgb(var(--primary) / 0.5)' }}
            />
          </div>
        )}

        {/* Baseline */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
      </div>
    </div>
  );
}

export { HEADER_WIDTH };
