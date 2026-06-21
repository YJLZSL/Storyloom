import { useState } from 'react';
import { motion } from 'framer-motion';
import { HistoryIcon, DeleteIcon, FileTextIcon, EditIcon } from '@/lib/icons';
import { useEvents } from '@/services/api-hooks.js';
import { TButton, TTag } from '@/components/ui-tdesign';
import { safeWorkspaceName, safeDescription } from '@/lib/safe-text';
import type { Workspace } from '../../../shared/types.js';

interface WorkspaceCardProps {
  workspace: Workspace;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
}

function formatRelativeTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years > 0) return `${years} 年前`;
  if (months > 0) return `${months} 个月前`;
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return '刚刚';
}

export function WorkspaceCard({ workspace, onSelect, onDelete, onRename }: WorkspaceCardProps) {
  const { data: eventsData } = useEvents(workspace.id);
  const eventCount = eventsData?.total ?? 0;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== workspace.name && onRename) {
      onRename(trimmed);
    }
    setIsEditing(false);
    setEditName(workspace.name);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(workspace.name);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onSelect}
      className="group relative cursor-pointer rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-[var(--shadow-card-hover)] overflow-hidden shimmer-effect"
    >
      {/* 左侧色条 */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300 group-hover:shadow-[2px_0_8px_-1px_rgb(var(--primary)_0.3)]"
        style={{ backgroundColor: 'rgb(var(--primary))' }}
      />

      <div className="mb-3 flex items-start justify-between gap-3 pl-2">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            autoFocus
            className="flex-1 min-w-0 rounded-md border border-primary/30 bg-background px-2 py-1 text-sm font-serif font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="line-clamp-1 font-serif text-lg font-semibold text-foreground flex-1 min-w-0">
            {safeWorkspaceName(workspace.name)}
          </h3>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {onRename && !isEditing && (
            <TButton
              variant="text"
              size="small"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditName(workspace.name); }}
              className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary focus:opacity-100 group-hover:opacity-100"
              aria-label="重命名工作区"
            >
              <EditIcon size={16} />
            </TButton>
          )}
          <TButton
            variant="text"
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
            aria-label="删除工作区"
          >
            <DeleteIcon size={16} />
          </TButton>
        </div>
      </div>

      <p className="mb-4 min-h-[2.5rem] line-clamp-2 text-sm text-muted-foreground pl-2">
        {safeDescription(workspace.description)}
      </p>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pl-2">
        <TTag variant="light" size="small" className="gap-1 font-normal">
          <FileTextIcon size={12} />
          {eventCount} 事件
        </TTag>
        <span className="flex items-center gap-1">
          <HistoryIcon size={12} />
          {formatRelativeTime(workspace.updatedAt)}
        </span>
      </div>
    </motion.div>
  );
}
