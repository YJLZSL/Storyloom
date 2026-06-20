import { useState, useRef, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  DeleteIcon,
  XIcon,
  CheckIcon,
  RightIcon,
  LocalTwoIcon,
  ListIcon,
  GridTwoIcon,
  NetworkTreeIcon,
  MagicIcon,
} from '@/lib/icons';
import { TButton, TTag } from '@/components/ui-tdesign';
import { Select as TSelect } from 'tdesign-react';
import {
  useForeshadowings,
  useCreateForeshadowing,
  useUpdateForeshadowing,
  useDeleteForeshadowing,
  useEvents,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { scrollSelectedIntoView } from '@/utils/revealInBestView';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import { ForeshadowingBoard } from './ForeshadowingBoard';
import { ForeshadowingGraph } from './ForeshadowingGraph';
import type { Foreshadowing } from '../../../shared/types';

const statuses = ['planted', 'developed', 'resolved', 'abandoned'] as const;
type StatusValue = (typeof statuses)[number];

const statusLabels: Record<StatusValue, string> = {
  planted: '已埋下',
  developed: '发展中',
  resolved: '已回收',
  abandoned: '已废弃',
};

// CSS 变量名（由 index.css 主题令牌提供）
const statusColorVars: Record<string, string> = {
  all: '--primary',
  planted: '--warning',
  developed: '--info',
  resolved: '--success',
  abandoned: '--muted-foreground',
};

function statusColorVar(status: string): string {
  return statusColorVars[status as StatusValue] ?? '--muted-foreground';
}

function StatusDot({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full ${className}`}
      style={{ backgroundColor: `rgb(var(${statusColorVar(status)}))` }}
    />
  );
}

export function ForeshadowingPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const selectForeshadowing = useSelectionStore((s) => s.selectForeshadowing);
  const selectedForeshadowingId = useSelectionStore((s) => s.selectedForeshadowingId);
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
  const [createRelatedIds, setCreateRelatedIds] = useState<string[]>([]);

  // 视图模式：列表 / 看板 / 呼应链条
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'graph'>('list');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<string>('planted');
  const [editPlantedEventId, setEditPlantedEventId] = useState('');
  const [editResolvedEventId, setEditResolvedEventId] = useState('');
  const [editRelatedIds, setEditRelatedIds] = useState<string[]>([]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status dropdown open state
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);

  const handleCardClick = (f: Foreshadowing) => {
    if (editingId === f.id) return;
    selectForeshadowing(selectedForeshadowingId === f.id ? null : f.id);
  };

  const filtered =
    foreshadowings?.filter((f) => (filter === 'all' ? true : f.status === filter)) || [];

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownId) return;
    const handler = () => setStatusDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [statusDropdownId]);

  // Scroll selected foreshadowing card into view
  useEffect(() => {
    if (!selectedForeshadowingId || !listRef.current) return;
    const timer = requestAnimationFrame(() => {
      scrollSelectedIntoView('foreshadowing', selectedForeshadowingId, listRef.current);
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedForeshadowingId]);

  // --- Create handlers ---
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !workspaceId || createForeshadowing.isPending) return;
    createForeshadowing.mutate(
      {
        workspaceId,
        data: {
          title: createTitle.trim(),
          description: createDesc.trim() || undefined,
          status: createStatus,
          plantedEventId: createPlantedEventId || undefined,
          resolvedEventId: createResolvedEventId || undefined,
          relatedForeshadowingIds: createRelatedIds,
        },
      },
      {
        onSuccess: () => {
          setCreateTitle('');
          setCreateDesc('');
          setCreateStatus('planted');
          setCreatePlantedEventId('');
          setCreateResolvedEventId('');
          setCreateRelatedIds([]);
          setShowCreateForm(false);
        },
      },
    );
  };

  // --- Edit handlers ---
  const startEdit = (f: Foreshadowing) => {
    setEditingId(f.id);
    setEditTitle(f.title);
    setEditDesc(f.description ?? '');
    setEditStatus(f.status);
    setEditPlantedEventId(f.plantedEventId ?? '');
    setEditResolvedEventId(f.resolvedEventId ?? '');
    setEditRelatedIds(f.relatedForeshadowingIds ?? []);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
    setEditStatus('planted');
    setEditPlantedEventId('');
    setEditResolvedEventId('');
    setEditRelatedIds([]);
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
        relatedForeshadowingIds: editRelatedIds,
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
      {/* Status filter pills + view toggle */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {viewMode === 'list' && (
          <>
            <button onClick={() => setFilter('all')} className="focus:outline-none">
              <TTag
                variant={filter === 'all' ? 'dark' : 'light'}
                size="small"
                theme={filter === 'all' ? 'primary' : 'default'}
              >
                <StatusDot status="resolved" className="w-1.5 h-1.5" />
                全部
              </TTag>
            </button>
            {statuses.map((s) => (
              <button key={s} onClick={() => setFilter(s)} className="focus:outline-none">
                <TTag
                  variant={filter === s ? 'dark' : 'light'}
                  size="small"
                  theme={filter === s ? 'primary' : 'default'}
                >
                  <StatusDot status={s} className="w-1.5 h-1.5" />
                  {statusLabels[s]}
                </TTag>
              </button>
            ))}
          </>
        )}
        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded bg-accent/50 ml-auto">
          <TButton
            variant="text"
            shape="square"
            size="small"
            theme={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => setViewMode('list')}
            title="列表视图"
            icon={<ListIcon size={14} />}
          />
          <TButton
            variant="text"
            shape="square"
            size="small"
            theme={viewMode === 'board' ? 'primary' : 'default'}
            onClick={() => setViewMode('board')}
            title="看板视图"
            icon={<GridTwoIcon size={14} />}
          />
          <TButton
            variant="text"
            shape="square"
            size="small"
            theme={viewMode === 'graph' ? 'primary' : 'default'}
            onClick={() => setViewMode('graph')}
            title="呼应链条"
            icon={<NetworkTreeIcon size={14} />}
          />
        </div>
        {/* Toggle create form button */}
        {viewMode === 'list' && (
          <TButton
            variant="outline"
            size="small"
            onClick={() => setShowCreateForm((v) => !v)}
            icon={showCreateForm ? <XIcon size={14} /> : <PlusIcon size={14} />}
          >
            {showCreateForm ? '取消' : '新建'}
          </TButton>
        )}
      </div>

      {/* 看板视图 */}
      {viewMode === 'board' && (
        <div className="flex-1 min-h-0">
          <ForeshadowingBoard />
        </div>
      )}

      {/* 呼应链条图谱 */}
      {viewMode === 'graph' && (
        <div className="flex-1 min-h-0">
          <ForeshadowingGraph
            foreshadowings={foreshadowings ?? []}
            onNodeDoubleClick={(id) => {
              const f = foreshadowings?.find((x) => x.id === id);
              if (f) {
                setViewMode('list');
                startEdit(f);
              }
            }}
          />
        </div>
      )}

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <>
          {/* Collapsible create form */}
          {showCreateForm && (
            <form
              onSubmit={handleCreate}
              className="shrink-0 space-y-2 mb-3 p-3 rounded-lg border border-border bg-card"
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
                  <div className="font-sans">
                    <div className="text-[10px] text-muted-foreground mb-1">关联伏笔（可选）</div>
                    <TSelect
                      multiple
                      filterable
                      value={createRelatedIds}
                      onChange={(val) => setCreateRelatedIds((val as string[]) ?? [])}
                      options={(foreshadowings ?? []).map((other) => ({ label: other.title, value: other.id }))}
                      placeholder="选择关联伏笔..."
                      size="small"
                      clearable
                    />
                  </div>
                </>
              )}
              <TButton
                type="submit"
                theme="primary"
                size="small"
                block
                disabled={!createTitle.trim() || createForeshadowing.isPending}
                icon={<PlusIcon size={14} />}
              >
                {createForeshadowing.isPending ? '添加中...' : '添加伏笔'}
              </TButton>
            </form>
          )}

          {/* Foreshadowing card list */}
          <div ref={listRef} className="flex-1 overflow-auto space-y-2">
            {filtered.map((f) => {
              const isEditing = editingId === f.id;
              const isDeleting = deletingId === f.id;
              const isStatusOpen = statusDropdownId === f.id;
              const isSelected = selectedForeshadowingId === f.id;
              const plantedTitle = f.plantedEventId ? eventMap.get(f.plantedEventId) : null;
              const resolvedTitle = f.resolvedEventId ? eventMap.get(f.resolvedEventId) : null;

              return (
                <ContextMenu key={f.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      data-entity-id={f.id}
                      onClick={() => handleCardClick(f)}
                      className={`foreshadowing-card group relative rounded-lg border bg-card p-3 text-card-foreground transition-all cursor-default ${
                        isSelected
                          ? 'border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary/15'
                          : 'border-border hover:-translate-y-0.5 hover:shadow-md'
                      }`}
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
                                className="w-2.5 h-2.5 rounded-full hover:ring-2 hover:ring-ring transition-shadow flex-shrink-0"
                                style={{ backgroundColor: `rgb(var(${statusColorVar(f.status)}))` }}
                                title="切换状态"
                              />
                              {isStatusOpen && (
                                <div
                                  className="absolute left-0 top-4 z-20 min-w-[90px] rounded-md border border-border bg-popover shadow-md py-1"
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
                                      <StatusDot status={s} className="w-2 h-2" />
                                      {statusLabels[s]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold font-sans flex-1 truncate text-card-foreground">
                              {f.title}
                            </span>
                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TButton
                                variant="text"
                                shape="square"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(f);
                                }}
                                title="编辑"
                                icon={<PencilIcon size={14} />}
                              />
                              <TButton
                                variant="text"
                                shape="square"
                                size="small"
                                theme="danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(isDeleting ? null : f.id);
                                }}
                                title="删除"
                                icon={<DeleteIcon size={14} />}
                              />
                            </div>
                          </div>

                          {f.description && (
                            <div className="text-xs text-muted-foreground mt-2 font-sans leading-relaxed line-clamp-3">
                              {f.description}
                            </div>
                          )}

                          {/* Event associations */}
                          {(plantedTitle || resolvedTitle) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {plantedTitle && (
                                <TTag variant="light" size="small" theme="default">
                                  <StatusDot status="planted" className="w-1.5 h-1.5" />
                                  埋: {plantedTitle}
                                  <TButton
                                    variant="text"
                                    shape="square"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (f.plantedEventId) scrollToEvent(f.plantedEventId);
                                    }}
                                    title="定位"
                                    icon={<LocalTwoIcon size={12} />}
                                  />
                                </TTag>
                              )}
                              {resolvedTitle && (
                                <TTag variant="light" size="small" theme="default">
                                  <StatusDot status="resolved" className="w-1.5 h-1.5" />
                                  收: {resolvedTitle}
                                  <TButton
                                    variant="text"
                                    shape="square"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (f.resolvedEventId) scrollToEvent(f.resolvedEventId);
                                    }}
                                    title="定位"
                                    icon={<LocalTwoIcon size={12} />}
                                  />
                                </TTag>
                              )}
                            </div>
                          )}

                          {/* Status chip */}
                          <div className="mt-2 flex items-center">
                            <TTag variant="light" size="small" theme="default">
                              <StatusDot status={f.status} className="w-1.5 h-1.5" />
                              {statusLabels[f.status as StatusValue] || f.status}
                            </TTag>
                          </div>

                          {/* Delete confirmation inline */}
                          {isDeleting && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                              <span className="text-[10px] text-destructive font-sans">确认删除此伏笔？</span>
                              <TButton
                                theme="danger"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete(f.id);
                                }}
                              >
                                删除
                              </TButton>
                              <TButton
                                variant="outline"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                              >
                                取消
                              </TButton>
                            </div>
                          )}
                        </>
                      )}

                      {/* Edit mode */}
                      {isEditing && (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-sans">编辑伏笔</span>
                            <TButton
                              variant="text"
                              shape="square"
                              size="small"
                              onClick={cancelEdit}
                              icon={<XIcon size={16} />}
                            />
                          </div>
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
                              <div className="font-sans">
                                <div className="text-[10px] text-muted-foreground mb-1">关联伏笔</div>
                                <TSelect
                                  multiple
                                  filterable
                                  value={editRelatedIds}
                                  onChange={(val) => setEditRelatedIds((val as string[]) ?? [])}
                                  options={(foreshadowings ?? [])
                                    .filter((other) => other.id !== f.id)
                                    .map((other) => ({ label: other.title, value: other.id }))}
                                  placeholder="选择关联伏笔..."
                                  size="small"
                                  clearable
                                />
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-2">
                            <TButton
                              theme="primary"
                              size="small"
                              onClick={saveEdit}
                              disabled={!editTitle.trim() || updateForeshadowing.isPending}
                              icon={<CheckIcon size={14} />}
                            >
                              保存
                            </TButton>
                            <TButton
                              variant="outline"
                              size="small"
                              onClick={cancelEdit}
                              icon={<XIcon size={14} />}
                            >
                              取消
                            </TButton>
                          </div>
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem icon={<PencilIcon size={16} />} onClick={() => startEdit(f)}>
                      编辑
                    </ContextMenuItem>
                    <ContextMenuItem icon={<DeleteIcon size={16} />} destructive onClick={() => setDeletingId(f.id)}>
                      删除
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem icon={<RightIcon size={16} />} onClick={() => handleQuickStatusChange(f, 'developed')}>
                      标记为发展中
                    </ContextMenuItem>
                    <ContextMenuItem icon={<CheckIcon size={16} />} onClick={() => handleQuickStatusChange(f, 'resolved')}>
                      标记为已回收
                    </ContextMenuItem>
                    <ContextMenuItem icon={<XIcon size={16} />} onClick={() => handleQuickStatusChange(f, 'abandoned')}>
                      标记为已废弃
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem icon={<LocalTwoIcon size={16} />} onClick={() => { if (f.plantedEventId) scrollToEvent(f.plantedEventId); }}>
                      定位埋设事件
                    </ContextMenuItem>
                    <ContextMenuItem icon={<LocalTwoIcon size={16} />} onClick={() => { if (f.resolvedEventId) scrollToEvent(f.resolvedEventId); }}>
                      定位回收事件
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
                <MagicIcon size={32} className="text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground font-sans">暂无伏笔</p>
                <p className="text-xs text-muted-foreground/70 font-sans mt-1">点击右上角「新建」埋下第一个伏笔</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
