import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, ArrowRight, MapPin, List, LayoutGrid } from 'lucide-react';
import {
  useForeshadowings,
  useCreateForeshadowing,
  useUpdateForeshadowing,
  useDeleteForeshadowing,
  useEvents,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import { ForeshadowingBoard } from './ForeshadowingBoard';
import type { Foreshadowing } from '../../../shared/types';

const statuses = ['planted', 'developed', 'resolved', 'abandoned'] as const;
const statusLabels: Record<string, string> = {
  planted: '已埋下',
  developed: '发展中',
  resolved: '已回收',
  abandoned: '已废弃',
};
const statusColors: Record<string, string> = {
  planted: 'bg-yellow-500',
  developed: 'bg-blue-500',
  resolved: 'bg-green-500',
  abandoned: 'bg-gray-500',
};

type StatusValue = (typeof statuses)[number];

export function ForeshadowingPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const { data: foreshadowings } = useForeshadowings(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createForeshadowing = useCreateForeshadowing();
  const updateForeshadowing = useUpdateForeshadowing();
  const deleteForeshadowing = useDeleteForeshadowing();

  const events = eventsData?.items ?? [];
  const eventMap = new Map(events.map((e) => [e.id, e.title]));

  // Filter state
  const [filter, setFilter] = useState<string>('all');
  const listRef = useRef<HTMLDivElement>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createStatus, setCreateStatus] = useState<StatusValue>('planted');
  const [createPlantedEventId, setCreatePlantedEventId] = useState('');
  const [createResolvedEventId, setCreateResolvedEventId] = useState('');

  // 视图模式：列表 / 看板
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<string>('planted');
  const [editPlantedEventId, setEditPlantedEventId] = useState('');
  const [editResolvedEventId, setEditResolvedEventId] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status dropdown open state
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);

  const filtered =
    foreshadowings?.filter((f) => (filter === 'all' ? true : f.status === filter)) || [];

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownId) return;
    const handler = () => setStatusDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [statusDropdownId]);

  // --- Create handlers ---
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !workspaceId) return;
    createForeshadowing.mutate({
      workspaceId,
      data: {
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
        status: createStatus,
        plantedEventId: createPlantedEventId || undefined,
        resolvedEventId: createResolvedEventId || undefined,
      },
    });
    setCreateTitle('');
    setCreateDesc('');
    setCreateStatus('planted');
    setCreatePlantedEventId('');
    setCreateResolvedEventId('');
    setShowCreateForm(false);
  };

  // --- Edit handlers ---
  const startEdit = (f: Foreshadowing) => {
    setEditingId(f.id);
    setEditTitle(f.title);
    setEditDesc(f.description ?? '');
    setEditStatus(f.status);
    setEditPlantedEventId(f.plantedEventId ?? '');
    setEditResolvedEventId(f.resolvedEventId ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
    setEditStatus('planted');
    setEditPlantedEventId('');
    setEditResolvedEventId('');
  };

  const saveEdit = () => {
    if (!editTitle.trim() || !workspaceId || !editingId) return;
    updateForeshadowing.mutate({
      workspaceId,
      foreshadowingId: editingId,
      data: {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        status: editStatus as StatusValue,
        plantedEventId: editPlantedEventId || null,
        resolvedEventId: editResolvedEventId || null,
      },
    });
    cancelEdit();
  };

  // --- Delete handlers ---
  const confirmDelete = (id: string) => {
    if (!workspaceId) return;
    deleteForeshadowing.mutate({ workspaceId, foreshadowingId: id });
    setDeletingId(null);
  };

  // --- Quick status change ---
  const handleQuickStatusChange = (f: Foreshadowing, newStatus: string) => {
    if (!workspaceId) return;
    updateForeshadowing.mutate({
      workspaceId,
      foreshadowingId: f.id,
      data: { status: newStatus as StatusValue },
    });
    setStatusDropdownId(null);
  };

  const inputClass =
    'w-full px-2 py-1.5 rounded border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow font-sans';
  const selectClass =
    'w-full px-2 py-1.5 rounded border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow font-sans';

  return (
    <div className="h-full flex flex-col">
      {/* Status filter buttons + view toggle */}
      <div className="flex flex-wrap gap-1 mb-2">
        {viewMode === 'list' && (
          <>
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 rounded text-[10px] transition-colors font-sans ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
              全部
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2 py-1 rounded text-[10px] transition-colors font-sans ${
                  filter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent hover:bg-accent/80'
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </>
        )}
        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded bg-accent/50 ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title="列表视图"
          >
            <List className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`p-1 rounded transition-colors ${viewMode === 'board' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title="看板视图"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
        </div>
        {/* Toggle create form button */}
        {viewMode === 'list' && (
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="px-2 py-1 rounded text-[10px] bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-sans flex items-center gap-0.5"
          >
            {showCreateForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showCreateForm ? '取消' : '新建'}
          </button>
        )}
      </div>

      {/* 看板视图 */}
      {viewMode === 'board' && (
        <div className="flex-1 min-h-0">
          <ForeshadowingBoard />
        </div>
      )}

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <>
      {/* Collapsible create form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="shrink-0 space-y-2 mb-3 p-3 rounded-md border border-border bg-accent/30"
        >
          <input
            type="text"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="伏笔标题 *"
            className={inputClass}
          />
          <textarea
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="伏笔描述"
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <select
            value={createStatus}
            onChange={(e) => setCreateStatus(e.target.value as StatusValue)}
            className={selectClass}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
          {events.length > 0 && (
            <>
              <select
                value={createPlantedEventId}
                onChange={(e) => setCreatePlantedEventId(e.target.value)}
                className={selectClass}
              >
                <option value="">埋下事件（可选）</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <select
                value={createResolvedEventId}
                onChange={(e) => setCreateResolvedEventId(e.target.value)}
                className={selectClass}
              >
                <option value="">回收事件（可选）</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="submit"
            disabled={!createTitle.trim() || createForeshadowing.isPending}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity disabled:opacity-50 font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            添加伏笔
          </button>
        </form>
      )}

      {/* Foreshadowing list */}
      <div ref={listRef} className="flex-1 overflow-auto space-y-2">
        {filtered.map((f) => {
          const isEditing = editingId === f.id;
          const isDeleting = deletingId === f.id;
          const isStatusOpen = statusDropdownId === f.id;
          const plantedTitle = f.plantedEventId ? eventMap.get(f.plantedEventId) : null;
          const resolvedTitle = f.resolvedEventId ? eventMap.get(f.resolvedEventId) : null;

          return (
            <ContextMenu key={f.id}>
              <ContextMenuTrigger asChild>
            <div
              data-entity-id={f.id}
              className="foreshadowing-card px-3 py-2 rounded-md border border-border hover:bg-accent/50 transition-colors cursor-default"
            >
              {/* View mode */}
              {!isEditing && (
                <>
                  <div className="flex items-center gap-2">
                    {/* Quick status change dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusDropdownId(isStatusOpen ? null : f.id);
                        }}
                        className={`w-2.5 h-2.5 rounded-full ${statusColors[f.status] || 'bg-gray-500'} hover:ring-2 hover:ring-ring transition-shadow flex-shrink-0`}
                        title="切换状态"
                      />
                      {isStatusOpen && (
                        <div
                          className="absolute left-0 top-4 z-20 min-w-[80px] rounded border border-border bg-popover shadow-md py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {statuses.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleQuickStatusChange(f, s)}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 text-[10px] hover:bg-accent transition-colors font-sans ${
                                f.status === s ? 'font-bold' : ''
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${statusColors[s]}`}
                              />
                              {statusLabels[s]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium font-sans flex-1 truncate">
                      {f.title}
                    </span>
                    {/* Action buttons */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(f);
                      }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(isDeleting ? null : f.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {f.description && (
                    <div className="text-xs text-muted-foreground mt-1 font-sans leading-relaxed">
                      {f.description}
                    </div>
                  )}

                  {/* Event associations */}
                  {(plantedTitle || resolvedTitle) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {plantedTitle && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 rounded px-1.5 py-0.5 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          埋: {plantedTitle}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (f.plantedEventId) scrollToEvent(f.plantedEventId);
                            }}
                            className="p-0.5 rounded hover:bg-accent text-muted-foreground/50 hover:text-primary transition-colors"
                            title="定位"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )}
                      {resolvedTitle && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 rounded px-1.5 py-0.5 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          收: {resolvedTitle}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (f.resolvedEventId) scrollToEvent(f.resolvedEventId);
                            }}
                            className="p-0.5 rounded hover:bg-accent text-muted-foreground/50 hover:text-primary transition-colors"
                            title="定位"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {statusLabels[f.status] || f.status}
                  </div>

                  {/* Delete confirmation inline */}
                  {isDeleting && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <span className="text-[10px] text-destructive font-sans">确认删除此伏笔？</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(f.id);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-sans"
                      >
                        删除
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-accent hover:bg-accent/80 transition-colors font-sans"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Edit mode */}
              {isEditing && (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="伏笔标题"
                    className={inputClass}
                    autoFocus
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="伏笔描述"
                    rows={2}
                    className={inputClass + ' resize-none'}
                  />
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className={selectClass}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                  {events.length > 0 && (
                    <>
                      <select
                        value={editPlantedEventId}
                        onChange={(e) => setEditPlantedEventId(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">埋下事件（可选）</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editResolvedEventId}
                        onChange={(e) => setEditResolvedEventId(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">回收事件（可选）</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={!editTitle.trim() || updateForeshadowing.isPending}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 font-sans"
                    >
                      <Check className="w-3 h-3" />
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent hover:bg-accent/80 transition-colors font-sans"
                    >
                      <X className="w-3 h-3" />
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => startEdit(f)}>
                  编辑
                </ContextMenuItem>
                <ContextMenuItem icon={<Trash2 className="w-4 h-4" />} destructive onClick={() => setDeletingId(f.id)}>
                  删除
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={<ArrowRight className="w-4 h-4" />} onClick={() => handleQuickStatusChange(f, 'developed')}>
                  标记为发展中
                </ContextMenuItem>
                <ContextMenuItem icon={<Check className="w-4 h-4" />} onClick={() => handleQuickStatusChange(f, 'resolved')}>
                  标记为已回收
                </ContextMenuItem>
                <ContextMenuItem icon={<X className="w-4 h-4" />} onClick={() => handleQuickStatusChange(f, 'abandoned')}>
                  标记为已废弃
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={<MapPin className="w-4 h-4" />} onClick={() => { if (f.plantedEventId) scrollToEvent(f.plantedEventId); }}>
                  定位埋设事件
                </ContextMenuItem>
                <ContextMenuItem icon={<MapPin className="w-4 h-4" />} onClick={() => { if (f.resolvedEventId) scrollToEvent(f.resolvedEventId); }}>
                  定位回收事件
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4 font-sans">
            暂无伏笔
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
