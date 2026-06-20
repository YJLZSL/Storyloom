import { useState, useEffect } from 'react';
import { Dialog, TInput, TButton, MessagePlugin } from '@/components/ui-tdesign';
import { useCreateTrack } from '@/services/api-hooks';
import { useTrackStore } from '@/stores/useTrackStore';
import { TRACK_COLORS } from '@/lib/colors';

interface CreateTrackDialogProps {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
}

export function CreateTrackDialog({ open, workspaceId, onClose }: CreateTrackDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TRACK_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTrack = useCreateTrack();
  const setSelectedTrack = useTrackStore((s) => s.setSelectedTrack);

  useEffect(() => {
    if (open) {
      setName('');
      setColor(TRACK_COLORS[0]);
      setIsSubmitting(false);
    }
  }, [open]);

  const resetForm = () => {
    setName('');
    setColor(TRACK_COLORS[0]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || createTrack.isPending || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createTrack.mutateAsync(
        {
          workspaceId,
          data: { name: name.trim(), color },
        },
        {
          onSuccess: (track) => {
            setSelectedTrack(track.id);
            MessagePlugin.success('轨道已创建');
            resetForm();
            onClose();
          },
          onError: () => {
            MessagePlugin.error('创建轨道失败');
          },
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      header="新建轨道"
      footer={
        <div className="flex gap-2 justify-end">
          <TButton
            variant="outline"
            onClick={onClose}
          >
            取消
          </TButton>
          <TButton
            theme="primary"
            onClick={handleSubmit}
            disabled={!name.trim() || createTrack.isPending || isSubmitting}
            loading={createTrack.isPending || isSubmitting}
          >
            创建
          </TButton>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="block text-sm font-medium mb-1.5">轨道名称 *</label>
          <TInput
            value={name}
            onChange={(val) => setName((val ?? '').toString())}
            onEnter={handleSubmit}
            placeholder="例如：主线、支线A"
            autofocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">颜色</label>
          <div className="flex items-center gap-2 flex-wrap">
            {TRACK_COLORS.map((c) => (
              <TButton
                key={c}
                type="button"
                shape="circle"
                variant="text"
                size="small"
                className={`w-8 h-8 !p-0 border-2 transition-colors ${
                  color === c ? 'border-foreground' : 'border-transparent hover:opacity-80'
                }`}
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 3px ${c}44, 0 2px 8px ${c}55` : 'none',
                }}
                onClick={() => setColor(c)}
                aria-label={`选择颜色 ${c}`}
              />
            ))}
            <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <span>自定义</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-input bg-background"
              />
            </label>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
