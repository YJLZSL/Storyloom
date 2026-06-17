import { useState, useRef, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, Link, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import {
  useWorldSettings,
  useCreateWorldSetting,
  useUpdateWorldSetting,
  useDeleteWorldSetting,
  useEvents,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import type { WorldSetting } from '../../../shared/types';

const categories = ['地理', '历史', '文化', '政治', '魔法', '科技', '种族', '其他'];

export function WorldBuildingPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const { data: settings } = useWorldSettings(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createMutation = useCreateWorldSetting();
  const updateMutation = useUpdateWorldSetting();
  const deleteMutation = useDeleteWorldSetting();

  const allEvents = eventsData?.items ?? [];

  // Collapsible state for referencing events per setting
  const [expandedSettingIds, setExpandedSettingIds] = useState<Set<string>>(new Set());

  const [category, setCategory] = useState('地理');

  // Create form state
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const openEventEditor = useCallback((eventId: string) => {
    setSelectedEvent(eventId);
    setActivePanel('event-editor');
  }, [setSelectedEvent, setActivePanel]);

  const filtered = settings?.filter((s) => s.category === category) || [];

  // ---- Create handler ----
  const handleCreate = useCallback(() => {
    if (!workspaceId || !newKey.trim()) return;
    createMutation.mutate(
      {
        workspaceId,
        data: {
          category,
          key: newKey.trim(),
          ...(newValue.trim() ? { value: newValue.trim() } : {}),
          ...(newDescription.trim() ? { description: newDescription.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setNewKey('');
          setNewValue('');
          setNewDescription('');
        },
      },
    );
  }, [workspaceId, category, newKey, newValue, newDescription, createMutation]);

  // ---- Edit handlers ----
  const startEditing = useCallback((s: WorldSetting) => {
    setEditingId(s.id);
    setEditKey(s.key);
    setEditValue(s.value ?? '');
    setEditDescription(s.description ?? '');
    setConfirmDeleteId(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditKey('');
    setEditValue('');
    setEditDescription('');
  }, []);

  const handleUpdate = useCallback(() => {
    if (!workspaceId || !editingId || !editKey.trim()) return;
    updateMutation.mutate(
      {
        workspaceId,
        settingId: editingId,
        data: {
          key: editKey.trim(),
          value: editValue.trim() || undefined,
          description: editDescription.trim() || undefined,
        },
      },
      { onSuccess: () => cancelEditing() },
    );
  }, [workspaceId, editingId, editKey, editValue, editDescription, updateMutation, cancelEditing]);

  // ---- Delete handler ----
  const handleDelete = useCallback(
    (settingId: string) => {
      if (!workspaceId) return;
      deleteMutation.mutate(
        { workspaceId, settingId },
        { onSuccess: () => setConfirmDeleteId(null) },
      );
    },
    [workspaceId, deleteMutation],
  );

  // ---- Handle Enter key in create form ----
  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCreate();
      }
    },
    [handleCreate],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Category filter buttons */}
      <div className="flex flex-wrap gap-1 mb-3">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2 py-1 rounded text-[10px] transition-colors font-sans ${
              category === c
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent hover:bg-accent/80'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Create form */}
      <div className="shrink-0 space-y-2 mb-4">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={handleCreateKeyDown}
          placeholder="设定名称"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
        />
        <textarea
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="设定内容"
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="补充描述（可选）"
          rows={1}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
        />
        <button
          onClick={handleCreate}
          disabled={!newKey.trim() || createMutation.isPending}
          className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {createMutation.isPending ? '添加中...' : '添加设定'}
        </button>
      </div>

      {/* Settings list */}
      <div ref={listRef} className="flex-1 overflow-auto space-y-2">
        {filtered.map((s) => {
          const isEditing = editingId === s.id;
          const isConfirmingDelete = confirmDeleteId === s.id;

          return (
            <ContextMenu key={s.id}>
              <ContextMenuTrigger asChild>
            <div
              data-entity-id={s.id}
              className="setting-card px-3 py-2 rounded-md border border-border hover:bg-accent/50 transition-colors"
            >
              {isEditing ? (
                /* ---- Inline edit mode ---- */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="设定名称"
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="设定内容"
                    rows={2}
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="补充描述（可选）"
                    rows={1}
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleUpdate}
                      disabled={!editKey.trim() || updateMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3 h-3" />
                      保存
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-accent hover:bg-accent/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- Read mode ---- */
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => startEditing(s)}
                    >
                      <div className="text-sm font-medium font-sans">{s.key}</div>
                      {s.value && (
                        <div className="text-xs text-muted-foreground mt-1 font-sans leading-relaxed">
                          {s.value}
                        </div>
                      )}
                      {s.description && (
                        <div className="text-xs text-muted-foreground/70 mt-1 font-sans italic">
                          {s.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <button
                        onClick={() => startEditing(s)}
                        className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        title="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="p-1 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {isConfirmingDelete && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-destructive font-sans">确认删除此设定？</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          {deleteMutation.isPending ? '删除中...' : '删除'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-accent hover:bg-accent/80 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Referencing events section */}
                  <div className="mt-2 border-t border-border/50 pt-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSettingIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-sans"
                    >
                      {expandedSettingIds.has(s.id) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      引用事件
                      {allEvents.filter((ev) => ev.worldSettingIds?.includes(s.id)).length > 0 && (
                        <span className="ml-0.5 px-1 rounded bg-accent text-[9px]">
                          {allEvents.filter((ev) => ev.worldSettingIds?.includes(s.id)).length}
                        </span>
                      )}
                    </button>
                    {expandedSettingIds.has(s.id) && (
                      <div className="mt-1 space-y-0.5">
                        {allEvents
                          .filter((ev) => ev.worldSettingIds?.includes(s.id))
                          .map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-accent/50 transition-colors cursor-pointer group"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventEditor(ev.id);
                              }}
                            >
                              <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground font-sans">
                                {ev.title}
                              </span>
                              <span className="text-muted-foreground/60 font-mono shrink-0">
                                {ev.startTime ? new Date(ev.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scrollToEvent(ev.id);
                                }}
                                className="p-0.5 rounded hover:bg-accent text-muted-foreground/50 hover:text-primary transition-colors shrink-0"
                                title="定位"
                              >
                                <MapPin className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))
                        }
                        {allEvents.filter((ev) => ev.worldSettingIds?.includes(s.id)).length === 0 && (
                          <div className="text-[10px] text-muted-foreground/60 font-sans px-1.5">暂无引用事件</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => startEditing(s)}>
                  编辑
                </ContextMenuItem>
                <ContextMenuItem icon={<Trash2 className="w-4 h-4" />} destructive onClick={() => setConfirmDeleteId(s.id)}>
                  删除
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={<Link className="w-4 h-4" />} onClick={() => setViewMode('timeline')}>
                  查看引用事件
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4 font-sans">
            该分类暂无设定
          </div>
        )}
      </div>
    </div>
  );
}
