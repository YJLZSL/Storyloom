import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessagePlugin } from 'tdesign-react';
import { useCreateWorkspace } from '@/services/api-hooks.js';
import { applyTemplate } from '@/lib/apply-template.js';
import { STORY_TEMPLATES } from '@/lib/story-templates.js';
import { Dialog } from '@/components/ui-tdesign';
import { TInput, TTextarea } from '@/components/ui-tdesign';
import {
  CompassIcon,
  LayersIcon,
  FilmIcon,
  FileTextIcon,
  UserIcon,
} from '@/lib/icons';
import { cn } from '@/lib/utils.js';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass: CompassIcon,
  Layers: LayersIcon,
  Film: FilmIcon,
  ScrollText: FileTextIcon,
  User: UserIcon,
};

const BLANK_TEMPLATE = {
  id: 'blank',
  name: '空白',
  description: '从零开始创建',
  icon: 'FileText' as const,
};

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CreateWorkspaceDialog({ open, onClose, onCreated }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('blank');
  const [applying, setApplying] = useState(false);
  const createWorkspace = useCreateWorkspace();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setTemplateId('blank');
      setApplying(false);
    }
  }, [open]);

  const getDefaultName = () => {
    return `新工作区 ${new Date().toLocaleDateString()}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (createWorkspace.isPending || applying) return;
    
    const finalName = name.trim() || getDefaultName();
    
    try {
      const result = await createWorkspace.mutateAsync({ name: finalName, description });
      if (templateId !== 'blank') {
        setApplying(true);
        try {
          await applyTemplate(result.id, templateId);
          qc.invalidateQueries({ queryKey: ['tracks', result.id] });
          qc.invalidateQueries({ queryKey: ['events', result.id] });
          MessagePlugin.success('工作区已创建，模板已应用');
        } catch (err) {
          const message = err instanceof Error ? err.message : '模板应用失败';
          MessagePlugin.error(`模板应用失败: ${message}`);
        } finally {
          setApplying(false);
        }
      }
      onCreated(result.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建工作区失败';
      MessagePlugin.error(`创建失败: ${message}`);
    } finally {
      setApplying(false);
    }
  };

  const options = [
    BLANK_TEMPLATE,
    ...STORY_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description, icon: t.icon })),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      header="新建工作区"
      width={640}
      confirmBtn={{
        content: '创建',
        disabled: createWorkspace.isPending || applying,
        loading: createWorkspace.isPending || applying,
      }}
      cancelBtn="取消"
      onConfirm={() => {
        void handleSubmit();
      }}
      onCancel={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }}
        className="space-y-5"
      >
        <p className="text-sm text-muted-foreground">选择一个模板并命名您的工作区</p>

        <div className="space-y-2">
          <label className="block text-sm font-medium">选择模板</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map((t) => {
              const Icon = ICON_MAP[t.icon] ?? FileTextIcon;
              const active = templateId === t.id;
              return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setTemplateId(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTemplateId(t.id);
                  }
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-accent',
                )}
              >
                <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{t.name}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{t.description}</span>
              </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">名称</label>
          <TInput
            value={name}
            onChange={(val) => setName((val ?? '').toString())}
            placeholder="输入工作区名称"
            autofocus
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">描述（可选）</label>
          <TTextarea
            value={description}
            onChange={(val) => setDescription((val ?? '').toString())}
            placeholder="输入工作区描述"
            rows={2}
          />
        </div>

        <button type="submit" hidden aria-hidden />
      </form>
    </Dialog>
  );
}
