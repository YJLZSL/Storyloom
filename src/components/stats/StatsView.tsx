import { useMemo } from 'react';
import { useEvents, useCharacters, useTracks, useConnections, useForeshadowings } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';

export function StatsView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const setOutlineFilterTrackId = useTimelineStore((s) => s.setOutlineFilterTrackId);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: characters } = useCharacters(workspaceId);
  const { data: tracks } = useTracks(workspaceId);
  const { data: connections } = useConnections(workspaceId);
  const { data: foreshadowings } = useForeshadowings(workspaceId);

  const events = eventsData?.items || [];

  // Compute track event distribution (include trackId for click handler)
  const trackDistribution = useMemo(() => {
    if (!tracks) return [];
    const countMap = new Map<string, number>();
    for (const track of tracks) countMap.set(track.id, 0);
    for (const event of events) {
      if (event.trackId && countMap.has(event.trackId)) {
        countMap.set(event.trackId, countMap.get(event.trackId)! + 1);
      }
    }
    return tracks.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color || '#3b82f6',
      count: countMap.get(t.id) || 0,
    }));
  }, [tracks, events]);

  // Compute foreshadowing status distribution
  const foreshadowingStats = useMemo(() => {
    if (!foreshadowings) return { planted: 0, developed: 0, resolved: 0, abandoned: 0 };
    const stats = { planted: 0, developed: 0, resolved: 0, abandoned: 0 };
    for (const f of foreshadowings) {
      if (f.status in stats) (stats as Record<string, number>)[f.status]++;
    }
    return stats;
  }, [foreshadowings]);

  // Compute character appearance frequency
  const characterFrequency = useMemo(() => {
    if (!characters) return [];
    const countMap = new Map<string, number>();
    for (const char of characters) countMap.set(char.id, 0);
    for (const event of events) {
      if (event.characterIds) {
        for (const cid of event.characterIds) {
          if (countMap.has(cid)) {
            countMap.set(cid, countMap.get(cid)! + 1);
          }
        }
      }
    }
    return characters
      .map((c) => ({ id: c.id, name: c.name, count: countMap.get(c.id) || 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [characters, events]);

  const maxTrackCount = Math.max(1, ...trackDistribution.map((t) => t.count));
  const maxCharCount = Math.max(1, ...characterFrequency.map((c) => c.count));

  // Click handlers
  const handleTrackBarClick = (trackId: string) => {
    setOutlineFilterTrackId(trackId);
    setViewMode('outline');
  };

  const handleForeshadowingStatClick = () => {
    setActivePanel('foreshadowing');
  };

  const handleCharacterBarClick = () => {
    setActivePanel('characters');
  };

  const eventsWithDates = events.filter((e) => e.startTime !== null).length;

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <h2 className="font-serif text-2xl font-semibold mb-6 tracking-tight">统计视图</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard title="总事件" value={events.length} />
        <StatCard title="角色数" value={characters?.length || 0} />
        <StatCard title="轨道数" value={tracks?.length || 0} />
        <StatCard title="关联数" value={connections?.length || 0} />
        <StatCard title="伏笔数" value={foreshadowings?.length || 0} />
        <StatCard title="时间跨度" value={getTimeSpan(events)} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Track Distribution */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-serif text-lg font-semibold mb-4">轨道事件分布</h3>
          {trackDistribution.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-sans">暂无轨道</div>
          ) : (
            <div className="space-y-3">
              {trackDistribution.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => handleTrackBarClick(track.id)}
                  title={`点击查看「${track.name}」轨道事件`}
                >
                  <span className="text-sm w-24 truncate font-sans group-hover:text-primary transition-colors">{track.name}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="stat-bar h-full rounded-full group-hover:opacity-80 transition-all duration-500"
                      style={{
                        width: `${(track.count / maxTrackCount) * 100}%`,
                        backgroundColor: track.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{track.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heatmap */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-serif text-lg font-semibold mb-4">情节密度热力图</h3>
          <EventDensityHeatmap events={events} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Foreshadowing Status */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-serif text-lg font-semibold mb-4">伏笔生命周期</h3>
          {foreshadowings && foreshadowings.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <ForeshadowingStat label="已埋下" count={foreshadowingStats.planted} color="bg-yellow-500" onClick={handleForeshadowingStatClick} />
              <ForeshadowingStat label="发展中" count={foreshadowingStats.developed} color="bg-blue-500" onClick={handleForeshadowingStatClick} />
              <ForeshadowingStat label="已回收" count={foreshadowingStats.resolved} color="bg-green-500" onClick={handleForeshadowingStatClick} />
              <ForeshadowingStat label="已废弃" count={foreshadowingStats.abandoned} color="bg-gray-500" onClick={handleForeshadowingStatClick} />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm font-sans">暂无伏笔</div>
          )}
        </div>

        {/* Character Appearance Frequency */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-serif text-lg font-semibold mb-4">角色出场频率</h3>
          {characterFrequency.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-sans">暂无角色关联数据</div>
          ) : (
            <div className="space-y-2">
              {characterFrequency.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={handleCharacterBarClick}
                  title="点击打开角色面板"
                >
                  <span className="text-sm w-20 truncate font-sans group-hover:text-primary transition-colors">{char.name}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="char-bar h-full rounded-full group-hover:opacity-80 transition-all duration-500"
                      style={{
                        width: `${(char.count / maxCharCount) * 100}%`,
                        backgroundColor: '#8b5cf6',
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{char.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 3 - Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-serif text-lg font-semibold mb-4">事件概览</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-sans">有日期事件</span>
              <span className="text-sm font-mono font-semibold">{eventsWithDates} / {events.length}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: events.length > 0 ? `${(eventsWithDates / events.length) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-sans">有摘要事件</span>
              <span className="text-sm font-mono font-semibold">
                {events.filter((e) => e.summary).length} / {events.length}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: events.length > 0 ? `${(events.filter((e) => e.summary).length / events.length) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-sans">有详细描述事件</span>
              <span className="text-sm font-mono font-semibold">
                {events.filter((e) => e.description).length} / {events.length}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: events.length > 0 ? `${(events.filter((e) => e.description).length / events.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="stat-card border border-border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
      <div className="text-xs text-muted-foreground mb-1 font-sans">{title}</div>
      <div className="text-xl font-serif font-bold tracking-tight">{value}</div>
    </div>
  );
}

function ForeshadowingStat({ label, count, color, onClick }: { label: string; count: number; color: string; onClick: () => void }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
      title={`点击查看「${label}」的伏笔`}
    >
      <div className={`w-3 h-3 rounded-full ${color} shrink-0`} />
      <div>
        <div className="text-xs text-muted-foreground font-sans">{label}</div>
        <div className="text-lg font-serif font-bold">{count}</div>
      </div>
    </div>
  );
}

function getTimeSpan(events: Array<{ startTime: Date | null }>): string {
  const times = events
    .map((e) => e.startTime)
    .filter((t): t is Date => t !== null)
    .map((t) => new Date(t).getTime());
  if (times.length < 2) return '-';
  const min = Math.min(...times);
  const max = Math.max(...times);
  const days = Math.ceil((max - min) / (1000 * 60 * 60 * 24));
  return `${days} 天`;
}

function EventDensityHeatmap({
  events,
}: {
  events: Array<{ startTime: Date | null }>;
}) {
  const times = events
    .map((e) => e.startTime)
    .filter((t): t is Date => t !== null)
    .map((t) => new Date(t));

  if (times.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm font-sans">暂无数据</div>;
  }

  const byMonth = new Map<string, number>();
  for (const t of times) {
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }

  const entries = Array.from(byMonth.entries()).sort();
  const maxCount = Math.max(...entries.map(([, c]) => c));

  return (
    <div className="grid grid-cols-4 gap-2">
      {entries.map(([month, count]) => (
        <div
          key={month}
          className="heatmap-cell aspect-square rounded-md flex items-center justify-center text-xs font-mono hover:scale-105 transition-transform cursor-default"
          style={{
            backgroundColor: `rgba(196, 112, 58, ${0.1 + (count / maxCount) * 0.9})`,
          }}
          title={`${month}: ${count} 个事件`}
        >
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground">{month}</div>
            <div className="font-semibold">{count}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
