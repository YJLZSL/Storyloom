import { useState, useRef, useEffect, useCallback } from 'react';
import { Drawer as TDrawer } from 'tdesign-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  SearchIcon,
  ChevronDownIcon,
  ClockIcon,
  EditIcon,
  DeleteIcon,
  RightIcon,
  UserIcon,
  LinkIcon,
  DragIcon,
  XIcon,
  HistoryIcon,
  UndoIcon,
  BookOpenIcon,
  CheckIcon,
  RoundIcon,
  IdeaIcon,
  PlusIcon,
  LocalTwoIcon,
} from '@/lib/icons';
import { TInput, TButton, TTag, TCheckTag } from '@/components/ui-tdesign';
import { useCommandContext } from '@/components/command-palette/commands';
import {
  useEvents,
  useTracks,
  useDeleteEvent,
  useUpdateEvent,
  useCharacters,
  useOutlineVersions,
  useCreateOutlineVersion,
  useDeleteOutlineVersion,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { scrollSelectedIntoView } from '@/utils/revealInBestView';
import { safeJsonArray } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/ContextMenu';
import type { TimelineEvent } from '../../../shared/types';

type OutlineStatus = 'completed' | 'in-progress' | 'pending' | 'abandoned';
type OutlineStage = 'all' | '起' | '承' | '转' | '合';

interface DragSortState {
  eventId: string;
  trackId: string;
  startY: number;
  currentY: number;
  hasMoved: boolean;
}

const STAGES: OutlineStage[] = ['all', '起', '承', '转', '合'];
const STAGE_LABELS: Record<OutlineStage, string> = {
  all: '全部',
  起: '起',
  承: '承',
  转: '转',
  合: '合',
};

const STATUS_LABELS: Record<OutlineStatus, string> = {
  completed: '已完成',
  'in-progress': '进行中',
  pending: '待处理',
  abandoned: '废弃',
};

const STATUS_THEME: Record<OutlineStatus, 'success' | 'primary' | 'warning' | 'default'> = {
  completed: 'success',
  'in-progress': 'primary',
  pending: 'warning',
  abandoned: 'default',
};

const STATUS_ICONS: Record<OutlineStatus, React.ReactNode> = {
  completed: <CheckIcon size={12} />,
  'in-progress': <ClockIcon size={12} />,
  pending: <RoundIcon size={12} />,
  abandoned: <DeleteIcon size={12} />,
};

function getEventTags(event: TimelineEvent): string[] {
  return safeJsonArray<string>(event.tagsJson, []);
}

function getEventStatus(event: TimelineEvent): OutlineStatus {
  const tags = getEventTags(event).map((t) => t.toLowerCase());
  const text = `${event.title} ${event.summary || ''}`.toLowerCase();
  if (tags.includes('废弃') || tags.includes('abandoned') || text.includes('废弃')) return 'abandoned';
  if (tags.includes('已完成') || tags.includes('completed') || tags.includes('done') || text.includes('已完成')) return 'completed';
  if (tags.includes('进行中') || tags.includes('in-progress') || tags.includes('wip') || text.includes('进行中')) return 'in-progress';
  return 'pending';
}

function getEventStage(event: TimelineEvent): OutlineStage | null {
  const tags = getEventTags(event).map((t) => t.toLowerCase());
  const text = `${event.title} ${event.summary || ''}`.toLowerCase();
  const order: Exclude<OutlineStage, 'all'>[] = ['起', '承', '转', '合'];
  for (const s of order) {
    if (tags.includes(s) || text.includes(s)) return s;
  }
  return null;
}

function getOutlineLevel(title: string): number {
  const t = title.trim();
  const numericPrefix = t.match(/^(\d+\.)+\d+/);
  if (numericPrefix) {
    return Math.min((numericPrefix[0].match(/\./g) || []).length, 2);
  }
  if (/^[（(]\d+[）)]/.test(t)) return 1;
  if (/^[一二三四五六七八九十]+、/.test(t)) return 0;
  return 0;
}

function StatusBadge({ status }: { status: OutlineStatus }) {
  return (
    <TTag theme={STATUS_THEME[status]} variant="light" size="small" className="inline-flex items-center gap-1">
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status]}
    </TTag>
  );
}

