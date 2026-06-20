import { useState, useMemo, useRef, useEffect } from 'react';
import { ChartHistogramIcon, FilterIcon, GroupIcon } from '@/lib/icons';
import { useEvents, useCharacters, useTracks } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { scrollSelectedIntoView } from '@/utils/revealInBestView';
import type { Character } from '../../../shared/types';

interface RowSegment {
  eventId: string;
  title: string;
  startTime: number;
  endTime: number;
  color: string | null;
}

interface Row {
  id: string;
  name: string;
  color: string;
  segments: RowSegment[];
}

export function GanttTimelineView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const selectEvent = useSelectionStore((s) => s.selectEvent);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: characters } = useCharacters(workspaceId);
  const { data: tracks } = useTracks(workspaceId);

  const events = eventsData?.items ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [filterMode, setFilterMode] = useState<'character' | 'track'>('character');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const openEventEditor = (eventId: string) => {
    selectEvent(eventId);
    setActivePanel('event-editor');
  };

  // 计算时间范围
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const times: number[] = [];
    for (const e of events) {
      if (e.startTime) times.push(new Date(e.startTime).getTime());
      if (e.endTime) times.push(new Date(e.endTime).getTime());
    }
    if (times.length === 0) {
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      };
    }
    const min = Math.min(...times);
    const max = Math.max(...times);
    const padding = Math.max((max - min) * 0.1, 24 * 60 * 60 * 1000);
    return {
      startDate: new Date(min - padding),
      endDate: new Date(max + padding),
    };
  }, [events]);

  const totalMs = endDate.getTime() - startDate.getTime();

  // 构建行数据：按角色或按轨道
  const rows: Row[] = useMemo(() => {
    if (filterMode === 'character') {
      const charMap = new Map<string, Row>();
      // 初始化所有角色
      for (const char of characters ?? []) {
        charMap.set(char.id, {
          id: char.id,
          name: char.name,
          color: '#3b82f6',
          segments: [],
        });
      }
      // 分配事件到角色
      for (const event of events) {
        const eventStart = event.startTime ? new Date(event.startTime).getTime() : null;
        const eventEnd = event.endTime
          ? new Date(event.endTime).getTime()
          : eventStart
            ? eventStart + 60 * 60 * 1000
            : null;
        if (eventStart === null || eventEnd === null) continue;
        const charIds = event.characterIds ?? [];
        for (const cid of charIds) {
          const row = charMap.get(cid);
          if (row) {
            row.segments.push({
              eventId: event.id,
              title: event.title,
              startTime: eventStart,
              endTime: eventEnd,
              color: event.color,
            });
          }
        }
      }
      // 过滤掉没有事件的行（除非用户已选择）
      return Array.from(charMap.values()).filter(
        (row) => row.segments.length > 0 || selectedIds.has(row.id),
      );
    } else {
      // 按轨道
      const trackMap = new Map<string, Row>();
      for (const track of tracks ?? []) {
        trackMap.set(track.id, {
          id: track.id,
          name: track.name,
          color: track.color || '#3b82f6',
          segments: [],
        });
      }
      for (const event of events) {
        const eventStart = event.startTime ? new Date(event.startTime).getTime() : null;
        const eventEnd = event.endTime
          ? new Date(event.endTime).getTime()
          : eventStart
            ? eventStart + 60 * 60 * 1000
            : null;
        if (eventStart === null || eventEnd === null) continue;
        const trackId = event.trackId || 'default';
        if (!trackMap.has(trackId)) {
          trackMap.set(trackId, {
            id: trackId,
            name: '未分类',
            color: '#9ca3af',
            segments: [],
          });
        }
        trackMap.get(trackId)!.segments.push({
          eventId: event.id,
          title: event.title,
          startTime: eventStart,
          endTime: eventEnd,
          color: event.color,
        });
      }
      return Array.from(trackMap.values()).filter(
        (row) => row.segments.length > 0 || selectedIds.has(row.id),
      );
    }
  }, [filterMode, characters, tracks, events, selectedIds]);

  // 时间刻度
  const ticks = useMemo(() => {
    const tickCount = 8;
    const result: { position: number; label: string }[] = [];
    for (let i = 0; i <= tickCount; i++) {
      const t = startDate.getTime() + (totalMs * i) / tickCount;
      const date = new Date(t);
      const position = (i / tickCount) * 100;
      const label = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
      result.push({ position, label });
    }
    return result;
  }, [startDate, totalMs]);

  // 可筛选实体列表
  const filterEntities: { id: string; name: string }[] = filterMode === 'character'
    ? (characters ?? []).map((c: Character) => ({ id: c.id, name: c.name }))
    : (tracks ?? []).map((t) => ({ id: t.id, name: t.name }));

  const toggleFilter = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Scroll selected event into view
  useEffect(() => {
    if (!selectedEventId || !containerRef.current) return;
    const timer = requestAnimationFrame(() => {
      scrollSelectedIntoView('event', selectedEventId, containerRef.current);
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedEventId]);

  return (
    <div ref={containerRef} className="h-full flex flex-col p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-4">
        <ChartHistogramIcon size={24} className="text-primary" />
        <h2 className="font-serif text-2xl font-semibold tracking-tight">事序图</h2>
        <div className="flex-1" />
        {/* 筛选模式切换 */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-muted/50">
          <button
            onClick={() => { setFilterMode('character'); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-sans ${
              filterMode === 'character' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GroupIcon size={12} />
            按角色
          </button>
          <button
            onClick={() => { setFilterMode('track'); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-sans ${
              filterMode === 'track' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FilterIcon size={12} />
            按轨道
          </button>
        </div>
      </div>

      {/* 筛选条 */}
      {filterEntities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {filterEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => toggleFilter(entity.id)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors font-sans ${
                selectedIds.has(entity.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent hover:bg-accent/80 text-muted-foreground'
              }`}
            >
              {entity.name}
            </button>
          ))}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-sans"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12 font-sans">
          暂无可显示的事序数据，请先为事件设置时间与角色/轨道
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* 时间刻度表头 */}
          <div className="relative h-8 border-b border-border bg-muted/30">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex items-center"
                style={{ left: `${tick.position}%` }}
              >
                <div className="w-px h-3 bg-border mr-1" />
                <span className="text-[10px] text-muted-foreground font-mono">{tick.label}</span>
              </div>
            ))}
          </div>

          {/* 行 */}
          <div className="relative">
            {rows.map((row, rowIdx) => (
              <div
                key={row.id}
                className={`gantt-row relative flex items-center transition-opacity duration-300 ${rowIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
                style={{ height: 48 }}
              >
                {/* 行标签 */}
                <div className="absolute left-0 top-0 bottom-0 w-32 flex items-center px-3 border-r border-border bg-card/80 backdrop-blur-sm z-10">
                  <span
                    className="w-2 h-2 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-xs font-medium font-sans truncate">{row.name}</span>
                </div>

                {/* 网格线 */}
                {ticks.map((tick, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-border/30"
                    style={{ left: `${tick.position}%` }}
                  />
                ))}

                {/* 事件段 */}
                <div className="absolute left-32 right-0 top-0 bottom-0">
                  {row.segments.map((seg) => {
                    const leftPct = ((seg.startTime - startDate.getTime()) / totalMs) * 100;
                    const widthPct = Math.max(
                      1,
                      ((seg.endTime - seg.startTime) / totalMs) * 100,
                    );
                    return (
                      <div
                        key={seg.eventId}
                        data-event-id={seg.eventId}
                        onClick={() => openEventEditor(seg.eventId)}
                        className={`absolute top-2 bottom-2 rounded-md border border-white/20 px-2 flex items-center cursor-pointer hover:brightness-110 transition-all overflow-hidden ${
                          selectedEventId === seg.eventId ? 'ring-2 ring-primary z-10' : ''
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: seg.color || row.color,
                          minWidth: 4,
                        }}
                        title={seg.title}
                      >
                        {widthPct > 5 && (
                          <span className="text-[10px] text-white font-medium font-sans truncate">
                            {seg.title}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
