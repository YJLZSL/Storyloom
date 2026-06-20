import { useMemo } from 'react';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useEvents, useCharacters, useWorldSettings, useTracks } from '@/services/api-hooks';
import { countWorkspaceWords } from '@/lib/word-count';
import { TTag, TBadge } from '@/components/ui-tdesign';

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
  const { data: tracks } = useTracks(currentWorkspaceId);

  const isMutating = useIsMutating();
  const isFetching = useIsFetching();

  const eventCount = eventsData?.items?.length ?? 0;
  const trackCount = tracks?.length ?? 0;

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

  const saveStatus = isMutating > 0 ? '保存中…' : isFetching > 0 ? '同步中…' : '就绪';
  const statusTheme = isMutating > 0 ? 'warning' : isFetching > 0 ? 'primary' : 'success';

  return (
    <footer className="flex h-7 items-center gap-4 border-t border-border bg-card px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span>轨道</span>
        <TBadge count={trackCount} shape="round" />
      </div>
      <span className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <span>事件</span>
        <TBadge count={eventCount} shape="round" />
      </div>
      <span className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <span>字数</span>
        <TBadge count={totalWords.toLocaleString()} shape="round" />
      </div>

      <div className="flex-1" />

      <TTag theme={statusTheme} variant="light">
        {saveStatus}
      </TTag>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <span>缩放</span>
        <TBadge count={`${Math.round(zoom * 100)}%`} shape="round" />
      </div>
      <span className="h-3 w-px bg-border" />
      <TBadge
        count={VIEW_LABELS[viewMode] || viewMode}
        shape="round"
        color="rgb(var(--primary))"
      />
    </footer>
  );
}
