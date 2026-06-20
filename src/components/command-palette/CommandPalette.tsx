import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { TInput, TTag } from '@/components/ui-tdesign';
import type { InputRef } from 'tdesign-react';
import {
  TimeIcon,
  UserIcon,
  GlobeIcon,
  EyesIcon,
  RelationalGraphIcon,
  ListIcon,
  BookOpenIcon,
  ChartHistogramIcon,
  PieIcon,
  PlusIcon,
  FolderOpenIcon,
  UploadIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon,
  CommandIcon,
  FullScreenIcon,
  PanelLeftIcon,
  SettingIcon,
  SunIcon,
  MoonIcon,
  TreeIcon,
  PencilIcon,
  ContrastIcon,
  MonitorIcon,
  DownloadIcon,
  SearchIcon,
} from '@/lib/icons';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { revealInBestView } from '@/utils/revealInBestView';
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
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandListItem {
  id: string;
  type: 'command';
  title: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  category: CommandCategory;
}

type ListItem = SearchResultItem | CommandListItem;

function isSearchItem(item: ListItem): item is SearchResultItem {
  return !('type' in item);
}

const FORESHADOWING_STATUS_LABELS: Record<string, string> = {
  planted: '已埋设',
  developed: '已发展',
  resolved: '已回收',
  abandoned: '已放弃',
};

const CATEGORY_ORDER: CommandCategory[] = ['view', 'action', 'edit', 'system', 'theme'];

