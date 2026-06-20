import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useExportWorkspace } from '@/services/api-hooks.js';
import { Dialog, TButton } from '@/components/ui-tdesign';
import {
  DownloadIcon,
  CheckIcon,
  FileCodeIcon,
} from '@/lib/icons';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  workspaceName?: string;
}

export function ExportDialog({ open, onClose, workspaceId, workspaceName }: ExportDialogProps) {
  const { refetch, isFetching, data, isError, error } = useExportWorkspace(workspaceId, { enabled: false });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    if (data && success) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (workspaceName || workspaceId || 'workspace').replace(/[^\w\u4e00-\u9fa5-]/g, '_');
      a.href = url;
      a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [data, success, workspaceId, workspaceName]);

  const handleExport = async () => {
    const result = await refetch();
    if (result.data) {
      setSuccess(true);
    }
  };

  const stats = data ? [
    { label: '事件', count: data.events?.length ?? 0 },
    { label: '轨道', count: data.tracks?.length ?? 0 },
    { label: '角色', count: data.characters?.length ?? 0 },
    { label: '关联', count: data.connections?.length ?? 0 },
    { label: '伏笔', count: data.foreshadowings?.length ?? 0 },
    { label: '世界观', count: data.worldSettings?.length ?? 0 },
  ] : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      width={480}
      header={
        <span className="font-serif text-xl font-semibold flex items-center gap-2">
          <FileCodeIcon className="w-5 h-5" />
          导出工作区
        </span>
      }
      footer={false}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.2, 1], rotate: [-180, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <CheckIcon className="w-7 h-7 text-primary" />
            </motion.div>
            <p className="text-lg font-medium text-foreground mb-2">导出成功</p>
            <p className="text-sm text-muted-foreground mb-4">文件已开始下载</p>
            {stats.length > 0 && (
              <div className="grid grid-cols-3 gap-2 w-full mb-4">
                {stats.map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-md bg-muted/50">
                    <div className="text-lg font-semibold text-foreground">{s.count}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <TButton
              theme="primary"
              onClick={onClose}
            >
              完成
            </TButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                将当前工作区的所有数据导出为 JSON 文件，包括：
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 事件、轨道、角色</li>
                <li>• 事件-角色关联、连接关系</li>
                <li>• 伏笔、世界观设定</li>
              </ul>
            </div>

            {isError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                导出失败：{error?.message || '未知错误'}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <TButton
                variant="outline"
                onClick={onClose}
              >
                取消
              </TButton>
              <TButton
                theme="primary"
                onClick={handleExport}
                disabled={isFetching || !workspaceId}
                loading={isFetching}
                icon={isFetching ? undefined : <DownloadIcon className="w-4 h-4" />}
              >
                {isFetching ? '导出中...' : '导出'}
              </TButton>
            </div>
          </div>
        )}
      </motion.div>
    </Dialog>
  );
}
