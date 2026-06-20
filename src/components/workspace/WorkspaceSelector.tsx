import { useState } from 'react';
import { PlusIcon, FolderOpenIcon, DownloadIcon, UploadIcon } from '@/lib/icons';
import { motion } from 'framer-motion';
import { useWorkspaces, useDeleteWorkspace } from '@/services/api-hooks.js';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore.js';
import { TButton } from '@/components/ui-tdesign';
import { WorkspaceCard } from './WorkspaceCard.js';
import { ChapterRail } from './ChapterRail.js';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog.js';
import { ExportDialog } from './ExportDialog.js';
import { ImportDialog } from './ImportDialog.js';
import type { Workspace } from '../../../shared/types.js';

const containerVariant = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const headerVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function WorkspaceSelector() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const deleteWorkspace = useDeleteWorkspace();
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportWs, setExportWs] = useState<Workspace | null>(null);
  const [importWsId, setImportWsId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setCurrentWorkspace(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个工作区吗？所有数据将被永久删除。')) {
      deleteWorkspace.mutate(id);
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <motion.div
          variants={headerVariant}
          initial="hidden"
          animate="show"
          className="mb-10"
        >
          <h1 className="mb-2 font-serif text-3xl font-bold">Storyloom · 絮织</h1>
          <p className="text-muted-foreground">
            选择一个工作区开始创作，或创建一个新的时间轴
          </p>
        </motion.div>

        {workspaces && workspaces.length > 0 && (
          <ChapterRail workspaces={workspaces} onSelect={handleSelect} />
        )}

        <motion.div
          variants={headerVariant}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          className="mb-6 flex items-center justify-between"
        >
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
            <FolderOpenIcon size={20} />
            我的工作区
          </h2>
          <TButton onClick={() => setCreateOpen(true)} data-onboarding="create-workspace">
            <PlusIcon size={16} />
            新建工作区
          </TButton>
        </motion.div>

        {isLoading ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <motion.div
            variants={containerVariant}
            initial="hidden"
            animate="show"
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {workspaces.map((ws) => (
              <motion.div key={ws.id} variants={itemVariant} className="flex flex-col gap-2">
                <WorkspaceCard
                  workspace={ws}
                  onSelect={() => handleSelect(ws.id)}
                  onDelete={() => handleDelete(ws.id)}
                />
                <div className="flex gap-2">
                  <TButton
                    variant="outline"
                    size="small"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => setExportWs(ws)}
                  >
                    <DownloadIcon size={14} />
                    导出
                  </TButton>
                  <TButton
                    variant="outline"
                    size="small"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => setImportWsId(ws.id)}
                  >
                    <UploadIcon size={14} />
                    导入
                  </TButton>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="py-20 text-center"
          >
            <FolderOpenIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">还没有工作区</p>
            <TButton onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} />
              创建第一个工作区
            </TButton>
          </motion.div>
        )}
      </div>

      <CreateWorkspaceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleSelect}
      />

      <ExportDialog
        open={exportWs !== null}
        onClose={() => setExportWs(null)}
        workspaceId={exportWs?.id ?? null}
        workspaceName={exportWs?.name}
      />

      <ImportDialog
        open={importWsId !== null}
        onClose={() => setImportWsId(null)}
        workspaceId={importWsId}
      />
    </div>
  );
}
