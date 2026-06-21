import { useState } from 'react';
import { Dialog } from 'tdesign-react';
import { cn } from '@/lib/utils';
import { FolderOpenIcon, DeleteIcon, PlusIcon, EditIcon } from '@/lib/icons';
import { useTranslation } from 'react-i18next';
import type { Workspace } from '../../../shared/types';

interface WorkspaceManagerDialogProps {
  open: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onCreate: () => void;
  isDeleting: boolean;
}

export function WorkspaceManagerDialog({
  open,
  onClose,
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onDelete,
  onRename,
  onCreate,
  isDeleting,
}: WorkspaceManagerDialogProps) {
  const { t } = useTranslation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const submitRename = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed && onRename) {
      onRename(id, trimmed);
    }
    setEditingId(null);
    setEditName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditName('');
    }
  };

  return (
    <Dialog
      header={t('workspace.manageTitle') || '管理工作区'}
      visible={open}
      onClose={onClose}
      width={480}
      footer={null}
      destroyOnClose
    >
      <div className="flex flex-col gap-3 max-h-[400px] overflow-auto">
        {/* 工作区列表 */}
        <div className="flex flex-col gap-1.5">
          {workspaces.map((ws) => {
            const isCurrent = ws.id === currentWorkspaceId;
            const isConfirming = confirmDeleteId === ws.id;
            const isEditing = editingId === ws.id;
            return (
              <div
                key={ws.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all',
                  isCurrent
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/50 hover:border-primary/20 hover:bg-accent/30'
                )}
              >
                <FolderOpenIcon
                  size={18}
                  className={cn('shrink-0', isCurrent ? 'text-primary' : 'text-muted-foreground')}
                />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, ws.id)}
                      onBlur={() => submitRename(ws.id)}
                      autoFocus
                      className="w-full rounded-md border border-primary/30 bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <>
                      <div className="text-sm font-medium truncate">{ws.name}</div>
                      <div className="text-[10px] text-muted-foreground/60">
                        {isCurrent ? '当前工作区' : ws.description || '无描述'}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isCurrent && !isEditing && (
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      onClick={() => {
                        onSwitch(ws.id);
                        onClose();
                      }}
                    >
                      <FolderOpenIcon size={12} />
                      切换
                    </button>
                  )}
                  {onRename && !isEditing && (
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      onClick={() => startRename(ws.id, ws.name)}
                    >
                      <EditIcon size={12} />
                      重命名
                    </button>
                  )}
                  {workspaces.length > 1 && (
                    <button
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                        isConfirming
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      )}
                      onClick={() => handleDelete(ws.id)}
                      disabled={isDeleting}
                    >
                      <DeleteIcon size={12} />
                      {isConfirming ? '确认删除' : '删除'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 新建工作区 */}
        <button
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
          onClick={() => {
            onCreate();
            onClose();
          }}
        >
          <PlusIcon size={16} />
          <span className="text-sm">{t('workspace.createNewWorkspace')}</span>
        </button>
      </div>
    </Dialog>
  );
}
