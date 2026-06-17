import { useMemo } from 'react';
import type { Connection, TimelineEvent, Track } from '../../../shared/types';
import { TRACK_HEIGHT, TRACK_GAP, HEADER_WIDTH } from './TimelineTrack';

const CONNECTION_STYLES: Record<string, { color: string; dashArray: string }> = {
  '因果': { color: '#3b82f6', dashArray: 'none' },
  '闪回': { color: '#8b5cf6', dashArray: '8 4' },
  '伏笔': { color: '#22c55e', dashArray: '3 5' },
  '平行': { color: '#f59e0b', dashArray: 'none' },
  '对比': { color: '#ef4444', dashArray: '8 4' },
  '呼应': { color: '#14b8a6', dashArray: 'none' },
  '转折': { color: '#f97316', dashArray: '3 5' },
  'causal': { color: '#3b82f6', dashArray: 'none' },
  'flashback': { color: '#8b5cf6', dashArray: '8 4' },
  'foreshadowing': { color: '#22c55e', dashArray: '3 5' },
  'parallel': { color: '#f59e0b', dashArray: 'none' },
  'contrast': { color: '#ef4444', dashArray: '8 4' },
  'echo': { color: '#14b8a6', dashArray: 'none' },
  'twist': { color: '#f97316', dashArray: '3 5' },
};

function getConnectionStyle(type: string) {
  return CONNECTION_STYLES[type] || { color: '#6b7280', dashArray: 'none' };
}

export interface TimelineConnectionsProps {
  connections: Connection[];
  events: TimelineEvent[];
  tracks: Track[];
  pixelsPerMs: number;
  referenceDateMs: number;
  contentWidth: number;
  contentHeight: number;
  viewportLeft: number;
  viewportWidth: number;
}

interface EventPixelPos {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function TimelineConnections({
  connections,
  events,
  tracks,
  pixelsPerMs,
  referenceDateMs,
  contentWidth,
  contentHeight,
  viewportLeft,
  viewportWidth,
}: TimelineConnectionsProps) {
  // Build event position map
  const eventPositions = useMemo(() => {
    const map = new Map<string, EventPixelPos>();
    const trackIndexMap = new Map<string, number>();
    tracks.forEach((track, i) => trackIndexMap.set(track.id, i));

    for (const event of events) {
      if (!event.startTime) continue;
      const startMs = new Date(event.startTime).getTime();
      const endMs = event.endTime ? new Date(event.endTime).getTime() : startMs;

      const x = (startMs - referenceDateMs) * pixelsPerMs + HEADER_WIDTH;
      const width = Math.max((endMs - startMs) * pixelsPerMs, 40);
      const trackIdx = event.trackId ? trackIndexMap.get(event.trackId) ?? 0 : 0;
      const y = trackIdx * (TRACK_HEIGHT + TRACK_GAP) + 8;
      const height = TRACK_HEIGHT - 16;

      map.set(event.id, {
        x,
        y,
        width,
        height,
        centerX: x + width / 2,
        centerY: y + height / 2,
      });
    }
    return map;
  }, [events, tracks, pixelsPerMs, referenceDateMs]);

  // Filter and compute paths for visible connections
  const paths = useMemo(() => {
    const buffer = 100;
    const visibleStart = viewportLeft - buffer;
    const visibleEnd = viewportLeft + viewportWidth + buffer;

    const result: Array<{
      id: string;
      d: string;
      color: string;
      dashArray: string;
      arrowId: string;
    }> = [];

    for (const conn of connections) {
      const source = eventPositions.get(conn.sourceEventId);
      const target = eventPositions.get(conn.targetEventId);
      if (!source || !target) continue;

      // Check if connection is in viewport (use bounding box of both endpoints)
      const minX = Math.min(source.x, target.x);
      const maxX = Math.max(source.x + source.width, target.x + target.width);
      if (maxX < visibleStart || minX > visibleEnd) continue;

      const style = getConnectionStyle(conn.type);

      // Source: right-center, Target: left-center
      const sx = source.x + source.width;
      const sy = source.centerY;
      const tx = target.x;
      const ty = target.centerY;

      // Cubic bezier control points
      const dx = Math.abs(tx - sx);
      const cpOffset = Math.max(dx * 0.4, 50);
      const cp1x = sx + cpOffset;
      const cp1y = sy;
      const cp2x = tx - cpOffset;
      const cp2y = ty;

      const d = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
      const arrowId = `arrow-${conn.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

      result.push({
        id: conn.id,
        d,
        color: style.color,
        dashArray: style.dashArray,
        arrowId,
      });
    }

    return result;
  }, [connections, eventPositions, viewportLeft, viewportWidth]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        top: 0,
        left: 0,
        width: contentWidth + HEADER_WIDTH,
        height: contentHeight,
        zIndex: 15,
      }}
    >
      <defs>
        {paths.map((p) => (
          <marker
            key={p.arrowId}
            id={p.arrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={p.color} />
          </marker>
        ))}
      </defs>

      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={2}
          strokeDasharray={p.dashArray === 'none' ? undefined : p.dashArray}
          opacity={0.7}
          markerEnd={`url(#${p.arrowId})`}
        />
      ))}
    </svg>
  );
}
