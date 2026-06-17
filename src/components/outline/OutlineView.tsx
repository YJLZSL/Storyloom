import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Clock, Pencil, Trash2, MoveRight, Users, Link, GripVertical, X } from 'lucide-react';
import { useEvents, useTracks, useDeleteEvent, useUpdateEvent, useCharacters } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
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

interface DragSortState {
  eventId: string;
  trackId: string;
  startY: number;
  currentY: number;
  hasMoved: boolean;
}

export function OutlineView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const outlineFilterTrackId = useTimelineStore((s) => s.outlineFilterTrackId);
  const setOutlineFilterTrackId = useTimelineStore((s) => s.setOutlineFilterTrackId);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: tracks } = useTracks(workspaceId);
  const { data: characters } = useCharacters(workspaceId);
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();
  const [search, setSearch] = useState('');
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [dragSortState, setDragSortState] = useState<DragSortState | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<{ trackId: string; index: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const trackRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const eventsListRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const openEventEditor = useCallback((eventId: string) => {
    setSelectedEvent(eventId);
    setActivePanel('event-editor');
  }, [setSelectedEvent, setActivePanel]);

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
    if (!search) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) ||
      (e.summary && e.summary.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q));
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

  // --- Inline edit ---
  const handleStartEdit = useCallback((event: TimelineEvent) => {
    setEditingEventId(event.id);
    setEditingTitle(event.title);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!workspaceId || !editingEventId || !editingTitle.trim()) {
      setEditingEventId(null);
      return;
    }
    updateEvent.mutate({
      workspaceId,
      eventId: editingEventId,
      data: { title: editingTitle.trim() },
    });
    setEditingEventId(null);
  }, [workspaceId, editingEventId, editingTitle, updateEvent]);

  const handleCancelEdit = useCallback(() => {
    setEditingEventId(null);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingEventId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingEventId]);

  // --- Drag sort ---
  const handleDragSortStart = useCallback((eventId: string, trackId: string, clientY: number) => {
    setDragSortState({ eventId, trackId, startY: clientY, currentY: clientY, hasMoved: false });
  }, []);

  const handleDragSortMove = useCallback((e: PointerEvent) => {
    if (!dragSortState) return;
    const dy = e.clientY - dragSortState.startY;
    const hasMoved = dragSortState.hasMoved || Math.abs(dy) > 3;
    setDragSortState((prev) => prev ? { ...prev, currentY: e.clientY, hasMoved } : null);

    if (hasMoved) {
      // Find drop indicator position
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
  }, [dragSortState, eventsByTrack]);

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
        // Reorder: calculate new startTime based on neighbors
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
          newStartTime = firstTime - 3600000; // 1 hour before
        } else if (targetIdx >= sortedEvents.length) {
          const lastTime = sortedEvents[sortedEvents.length - 1].startTime ? new Date(sortedEvents[sortedEvents.length - 1].startTime!).getTime() : Date.now();
          newStartTime = lastTime + 3600000; // 1 hour after
        } else {
          // Between two events
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

  return (
    <div ref={containerRef} className="h-full flex flex-col p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">大纲视图</h2>
        <div className="flex-1" />
        {outlineFilterTrackId && (
          <button
            onClick={() => setOutlineFilterTrackId(null)}
            className="px-2 py-1 rounded text-[10px] bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-sans flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            清除轨道过滤
          </button>
        )}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索事件..."
            className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64 transition-shadow"
          />
        </div>
      </div>

      <div className="space-y-4">
        {tracks?.filter((track) => !outlineFilterTrackId || track.id === outlineFilterTrackId).map((track) => {
          const trackEvents = eventsByTrack.get(track.id) || [];
          const collapsed = collapsedTracks.has(track.id);
          return (
            <div
              key={track.id}
              ref={(el) => { if (el) trackRefs.current.set(track.id, el); }}
              className="outline-track border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleTrack(track.id)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left group"
              >
                <span className="transition-transform duration-200" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  <ChevronDown className="w-4 h-4" />
                </span>
                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: track.color || '#c4703a' }} />
                <span className="font-medium font-sans">{track.name}</span>
                <span className="text-xs text-muted-foreground font-mono">({trackEvents.length})</span>
              </button>
              <div
                ref={(el) => { if (el) eventsListRefs.current.set(track.id, el); }}
                style={{ height: collapsed ? 0 : undefined, overflow: 'hidden', opacity: collapsed ? 0 : 1 }}
              >
                <div className="divide-y divide-border relative">
                  {trackEvents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground font-sans">暂无事件</div>
                  ) : (
                    trackEvents.map((event, index) => (
                      <ContextMenu key={event.id}>
                        <ContextMenuTrigger asChild>
                      <div
                        data-outline-event-id={event.id}
                        className={`px-4 py-3 hover:bg-accent/50 transition-all cursor-pointer group/event ${
                          dragSortState?.eventId === event.id && dragSortState.hasMoved ? 'opacity-40' : ''
                        }`}
                        onClick={() => {
                          if (!editingEventId) openEventEditor(event.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(event);
                        }}
                      >
                        {/* Drop indicator line above this item */}
                        {dropIndicatorIndex?.trackId === track.id && dropIndicatorIndex.index === index && (
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-primary z-10"
                            style={{ top: 0 }}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <GripVertical
                            className="w-4 h-4 text-muted-foreground/40 cursor-grab shrink-0 opacity-0 group-hover/event:opacity-100 transition-opacity"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              handleDragSortStart(event.id, track.id, e.clientY);
                            }}
                          />
                          {editingEventId === event.id ? (
                            <input
                              ref={editInputRef}
                              className="font-medium text-sm font-sans leading-snug flex-1 bg-transparent border-b border-primary outline-none min-w-0"
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
                            <h4 className="font-medium text-sm font-sans leading-snug">{event.title}</h4>
                          )}
                          {event.startTime && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono tracking-wide">
                              <Clock className="w-3 h-3" />
                              {new Date(event.startTime).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                        {event.summary && (
                          <p className="text-xs text-muted-foreground mt-1 font-sans leading-relaxed ml-6">{event.summary}</p>
                        )}
                        {deletingEventId === event.id && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                            <span className="text-xs text-destructive font-sans">确认删除此事件？</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (workspaceId) deleteEvent.mutate({ workspaceId, eventId: event.id });
                                setDeletingEventId(null);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-sans"
                            >
                              删除
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingEventId(null);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] bg-accent hover:bg-accent/80 transition-colors font-sans"
                            >
                              取消
                            </button>
                          </div>
                        )}
                      </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => openEventEditor(event.id)}>
                            编辑
                          </ContextMenuItem>
                          <ContextMenuItem icon={<Trash2 className="w-4 h-4" />} destructive onClick={() => setDeletingEventId(event.id)}>
                            删除
                          </ContextMenuItem>
                          <ContextMenuSub>
                            <ContextMenuSubTrigger icon={<MoveRight className="w-4 h-4" />}>
                              移动到轨道
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                              {tracks?.map((t) => (
                                <ContextMenuItem
                                  key={t.id}
                                  onClick={() => {
                                    if (workspaceId) updateEvent.mutate({ workspaceId, eventId: event.id, data: { trackId: t.id } });
                                  }}
                                >
                                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: t.color || '#888' }} />
                                  {t.name}
                                </ContextMenuItem>
                              ))}
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                          <ContextMenuSub>
                            <ContextMenuSubTrigger icon={<Users className="w-4 h-4" />}>
                              关联到角色
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                              {characters?.map((c) => (
                                <ContextMenuItem key={c.id} onClick={() => openEventEditor(event.id)}>
                                  {c.name}
                                </ContextMenuItem>
                              ))}
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                          <ContextMenuSeparator />
                          <ContextMenuItem icon={<Link className="w-4 h-4" />} onClick={() => openEventEditor(event.id)}>
                            创建关联
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  )}
                  {/* Drop indicator at end of list */}
                  {dropIndicatorIndex?.trackId === track.id && dropIndicatorIndex.index === trackEvents.length && trackEvents.length > 0 && (
                    <div className="h-0.5 bg-primary" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
