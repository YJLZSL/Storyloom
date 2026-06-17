import { useState, useRef, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, Link, Sparkles, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { useCharacters, useCreateCharacter, useUpdateCharacter, useDeleteCharacter, useEvents } from '@/services/api-hooks';
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
import type { Character } from '../../../shared/types';

function parseTraits(traitsJson: string | null): string[] {
  if (!traitsJson) return [];
  try {
    const parsed = JSON.parse(traitsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CharacterPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const { data: characters } = useCharacters(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createCharacter = useCreateCharacter();
  const updateCharacter = useUpdateCharacter();
  const deleteCharacter = useDeleteCharacter();

  const allEvents = eventsData?.items ?? [];

  // Collapsible state for related events per character
  const [expandedCharIds, setExpandedCharIds] = useState<Set<string>>(new Set());

  // Create form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTraits, setEditTraits] = useState<string[]>([]);
  const [newTrait, setNewTrait] = useState('');

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const openEventEditor = useCallback((eventId: string) => {
    setSelectedEvent(eventId);
    setActivePanel('event-editor');
  }, [setSelectedEvent, setActivePanel]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    createCharacter.mutate({
      workspaceId,
      data: {
        name,
        role: role || undefined,
        description: description || undefined,
      },
    });
    setName('');
    setRole('');
    setDescription('');
  };

  const startEditing = (char: Character) => {
    setEditingId(char.id);
    setEditName(char.name);
    setEditRole(char.role ?? '');
    setEditDescription(char.description ?? '');
    setEditTraits(parseTraits(char.traitsJson));
    setNewTrait('');
    setDeletingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditRole('');
    setEditDescription('');
    setEditTraits([]);
    setNewTrait('');
  };

  const saveEdit = (charId: string) => {
    if (!workspaceId || !editName.trim()) return;
    updateCharacter.mutate({
      workspaceId,
      characterId: charId,
      data: {
        name: editName,
        role: editRole || undefined,
        description: editDescription || undefined,
        traitsJson: JSON.stringify(editTraits),
      },
    });
    cancelEditing();
  };

  const confirmDelete = (charId: string) => {
    if (!workspaceId) return;
    deleteCharacter.mutate({ workspaceId, characterId: charId });
    setDeletingId(null);
    if (editingId === charId) {
      cancelEditing();
    }
  };

  const handleCardClick = (char: Character) => {
    if (editingId === char.id) return;
    startEditing(char);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Create form */}
      <form onSubmit={handleAdd} className="shrink-0 space-y-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="角色名称"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
        />
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="角色身份"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="角色描述"
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-none"
        />
        <button
          type="submit"
          disabled={!name.trim() || createCharacter.isPending}
          className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          添加角色
        </button>
      </form>

      {/* Character list */}
      <div ref={listRef} className="flex-1 overflow-auto space-y-2">
        {characters?.map((char) => {
          const traits = parseTraits(char.traitsJson);
          const isEditing = editingId === char.id;
          const isDeleting = deletingId === char.id;

          return (
            <ContextMenu key={char.id}>
              <ContextMenuTrigger asChild>
            <div
              data-entity-id={char.id}
              className="character-item rounded-md border border-border hover:bg-accent/50 transition-colors cursor-default"
            >
              {isEditing ? (
                /* Expanded edit mode */
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-sans">编辑角色</span>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1 rounded hover:bg-accent transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="角色名称"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="角色身份"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="角色描述"
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-none"
                  />
                  {/* Editable traits */}
                  <div>
                    <span className="text-xs text-muted-foreground font-sans">特征</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {editTraits.map((trait, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground font-sans"
                        >
                          {trait}
                          <button
                            type="button"
                            onClick={() => setEditTraits((prev) => prev.filter((_, idx) => idx !== i))}
                            className="ml-0.5 hover:text-destructive transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={newTrait}
                        onChange={(e) => setNewTrait(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTrait.trim()) {
                            e.preventDefault();
                            setEditTraits((prev) => [...prev, newTrait.trim()]);
                            setNewTrait('');
                          }
                        }}
                        placeholder="添加特征"
                        className="flex-1 px-2 py-1 rounded border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTrait.trim()) {
                            setEditTraits((prev) => [...prev, newTrait.trim()]);
                            setNewTrait('');
                          }
                        }}
                        className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(char.id)}
                      disabled={!editName.trim() || updateCharacter.isPending}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal card view */
                <div
                  className="px-3 py-2"
                  onClick={() => handleCardClick(char)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium font-sans truncate">{char.name}</div>
                      {char.role && (
                        <div className="text-xs text-muted-foreground font-sans truncate">{char.role}</div>
                      )}
                      {char.description && (
                        <div className="text-xs text-muted-foreground/80 font-sans mt-1 line-clamp-2">{char.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(char);
                        }}
                        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        title="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(char.id);
                        }}
                        className="p-1.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trait tags */}
                  {traits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {traits.map((trait, i) => (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground font-sans"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Related events section */}
                  <div className="mt-2 border-t border-border/50 pt-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCharIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(char.id)) next.delete(char.id);
                          else next.add(char.id);
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-sans"
                    >
                      {expandedCharIds.has(char.id) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      关联事件
                      {allEvents.filter((ev) => ev.characterIds?.includes(char.id)).length > 0 && (
                        <span className="ml-0.5 px-1 rounded bg-accent text-[9px]">
                          {allEvents.filter((ev) => ev.characterIds?.includes(char.id)).length}
                        </span>
                      )}
                    </button>
                    {expandedCharIds.has(char.id) && (
                      <div className="mt-1 space-y-0.5">
                        {allEvents
                          .filter((ev) => ev.characterIds?.includes(char.id))
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
                        {allEvents.filter((ev) => ev.characterIds?.includes(char.id)).length === 0 && (
                          <div className="text-[10px] text-muted-foreground/60 font-sans px-1.5">暂无关联事件</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {isDeleting && !isEditing && (
                <div className="px-3 py-2 border-t border-border bg-destructive/5">
                  <div className="text-xs text-destructive font-sans mb-2">确定要删除角色「{char.name}」吗？</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmDelete(char.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs hover:opacity-90 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                      确认删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => startEditing(char)}>
                  编辑
                </ContextMenuItem>
                <ContextMenuItem icon={<Trash2 className="w-4 h-4" />} destructive onClick={() => setDeletingId(char.id)}>
                  删除
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={<Link className="w-4 h-4" />} onClick={() => setViewMode('timeline')}>
                  查看关联事件
                </ContextMenuItem>
                <ContextMenuItem icon={<Sparkles className="w-4 h-4" />} onClick={() => setActivePanel('ai')}>
                  AI 生成对话
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {(!characters || characters.length === 0) && (
          <div className="text-center text-sm text-muted-foreground py-4 font-sans">暂无角色</div>
        )}
      </div>
    </div>
  );
}