const COMMAND_ICON_MAP: Record<string, React.ReactNode> = {
  'view-timeline': <TimeIcon size={16} />,
  'view-outline': <ListIcon size={16} />,
  'view-narrative': <BookOpenIcon size={16} />,
  'view-gantt': <ChartHistogramIcon size={16} />,
  'view-statistics': <PieIcon size={16} />,
  'view-relationship': <RelationalGraphIcon size={16} />,
  'action-new-event': <PlusIcon size={16} />,
  'action-new-character': <UserIcon size={16} />,
  'action-new-workspace': <FolderOpenIcon size={16} />,
  'action-export': <DownloadIcon size={16} />,
  'action-import': <UploadIcon size={16} />,
  'edit-save': <SaveIcon size={16} />,
  'edit-undo': <UndoIcon size={16} />,
  'edit-redo': <RedoIcon size={16} />,
  'system-command-palette': <CommandIcon size={16} />,
  'system-focus-mode': <FullScreenIcon size={16} />,
  'system-toggle-sidebar': <PanelLeftIcon size={16} />,
  'system-settings': <SettingIcon size={16} />,
  'theme-luosheng': <SunIcon size={16} />,
  'theme-midnight': <MoonIcon size={16} />,
  'theme-forest': <TreeIcon size={16} />,
  'theme-ink-wash': <PencilIcon size={16} />,
  'theme-contrast': <ContrastIcon size={16} />,
  'theme-system': <MonitorIcon size={16} />,
};

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

  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const queryClient = useQueryClient();
  const ctx = useCommandContext();
  const selection = useSelectionStore.getState();

  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setActiveId(null);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
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
          icon: <TimeIcon size={16} />,
          onSelect: () => {
            selection.selectEvent(e.id);
            revealInBestView('event', e.id);
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
          icon: <UserIcon size={16} />,
          onSelect: () => {
            selection.selectCharacter(c.id);
            revealInBestView('character', c.id);
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
          icon: <GlobeIcon size={16} />,
          onSelect: () => {
            selection.selectWorldSetting(s.id);
            revealInBestView('worldSetting', s.id);
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
          icon: <EyesIcon size={16} />,
          onSelect: () => {
            selection.selectForeshadowing(f.id);
            revealInBestView('foreshadowing', f.id);
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
          icon: <RelationalGraphIcon size={16} />,
          onSelect: () => {
            revealInBestView('connection', c.id);
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
    selection,
  ]);

  const commandItems = useMemo<CommandListItem[]>(() => {
    return filteredCommands.map((cmd) => ({
      id: cmd.id,
      type: 'command',
      title: cmd.title,
      icon: COMMAND_ICON_MAP[cmd.id] ?? <CommandIcon size={16} />,
      shortcut: cmd.shortcut,
      category: cmd.category,
      onSelect: () => {
        cmd.handler(ctx);
      },
    }));
  }, [filteredCommands, ctx]);

  const commandsByCategory = useMemo(() => {
    const groups: Record<CommandCategory, CommandListItem[]> = {
      view: [],
      action: [],
      theme: [],
      edit: [],
      system: [],
    };
    for (const item of commandItems) {
      groups[item.category].push(item);
    }
    return groups;
  }, [commandItems]);

  const flatSelectableIds = useMemo(() => {
    const ids: string[] = [];
    if (searchResults.length > 0) {
      ids.push(...searchResults.map((r) => r.id));
    }
    for (const category of CATEGORY_ORDER) {
      if (!isCommandMode || !query || searchResults.length === 0) {
        ids.push(...commandsByCategory[category].map((c) => c.id));
      }
    }
    return ids;
  }, [searchResults, commandsByCategory, isCommandMode, query]);

  const hasSearchResults = searchResults.length > 0;
  const hasCommands = filteredCommands.length > 0;
  const showEmpty = isCommandMode ? !hasCommands : !hasSearchResults && !hasCommands;
  const showCommands = hasCommands && (isCommandMode || !query || !hasSearchResults);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (flatSelectableIds.length === 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveId((prev) => {
          const currentIndex = prev ? flatSelectableIds.indexOf(prev) : -1;
          let nextIndex: number;
          if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < flatSelectableIds.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : flatSelectableIds.length - 1;
          }
          return flatSelectableIds[nextIndex] ?? null;
        });
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const targetId = activeId ?? flatSelectableIds[0];
        if (!targetId) return;
        const item =
          searchResults.find((r) => r.id === targetId) ??
          commandItems.find((c) => c.id === targetId);
        item?.onSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, flatSelectableIds, activeId, searchResults, commandItems]);

  const renderItem = (item: ListItem) => {
    const selected = activeId === item.id;
    return (
      <div
        key={item.id}
        role="option"
        aria-selected={selected}
        onClick={() => {
          setActiveId(item.id);
          item.onSelect();
        }}
        onMouseEnter={() => setActiveId(item.id)}
        className={`
          flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm
          transition-colors
          ${selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
        `}
      >
        <span className="shrink-0 text-muted-foreground">{item.icon}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{item.title}</span>
          {!isSearchItem(item) ? null : (
            <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
          )}
        </div>
        {!isSearchItem(item) && item.shortcut && (
          <span className="ml-auto shrink-0 text-xs tracking-widest text-muted-foreground">
            {formatKeysForDisplay(item.shortcut.split('+'))}
          </span>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[rgb(var(--popover))] text-[rgb(var(--popover-foreground))] border border-[rgb(var(--border))] shadow-2xl p-0 top-[20%] translate-y-0 max-w-2xl overflow-hidden">
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <div className="flex items-center border-b px-3">
          <TInput
            ref={inputRef}
            value={search}
            onChange={(v) => setSearch(v as string)}
            placeholder={isCommandMode ? '输入命令名称...' : '搜索事件、角色、世界观、伏笔，或输入 > 执行命令'}
            prefixIcon={<SearchIcon size={18} />}
            className="flex-1 border-0 shadow-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden bg-[rgb(var(--popover))] p-1">
          {showEmpty && (
            <div className="py-6 text-center text-sm text-muted-foreground">无匹配结果</div>
          )}

          {!isCommandMode && hasSearchResults && (
            <div className="mb-1">
              <div className="px-2 py-1.5">
                <TTag theme="default" variant="light" size="small">
                  搜索结果
                </TTag>
              </div>
              {searchResults.map((item) => renderItem(item))}
            </div>
          )}

          {showCommands && (
            <>
              {CATEGORY_ORDER.map((category) => {
                const items = commandsByCategory[category];
                if (!items || items.length === 0) return null;
                return (
                  <div key={category} className="mb-1">
                    <div className="px-2 py-1.5">
                      <TTag theme="primary" variant="light" size="small">
                        {CATEGORY_LABELS[category]}
                      </TTag>
                    </div>
                    {items.map((item) => renderItem(item))}
                  </div>
                );
              })}
            </>
          )}

          {!isCommandMode && !query && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <span>回车跳转或执行</span>
              <TTag theme="default" variant="light" size="small" className="ml-auto">
                输入 &gt; 查看命令
              </TTag>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
