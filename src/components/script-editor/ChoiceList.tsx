import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  PlusIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  ArrowRightIcon,
  LinkIcon,
} from '@/lib/icons';
import { TButton, TInput } from '@/components/ui-tdesign';
import {
  useChoices,
  useCreateChoice,
  useDeleteChoice,
  useScenes,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { toast } from 'sonner';
import type { Choice } from '../../../shared/types';
import { ChoiceEditor } from './ChoiceEditor';

const BranchIcon = LinkIcon;

interface ChoiceListProps {
  beatId: string;
  sceneId: string;
  editingChoice: string | null;
  onEditChoice: (choiceId: string | null) => void;
}

export function ChoiceList({ beatId, sceneId: _sceneId, editingChoice, onEditChoice }: ChoiceListProps) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: choices, isLoading } = useChoices(beatId);
  const { data: scenes } = useScenes(workspaceId);
  const createChoice = useCreateChoice();
  const deleteChoice = useDeleteChoice();

  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNextSceneId, setNewNextSceneId] = useState('');
  const [newCondition, setNewCondition] = useState('');

  const sortedChoices = choices
    ? [...choices].sort((a, b) => (a.choiceOrder ?? 0) - (b.choiceOrder ?? 0))
    : [];

  const sceneMap = new Map(scenes?.map((s) => [s.id, s.name]) ?? []);

  const handleCreate = () => {
    if (!newLabel.trim()) {
      toast.error('请输入选项标签');
      return;
    }
    createChoice.mutate(
      {
        beatId,
        data: {
          label: newLabel.trim(),
          nextSceneId: newNextSceneId.trim() || undefined,
          condition: newCondition.trim() || undefined,
          choiceOrder: sortedChoices.length,
        },
      },
      {
        onSuccess: () => {
          toast.success('选项已创建');
          setNewLabel('');
          setNewNextSceneId('');
          setNewCondition('');
          setCreating(false);
        },
        onError: (err) => toast.error(`创建失败: ${err.message}`),
      }
    );
  };

  const handleDelete = (choice: Choice) => {
    if (!confirm(`确定删除选项「${choice.label}」吗？`)) return;
    deleteChoice.mutate(choice.id, {
      onSuccess: () => {
        toast.success('选项已删除');
        if (editingChoice === choice.id) {
          onEditChoice(null);
        }
      },
      onError: (err) => toast.error(`删除失败: ${err.message}`),
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 标题栏 */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3">
        <div className="flex items-center gap-2">
          <BranchIcon size={16} className="text-amber-500" />
          <span className="text-sm font-semibold">选项</span>
          <span className="text-xs text-muted-foreground">({sortedChoices.length})</span>
        </div>
        <TButton
          theme="success"
          variant="outline"
          size="small"
          className="h-7 px-2"
          onClick={() => { setCreating(true); setNewLabel(''); setNewNextSceneId(''); setNewCondition(''); }}
          disabled={creating || !!editingChoice}
        >
          <PlusIcon size={14} />
          新建
        </TButton>
      </div>

      {/* 选项列表 */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
        )}

        {!isLoading && sortedChoices.length === 0 && !creating && (
          <div className="p-4 text-center">
            <BranchIcon size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无选项</p>
            <p className="text-xs text-muted-foreground/60 mt-1">点击「新建」添加选项</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {sortedChoices.map((choice, index) => (
              <motion.div
                key={choice.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={cn(
                  'rounded-xl border transition-all',
                  editingChoice === choice.id
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/40 bg-background/60 hover:border-primary/20 hover:bg-accent/20'
                )}
              >
                {editingChoice === choice.id ? (
                  <ChoiceEditor
                    choice={choice}
                    scenes={scenes ?? []}
                    onSave={() => onEditChoice(null)}
                    onCancel={() => onEditChoice(null)}
                  />
                ) : (
                  <div
                    className="group cursor-pointer p-3"
                    onClick={() => onEditChoice(choice.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-[10px] text-muted-foreground/50 tabular-nums w-4 text-right">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug">{choice.label}</div>
                        {choice.nextSceneId && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
                            <ArrowRightIcon size={11} />
                            <span className="truncate">{sceneMap.get(choice.nextSceneId) ?? choice.nextSceneId}</span>
                          </div>
                        )}
                        {choice.condition && (
                          <div className="mt-1 text-[10px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded font-mono">
                            条件: {choice.condition}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <TButton
                          variant="text"
                          size="small"
                          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); onEditChoice(choice.id); }}
                        >
                          <EditIcon size={13} />
                        </TButton>
                        <TButton
                          variant="text"
                          size="small"
                          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(choice); }}
                        >
                          <DeleteIcon size={13} />
                        </TButton>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 新建选项 */}
          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-3"
              >
                <div className="flex flex-col gap-2">
                  <TInput
                    size="small"
                    value={newLabel}
                    onChange={(v) => setNewLabel(v as string)}
                    placeholder="选项标签..."
                    className="h-8 text-sm"
                    autofocus
                  />
                  <TInput
                    size="small"
                    value={newNextSceneId}
                    onChange={(v) => setNewNextSceneId(v as string)}
                    placeholder="跳转场景 ID (可选)..."
                    className="h-8 text-xs font-mono"
                  />
                  <TInput
                    size="small"
                    value={newCondition}
                    onChange={(v) => setNewCondition(v as string)}
                    placeholder="条件表达式 (可选)..."
                    className="h-8 text-xs font-mono"
                  />
                  <div className="flex justify-end gap-1">
                    <TButton theme="default" variant="outline" size="small" className="h-7" onClick={() => setCreating(false)}>
                      <X size={13} />
                      取消
                    </TButton>
                    <TButton theme="primary" size="small" className="h-7" onClick={handleCreate} disabled={!newLabel.trim()}>
                      <CheckIcon size={13} />
                      创建
                    </TButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

