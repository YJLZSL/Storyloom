import { useRef, useState, useMemo } from 'react';
import { PlusIcon, RightIcon, PencilIcon, DeleteIcon, XIcon, CheckIcon } from '@/lib/icons';
import { TButton, TTag, TInput } from '@/components/ui-tdesign';
import {
  useConnections,
  useCreateConnection,
  useUpdateConnection,
  useDeleteConnection,
  useEvents,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import type { Connection, ConnectionType } from '../../../shared/types';

const CONNECTION_TYPES: ConnectionType[] = ['因果', '闪回', '伏笔', '平行', '对比', '呼应', '转折'];

const typeColors: Record<string, string> = {
  '因果': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  '闪回': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  '伏笔': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  '平行': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  '对比': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  '呼应': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  '转折': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

export function ConnectionPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: connections } = useConnections(workspaceId);
  const { data: eventsData } = useEvents(workspaceId);
  const createMutation = useCreateConnection();
  const updateMutation = useUpdateConnection();
  const deleteMutation = useDeleteConnection();

  const listRef = useRef<HTMLDivElement>(null);

  // --- Create form state ---
  const [formOpen, setFormOpen] = useState(false);
  const [sourceEventId, setSourceEventId] = useState('');
  const [targetEventId, setTargetEventId] = useState('');
  const [newType, setNewType] = useState<ConnectionType>('因果');
  const [newDescription, setNewDescription] = useState('');

  // --- Edit state ---
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editType, setEditType] = useState<ConnectionType>('因果');
  const [editDescription, setEditDescription] = useState('');

  // --- Delete confirmation ---
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Build event lookup map
  const events = eventsData?.items ?? [];
  const eventMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of events) {
      map.set(ev.id, ev.title);
    }
    return map;
  }, [events]);

  // --- Handlers ---
  const resetForm = () => {
    setSourceEventId('');
    setTargetEventId('');
    setNewType('因果');
    setNewDescription('');
  };

  const handleCreate = () => {
    if (!workspaceId || !sourceEventId || !targetEventId) return;
    createMutation.mutate(
      {
        workspaceId,
        data: {
          sourceEventId,
          targetEventId,
          type: newType,
          description: newDescription.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          resetForm();
          setFormOpen(false);
        },
      },
    );
  };

  const startEdit = (conn: Connection) => {
    setExpandedId(conn.id);
    setEditType(conn.type as ConnectionType);
    setEditDescription(conn.description ?? '');
  };

  const cancelEdit = () => {
    setExpandedId(null);
  };

  const handleUpdate = (conn: Connection) => {
    if (!workspaceId) return;
    updateMutation.mutate(
      {
        workspaceId,
        connectionId: conn.id,
        data: {
          type: editType,
          description: editDescription.trim() || undefined,
        },
      },
      { onSuccess: () => setExpandedId(null) },
    );
  };

  const handleDelete = (connectionId: string) => {
    if (!workspaceId) return;
    deleteMutation.mutate(
      { workspaceId, connectionId },
      { onSuccess: () => setConfirmDeleteId(null) },
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* --- Collapsible Create Form --- */}
      <div className="mb-2 border-b border-border pb-2">
        <TButton
          variant="text"
          size="small"
          block
          onClick={() => setFormOpen((v) => !v)}
          icon={formOpen ? <XIcon size={14} /> : <PlusIcon size={14} />}
        >
          {formOpen ? '取消新建' : '新建关联'}
        </TButton>

        {formOpen && (
          <div className="mt-2 space-y-2">
            {/* Source event */}
            <div>
              <label className="text-xs text-muted-foreground font-sans mb-0.5 block">源事件</label>
              <select
                value={sourceEventId}
                onChange={(e) => setSourceEventId(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">选择事件...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Target event */}
            <div>
              <label className="text-xs text-muted-foreground font-sans mb-0.5 block">目标事件</label>
              <select
                value={targetEventId}
                onChange={(e) => setTargetEventId(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">选择事件...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Connection type */}
            <div>
              <label className="text-xs text-muted-foreground font-sans mb-0.5 block">关联类型</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ConnectionType)}
                className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CONNECTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground font-sans mb-0.5 block">描述（可选）</label>
              <TInput
                value={newDescription}
                onChange={(val) => setNewDescription((val ?? '').toString())}
                placeholder="输入关联描述..."
                size="small"
              />
            </div>

            {/* Submit */}
            <TButton
              theme="primary"
              size="small"
              block
              onClick={handleCreate}
              disabled={!sourceEventId || !targetEventId || createMutation.isPending}
              icon={<PlusIcon size={14} />}
            >
              {createMutation.isPending ? '创建中...' : '创建关联'}
            </TButton>
          </div>
        )}
      </div>

      {/* --- Connection List --- */}
      <div ref={listRef} className="flex-1 overflow-auto space-y-2">
        {connections?.map((conn) => {
          const isExpanded = expandedId === conn.id;
          const isConfirmingDelete = confirmDeleteId === conn.id;
          const sourceTitle = eventMap.get(conn.sourceEventId) ?? conn.sourceEventId.slice(0, 8);
          const targetTitle = eventMap.get(conn.targetEventId) ?? conn.targetEventId.slice(0, 8);
          const colorClass = typeColors[conn.type] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';

          return (
            <div
              key={conn.id}
              data-entity-id={conn.id}
              className="connection-card rounded-md border border-border hover:bg-accent/50 transition-colors cursor-default overflow-hidden"
            >
              {/* Card header */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate max-w-[120px]" title={eventMap.get(conn.sourceEventId) ?? conn.sourceEventId}>
                    {sourceTitle}
                  </span>
                  <RightIcon size={12} className="shrink-0 text-muted-foreground" />
                  <TTag size="small" variant="light" className={colorClass}>
                    {conn.type}
                  </TTag>
                  <RightIcon size={12} className="shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate max-w-[120px]" title={eventMap.get(conn.targetEventId) ?? conn.targetEventId}>
                    {targetTitle}
                  </span>

                  {/* Action buttons */}
                  <div className="ml-auto flex items-center gap-0.5 shrink-0">
                    <TButton
                      variant="text"
                      shape="square"
                      size="small"
                      onClick={() => (isExpanded ? cancelEdit() : startEdit(conn))}
                      title={isExpanded ? '收起' : '编辑'}
                      icon={isExpanded ? <XIcon size={14} /> : <PencilIcon size={14} />}
                    />
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-0.5">
                        <TButton
                          variant="text"
                          shape="square"
                          size="small"
                          theme="success"
                          onClick={() => handleDelete(conn.id)}
                          title="确认删除"
                          icon={<CheckIcon size={14} />}
                        />
                        <TButton
                          variant="text"
                          shape="square"
                          size="small"
                          onClick={() => setConfirmDeleteId(null)}
                          title="取消"
                          icon={<XIcon size={14} />}
                        />
                      </div>
                    ) : (
                      <TButton
                        variant="text"
                        shape="square"
                        size="small"
                        theme="danger"
                        onClick={() => setConfirmDeleteId(conn.id)}
                        title="删除"
                        icon={<DeleteIcon size={14} />}
                      />
                    )}
                  </div>
                </div>

                {/* Description preview (when not expanded) */}
                {conn.description && !isExpanded && (
                  <div className="text-xs text-muted-foreground mt-1 font-sans leading-relaxed line-clamp-2">
                    {conn.description}
                  </div>
                )}
              </div>

              {/* Expanded edit area */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
                  {/* Edit type */}
                  <div>
                    <label className="text-xs text-muted-foreground font-sans mb-0.5 block">关联类型</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as ConnectionType)}
                      className="w-full text-xs rounded-md border border-border bg-background px-2 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {CONNECTION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Edit description */}
                  <div>
                    <label className="text-xs text-muted-foreground font-sans mb-0.5 block">描述</label>
                    <TInput
                      value={editDescription}
                      onChange={(val) => setEditDescription((val ?? '').toString())}
                      placeholder="输入关联描述..."
                      size="small"
                    />
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex items-center gap-2 pt-1">
                    <TButton
                      theme="primary"
                      size="small"
                      onClick={() => handleUpdate(conn)}
                      disabled={updateMutation.isPending}
                      icon={<CheckIcon size={14} />}
                    >
                      {updateMutation.isPending ? '保存中...' : '保存'}
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
          );
        })}

        {(!connections || connections.length === 0) && (
          <div className="text-center text-sm text-muted-foreground py-4 font-sans">暂无关联</div>
        )}
      </div>
    </div>
  );
}