export function OutlineView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const selectEvent = useSelectionStore((s) => s.selectEvent);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const outlineFilterTrackId = useTimelineStore((s) => s.outlineFilterTrackId);
  const setOutlineFilterTrackId = useTimelineStore((s) => s.setOutlineFilterTrackId);
  const outlineFontSize = useSettingsStore((s) => s.outlineFontSize);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: tracks } = useTracks(workspaceId);
  const { data: characters } = useCharacters(workspaceId);
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();
  const queryClient = useQueryClient();
  const ctx = useCommandContext();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<OutlineStage>('all');
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSummary, setEditingSummary] = useState('');
  const [dragSortState, setDragSortState] = useState<DragSortState | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<{ trackId: string; index: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [pendingDeleteVersionId, setPendingDeleteVersionId] = useState<string | null>(null);
  const lastSnapshotMsRef = useRef<number>(0);

  const { data: outlineVersions } = useOutlineVersions(historyOpen ? workspaceId : null);
  const createOutlineVersion = useCreateOutlineVersion();
  const deleteOutlineVersion = useDeleteOutlineVersion();
  const trackRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const eventsListRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const openEventEditor = useCallback((eventId: string) => {
    selectEvent(eventId);
    setActivePanel('event-editor');
  }, [selectEvent, setActivePanel]);

  const jumpToEventOnTimeline = useCallback((eventId: string) => {
    selectEvent(eventId);
    setViewMode('timeline');
    scrollToEvent(eventId);
  }, [selectEvent, setViewMode, scrollToEvent]);

  const events = eventsData?.items || [];

  const toggleTrack = (trackId: string) => {
    setCollapsedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const filteredEvents = events.filter((e) => {
    let match = true;
    if (search) {
      const q = search.toLowerCase();
      match =
        e.title.toLowerCase().includes(q) ||
        Boolean(e.summary && e.summary.toLowerCase().includes(q)) ||
        Boolean(e.description && e.description.toLowerCase().includes(q));
    }
    if (match && stageFilter !== 'all') {
      match = getEventStage(e) === stageFilter;
    }
    return match;
  });

  const eventsByTrack = (() => {
    const map = new Map<string, typeof events>();
    if (tracks) {
      for (const track of tracks) {
        map.set(track.id, []);
      }
    }
    for (const event of filteredEvents) {
      const trackId = event.trackId || 'default';
      if (!map.has(trackId)) map.set(trackId, []);
      map.get(trackId)!.push(event);
    }
    return map;
  })();

  const handleStartEdit = useCallback((event: TimelineEvent) => {
    setEditingEventId(event.id);
    setEditingTitle(event.title);
    setEditingSummary(event.summary || '');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!workspaceId || !editingEventId || !editingTitle.trim()) {
      setEditingEventId(null);
      return;
    }
    const currentEvent = events.find((e) => e.id === editingEventId);
    const trimmedTitle = editingTitle.trim();
    const trimmedSummary = editingSummary.trim();
    const data: { title: string; summary?: string } = { title: trimmedTitle };
    if (trimmedSummary !== (currentEvent?.summary || '')) {
      data.summary = trimmedSummary;
    }

    queryClient.setQueryData(['events', workspaceId], (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((e: TimelineEvent) =>
          e.id === editingEventId ? { ...e, ...data } : e
        ),
      };
    });

    try {
      await updateEvent.mutateAsync({ workspaceId, eventId: editingEventId, data });
      setEditingEventId(null);
    } catch {
      queryClient.invalidateQueries({ queryKey: ['events', workspaceId] });
      setEditingEventId(editingEventId);
    }
  }, [workspaceId, editingEventId, editingTitle, editingSummary, events, updateEvent, queryClient]);

  const handleCancelEdit = useCallback(() => {
    setEditingEventId(null);
  }, []);

  useEffect(() => {
    if (editingEventId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingEventId]);

  useEffect(() => {
    if (!selectedEventId || !containerRef.current) return;
    const timer = requestAnimationFrame(() => {
      scrollSelectedIntoView('event', selectedEventId, containerRef.current);
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedEventId]);

  const handleDragSortStart = useCallback((eventId: string, trackId: string, clientY: number) => {
    setDragSortState({ eventId, trackId, startY: clientY, currentY: clientY, hasMoved: false });
  }, []);

  const handleDragSortMove = useCallback(
    (e: PointerEvent) => {
      if (!dragSortState) return;
      const dy = e.clientY - dragSortState.startY;
      const hasMoved = dragSortState.hasMoved || Math.abs(dy) > 3;
      setDragSortState((prev) => (prev ? { ...prev, currentY: e.clientY, hasMoved } : null));

      if (hasMoved) {
        const trackEvents = eventsByTrack.get(dragSortState.trackId);
        if (!trackEvents) return;
        const listEl = eventsListRefs.current.get(dragSortState.trackId);
        if (!listEl) return;

        const items = listEl.querySelectorAll('[data-outline-event-id]');
        let targetIndex = trackEvents.length;
        for (let i = 0; i < items.length; i++) {
          const rect = items[i].getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            targetIndex = i;
            break;
          }
        }
        setDropIndicatorIndex({ trackId: dragSortState.trackId, index: targetIndex });
      }
    },
    [dragSortState, eventsByTrack]
  );

  const handleDragSortEnd = useCallback(() => {
    if (!dragSortState || !workspaceId || !dragSortState.hasMoved) {
      setDragSortState(null);
      setDropIndicatorIndex(null);
      return;
    }

    const trackEvents = eventsByTrack.get(dragSortState.trackId);
    if (trackEvents && dropIndicatorIndex) {
      const draggedIndex = trackEvents.findIndex((e) => e.id === dragSortState.eventId);
      if (draggedIndex !== -1) {
        const sortedEvents = [...trackEvents].sort((a, b) => {
          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          return aTime - bTime;
        });

        let newStartTime: number | null = null;
        const targetIdx = dropIndicatorIndex.index;

        if (sortedEvents.length === 0) {
          newStartTime = Date.now();
        } else if (targetIdx === 0) {
          const firstTime = sortedEvents[0].startTime ? new Date(sortedEvents[0].startTime).getTime() : Date.now();
          newStartTime = firstTime - 3600000;
        } else if (targetIdx >= sortedEvents.length) {
          const lastTime = sortedEvents[sortedEvents.length - 1].startTime
            ? new Date(sortedEvents[sortedEvents.length - 1].startTime!).getTime()
            : Date.now();
          newStartTime = lastTime + 3600000;
        } else {
          const beforeEvent = sortedEvents[targetIdx - 1];
          const afterEvent = sortedEvents[targetIdx];
          const beforeTime = beforeEvent.startTime ? new Date(beforeEvent.startTime).getTime() : Date.now() - 3600000;
          const afterTime = afterEvent.startTime ? new Date(afterEvent.startTime).getTime() : Date.now() + 3600000;
          newStartTime = Math.round((beforeTime + afterTime) / 2);
        }

        updateEvent.mutate({
          workspaceId,
          eventId: dragSortState.eventId,
          data: { startTime: newStartTime },
        });
      }
    }

    setDragSortState(null);
    setDropIndicatorIndex(null);
  }, [dragSortState, workspaceId, eventsByTrack, dropIndicatorIndex, updateEvent]);

  useEffect(() => {
    if (!dragSortState) return;
    window.addEventListener('pointermove', handleDragSortMove);
    window.addEventListener('pointerup', handleDragSortEnd);
    return () => {
      window.removeEventListener('pointermove', handleDragSortMove);
      window.removeEventListener('pointerup', handleDragSortEnd);
    };
  }, [dragSortState, handleDragSortMove, handleDragSortEnd]);

  const buildOutlineSnapshot = useCallback((): string => {
    const sortedTracks = [...(tracks ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    const snapshot = {
      version: 1,
      createdAt: Date.now(),
      tracks: sortedTracks.map((t) => ({
        trackId: t.id,
        trackName: t.name,
        events: events
          .filter((e) => (e.trackId || 'default') === t.id)
          .sort((a, b) => {
            const at = a.startTime ? new Date(a.startTime).getTime() : 0;
            const bt = b.startTime ? new Date(b.startTime).getTime() : 0;
            return at - bt;
          })
          .map((e) => ({
            eventId: e.id,
            title: e.title,
            summary: e.summary ?? '',
            startTime: e.startTime ? new Date(e.startTime).getTime() : null,
          })),
      })),
    };
    return JSON.stringify(snapshot, null, 2);
  }, [tracks, events]);

  const saveOutlineSnapshot = useCallback(
    (description?: string) => {
      if (!workspaceId) return;
      const now = Date.now();
      if (!description && now - lastSnapshotMsRef.current < 5 * 60 * 1000) return;
      lastSnapshotMsRef.current = now;
      createOutlineVersion.mutate({
        workspaceId,
        data: {
          content: buildOutlineSnapshot(),
          description: description || '自动保存',
        },
      });
    },
    [workspaceId, buildOutlineSnapshot, createOutlineVersion]
  );

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      if (!workspaceId || !outlineVersions) return;
      const version = outlineVersions.find((v) => v.id === versionId);
      if (!version) return;
      let parsed: { tracks?: Array<{ events?: Array<{ eventId: string; title: string; summary: string }> }> };
      try {
        parsed = JSON.parse(version.content);
      } catch {
        return;
      }
      if (!parsed.tracks) return;
      for (const track of parsed.tracks) {
        for (const item of track.events ?? []) {
          const exists = events.find((e) => e.id === item.eventId);
          if (!exists) continue;
          if (exists.title !== item.title || (exists.summary ?? '') !== (item.summary ?? '')) {
            updateEvent.mutate({
              workspaceId,
              eventId: item.eventId,
              data: { title: item.title, summary: item.summary },
            });
          }
        }
      }
      setPendingRestoreId(null);
      setHistoryOpen(false);
    },
    [workspaceId, outlineVersions, events, updateEvent]
  );

  const renderDiffPreview = (versionContent: string) => {
    let parsed: { tracks?: Array<{ trackName: string; events?: Array<{ title: string; summary: string }> }> };
    try {
      parsed = JSON.parse(versionContent);
    } catch {
      return <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground">{versionContent}</pre>;
    }
    const currentSnapshot = (() => {
      try {
        return JSON.parse(buildOutlineSnapshot()) as typeof parsed;
      } catch {
        return null;
      }
    })();
    return (
      <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
        <div>
          <div className="font-medium text-muted-foreground mb-1">当前</div>
          <div className="space-y-2">
            {(currentSnapshot?.tracks ?? []).map((t, ti) => (
              <div key={ti} className="border border-border rounded p-2">
                <div className="font-medium mb-1">{t.trackName}</div>
                <ul className="space-y-0.5">
                  {(t.events ?? []).map((e, ei) => (
                    <li key={ei} className="truncate text-muted-foreground">· {e.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground mb-1">历史</div>
          <div className="space-y-2">
            {(parsed.tracks ?? []).map((t, ti) => (
              <div key={ti} className="border border-border rounded p-2">
                <div className="font-medium mb-1">{t.trackName}</div>
                <ul className="space-y-0.5">
                  {(t.events ?? []).map((e, ei) => (
                    <li key={ei} className="truncate text-muted-foreground">· {e.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const visibleTracks = tracks?.filter((track) => !outlineFilterTrackId || track.id === outlineFilterTrackId) || [];
  const totalEvents = visibleTracks.reduce((sum, t) => sum + (eventsByTrack.get(t.id)?.length || 0), 0);

  return (
    <div ref={containerRef} className="h-full flex flex-col p-6 overflow-auto" style={{ fontSize: outlineFontSize }}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-serif text-2xl font-semibold tracking-tight whitespace-nowrap">大纲视图</h2>
        <div className="flex-1" />
        <TButton
          theme="success"
          size="small"
          icon={<PlusIcon size={16} />}
          disabled={!workspaceId}
          onClick={() => ctx.createEvent()}
        >
          新建章节
        </TButton>
        <TButton
          size="small"
          icon={<HistoryIcon size={16} />}
          disabled={!workspaceId}
          onClick={() => {
            saveOutlineSnapshot('手动保存快照');
            setHistoryOpen(true);
          }}
        >
          演进历史
        </TButton>
        {outlineFilterTrackId && (
          <TButton variant="text" size="small" icon={<XIcon size={14} />} onClick={() => setOutlineFilterTrackId(null)}>
            清除轨道过滤
          </TButton>
        )}
        <TInput
          prefixIcon={<SearchIcon size={16} />}
          value={search}
          onChange={(v) => setSearch(v as string)}
          placeholder="搜索事件..."
          className="w-64"
        />
      </div>

      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-muted-foreground">阶段过滤：</span>
        {STAGES.map((s) => (
          <TCheckTag
            key={s}
            checked={stageFilter === s}
            onChange={() => setStageFilter(s)}
            size="small"
          >
            {STAGE_LABELS[s]}
          </TCheckTag>
        ))}
      </div>

      {totalEvents === 0 && !search && stageFilter === 'all' ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="relative max-w-sm w-full rounded-2xl border border-border bg-card/80 p-8 text-center shadow-sm overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgb(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgb(var(--primary)) 0%, transparent 40%)',
              }}
            />
            <div className="relative">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <BookOpenIcon size={36} className="text-primary/70" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-foreground">大纲还是一片空白</h3>
              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                在时间轴上创建事件后，它们会在这里以卡片形式整齐排列，方便你随时编排与调整。
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <TTag theme="success" variant="light" size="small" className="inline-flex items-center gap-1">
                  <CheckIcon size={12} />
                  已完成
                </TTag>
                <TTag theme="primary" variant="light" size="small" className="inline-flex items-center gap-1">
                  <ClockIcon size={12} />
                  进行中
                </TTag>
                <TTag theme="warning" variant="light" size="small" className="inline-flex items-center gap-1">
                  <RoundIcon size={12} />
                  待处理
                </TTag>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleTracks.map((track) => {
            const trackEvents = eventsByTrack.get(track.id) || [];
            const collapsed = collapsedTracks.has(track.id);
            return (
              <div
                key={track.id}
                ref={(el) => {
                  if (el) trackRefs.current.set(track.id, el);
                }}
                className="outline-track rounded-xl border border-border bg-card/60 shadow-sm overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(to bottom, rgb(var(--card)) 0%, rgb(var(--background)) 100%)' }}
              >
                <button
                  onClick={() => toggleTrack(track.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left group"
                >
                  <span
                    className="transition-transform duration-200"
                    style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  >
                    <ChevronDownIcon size={16} />
                  </span>
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: track.color || 'rgb(var(--primary))' }} />
                  <span className="font-medium font-sans">{track.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">({trackEvents.length})</span>
                </button>
                <div
                  ref={(el) => {
                    if (el) eventsListRefs.current.set(track.id, el);
                  }}
                  style={{ height: collapsed ? 0 : undefined, overflow: 'hidden', opacity: collapsed ? 0 : 1 }}
                >
                  <div className="p-3 grid grid-cols-1 gap-3 relative">
                    {trackEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/5">
                          <IdeaIcon size={20} className="text-primary/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">该轨道下暂无事件</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">点击时间轴添加新事件</p>
                      </div>
                    ) : (
                      trackEvents.map((event, index) => {
                        const status = getEventStatus(event);
                        const level = getOutlineLevel(event.title);
                        const levelIndent = level >= 2 ? 'ml-8' : level === 1 ? 'ml-4' : '';
                        const levelBorder = level > 0 ? 'border-l-[3px] border-primary/15' : '';
                        const levelPadding = level > 0 ? 'pl-4' : '';
                        const isEditing = editingEventId === event.id;
                        return (
                          <ContextMenu key={event.id}>
                            <ContextMenuTrigger asChild>
                              <div
                                data-outline-event-id={event.id}
                                className={`
                                  relative rounded-xl border bg-card p-4 shadow-sm
                                  hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group/card
                                  ${selectedEventId === event.id ? 'border-primary ring-2 ring-primary/40' : 'border-border'}
                                  ${dragSortState?.eventId === event.id && dragSortState.hasMoved ? 'opacity-40' : ''}
                                  ${levelIndent} ${levelBorder} ${levelPadding}
                                `}
                                onClick={() => {
                                  if (!isEditing) jumpToEventOnTimeline(event.id);
                                }}
                              >
                                {dropIndicatorIndex?.trackId === track.id && dropIndicatorIndex.index === index && (
                                  <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-primary z-10 rounded-full" />
                                )}
                                <div className="flex items-start gap-3">
                                  <span
                                    className="text-muted-foreground/30 cursor-grab shrink-0 mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                    onPointerDown={(e) => {
                                      e.preventDefault();
                                      handleDragSortStart(event.id, track.id, e.clientY);
                                    }}
                                  >
                                    <DragIcon size={16} />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <StatusBadge status={status} />
                                        {isEditing ? (
                                          <input
                                            ref={editInputRef}
                                            className="font-medium text-sm font-sans leading-snug flex-1 bg-transparent border-b border-primary outline-none min-w-0 py-0.5"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit();
                                              if (e.key === 'Escape') handleCancelEdit();
                                              e.stopPropagation();
                                            }}
                                            onBlur={handleSaveEdit}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          <h4
                                            className="font-medium text-sm font-sans leading-snug text-foreground hover:text-primary transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartEdit(event);
                                            }}
                                            title="点击编辑标题"
                                          >
                                            {event.title}
                                          </h4>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <TButton
                                          variant="text"
                                          shape="square"
                                          size="small"
                                          icon={<EditIcon size={16} />}
                                          onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            openEventEditor(event.id);
                                          }}
                                          title="编辑"
                                        />
                                        <TButton
                                          variant="text"
                                          shape="square"
                                          size="small"
                                          icon={<DeleteIcon size={16} />}
                                          onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            setDeletingEventId(event.id);
                                          }}
                                          title="删除"
                                        />
                                      </div>
                                    </div>
                                    {isEditing ? (
                                      <textarea
                                        className="w-full text-xs text-muted-foreground font-sans leading-relaxed bg-transparent border border-input rounded-md p-2 outline-none focus:ring-1 focus:ring-ring resize-none"
                                        rows={2}
                                        value={editingSummary}
                                        onChange={(e) => setEditingSummary(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') handleCancelEdit();
                                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit();
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="摘要（可选）"
                                      />
                                    ) : event.summary ? (
                                      <p
                                        className="text-xs text-muted-foreground font-sans leading-relaxed line-clamp-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(event);
                                        }}
                                        title="点击编辑摘要"
                                      >
                                        {event.summary}
                                      </p>
                                    ) : (
                                      <p
                                        className="text-xs text-muted-foreground/50 font-sans italic"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(event);
                                        }}
                                      >
                                        暂无摘要，点击添加...
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-3">
                                      {event.startTime && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono tracking-wide">
                                          <ClockIcon size={12} />
                                          {new Date(event.startTime).toLocaleDateString('zh-CN')}
                                        </span>
                                      )}
                                      {event.location && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 truncate max-w-[120px]">
                                          <LocalTwoIcon size={12} />
                                          {event.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {deletingEventId === event.id && (
                                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                                    <span className="text-xs text-destructive font-sans">确认删除此事件？</span>
                                    <TButton
                                      theme="danger"
                                      size="small"
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (workspaceId) deleteEvent.mutate({ workspaceId, eventId: event.id });
                                        setDeletingEventId(null);
                                      }}
                                    >
                                      删除
                                    </TButton>
                                    <TButton variant="outline" size="small" onClick={() => setDeletingEventId(null)}>
                                      取消
                                    </TButton>
                                  </div>
                                )}
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem icon={<EditIcon size={16} />} onClick={() => openEventEditor(event.id)}>
                                编辑
                              </ContextMenuItem>
                              <ContextMenuItem
                                icon={<DeleteIcon size={16} />}
                                destructive
                                onClick={() => setDeletingEventId(event.id)}
                              >
                                删除
                              </ContextMenuItem>
                              <ContextMenuSub>
                                <ContextMenuSubTrigger icon={<RightIcon size={16} />}>移动到轨道</ContextMenuSubTrigger>
                                <ContextMenuSubContent>
                                  {tracks?.map((t) => (
                                    <ContextMenuItem
                                      key={t.id}
                                      onClick={() => {
                                        if (workspaceId) updateEvent.mutate({ workspaceId, eventId: event.id, data: { trackId: t.id } });
                                      }}
                                    >
                                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: t.color || 'rgb(var(--muted-foreground))' }} />
                                      {t.name}
                                    </ContextMenuItem>
                                  ))}
                                </ContextMenuSubContent>
                              </ContextMenuSub>
                              <ContextMenuSub>
                                <ContextMenuSubTrigger icon={<UserIcon size={16} />}>关联到角色</ContextMenuSubTrigger>
                                <ContextMenuSubContent>
                                  {characters?.map((c) => (
                                    <ContextMenuItem key={c.id} onClick={() => openEventEditor(event.id)}>
                                      {c.name}
                                    </ContextMenuItem>
                                  ))}
                                </ContextMenuSubContent>
                              </ContextMenuSub>
                              <ContextMenuSeparator />
                              <ContextMenuItem icon={<LinkIcon size={16} />} onClick={() => openEventEditor(event.id)}>
                                创建关联
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })
                    )}
                    {dropIndicatorIndex?.trackId === track.id &&
                      dropIndicatorIndex.index === trackEvents.length &&
                      trackEvents.length > 0 && <div className="h-0.5 bg-primary rounded-full" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TDrawer visible={historyOpen} onClose={() => setHistoryOpen(false)} header="大纲演进历史" size="520px" footer={null}>
        <div className="text-xs text-muted-foreground mb-3 font-sans">
          每次打开此面板会自动保存一份当前大纲快照（5 分钟内仅保留一次）。
        </div>
        {(!outlineVersions || outlineVersions.length === 0) ? (
          <div className="text-center text-sm text-muted-foreground py-8 font-sans">暂无版本记录</div>
        ) : (
          <div className="space-y-2">
            {outlineVersions.map((v) => {
              const isExpanded = expandedVersionId === v.id;
              const isPendingRestore = pendingRestoreId === v.id;
              const isPendingDelete = pendingDeleteVersionId === v.id;
              const created = v.createdAt ? new Date(v.createdAt) : null;
              return (
                <div key={v.id} className="border border-border rounded-md p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium font-sans truncate">{v.description || '自动保存'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {created ? created.toLocaleString('zh-CN') : ''}
                      </div>
                    </div>
                    <TButton size="small" variant="outline" onClick={() => setExpandedVersionId(isExpanded ? null : v.id)}>
                      {isExpanded ? '收起' : 'Diff'}
                    </TButton>
                    <TButton
                      theme="primary"
                      size="small"
                      icon={<UndoIcon size={14} />}
                      onClick={() => setPendingRestoreId(isPendingRestore ? null : v.id)}
                    >
                      回滚
                    </TButton>
                    <TButton
                      theme="danger"
                      variant="text"
                      shape="square"
                      size="small"
                      icon={<DeleteIcon size={14} />}
                      onClick={() => setPendingDeleteVersionId(isPendingDelete ? null : v.id)}
                      title="删除"
                    />
                  </div>
                  {isPendingRestore && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <span className="text-[10px] text-foreground font-sans">将根据此版本批量更新事件标题与摘要，确认？</span>
                      <TButton theme="primary" size="small" onClick={() => handleRestoreVersion(v.id)}>
                        确认
                      </TButton>
                      <TButton variant="outline" size="small" onClick={() => setPendingRestoreId(null)}>
                        取消
                      </TButton>
                    </div>
                  )}
                  {isPendingDelete && workspaceId && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <span className="text-[10px] text-destructive font-sans">删除此版本？</span>
                      <TButton
                        theme="danger"
                        size="small"
                        onClick={() => {
                          deleteOutlineVersion.mutate({ workspaceId, versionId: v.id });
                          setPendingDeleteVersionId(null);
                        }}
                      >
                        删除
                      </TButton>
                      <TButton variant="outline" size="small" onClick={() => setPendingDeleteVersionId(null)}>
                        取消
                      </TButton>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      {renderDiffPreview(v.content)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </TDrawer>
    </div>
  );
}
