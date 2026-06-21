import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  UserIcon,
  GlobeIcon,
  RemindIcon,
  RobotIcon,
  LinkIcon,
  SettingIcon,
  EditIcon,
  SearchIcon,
  TimeIcon,
  MenuUnfoldIcon,
  MenuFoldIcon,
  BookmarkIcon,
  MapIcon,
  type IconParkIconProps,
} from '@/lib/icons';
import { TButton, TInput } from '@/components/ui-tdesign';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { useCharacters, useEvents, useForeshadowings, useWorldSettings } from '@/services/api-hooks';
import { PomodoroTimer } from '@/components/_shared/PomodoroTimer';
import { DailyGoalWidget } from '@/stores/useDailyGoalStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { toast } from 'sonner';

/* ───────── 类型 ───────── */

type IconComponent = (props: IconParkIconProps) => React.ReactElement;

interface ToolItem {
  id: string;
  label: string;
  icon: IconComponent;
  panelId: 'characters' | 'worldview' | 'foreshadowing' | 'ai' | 'connections' | 'consistency' | 'event-editor' | 'bookmarks' | 'maps';
}

/* ───────── 常量 ───────── */

const CREATION_TOOLS: ToolItem[] = [
  { id: 'characters', label: 'Characters', icon: UserIcon, panelId: 'characters' },
  { id: 'worldview', label: 'Worldview', icon: GlobeIcon, panelId: 'worldview' },
  { id: 'foreshadowing', label: 'Foreshadowing', icon: RemindIcon, panelId: 'foreshadowing' },
  { id: 'ai', label: 'AI Assistant', icon: RobotIcon, panelId: 'ai' },
];

const UTILITY_TOOLS: ToolItem[] = [
  { id: 'connections', label: 'Connections', icon: LinkIcon, panelId: 'connections' },
  { id: 'consistency', label: 'Consistency', icon: SettingIcon, panelId: 'consistency' },
  { id: 'event-editor', label: 'Event Editor', icon: EditIcon, panelId: 'event-editor' },
  { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon, panelId: 'bookmarks' },
  { id: 'maps', label: 'Maps', icon: MapIcon, panelId: 'maps' },
];

