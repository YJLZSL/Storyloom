import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  XIcon,
  CheckIcon,
  LinkIcon,
  CompassIcon,
  GlobeIcon,
  HistoryIcon,
  BookOpenIcon,
  UserIcon,
  MagicIcon,
  TagIcon,
  TreeIcon,
  SearchIcon,
} from '@/lib/icons';
import { TDialog, TCard, TButton, TInput, TTag, TBadge } from '@/components/ui-tdesign';
import {
  useWorldSettings,
  useCreateWorldSetting,
  useUpdateWorldSetting,
  useDeleteWorldSetting,
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
import type { WorldSetting } from '../../../shared/types';

const categories = ['地理', '历史', '文化', '政治', '魔法', '科技', '种族', '其他'];

const CATEGORY_ICONS: Record<string, typeof GlobeIcon> = {
  地理: GlobeIcon,
  历史: HistoryIcon,
  文化: BookOpenIcon,
  政治: UserIcon,
  魔法: MagicIcon,
  科技: TagIcon,
  种族: TreeIcon,
  其他: CompassIcon,
};

type StatusFilter = 'all' | 'empty' | 'filled' | 'linked';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'empty', label: '待填' },
  { key: 'filled', label: '已填' },
  { key: 'linked', label: '关联中' },
];

export function WorldBuildingPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const selectedWorldSettingId = useSelectionStore((s) => s.selectedWorldSettingId);
  const selectWorldSetting = useSelectionStore((s) => s.selectWorldSetting);
  const { data: settings } = useWorldSettings(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createMutation = useCreateWorldSetting();
  const updateMutation = useUpdateWorldSetting();
  const deleteMutation = useDeleteWorldSetting();

  const allEvents = eventsData?.items ?? [];

  const [category, setCategory] = useState('地理');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const eventIdToSettingIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ev of allEvents) {
      for (const sid of ev.worldSettingIds ?? []) {
        if (!map.has(sid)) map.set(sid, new Set());
        map.get(sid)!.add(ev.id);
      }
    }
    return map;
  }, [allEvents]);

  const getSettingStatus = useCallback((s: WorldSetting): { label: string; theme: 'default' | 'primary' | 'warning' | 'success' } => {
    const linked = eventIdToSettingIds.has(s.id);
    const filled = !!(s.value?.trim() || s.description?.trim());
    if (linked) return { label: '关联中', theme: 'primary' };
    if (filled) return { label: '已填', theme: 'success' };
    return { label: '待填', theme: 'warning' };
  }, [eventIdToSettingIds]);

  const filtered = useMemo(() => {
    let list = settings?.filter((s) => s.category === category) || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.key.toLowerCase().includes(q) ||
          (s.value && s.value.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((s) => {
        const status = getSettingStatus(s);
        if (statusFilter === 'empty') return status.label === '待填';
        if (statusFilter === 'filled') return status.label === '已填';
        if (statusFilter === 'linked') return status.label === '关联中';
        return true;
      });
    }
    return list;
  }, [settings, category, search, statusFilter, getSettingStatus]);

  // ---- Create handler ----
  const handleCreate = useCallback(() => {
    if (!workspaceId || !newKey.trim() || createMutation.isPending) return;
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

  const handleCardClick = (s: WorldSetting) => {
    if (editingId === s.id) return;
    selectWorldSetting(selectedWorldSettingId === s.id ? null : s.id);
  };

  // Scroll selected world setting card into view
  useEffect(() => {
    if (!selectedWorldSettingId || !listRef.current) return;
    const timer = requestAnimationFrame(() => {
      scrollSelectedIntoView('worldSetting', selectedWorldSettingId, listRef.current);
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedWorldSettingId]);

  const statusCounts = useMemo(() => {
    const list = settings?.filter((s) => s.category === category) || [];
    return {
      all: list.length,
      empty: list.filter((s) => getSettingStatus(s).label === '待填').length,
      filled: list.filter((s) => getSettingStatus(s).label === '已填').length,
      linked: list.filter((s) => getSettingStatus(s).label === '关联中').length,
    };
  }, [settings, category, getSettingStatus]);

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
            placeholder="搜索设定"
            size="small"
            prefixIcon={<SearchIcon size={14} />}
            clearable
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {categories.map((c) => (
          <TButton
            key={c}
            variant="text"
            className="p-0 h-auto min-h-0"
            onClick={() => setCategory(c)}
          >
            <TTag
              variant={category === c ? 'dark' : 'light'}
              size="small"
              theme={category === c ? 'primary' : 'default'}
            >
              {c}
            </TTag>
          </TButton>
        ))}
      </div>

      {/* Create form */}
      <div className="shrink-0 space-y-2 mb-4">
        <TInput
          value={newKey}
          onChange={(val) => setNewKey((val ?? '').toString())}
          onEnter={handleCreate}
          placeholder="设定名称"
          size="small"
        />
        <TInput
          value={newValue}
          onChange={(val) => setNewValue((val ?? '').toString())}
          onEnter={handleCreate}
          placeholder="设定内容"
          size="small"
        />
        <TInput
          value={newDescription}
          onChange={(val) => setNewDescription((val ?? '').toString())}
          onEnter={handleCreate}
          placeholder="补充描述（可选）"
          size="small"
        />
        <TButton
          theme="primary"
          size="small"
          block
          onClick={handleCreate}
          disabled={!newKey.trim() || createMutation.isPending}
          icon={<PlusIcon size={16} />}
        >
          {createMutation.isPending ? '添加中...' : '添加设定'}
        </TButton>
      </div>

      {/* Settings grid */}
      <div ref={listRef} className="flex-1 overflow-auto">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((s) => {
              const isSelected = selectedWorldSettingId === s.id;
              const status = getSettingStatus(s);
              const Icon = CATEGORY_ICONS[s.category] || CompassIcon;

              return (
                <ContextMenu key={s.id}>
                  <ContextMenuTrigger asChild>
                    <div data-entity-id={s.id} onClick={() => handleCardClick(s)}>
                      <TCard
                        bordered
                        hoverShadow
                        size="small"
                        className={`cursor-default transition-all ${
                          isSelected
                            ? 'ring-1 ring-primary/40 border-primary'
                            : ''
                        }`}
                        avatar={
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Icon size={28} />
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{s.key}</span>
                          <TTag variant="light" size="small" theme={status.theme}>
                            {status.label}
                          </TTag>
                        </div>
                      }
                      description={
                        <div className="space-y-1">
                          {s.value && (
                            <div className="text-xs text-muted-foreground line-clamp-3">
                              {s.value}
                            </div>
                          )}
                          {s.description && (
                            <div className="text-xs text-muted-foreground/70 italic line-clamp-2">
                              {s.description}
                            </div>
                          )}
                        </div>
                      }
                      footer={
                        <div className="flex items-center justify-between w-full">
                          <TTag variant="light" size="small" theme="default">
                            {s.category}
                          </TTag>
                          <div className="flex items-center gap-0.5">
                            <TButton
                              variant="text"
                              shape="square"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(s);
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
                                setConfirmDeleteId(s.id);
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
                    <ContextMenuItem icon={<EditIcon size={16} />} onClick={() => startEditing(s)}>
                      编辑
                    </ContextMenuItem>
                    <ContextMenuItem icon={<DeleteIcon size={16} />} destructive onClick={() => setConfirmDeleteId(s.id)}>
                      删除
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem icon={<LinkIcon size={16} />} onClick={() => setViewMode('timeline')}>
                      查看引用事件
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <CompassIcon size={32} className="text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground font-sans">该分类暂无设定</p>
            <p className="text-xs text-muted-foreground/70 font-sans mt-1">在上方添加第一条「{category}」设定</p>
          </div>
        )}
      </div>

      <TDialog
        visible={!!editingId}
        onClose={cancelEditing}
        header="编辑设定"
        closeOnOverlayClick={false}
        width="480px"
        footer={
          <div className="flex items-center gap-2">
            <TButton
              theme="primary"
              size="small"
              onClick={handleUpdate}
              disabled={!editKey.trim() || updateMutation.isPending}
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
            value={editKey}
            onChange={(val) => setEditKey((val ?? '').toString())}
            placeholder="设定名称"
            size="small"
          />
          <TInput
            value={editValue}
            onChange={(val) => setEditValue((val ?? '').toString())}
            placeholder="设定内容"
            size="small"
          />
          <TInput
            value={editDescription}
            onChange={(val) => setEditDescription((val ?? '').toString())}
            placeholder="补充描述（可选）"
            size="small"
          />
        </div>
      </TDialog>

      {/* Delete confirmation modal */}
      <TDialog
        visible={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        header="确认删除"
        closeOnOverlayClick={false}
        width="400px"
        footer={
          <div className="flex items-center gap-2 justify-center">
            <TButton
              theme="danger"
              size="small"
              onClick={() => handleDelete(confirmDeleteId!)}
              disabled={deleteMutation.isPending}
              icon={<DeleteIcon size={14} />}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </TButton>
            <TButton variant="outline" size="small" onClick={() => setConfirmDeleteId(null)} icon={<XIcon size={14} />}>
              取消
            </TButton>
          </div>
        }
      >
        <div className="text-center space-y-3 py-4">
          <DeleteIcon size={28} className="mx-auto text-destructive" />
          <p className="text-sm">确认删除此设定？</p>
        </div>
      </TDialog>
    </div>
  );
}
