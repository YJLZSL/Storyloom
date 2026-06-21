import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  SaveIcon,
} from '@/lib/icons';
import { TButton, TInput, TSelect, TOption } from '@/components/ui-tdesign';
import { useUpdateBeat } from '@/services/api-hooks';
import { toast } from 'sonner';
import type { Beat, BeatKind } from '../../../shared/types';

interface BeatEditorProps {
  beat: Beat | null;
  onSave?: (beat: Beat) => void;
  onCancel?: () => void;
  className?: string;
}

const BEAT_KIND_OPTIONS: { value: BeatKind; label: string }[] = [
  { value: 'line', label: '对话' },
  { value: 'choice', label: '选项' },
  { value: 'jump', label: '跳转' },
  { value: 'sfx', label: '音效' },
  { value: 'anim', label: '动画' },
];

export function BeatEditor({ beat, onSave, onCancel, className }: BeatEditorProps) {
  const updateBeat = useUpdateBeat();
  const [kind, setKind] = useState<BeatKind>('line');
  const [text, setText] = useState('');
  const [characterId, setCharacterId] = useState('');
  const [portraitAssetId, setPortraitAssetId] = useState('');
  const [metadataJson, setMetadataJson] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (beat) {
      setKind(beat.kind);
      setText(beat.text ?? '');
      setCharacterId(beat.characterId ?? '');
      setPortraitAssetId(beat.portraitAssetId ?? '');
      setMetadataJson(beat.metadataJson ?? '');
      setHasChanges(false);
    } else {
      setKind('line');
      setText('');
      setCharacterId('');
      setPortraitAssetId('');
      setMetadataJson('');
      setHasChanges(false);
    }
  }, [beat?.id]);

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'kind': setKind(value as BeatKind); break;
      case 'text': setText(value); break;
      case 'characterId': setCharacterId(value); break;
      case 'portraitAssetId': setPortraitAssetId(value); break;
      case 'metadataJson': setMetadataJson(value); break;
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!beat) return;
    updateBeat.mutate(
      {
        id: beat.id,
        data: {
          kind,
          text: text.trim() || undefined,
          characterId: characterId.trim() || undefined,
          portraitAssetId: portraitAssetId.trim() || undefined,
          metadataJson: metadataJson.trim() || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast.success('节拍已更新');
          setHasChanges(false);
          onSave?.(data);
        },
        onError: (err) => toast.error(`保存失败: ${err.message}`),
      }
    );
  };

  if (!beat) {
    return (
      <div className={cn('flex h-full items-center justify-center p-6', className)}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-muted-foreground/60">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">选择一个节拍进行编辑</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={cn('flex flex-col gap-4 p-4', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">节拍编辑</span>
        <div className="flex items-center gap-1">
          {onCancel && (
            <TButton theme="default" variant="outline" size="small" className="h-7" onClick={onCancel}>
              <X size={13} />
              取消
            </TButton>
          )}
          <TButton
            theme="primary"
            size="small"
            className="h-7"
            onClick={handleSave}
            disabled={!hasChanges || updateBeat.isPending}
          >
            <SaveIcon size={13} />
            保存
          </TButton>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">类型</label>
          <TSelect
            size="small"
            value={kind}
            onChange={(v) => handleFieldChange('kind', v as string)}
            className="h-8 text-sm"
          >
            {BEAT_KIND_OPTIONS.map((opt) => (
              <TOption key={opt.value} value={opt.value} label={opt.label} />
            ))}
          </TSelect>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">角色 ID</label>
          <TInput
            size="small"
            value={characterId}
            onChange={(v) => handleFieldChange('characterId', v as string)}
            placeholder="输入角色 ID..."
            className="h-8 text-xs font-mono"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">立绘 Asset ID</label>
          <TInput
            size="small"
            value={portraitAssetId}
            onChange={(v) => handleFieldChange('portraitAssetId', v as string)}
            placeholder="输入立绘 Asset ID..."
            className="h-8 text-xs font-mono"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">文本内容</label>
          <textarea
            value={text}
            onChange={(e) => handleFieldChange('text', e.target.value)}
            placeholder="输入文本内容..."
            className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 transition-colors resize-none"
            rows={5}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">元数据 (JSON)</label>
          <textarea
            value={metadataJson}
            onChange={(e) => handleFieldChange('metadataJson', e.target.value)}
            placeholder='{"key": "value"}'
            className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary/40 transition-colors resize-none"
            rows={3}
          />
        </div>
      </div>
    </motion.div>
  );
}