export function LeftPanel() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const selectedCharacterId = useSelectionStore((s) => s.selectedCharacterId);
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const { data: characters } = useCharacters(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: foreshadowings } = useForeshadowings(workspaceId);
  const { data: worldSettings } = useWorldSettings(workspaceId);

  const events = eventsData?.items ?? [];

  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setViewMode = useTimelineStore((s) => s.setViewMode);

  const filteredEvents = searchQuery.trim()
    ? events.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : [];

  const handleEventClick = (eventId: string, eventTitle: string) => {
    scrollToEvent(eventId);
    setViewMode('timeline');
    setSearchQuery('');
    toast.success(`已定位到事件「${eventTitle}」`);
  };

  const handleToolClick = (panelId: ToolItem['panelId']) => {
    setActivePanel(activePanel === panelId ? null : panelId);
  };

  const ToggleIcon = collapsed ? MenuUnfoldIcon : MenuFoldIcon;

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border/40 glass transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-12' : 'w-(--sidebar-width) lg:w-(--sidebar-width-lg) xl:w-(--sidebar-width-xl)',
      )}
      style={{ zIndex: 'var(--z-sidenav)' }}
    >
      {/* 折叠按钮 */}
      <div
        className={cn(
          'flex h-10 shrink-0 items-center border-b border-border/40 px-2',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="select-none text-xs font-semibold tracking-wide text-muted-foreground/70">
            {t('leftPanel.resourceDirectory')}
          </span>
        )}
        <TButton
          variant="text"
          shape="circle"
          size="small"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t('leftPanel.expand') : t('leftPanel.collapse')}
          className="size-7 btn-lift ripple-btn text-muted-foreground/60 hover:bg-accent/40 hover:text-accent-foreground transition-colors"
        >
          <ToggleIcon size={16} />
        </TButton>
      </div>

      {!collapsed && (
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
          {/* 搜索 */}
          <div className="relative group">
            <SearchIcon className="search-icon absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors" />
            <TInput
              size="small"
              placeholder={t('leftPanel.searchEventsPlaceholder') || '搜索事件...'}
              value={searchQuery}
              onChange={(v) => setSearchQuery(v as string)}
              className="h-8 pl-8 text-xs border-border/50 focus:border-primary/50 transition-all input-glow search-expand"
              clearable
            />
            {/* 事件搜索结果 */}
            {filteredEvents.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg">
                {filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/50"
                    onClick={() => handleEventClick(event.id, event.title)}
                  >
                    <TimeIcon size={14} className="shrink-0 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{event.title}</div>
                      {event.summary && (
                        <div className="truncate text-muted-foreground/70">{event.summary}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && filteredEvents.length === 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg px-3 py-2 text-xs text-muted-foreground">
                未找到匹配的事件
              </div>
            )}
          </div>

          {/* 创作工具 */}
          <ToolSection title={t('leftPanel.creation')} tools={CREATION_TOOLS} activePanel={activePanel} onToolClick={handleToolClick} />

          {/* 工具 */}
          <ToolSection title={t('leftPanel.tools')} tools={UTILITY_TOOLS} activePanel={activePanel} onToolClick={handleToolClick} />

          {/* 专注工具 */}
          <div className="space-y-2">
            <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              专注工具
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 backdrop-blur-sm space-y-3">
              <PomodoroTimer />
            </div>
          </div>

          {/* 每日目标 */}
          <DailyGoalWidget />

          {/* 快速统计 */}
          <div className="mt-auto space-y-2 rounded-xl border border-border/40 bg-background/60 p-3 backdrop-blur-sm card-hover-shadow">
            <div className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t('leftPanel.workspaceOverview')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatBadge label={t('leftPanel.events')} value={events.length} color="blue" />
              <StatBadge label={t('leftPanel.characters')} value={characters?.length ?? 0} color="green" />
              <StatBadge label={t('leftPanel.foreshadowings')} value={foreshadowings?.length ?? 0} color="amber" />
              <StatBadge label={t('leftPanel.settings')} value={worldSettings?.length ?? 0} color="purple" />
            </div>
            {selectedEventId && (
              <div className="border-t border-border/30 pt-2">
                <div className="text-[10px] text-muted-foreground/50">{t('leftPanel.selectedEvent')}</div>
                <div className="mt-1 truncate text-xs font-medium text-primary">
                  {events.find((e) => e.id === selectedEventId)?.title ?? selectedEventId.slice(0, 8)}
                </div>
              </div>
            )}
            {selectedCharacterId && (
              <div className="border-t border-border/30 pt-2">
                <div className="text-[10px] text-muted-foreground/50">{t('leftPanel.selectedCharacter')}</div>
                <div className="mt-1 truncate text-xs font-medium text-primary">
                  {characters?.find((c) => c.id === selectedCharacterId)?.name ?? selectedCharacterId.slice(0, 8)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 折叠状态只显示图标 */}
      {collapsed && (
        <div className="flex flex-1 flex-col items-center gap-1 py-2">
          {[...CREATION_TOOLS, ...UTILITY_TOOLS].map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.panelId;
            return (
              <TButton
                key={item.id}
                variant="text"
                shape="square"
                size="small"
                className={cn(
                  'size-10 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground/60 hover:bg-accent/50 hover:text-accent-foreground',
                )}
                onClick={() => handleToolClick(item.panelId)}
                title={t(`panels.${item.id === 'event-editor' ? 'eventEditor' : item.id}` as const)}
              >
                <Icon size={20} />
              </TButton>
            );
          })}
        </div>
      )}
    </aside>
  );
}

/* ───────── 子组件：工具分区 ───────── */

function ToolSection({
  title,
  tools,
  activePanel,
  onToolClick,
}: {
  title: string;
  tools: ToolItem[];
  activePanel: string | null;
  onToolClick: (id: ToolItem['panelId']) => void;
}) {
  const { t } = useTranslation();
  const getToolLabel = (id: string) => {
    const keyMap: Record<string, string> = {
      characters: 'panels.characters',
      worldview: 'panels.worldview',
      foreshadowing: 'panels.foreshadowing',
      ai: 'panels.ai',
      connections: 'panels.connections',
      consistency: 'panels.consistency',
      'event-editor': 'panels.eventEditor',
      bookmarks: '书签',
      maps: '地图',
    };
    return t(keyMap[id] || id);
  };
  return (
    <div className="space-y-2">
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {tools.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.panelId;
          return (
            <button
              key={item.id}
              onClick={() => onToolClick(item.panelId)}
              className={cn(
                'ripple-btn flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all duration-200 weave-border tool-bar-indicator',
                isActive
                  ? 'bg-primary/10 text-primary font-medium shadow-sm active'
                  : 'text-foreground/80 hover:bg-accent/50 hover:text-accent-foreground',
              )}
            >
              <Icon size={18} className={cn('transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
              <span>{getToolLabel(item.id)}</span>
              {isActive && (
                <span className="ml-auto inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── 子组件：统计徽章 ───────── */

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
    blue: { bg: 'bg-blue-50/70 dark:bg-blue-900/15', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400' },
    green: { bg: 'bg-green-50/70 dark:bg-green-900/15', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-400' },
    amber: { bg: 'bg-amber-50/70 dark:bg-amber-900/15', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
    purple: { bg: 'bg-purple-50/70 dark:bg-purple-900/15', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-400' },
  };
  const c = colorMap[color];
  return (
    <div className={cn('flex items-center justify-between rounded-lg px-2.5 py-1.5', c.bg)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
        <span className={cn('text-[10px]', c.text)}>{label}</span>
      </div>
      <span className={cn('text-xs font-semibold tabular-nums', c.text)}>{value}</span>
    </div>
  );
}
