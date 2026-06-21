import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  SaveIcon,
  ArrowRightIcon,
} from '@/lib/icons';
import { TButton, TInput, TSelect, TOption } from '@/components/ui-tdesign';
import { useUpdateChoice } from '@/services/api-hooks';
import { toast } from 'sonner';
import type { Choice, Scene } from '../../../shared/types';

interface ChoiceEditorProps {
  choice: Choice | null;
  scenes: Scene[];
  onSave?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ChoiceEditor({ choice, scenes, onSave, onCancel, className }: ChoiceEditorProps) {
  const updateChoice = useUpdateChoice();
  const [label, setLabel] = useState('');
  const [nextSceneId, setNextSceneId] = useState('');
  const [condition, setCondition] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (choice) {
      setLabel(choice.label);
      setNextSceneId(choice.nextSceneId ?? '');
      setCondition(choice.condition ?? '');
      setHasChanges(false);
    } else {
      setLabel('');
      setNextSceneId('');
      setCondition('');
      setHasChanges(false);
    }
  }, [choice?.id]);

  const handleSave = () => {
    if (!choice) return;
    if (!label.trim()) {
      toast.error('选项标签不能为空');
      return;
    }
    updateChoice.mutate(
      {
        id: choice.id,
        data: {
          label: label.trim(),
          nextSceneId: nextSceneId.trim() || undefined,
          condition: condition.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('选项已更新');
          setHasChanges(false);
          onSave?.();
        },
        onError: (err) => toast.error(`保存失败: ${err.message}`),
      }
    );
  };

  const handleChange = (field: 'label' | 'nextSceneId' | 'condition', value: string) => {
    switch (field) {
      case 'label': setLabel(value); break;
      case 'nextSceneId': setNextSceneId(value); break;
      case 'condition': setCondition(value); break;
    }
    setHasChanges(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex flex-col gap-3 p-3', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">编辑选项</span>
        <div className="flex items-center gap-1">
          {onCancel && (
            <TButton theme="default" variant="text" size="small" className="h-6 w-6 p-0" onClick={onCancel}>
              <X size={13} />
            </TButton>
          )}
          <TButton
            theme="primary"
            size="small"
            className="h-6 px-2"
            onClick={handleSave}
            disabled={!hasChanges || updateChoice.isPending}
          >
            <SaveIcon size={12} />
            <span className="text-xs">保存</span>
          </TButton>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">标签</label>
          <TInput
            size="small"
            value={label}
            onChange={(v) => handleChange('label', v as string)}
            placeholder="选项显示文本..."
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <ArrowRightIcon size={10} />
            跳转场景
          </label>
          <TSelect
            size="small"
            value={nextSceneId}
            onChange={(v) => handleChange('nextSceneId', v as string)}
            className="h-8 text-xs"
          >
            <TOption value="" label="(不跳转)" />
            {scenes.map((scene) => (
              <TOption key={scene.id} value={scene.id} label={scene.name} />
            ))}
          </TSelect>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">条件</label>
          <TInput
            size="small"
            value={condition}
            onChange={(v) => handleChange('condition', v as string)}
            placeholder="例如: flags.hasKey === true"
            className="h-8 text-xs font-mono"
          />
          <p className="mt-1 text-[10px] text-muted-foreground/50">留空表示无条件显示</p>
        </div>
      </div>
    </motion.div>
  );
}
