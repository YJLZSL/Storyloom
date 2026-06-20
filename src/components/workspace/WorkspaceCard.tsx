import { motion } from 'framer-motion';
import { HistoryIcon, DeleteIcon, FileTextIcon } from '@/lib/icons';
import { useEvents } from '@/services/api-hooks.js';
import { TButton, TTag } from '@/components/ui-tdesign';
import { safeWorkspaceName, safeDescription } from '@/lib/safe-text';
import type { Workspace } from '../../../shared/types.js';

interface WorkspaceCardProps {
  workspace: Workspace;
  onSelect: () => void;
  onDelete: () => void;
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

export function WorkspaceCard({ workspace, onSelect, onDelete }: WorkspaceCardProps) {
  const { data: eventsData } = useEvents(workspace.id);
  const eventCount = eventsData?.total ?? 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onSelect}
      className="group relative cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="line-clamp-1 font-serif text-lg font-semibold text-foreground">
          {safeWorkspaceName(workspace.name)}
        </h3>
        <TButton
          variant="text"
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
          aria-label="删除工作区"
        >
          <DeleteIcon size={16} />
        </TButton>
      </div>

      <p className="mb-4 min-h-[2.5rem] line-clamp-2 text-sm text-muted-foreground">
        {safeDescription(workspace.description)}
      </p>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
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
