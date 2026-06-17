import { useState, useEffect } from 'react';
import { Plus, FileText, Compass, Layers, ScrollText, User, Film } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCreateWorkspace } from '@/services/api-hooks.js';
import { applyTemplate } from '@/lib/apply-template.js';
import { STORY_TEMPLATES } from '@/lib/story-templates.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Textarea } from '@/components/ui/textarea.js';
import { cn } from '@/lib/utils.js';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  Layers,
  Film,
  ScrollText,
  User,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const result = await createWorkspace.mutateAsync({ name, description });
      if (templateId !== 'blank') {
        setApplying(true);
        try {
          await applyTemplate(result.id, templateId);
          qc.invalidateQueries({ queryKey: ['tracks', result.id] });
          qc.invalidateQueries({ queryKey: ['events', result.id] });
          toast.success('工作区已创建，模板已应用');
        } catch (err) {
          const message = err instanceof Error ? err.message : '模板应用失败';
          toast.error(`模板应用失败: ${message}`);
        } finally {
          setApplying(false);
        }
      }
      onCreated(result.id);
      onClose();
    } catch {
      // error handled by mutation
    }
  };

  const options = [
    BLANK_TEMPLATE,
    ...STORY_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description, icon: t.icon })),
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建工作区</DialogTitle>
          <DialogDescription>选择一个模板并命名您的工作区</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>选择模板</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {options.map((t) => {
                const Icon = ICON_MAP[t.icon] ?? FileText;
                const active = templateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-name">名称</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入工作区名称"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-desc">描述（可选）</Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入工作区描述"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={!name.trim() || createWorkspace.isPending || applying}>
              <Plus className="size-4" />
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
