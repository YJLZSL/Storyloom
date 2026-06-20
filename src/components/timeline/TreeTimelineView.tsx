import { useMemo, useEffect, useRef } from 'react';
import { useEvents, useConnections } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { scrollSelectedIntoView } from '@/utils/revealInBestView';
import { getTreeConnectionColor } from '@/lib/colors';
import type { TimelineEvent, Connection } from '../../../shared/types';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;
const COL_WIDTH = 220;
const ROW_HEIGHT = 80;
const ROW_OFFSET_Y = 40;
const COL_OFFSET_X = 60;
const ROWS_PER_COL = 5;

interface NodeLayout {
  event: TimelineEvent;
  x: number;
  y: number;
}

function shortDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function getConnectionColor(type: string): string {
  return getTreeConnectionColor(type) ?? 'var(--border)';
}

export function TreeTimelineView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setDetailEvent = useUIStore((s) => s.setDetailEvent);
  const selectEvent = useSelectionStore((s) => s.selectEvent);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: eventsData } = useEvents(workspaceId);
  const { data: connectionsData } = useConnections(workspaceId);

  const events = useMemo<TimelineEvent[]>(() => eventsData?.items ?? [], [eventsData]);
  const connections = useMemo<Connection[]>(() => connectionsData ?? [], [connectionsData]);

  const layout = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const ta = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });

    const nodes = new Map<string, NodeLayout>();
    sorted.forEach((event, i) => {
      const col = Math.floor(i / ROWS_PER_COL);
      const row = i % ROWS_PER_COL;
      const x = col * COL_WIDTH + COL_OFFSET_X;
      const y = row * ROW_HEIGHT + ROW_OFFSET_Y;
      nodes.set(event.id, { event, x, y });
    });

    const cols = sorted.length === 0 ? 0 : Math.floor((sorted.length - 1) / ROWS_PER_COL) + 1;
    const width = Math.max(cols * COL_WIDTH + COL_OFFSET_X + NODE_WIDTH, 800);
    const rows = Math.min(sorted.length, ROWS_PER_COL);
    const height = Math.max(rows * ROW_HEIGHT + ROW_OFFSET_Y + NODE_HEIGHT, 480);

    return { sorted, nodes, width, height };
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <div className="mb-2 text-base">暂无事件</div>
          <div className="text-sm">先在时间轴或大纲创建事件</div>
        </div>
      </div>
    );
  }

  const handleNodeClick = (eventId: string) => {
    selectEvent(eventId);
    setDetailEvent(eventId);
  };

  // Scroll selected event node into view
  useEffect(() => {
    if (!selectedEventId || !containerRef.current) return;
    const timer = requestAnimationFrame(() => {
      scrollSelectedIntoView('event', selectedEventId, containerRef.current);
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedEventId]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto bg-background">
      <svg width={layout.width} height={layout.height}>
        <defs>
          <marker
            id="tree-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Edges */}
        <g>
          {connections.map((conn) => {
            const source = layout.nodes.get(conn.sourceEventId);
            const target = layout.nodes.get(conn.targetEventId);
            if (!source || !target) return null;
            const sx = source.x + NODE_WIDTH;
            const sy = source.y + NODE_HEIGHT / 2;
            const tx = target.x;
            const ty = target.y + NODE_HEIGHT / 2;
            const mx = (sx + tx) / 2;
            const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
            const color = getConnectionColor(conn.type);
            return (
              <g key={conn.id} style={{ color }}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.85}
                  markerEnd="url(#tree-arrow)"
                />
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {layout.sorted.map((event) => {
            const pos = layout.nodes.get(event.id);
            if (!pos) return null;
            const label = truncate(event.summary || event.title || '未命名事件', 18);
            const dateLabel = shortDate(event.startTime);
            const isSelected = selectedEventId === event.id;
            return (
              <g
                key={event.id}
                data-event-id={event.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(event.id)}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  ry={8}
                  fill="var(--card)"
                  stroke={isSelected ? 'var(--primary)' : 'var(--border)'}
                  strokeWidth={isSelected ? 3 : 1}
                />
                {event.color && (
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={NODE_HEIGHT}
                    rx={2}
                    ry={2}
                    fill={event.color}
                  />
                )}
                <text
                  x={14}
                  y={22}
                  className="text-sm font-medium"
                  fill="var(--foreground)"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {label}
                </text>
                <text
                  x={14}
                  y={42}
                  className="text-xs"
                  fill="var(--muted-foreground)"
                  style={{ fontSize: 11 }}
                >
                  {dateLabel}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
