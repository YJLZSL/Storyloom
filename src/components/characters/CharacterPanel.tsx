import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  XIcon,
  CheckIcon,
  LinkIcon,
  UserIcon,
  GroupIcon,
  SearchIcon,
} from '@/lib/icons';
import { TDialog, TCard, TButton, TInput, TTag, TBadge } from '@/components/ui-tdesign';
import { useCharacters, useCreateCharacter, useUpdateCharacter, useDeleteCharacter, useEvents } from '@/services/api-hooks';
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
import { safeJsonArray } from '@/lib/utils';
import type { Character } from '../../../shared/types';

function parseTraits(traitsJson: string | null): string[] {
  return safeJsonArray<string>(traitsJson, []);
}

type StatusFilter = 'all' | 'empty' | 'filled' | 'linked';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'empty', label: '待完善' },
  { key: 'filled', label: '有资料' },
  { key: 'linked', label: '关联中' },
];

export function CharacterPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const selectedCharacterId = useSelectionStore((s) => s.selectedCharacterId);
  const selectCharacter = useSelectionStore((s) => s.selectCharacter);
  const { data: characters } = useCharacters(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createCharacter = useCreateCharacter();
  const updateCharacter = useUpdateCharacter();
  const deleteCharacter = useDeleteCharacter();

  const allEvents = eventsData?.items ?? [];

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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const listRef = useRef<HTMLDivElement>(null);

  const eventIdToCharacterIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ev of allEvents) {
      for (const cid of ev.characterIds ?? []) {
        if (!map.has(cid)) map.set(cid, new Set());
        map.get(cid)!.add(ev.id);
      }
    }
    return map;
  }, [allEvents]);

  const getCharacterStatus = useCallback((char: Character): { label: string; theme: 'default' | 'primary' | 'warning' | 'success' } => {
    const linked = eventIdToCharacterIds.has(char.id);
    const filled = !!(char.role?.trim() || char.description?.trim());
    if (linked) return { label: '关联中', theme: 'primary' };
    if (filled) return { label: '有资料', theme: 'success' };
    return { label: '待完善', theme: 'warning' };
  }, [eventIdToCharacterIds]);

  const filtered = useMemo(() => {
    let list = characters ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (char) =>
          char.name.toLowerCase().includes(q) ||
          (char.role && char.role.toLowerCase().includes(q)) ||
          (char.description && char.description.toLowerCase().includes(q)) ||
          parseTraits(char.traitsJson).some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((char) => {
        const status = getCharacterStatus(char);
        if (statusFilter === 'empty') return status.label === '待完善';
        if (statusFilter === 'filled') return status.label === '有资料';
        if (statusFilter === 'linked') return status.label === '关联中';
        return true;
      });
    }
    return list;
  }, [characters, search, statusFilter, getCharacterStatus]);

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || !workspaceId || createCharacter.isPending) return;
    createCharacter.mutate(
      {
        workspaceId,
        data: {
          name,
          role: role || undefined,
          description: description || undefined,
        },
      },
      {
        onSuccess: () => {
          setName('');
          setRole('');
          setDescription('');
        },
      },
    );
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
    selectCharacter(selectedCharacterId === char.id ? null : char.id);
  };

  // Scroll selected character card into view
  useEffect(() => {
    if (!selectedCharacterId || !listRef.current) return;
    const timer = requestAnimationFrame(() => {
      scrollSelectedIntoView('character', selectedCharacterId, listRef.current);
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedCharacterId]);

  const statusCounts = useMemo(() => {
    const list = characters ?? [];
    return {
      all: list.length,
      empty: list.filter((c) => getCharacterStatus(c).label === '待完善').length,
      filled: list.filter((c) => getCharacterStatus(c).label === '有资料').length,
      linked: list.filter((c) => getCharacterStatus(c).label === '关联中').length,
    };
  }, [characters, getCharacterStatus]);

  return (
    <div className="h-full flex flex-col">
      {/* Status filter badges + search */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {STATUS_FILTERS.map((sf) => (
          <TButton
            key={sf.key}
            variant="text"
            className="p-0 h-auto min-h-0"
            onClick={() => setStatusFilter(sf.key)}
          >
            <TTag
              variant={statusFilter === sf.key ? 'dark' : 'light'}
              size="small"
              theme={statusFilter === sf.key ? 'primary' : 'default'}
            >
              {sf.label}
              <TBadge count={statusCounts[sf.key]} shape="circle" size="small" className="ml-1" />
            </TTag>
          </TButton>
        ))}
        <div className="ml-auto w-32">
          <TInput
            value={search}
            onChange={(val) => setSearch((val ?? '').toString())}
            placeholder="搜索角色"
            size="small"
            prefixIcon={<SearchIcon size={14} />}
            clearable
          />
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={handleAdd} className="shrink-0 space-y-2 mb-4">
        <TInput
          value={name}
          onChange={(val) => setName((val ?? '').toString())}
          placeholder="角色名称"
          size="small"
        />
        <TInput
          value={role}
          onChange={(val) => setRole((val ?? '').toString())}
          placeholder="角色身份"
          size="small"
        />
        <TInput
          value={description}
          onChange={(val) => setDescription((val ?? '').toString())}
          placeholder="角色描述"
          size="small"
        />
        <TButton
          type="submit"
          theme="primary"
          size="small"
          block
          disabled={!name.trim() || createCharacter.isPending}
          icon={<PlusIcon size={16} />}
        >
          {createCharacter.isPending ? '添加中...' : '添加角色'}
        </TButton>
      </form>

      {/* Character grid */}
      <div ref={listRef} className="flex-1 overflow-auto">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((char) => {
              const traits = parseTraits(char.traitsJson);
              const isSelected = selectedCharacterId === char.id;
              const status = getCharacterStatus(char);

              return (
                <ContextMenu key={char.id}>
                  <ContextMenuTrigger asChild>
                    <div data-entity-id={char.id} onClick={() => handleCardClick(char)}>
                      <TCard
                        bordered
                        hoverShadow
                        size="small"
                        className={`cursor-default transition-all ${
                          isSelected ? 'ring-1 ring-primary/40 border-primary' : ''
                        }`}
                        avatar={
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <UserIcon size={28} />
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{char.name}</span>
                          <TTag variant="light" size="small" theme={status.theme}>
                            {status.label}
                          </TTag>
                        </div>
                      }
                      description={
                        <div className="space-y-1">
                          {char.role && (
                            <div className="text-xs text-muted-foreground truncate">{char.role}</div>
                          )}
                          {char.description && (
                            <div className="text-xs text-muted-foreground/70 line-clamp-2">{char.description}</div>
                          )}
                          {traits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {traits.map((trait, i) => (
                                <TTag key={i} variant="light" size="small" theme="default">
                                  {trait}
                                </TTag>
                              ))}
                            </div>
                          )}
                        </div>
                      }
                      footer={
                        <div className="flex items-center justify-between w-full">
                          <TTag variant="light" size="small" theme="default">
                            {traits.length} 特征
                          </TTag>
                          <div className="flex items-center gap-0.5">
                            <TButton
                              variant="text"
                              shape="square"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(char);
                              }}
                              icon={<EditIcon size={14} />}
                            />
                            <TButton
                              variant="text"
                              shape="square"
                              size="small"
                              theme="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(char.id);
                              }}
                              icon={<DeleteIcon size={14} />}
                            />
                          </div>
                        </div>
                      }
                    />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem icon={<EditIcon size={16} />} onClick={() => startEditing(char)}>
                      编辑
                    </ContextMenuItem>
                    <ContextMenuItem icon={<DeleteIcon size={16} />} destructive onClick={() => setDeletingId(char.id)}>
                      删除
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem icon={<LinkIcon size={16} />} onClick={() => setViewMode('timeline')}>
                      查看关联事件
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <GroupIcon size={32} className="text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground font-sans">暂无角色</p>
            <p className="text-xs text-muted-foreground/70 font-sans mt-1">在上方创建第一个角色</p>
          </div>
        )}
      </div>

      <TDialog
        visible={!!editingId}
        onClose={cancelEditing}
        header="编辑角色"
        closeOnOverlayClick={false}
        width="480px"
        footer={
          <div className="flex items-center gap-2">
            <TButton
              theme="primary"
              size="small"
              onClick={() => saveEdit(editingId!)}
              disabled={!editName.trim() || updateCharacter.isPending}
              icon={<CheckIcon size={14} />}
            >
              保存
            </TButton>
            <TButton variant="outline" size="small" onClick={cancelEditing} icon={<XIcon size={14} />}>
              取消
            </TButton>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <TInput
            value={editName}
            onChange={(val) => setEditName((val ?? '').toString())}
            placeholder="角色名称"
            size="small"
          />
          <TInput
            value={editRole}
            onChange={(val) => setEditRole((val ?? '').toString())}
            placeholder="角色身份"
            size="small"
          />
          <TInput
            value={editDescription}
            onChange={(val) => setEditDescription((val ?? '').toString())}
            placeholder="角色描述"
            size="small"
          />
          <div>
            <span className="text-xs text-muted-foreground">特征</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {editTraits.map((trait, i) => (
                <TTag key={i} variant="light" size="small" theme="default">
                  {trait}
                  <TButton
                    variant="text"
                    shape="square"
                    size="small"
                    className="ml-0.5 p-0 w-4 h-4 min-h-0"
                    onClick={() => setEditTraits((prev) => prev.filter((_, idx) => idx !== i))}
                    icon={<XIcon size={10} />}
                  />
                </TTag>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TInput
                value={newTrait}
                onChange={(val) => setNewTrait((val ?? '').toString())}
                onEnter={() => {
                  if (newTrait.trim()) {
                    setEditTraits((prev) => [...prev, newTrait.trim()]);
                    setNewTrait('');
                  }
                }}
                placeholder="添加特征"
                size="small"
                className="flex-1"
              />
              <TButton
                theme="primary"
                size="small"
                onClick={() => {
                  if (newTrait.trim()) {
                    setEditTraits((prev) => [...prev, newTrait.trim()]);
                    setNewTrait('');
                  }
                }}
              >
                添加
              </TButton>
            </div>
          </div>
        </div>
      </TDialog>

      {/* Delete confirmation modal */}
      <TDialog
        visible={!!deletingId}
        onClose={() => setDeletingId(null)}
        header="确认删除"
        closeOnOverlayClick={false}
        width="400px"
        footer={
          <div className="flex items-center gap-2 justify-center">
            <TButton
              theme="danger"
              size="small"
              onClick={() => confirmDelete(deletingId!)}
              disabled={deleteCharacter.isPending}
              icon={<DeleteIcon size={14} />}
            >
              {deleteCharacter.isPending ? '删除中...' : '确认删除'}
            </TButton>
            <TButton variant="outline" size="small" onClick={() => setDeletingId(null)} icon={<XIcon size={14} />}>
              取消
            </TButton>
          </div>
        }
      >
        <div className="text-center space-y-3 py-4">
          <DeleteIcon size={28} className="mx-auto text-destructive" />
          <p className="text-sm">确定要删除该角色吗？</p>
        </div>
      </TDialog>
    </div>
  );
}
