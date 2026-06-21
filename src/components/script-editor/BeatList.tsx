import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  PlusIcon,
  DeleteIcon,
  EditIcon,
  MessageIcon,
  LinkIcon,
  AllApplicationIcon,
  PlayIcon,
  FilmIcon,
  CheckIcon,
} from '@/lib/icons';

const BranchIcon = LinkIcon;
const JumpIcon = AllApplicationIcon;
const SoundIcon = FilmIcon;
import { TButton, TInput, TSelect, TOption } from '@/components/ui-tdesign';
import {
  useBeats,
  useCreateBeat,
  useUpdateBeat,
  useDeleteBeat,
  useReorderBeats,
} from '@/services/api-hooks';
import { toast } from 'sonner';
import type { Beat, BeatKind } from '../../../shared/types';

interface BeatListProps {
  sceneId: string;
  selectedBeatId: string | null;
  onSelectBeat: (beatId: string | null) => void;
  onEditBeat: (beat: Beat | null) => void;
  onCreateBeat: () => void;
  editingBeat: Beat | null;
  creatingBeat: boolean;
  onCancelEdit: () => void;
}

const BEAT_KIND_OPTIONS: { value: BeatKind; label: string }[] = [
  { value: 'line', label: '对话' },
  { value: 'choice', label: '选项' },
  { value: 'jump', label: '跳转' },
  { value: 'sfx', label: '音效' },
  { value: 'anim', label: '动画' },
];

const BEAT_KIND_ICONS: Record<BeatKind, typeof MessageIcon> = {
  line: MessageIcon,
  choice: BranchIcon,
  jump: JumpIcon,
  sfx: SoundIcon,
  anim: PlayIcon,
};

const BEAT_KIND_COLORS: Record<BeatKind, string> = {
  line: 'bg-blue-50/70 text-blue-600 dark:bg-blue-900/15 dark:text-blue-300',
  choice: 'bg-amber-50/70 text-amber-600 dark:bg-amber-900/15 dark:text-amber-300',
  jump: 'bg-purple-50/70 text-purple-600 dark:bg-purple-900/15 dark:text-purple-300',
  sfx: 'bg-green-50/70 text-green-600 dark:bg-green-900/15 dark:text-green-300',
  anim: 'bg-rose-50/70 text-rose-600 dark:bg-rose-900/15 dark:text-rose-300',
};

