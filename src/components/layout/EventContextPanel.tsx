import { useMemo } from 'react';
import { cn, safeJsonArray } from '@/lib/utils';
import {
  TimeIcon,
  UserIcon,
  GlobeIcon,
  RemindIcon,
  LinkIcon,
  LocalTwoIcon,
  TagIcon,
  LayersIcon,
  HistoryIcon,
  FireIcon,
} from '@/lib/icons';
import {
  useCharacters,
  useWorldSettings,
  useForeshadowings,
  useConnections,
  useEvents,
  useTracks,
} from '@/services/api-hooks';
import { useTimelineStore } from '@/stores/useTimelineStore';
import type {
  TimelineEvent,
  Character,
  WorldSetting,
  Foreshadowing,
  Connection,
  Track,
} from '../../../shared/types';

/* ───────── 常量 ───────── */

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  planted: { label: '已埋下', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
  developed: { label: '发展中', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
  resolved: { label: '已回收', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  abandoned: { label: '已废弃', color: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300' },
};

const TYPE_COLORS: Record<string, string> = {
  '因果': 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  '闪回': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  '伏笔': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
  '平行': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  '对比': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  '呼应': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  '转折': 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
};

const CATEGORY_COLORS: Record<string, string> = {
  '地理': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  '历史': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  '文化': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  '政治': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  '魔法': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  '科技': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300',
  '种族': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  '其他': 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300',
};

/* ───────── 组件 ───────── */

interface EventContextPanelProps {
  event: TimelineEvent | null;
  workspaceId: string | null;
}

export function EventContextPanel({ event, workspaceId }: EventContextPanelProps) {
  const { data: charactersData } = useCharacters(workspaceId);
  const { data: worldSettingsData } = useWorldSettings(workspaceId);
  const { data: foreshadowingsData } = useForeshadowings(workspaceId);
  const { data: connectionsData } = useConnections(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: tracksData } = useTracks(workspaceId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);

  const characters = charactersData ?? [];
  const worldSettings = worldSettingsData ?? [];
  const foreshadowings = foreshadowingsData ?? [];
  const connections = connectionsData ?? [];
  const allEvents = eventsData?.items ?? [];
  const tracks = tracksData ?? [];

  const eventId = event?.id ?? null;

  // 关联角色
  const relatedCharacters = useMemo(() => {
    if (!eventId || !event?.characterIds?.length) return [];
    return characters.filter((c) => event.characterIds!.includes(c.id));
  }, [characters, event]);

  // 关联世界观
  const relatedWorldSettings = useMemo(() => {
    if (!eventId || !event?.worldSettingIds?.length) return [];
    return worldSettings.filter((w) => event.worldSettingIds!.includes(w.id));
  }, [worldSettings, event]);

  // 相关伏笔
  const relatedForeshadowings = useMemo(() => {
    if (!eventId) return [];
    return foreshadowings.filter(
      (f) => f.plantedEventId === eventId || f.resolvedEventId === eventId,
    );
  }, [foreshadowings, eventId]);

  // 关联事件
  const relatedConnections = useMemo(() => {
    if (!eventId) return [];
    return connections.filter(
      (c) => c.sourceEventId === eventId || c.targetEventId === eventId,
    );
  }, [connections, eventId]);

  // 轨道名称
  const trackMap = useMemo(() => {
    const map: Record<string, Track> = {};
    tracks.forEach((t) => (map[t.id] = t));
    return map;
  }, [tracks]);

  // 事件名称映射
  const eventMap = useMemo(() => {
    const map: Record<string, TimelineEvent> = {};
    allEvents.forEach((e) => (map[e.id] = e));
    return map;
  }, [allEvents]);

  if (!event) {
    return <EmptyState />;
  }

  const tags = safeJsonArray<string>(event.tagsJson, []);
  const trackName = event.trackId ? trackMap[event.trackId]?.name ?? '未命名轨道' : '未分配';
  const trackColor = event.trackId ? trackMap[event.trackId]?.color : null;

  return (
    <div className="flex flex-col gap-3 overflow-auto p-3">
      {/* 事件概览 */}
      <SectionCard icon={<TimeIcon size={14} />} title="事件概览">
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold text-foreground">{event.title}</div>
            {event.summary && (
              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.summary}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {trackName && (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: trackColor ? `${trackColor}20` : undefined,
                  color: trackColor ?? undefined,
                }}
              >
                <LayersIcon size={10} />
                {trackName}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1 rounded bg-accent/50 px-1.5 py-0.5 text-[10px] text-foreground">
                <LocalTwoIcon size={10} />
                {event.location}
              </span>
            )}
          </div>

          {event.startTime && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <HistoryIcon size={12} />
              <span>{formatDate(event.startTime)}</span>
              {event.endTime && event.endTime !== event.startTime && (
                <span> → {formatDate(event.endTime)}</span>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary"
                >
                  <TagIcon size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* 参与角色 */}
      <SectionCard icon={<UserIcon size={14} />} title="参与角色">
        {relatedCharacters.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {relatedCharacters.map((char) => (
              <CharacterBadge key={char.id} character={char} />
            ))}
          </div>
        ) : (
          <EmptyLabel label="暂无关联角色" />
        )}
      </SectionCard>

      {/* 世界观元素 */}
      <SectionCard icon={<GlobeIcon size={14} />} title="世界观元素">
        {relatedWorldSettings.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {relatedWorldSettings.map((ws) => (
              <WorldSettingItem key={ws.id} worldSetting={ws} />
            ))}
          </div>
        ) : (
          <EmptyLabel label="暂无关联设定" />
        )}
      </SectionCard>

      {/* 相关伏笔 */}
      <SectionCard icon={<RemindIcon size={14} />} title="相关伏笔">
        {relatedForeshadowings.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {relatedForeshadowings.map((fs) => (
              <ForeshadowingItem key={fs.id} foreshadowing={fs} eventId={eventId!} />
            ))}
          </div>
        ) : (
          <EmptyLabel label="暂无关联伏笔" />
        )}
      </SectionCard>

      {/* 关联事件 */}
      <SectionCard icon={<LinkIcon size={14} />} title="关联事件">
        {relatedConnections.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {relatedConnections.map((conn) => (
              <ConnectionItem
                key={conn.id}
                connection={conn}
                currentEventId={eventId!}
                eventMap={eventMap}
                onJump={(id) => {
                  setSelectedEvent(id);
                  scrollToEvent(id);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyLabel label="暂无关联事件" />
        )}
      </SectionCard>
    </div>
  );
}

/* ───────── 子组件 ───────── */

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 transition-all duration-200 hover:border-border/70 hover:shadow-sm hover:bg-background/70">
      <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2.5">
        <span className="text-muted-foreground/70">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
        <FireIcon size={24} className="text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground/70">选择一个事件查看关联数据</p>
        <p className="mt-1 text-xs text-muted-foreground/40">在时间轴中点击任意事件</p>
      </div>
    </div>
  );
}

function EmptyLabel({ label }: { label: string }) {
  return (
    <p className="py-3 text-center text-[11px] italic text-muted-foreground/40">{label}</p>
  );
}

function CharacterBadge({ character }: { character: Character }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/80 px-2.5 py-1.5 transition-all duration-200 hover:border-border/70 hover:shadow-sm">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary ring-2 ring-primary/5">
        {character.name.charAt(0)}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-medium leading-tight text-foreground">
          {character.name}
        </span>
        {character.role && (
          <span className="text-[10px] leading-tight text-muted-foreground/60">{character.role}</span>
        )}
      </div>
    </div>
  );
}

function WorldSettingItem({ worldSetting }: { worldSetting: WorldSetting }) {
  const colorClass = CATEGORY_COLORS[worldSetting.category] ?? CATEGORY_COLORS['其他'];
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-2.5 py-2 transition-all duration-200 hover:border-border/70">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', colorClass)}>
          {worldSetting.category}
        </span>
        <span className="text-[11px] font-medium text-foreground">{worldSetting.key}</span>
      </div>
      {worldSetting.value && (
        <span className="max-w-[120px] truncate text-[10px] text-muted-foreground/60">
          {worldSetting.value}
        </span>
      )}
    </div>
  );
}

function ForeshadowingItem({
  foreshadowing,
  eventId,
}: {
  foreshadowing: Foreshadowing;
  eventId: string;
}) {
  const status = STATUS_MAP[foreshadowing.status] ?? STATUS_MAP['planted'];
  const isPlanted = foreshadowing.plantedEventId === eventId;
  const isResolved = foreshadowing.resolvedEventId === eventId;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 bg-background/80 px-2.5 py-2 transition-all duration-200 hover:border-border/70">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">{foreshadowing.title}</span>
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', status.color)}>
          {status.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isPlanted && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <span className="h-1 w-1 rounded-full bg-amber-400" />埋下处
          </span>
        )}
        {isResolved && (
          <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
            <span className="h-1 w-1 rounded-full bg-green-400" />回收处
          </span>
        )}
      </div>
      {foreshadowing.description && (
        <p className="text-[10px] text-muted-foreground/60 line-clamp-2">{foreshadowing.description}</p>
      )}
    </div>
  );
}

function ConnectionItem({
  connection,
  currentEventId,
  eventMap,
  onJump,
}: {
  connection: Connection;
  currentEventId: string;
  eventMap: Record<string, TimelineEvent>;
  onJump: (eventId: string) => void;
}) {
  const isSource = connection.sourceEventId === currentEventId;
  const otherEventId = isSource ? connection.targetEventId : connection.sourceEventId;
  const otherEvent = eventMap[otherEventId];
  const typeClass = TYPE_COLORS[connection.type] ?? 'bg-gray-50 text-gray-700';

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 bg-background/80 px-2.5 py-2 transition-all duration-200 hover:border-border/70">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', typeClass)}>
          {connection.type}
        </span>
        <span className="text-[10px] text-muted-foreground/40">
          {isSource ? '→' : '←'}
        </span>
      </div>
      <button
        onClick={() => onJump(otherEventId)}
        className="text-left text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {otherEvent?.title ?? '未命名事件'}
      </button>
      {connection.description && (
        <p className="text-[10px] text-muted-foreground/60 line-clamp-2">{connection.description}</p>
      )}
    </div>
  );
}

/* ───────── 工具函数 ───────── */

function formatDate(date: Date | string | null): string {
  if (!date) return '未知时间';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
