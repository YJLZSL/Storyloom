import { useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useEvents, useCharacters, useWorldSettings } from '@/services/api-hooks';
import { countWorkspaceWords } from '@/lib/word-count';

const VIEW_LABELS: Record<string, string> = {
  timeline: '时间轴',
  outline: '大纲',
  narrative: '叙事',
  gantt: '甘特',
  statistics: '统计',
  relationship: '关系图',
};

export function StatusBar() {
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const viewMode = useTimelineStore((s) => s.viewMode);
  const zoom = useTimelineStore((s) => s.zoom);

  const { data: eventsData } = useEvents(currentWorkspaceId);
  const { data: characters } = useCharacters(currentWorkspaceId);
  const { data: worldSettings } = useWorldSettings(currentWorkspaceId);

  const eventCount = eventsData?.items?.length ?? 0;

  const totalWords = useMemo(
    () =>
      countWorkspaceWords({
        events: (eventsData?.items || []).map((e) => ({
          title: e.title,
          summary: e.summary,
          description: e.description,
        })),
        characters: (characters || []).map((c) => ({
          name: c.name,
          description: c.description,
        })),
        worldSettings: (worldSettings || []).map((w) => ({
          key: w.key,
          value: w.value ?? '',
          description: w.description,
        })),
      }),
    [eventsData, characters, worldSettings],
  );

  return (
    <footer className="flex h-7 items-center gap-4 border-t border-border bg-card px-3 text-xs text-muted-foreground">
      {/* 左侧：事件数 + 字数 */}
      <span>{eventCount} 个事件</span>
      <span className="h-3 w-px bg-border" />
      <span>{totalWords.toLocaleString()} 字</span>

      <div className="flex-1" />

      {/* 中间：保存状态 */}
      <span className="text-muted-foreground/80">已保存</span>

      <div className="flex-1" />

      {/* 右侧：缩放比例 + 视图名称 */}
      <span className="font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
      <span className="h-3 w-px bg-border" />
      <span>{VIEW_LABELS[viewMode] || viewMode}</span>
    </footer>
  );
}