export function BeatList({
  sceneId,
  selectedBeatId,
  onSelectBeat,
  onEditBeat,
  onCreateBeat,
  editingBeat,
  creatingBeat,
  onCancelEdit,
}: BeatListProps) {
  const { data: beats, isLoading } = useBeats(sceneId);
  const createBeat = useCreateBeat();
  const updateBeat = useUpdateBeat();
  const deleteBeat = useDeleteBeat();
  const reorderBeats = useReorderBeats();

  const [newBeatKind, setNewBeatKind] = useState<BeatKind>('line');
  const [newBeatText, setNewBeatText] = useState('');
  const [editText, setEditText] = useState('');
  const [editKind, setEditKind] = useState<BeatKind>('line');
  const [editCharacterId, setEditCharacterId] = useState('');
  const [editMetadata, setEditMetadata] = useState('');

  const sortedBeats = beats
    ? [...beats].sort((a, b) => (a.beatOrder ?? 0) - (b.beatOrder ?? 0))
    : [];

  useEffect(() => {
    if (editingBeat) {
      setEditText(editingBeat.text ?? '');
      setEditKind(editingBeat.kind);
      setEditCharacterId(editingBeat.characterId ?? '');
      setEditMetadata(editingBeat.metadataJson ?? '');
    }
  }, [editingBeat]);

  const handleCreate = () => {
    if (!newBeatText.trim() && newBeatKind === 'line') {
      toast.error('请输入对话文本');
      return;
    }
    createBeat.mutate(
      {
        sceneId,
        data: {
          kind: newBeatKind,
          text: newBeatText.trim() || undefined,
          beatOrder: sortedBeats.length,
        },
      },
      {
        onSuccess: () => {
          toast.success('节拍已创建');
          setNewBeatText('');
          setNewBeatKind('line');
          onCancelEdit();
        },
        onError: (err) => toast.error(`创建失败: ${err.message}`),
      }
    );
  };

  const handleSaveEdit = () => {
    if (!editingBeat) return;
    updateBeat.mutate(
      {
        id: editingBeat.id,
        data: {
          kind: editKind,
          text: editText.trim() || undefined,
          characterId: editCharacterId.trim() || undefined,
          metadataJson: editMetadata.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('节拍已更新');
          onCancelEdit();
        },
        onError: (err) => toast.error(`更新失败: ${err.message}`),
      }
    );
  };

  const handleDelete = (beat: Beat) => {
    if (!confirm(`确定删除此${BEAT_KIND_OPTIONS.find((o) => o.value === beat.kind)?.label ?? '节拍'}吗？`)) return;
    deleteBeat.mutate(beat.id, {
      onSuccess: () => {
        toast.success('节拍已删除');
        if (selectedBeatId === beat.id) onSelectBeat(null);
      },
      onError: (err) => toast.error(`删除失败: ${err.message}`),
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0 || !sortedBeats.length) return;
    const newOrder = [...sortedBeats];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    const items = newOrder.map((b, i) => ({ id: b.id, beatOrder: i }));
    reorderBeats.mutate({ sceneId, items });
  };

  const handleMoveDown = (index: number) => {
    if (index >= sortedBeats.length - 1 || !sortedBeats.length) return;
    const newOrder = [...sortedBeats];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    const items = newOrder.map((b, i) => ({ id: b.id, beatOrder: i }));
    reorderBeats.mutate({ sceneId, items });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 标题栏 */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">节拍</span>
          <span className="text-xs text-muted-foreground">({sortedBeats.length})</span>
        </div>
        <TButton
          theme="success"
          variant="outline"
          size="small"
          className="h-7 px-2"
          onClick={onCreateBeat}
          disabled={creatingBeat || !!editingBeat}
        >
          <PlusIcon size={14} />
          新建
        </TButton>
      </div>

      {/* 节拍列表 */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
        )}

        {!isLoading && sortedBeats.length === 0 && !creatingBeat && (
          <div className="p-6 text-center">
            <MessageIcon size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无节拍</p>
            <p className="text-xs text-muted-foreground/60 mt-1">点击「新建」添加第一个节拍</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {sortedBeats.map((beat, index) => (
              <motion.div
                key={beat.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={cn(
                  'group rounded-xl border transition-all',
                  selectedBeatId === beat.id
                    ? 'border-primary/30 bg-primary/5 shadow-sm'
                    : 'border-border/40 bg-background/60 hover:border-primary/20 hover:bg-accent/20'
                )}
              >
                {editingBeat?.id === beat.id ? (
                  <div className="p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <TSelect
                        size="small"
                        value={editKind}
                        onChange={(v) => setEditKind(v as BeatKind)}
                        className="h-7 text-xs"
                      >
                        {BEAT_KIND_OPTIONS.map((opt) => (
                          <TOption key={opt.value} value={opt.value} label={opt.label} />
                        ))}
                      </TSelect>
                      <TInput
                        size="small"
                        value={editCharacterId}
                        onChange={(v) => setEditCharacterId(v as string)}
                        placeholder="角色 ID"
                        className="h-7 flex-1 text-xs font-mono"
                      />
                    </div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="输入文本内容..."
                      className="mb-2 w-full rounded-md border border-border/50 bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/40 transition-colors resize-none"
                      rows={3}
                    />
                    <textarea
                      value={editMetadata}
                      onChange={(e) => setEditMetadata(e.target.value)}
                      placeholder="元数据 JSON (可选)"
                      className="mb-2 w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-xs font-mono outline-none focus:border-primary/40 transition-colors resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end gap-1">
                      <TButton theme="default" variant="outline" size="small" className="h-7" onClick={onCancelEdit}>
                        <X size={13} />
                        取消
                      </TButton>
                      <TButton theme="primary" size="small" className="h-7" onClick={handleSaveEdit}>
                        <CheckIcon size={13} />
                        保存
                      </TButton>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-start gap-2.5 p-3 cursor-pointer"
                    onClick={() => onSelectBeat(beat.id)}
                  >
                    {/* 序号 */}
                    <span className="mt-0.5 text-[10px] text-muted-foreground/50 tabular-nums w-4 text-right">
                      {index + 1}
                    </span>

                    {/* 类型图标 */}
                    <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md', BEAT_KIND_COLORS[beat.kind])}>
                      {(() => {
                        const Icon = BEAT_KIND_ICONS[beat.kind] || MessageIcon;
                        return <Icon size={12} />;
                      })()}
                    </div>

                    {/* 内容 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', BEAT_KIND_COLORS[beat.kind])}>
                          {BEAT_KIND_OPTIONS.find((o) => o.value === beat.kind)?.label ?? beat.kind}
                        </span>
                        {beat.characterId && (
                          <span className="text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded">
                            {beat.characterId}
                          </span>
                        )}
                      </div>
                      <p className={cn('text-sm leading-relaxed', !beat.text && 'text-muted-foreground/40 italic')}>
                        {beat.text || '(无文本)'}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <TButton
                        variant="text"
                        size="small"
                        className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                        disabled={index === 0}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                      </TButton>
                      <TButton
                        variant="text"
                        size="small"
                        className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                        disabled={index === sortedBeats.length - 1}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </TButton>
                      <TButton
                        variant="text"
                        size="small"
                        className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); onEditBeat(beat); }}
                      >
                        <EditIcon size={13} />
                      </TButton>
                      <TButton
                        variant="text"
                        size="small"
                        className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(beat); }}
                      >
                        <DeleteIcon size={13} />
                      </TButton>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 新建节拍 */}
          <AnimatePresence>
            {creatingBeat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <TSelect
                    size="small"
                    value={newBeatKind}
                    onChange={(v) => setNewBeatKind(v as BeatKind)}
                    className="h-7 text-xs"
                  >
                    {BEAT_KIND_OPTIONS.map((opt) => (
                      <TOption key={opt.value} value={opt.value} label={opt.label} />
                    ))}
                  </TSelect>
                </div>
                <textarea
                  value={newBeatText}
                  onChange={(e) => setNewBeatText(e.target.value)}
                  placeholder="输入文本内容..."
                  className="mb-2 w-full rounded-md border border-border/50 bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/40 transition-colors resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <TButton theme="default" variant="outline" size="small" className="h-7" onClick={onCancelEdit}>
                    <X size={13} />
                    取消
                  </TButton>
                  <TButton theme="primary" size="small" className="h-7" onClick={handleCreate}>
                    <CheckIcon size={13} />
                    创建
                  </TButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

