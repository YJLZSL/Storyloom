import { memo } from 'react';
import { TimelineEventCard } from './TimelineEventCard';
import type { Track as TrackType, TimelineEvent } from '../../../shared/types';

const TRACK_HEIGHT = 80;
const TRACK_GAP = 8;
const HEADER_WIDTH = 160;

export interface TimelineTrackProps {
  track: TrackType;
  events: TimelineEvent[];
  allTracks: TrackType[];
  trackIndex: number;
  pixelsPerMs: number;
  referenceDateMs: number;
  contentWidth: number;
  viewportLeft: number;
  viewportWidth: number;
  onResizeEnd: (eventId: string, startTime: number | null, endTime: number | null) => void;
}

export const TimelineTrack = memo(function TimelineTrack({
  track,
  events,
  allTracks: _allTracks,
  trackIndex,
  pixelsPerMs,
  referenceDateMs,
  contentWidth,
  viewportLeft,
  viewportWidth,
  onResizeEnd,
}: TimelineTrackProps) {
  const top = trackIndex * (TRACK_HEIGHT + TRACK_GAP);

  // Virtual scrolling: only render events within viewport (with 100px buffer)
  const buffer = 100;
  const visibleStart = viewportLeft - buffer;
  const visibleEnd = viewportLeft + viewportWidth + buffer;

  const visibleEvents = events.filter((event) => {
    if (!event.startTime) return true;
    const startMs = new Date(event.startTime).getTime();
    const endMs = event.endTime ? new Date(event.endTime).getTime() : startMs;
    const leftPx = (startMs - referenceDateMs) * pixelsPerMs;
    const rightPx = (endMs - referenceDateMs) * pixelsPerMs;
    return rightPx >= visibleStart && leftPx <= visibleEnd;
  });

  return (
    <div
      className="absolute left-0 right-0 flex"
      style={{
        top,
        height: TRACK_HEIGHT,
      }}
    >
      {/* Track header (sticky left) */}
      <div
        className="sticky left-0 z-20 shrink-0 border-r border-border bg-card/95 backdrop-blur-sm flex items-center px-3 gap-2"
        style={{ width: HEADER_WIDTH, height: TRACK_HEIGHT }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: track.color || 'var(--primary)' }}
        />
        <span
          className="font-sans text-sm font-semibold truncate flex-1"
          style={{ color: track.color || undefined }}
        >
          {track.name}
        </span>
      </div>

      {/* Track content area */}
      <div
        className="relative flex-1"
        style={{ width: contentWidth, height: TRACK_HEIGHT }}
      >
        {/* Track background */}
        <div
          className="absolute inset-0 border-b border-border/40"
          style={{ backgroundColor: track.color ? `${track.color}08` : undefined }}
        />

        {/* Events */}
        {visibleEvents.map((event) => {
          const startMs = event.startTime ? new Date(event.startTime).getTime() : null;
          const endMs = event.endTime ? new Date(event.endTime).getTime() : null;

          let left = 0;
          let width = 120;
          if (startMs) {
            left = (startMs - referenceDateMs) * pixelsPerMs;
            if (endMs && endMs > startMs) {
              width = Math.max((endMs - startMs) * pixelsPerMs, 40);
            }
          }

          return (
            <TimelineEventCard
              key={event.id}
              event={event}
              left={left}
              width={width}
              top={8}
              height={TRACK_HEIGHT - 16}
              pixelsPerMs={pixelsPerMs}
              onResizeEnd={onResizeEnd}
            />
          );
        })}
      </div>
    </div>
  );
});

export { TRACK_HEIGHT, TRACK_GAP, HEADER_WIDTH };
