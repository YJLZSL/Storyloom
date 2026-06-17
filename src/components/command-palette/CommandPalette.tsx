import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, User, Globe, Eye, GitBranch, CornerDownLeft } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores/useUIStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { formatKeysForDisplay } from '@/lib/platform';
import type {
  TimelineEvent,
  Character,
  WorldSetting,
  Foreshadowing,
  Connection,
} from '../../../shared/types';
import {
  commands,
  CATEGORY_LABELS,
  useCommandContext,
  type CommandCategory,
} from './commands';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
}

const FORESHADOWING_STATUS_LABELS: Record<string, string> = {
  planted: '已埋设',
  developed: '已发展',
  resolved: '已回收',
  abandoned: '已放弃',
};

const CATEGORY_ORDER: CommandCategory[] = ['view', 'action', 'edit', 'system', 'theme'];

function formatTime(date: Date | string | null): string {
  if (!date) return '未设定时间';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '未设定时间';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setSelectedCharacter = useTimelineStore((s) => s.setSelectedCharacter);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);

  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const queryClient = useQueryClient();
  const ctx = useCommandContext();

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const isCommandMode = search.startsWith('>');
  const query = isCommandMode ? search.slice(1).trim().toLowerCase() : search.trim().toLowerCase();

  const close = () => setOpen(false);

  const eventsData = queryClient.getQueryData<{ items: TimelineEvent[]; total: number }>([
    'events',
    workspaceId,
  ]);
  const characters = queryClient.getQueryData<Character[]>(['characters', workspaceId]);
  const worldSettings = queryClient.getQueryData<WorldSetting[]>(['worldSettings', workspaceId]);
  const foreshadowings = queryClient.getQueryData<Foreshadowing[]>(['foreshadowings', workspaceId]);
  const connections = queryClient.getQueryData<Connection[]>(['connections', workspaceId]);

  const eventMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of eventsData?.items ?? []) {
      map.set(e.id, e.title);
    }
    return map;
  }, [eventsData]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    return commands.filter((c) => c.title.toLowerCase().includes(query));
  }, [query]);

  const searchResults = useMemo<SearchResultItem[]>(() => {
    if (!workspaceId || isCommandMode || !query) return [];
    const results: SearchResultItem[] = [];

    for (const e of eventsData?.items ?? []) {
      if (
        e.title.toLowerCase().includes(query) ||
        (e.summary && e.summary.toLowerCase().includes(query))
      ) {
        results.push({
          id: `event-${e.id}`,
          title: e.title,
          subtitle: `事件 · ${formatTime(e.startTime)}`,
          icon: Clock,
          onSelect: () => {
            setSelectedEvent(e.id);
            setViewMode('timeline');
            scrollToEvent(e.id);
            close();
          },
        });
      }
    }

    for (const c of characters ?? []) {
      if (
        c.name.toLowerCase().includes(query) ||
        (c.role && c.role.toLowerCase().includes(query))
      ) {
        results.push({
          id: `char-${c.id}`,
          title: c.name,
          subtitle: `角色${c.role ? ' · ' + c.role : ''}`,
          icon: User,
          onSelect: () => {
            setSelectedCharacter(c.id);
            setActivePanel('characters');
            close();
          },
        });
      }
    }

    for (const s of worldSettings ?? []) {
      if (
        s.key.toLowerCase().includes(query) ||
        (s.value && s.value.toLowerCase().includes(query)) ||
        s.category.toLowerCase().includes(query)
      ) {
        results.push({
          id: `ws-${s.id}`,
          title: s.key,
          subtitle: `世界观 · ${s.category}`,
          icon: Globe,
          onSelect: () => {
            setActivePanel('worldview');
            close();
          },
        });
      }
    }

    for (const f of foreshadowings ?? []) {
      if (
        f.title.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
      ) {
        results.push({
          id: `fs-${f.id}`,
          title: f.title,
          subtitle: `伏笔 · ${FORESHADOWING_STATUS_LABELS[f.status] ?? f.status}`,
          icon: Eye,
          onSelect: () => {
            setActivePanel('foreshadowing');
            close();
          },
        });
      }
    }

    for (const c of connections ?? []) {
      if (
        (c.description && c.description.toLowerCase().includes(query)) ||
        c.type.toLowerCase().includes(query)
      ) {
        const sourceTitle = eventMap.get(c.sourceEventId) ?? c.sourceEventId.slice(0, 8);
        const targetTitle = eventMap.get(c.targetEventId) ?? c.targetEventId.slice(0, 8);
        results.push({
          id: `conn-${c.id}`,
          title: `${sourceTitle} → ${targetTitle}`,
          subtitle: `关联 · ${c.type}`,
          icon: GitBranch,
          onSelect: () => {
            setActivePanel('connections');
            close();
          },
        });
      }
    }

    return results.slice(0, 12);
  }, [
    workspaceId,
    isCommandMode,
    query,
    eventsData,
    characters,
    worldSettings,
    foreshadowings,
    connections,
    eventMap,
    setSelectedEvent,
    setViewMode,
    scrollToEvent,
    setSelectedCharacter,
    setActivePanel,
    close,
  ]);

  const commandsByCategory = useMemo(() => {
    const groups: Record<CommandCategory, typeof commands> = {
      view: [],
      action: [],
      theme: [],
      edit: [],
      system: [],
    };
    for (const cmd of filteredCommands) {
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const hasSearchResults = searchResults.length > 0;
  const hasCommands = filteredCommands.length > 0;
  const showEmpty = isCommandMode ? !hasCommands : !hasSearchResults && !hasCommands;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder={isCommandMode ? '输入命令名称...' : '搜索事件、角色、世界观、伏笔，或输入 > 执行命令'}
      />
      <CommandList>
        {showEmpty && <CommandEmpty>无匹配结果</CommandEmpty>}

        {!isCommandMode && hasSearchResults && (
          <CommandGroup heading="搜索结果">
            {searchResults.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={item.onSelect}
                  className="gap-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {hasCommands && (isCommandMode || !query || !hasSearchResults) && (
          <>
            {CATEGORY_ORDER.map((category) => {
              const items = commandsByCategory[category];
              if (!items || items.length === 0) return null;
              return (
                <CommandGroup key={category} heading={CATEGORY_LABELS[category]}>
                  {items.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <CommandItem
                        key={cmd.id}
                        value={cmd.id}
                        onSelect={() => cmd.handler(ctx)}
                        className="gap-2"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{cmd.title}</span>
                        {cmd.shortcut && (
                          <CommandShortcut>
                            {formatKeysForDisplay(cmd.shortcut.split('+'))}
                          </CommandShortcut>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </>
        )}

        {!isCommandMode && !query && (
          <div className="flex items-center gap-1.5 px-2 py-2 text-xs text-muted-foreground">
            <CornerDownLeft className="size-3" />
            <span>回车跳转或执行</span>
            <Badge variant="outline" className="ml-auto">输入 &gt; 查看命令</Badge>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
