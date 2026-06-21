import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  PlusIcon,
  DeleteIcon,
  EditIcon,
  FilmIcon,
  CheckIcon,
} from '@/lib/icons';
import { X } from 'lucide-react';
import { TButton, TInput, DialogPlugin } from '@/components/ui-tdesign';
import {
  useCreateScene,
  useUpdateScene,
  useDeleteScene,
  useReorderScenes,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { toast } from 'sonner';
import type { Scene } from '../../../shared/types';

interface SceneListProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string | null) => void;
  isLoading: boolean;
}

export function SceneList({ scenes, selectedSceneId, onSelectScene, isLoading }: SceneListProps) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const createScene = useCreateScene();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();
  const reorderScenes = useReorderScenes();

  const [creating, setCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [orderedScenes, setOrderedScenes] = useState<Scene[]>([]);

  // 当 scenes 变化时更新本地排序状态
  const sortedScenes = scenes.length > 0
    ? [...scenes].sort((a, b) => (a.sceneOrder ?? 0) - (b.sceneOrder ?? 0))
    : [];

  const displayScenes = orderedScenes.length > 0 && scenes.length === orderedScenes.length
    ? orderedScenes
    : sortedScenes;

  const handleCreate = () => {
    if (!newSceneName.trim()) {
      toast.error('请输入场景名称');
      return;
    }
    if (!workspaceId) return;
    createScene.mutate(
      {
        workspaceId,
        data: {
          name: newSceneName.trim(),
          sceneOrder: scenes.length,
        },
      },
      {
        onSuccess: (data) => {
          toast.success('场景已创建');
          setNewSceneName('');
          setCreating(false);
          onSelectScene(data.id);
        },
        onError: (err) => toast.error(`创建失败: ${err.message}`),
      }
    );
  };

  const handleDelete = (scene: Scene) => {
    const confirmDialog = DialogPlugin.confirm({
      header: '删除场景',
      body: `确定删除场景「${scene.name}」吗？此操作不可恢复。`,
      onConfirm: () => {
        deleteScene.mutate(scene.id, {
          onSuccess: () => {
            toast.success('场景已删除');
            if (selectedSceneId === scene.id) {
              onSelectScene(null);
            }
          },
          onError: (err) => toast.error(`删除失败: ${err.message}`),
        });
        confirmDialog.hide();
      },
      onClose: () => confirmDialog.hide(),
    });
  };

  const handleStartEdit = (scene: Scene) => {
    setEditingId(scene.id);
    setEditName(scene.name);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast.error('场景名称不能为空');
      return;
    }
    updateScene.mutate(
      { id: editingId!, data: { name: editName.trim() } },
      {
        onSuccess: () => {
          toast.success('场景已更新');
          setEditingId(null);
        },
        onError: (err) => toast.error(`更新失败: ${err.message}`),
      }
    );
  };

  // @ts-ignore
  const _handleReorder = (newOrder: Scene[]) => {
    setOrderedScenes(newOrder);
    if (!workspaceId) return;
    const items = newOrder.map((scene, index) => ({
      id: scene.id,
      sceneOrder: index,
    }));
    reorderScenes.mutate(
      { workspaceId, items },
      {
        onSuccess: () => {
          setOrderedScenes([]);
        },
        onError: (err) => {
          toast.error(`排序失败: ${err.message}`);
          setOrderedScenes([]);
        },
      }
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* 标题栏 */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3">
        <div className="flex items-center gap-2">
          <FilmIcon size={16} className="text-primary" />
          <span className="text-sm font-semibold">场景</span>
          <span className="text-xs text-muted-foreground">({scenes.length})</span>
        </div>
        <TButton
          theme="success"
          variant="outline"
          size="small"
          className="h-7 px-2"
          onClick={() => { setCreating(true); setNewSceneName(''); }}
          disabled={!workspaceId}
        >
          <PlusIcon size={14} />
          新建
        </TButton>
      </div>

      {/* 场景列表 */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
        )}

        {!isLoading && scenes.length === 0 && !creating && (
          <div className="p-4 text-center">
            <FilmIcon size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无场景</p>
            <p className="text-xs text-muted-foreground/60 mt-1">点击「新建」创建第一个场景</p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <AnimatePresence>
            {displayScenes.map((scene, index) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all cursor-pointer',
                  selectedSceneId === scene.id
                    ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                    : 'hover:bg-accent/40 border border-transparent'
                )}
                onClick={() => onSelectScene(scene.id)}
              >
                {editingId === scene.id ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <TInput
                      size="small"
                      value={editName}
                      onChange={(v) => setEditName(v as string)}
                      className="h-7 flex-1 text-xs"
                      autofocus
                      onKeydown={(_value: string, context: { e: React.KeyboardEvent<HTMLDivElement> }) => {
                        if (context.e.key === 'Enter') handleSaveEdit();
                        if (context.e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <TButton
                      theme="success"
                      variant="text"
                      size="small"
                      className="h-6 w-6 p-0"
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                    >
                      <CheckIcon size={14} />
                    </TButton>
                    <TButton
                      theme="danger"
                      variant="text"
                      size="small"
                      className="h-6 w-6 p-0"
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                    >
                      <X size={14} />
                    </TButton>
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground/60 w-5 text-right tabular-nums">
                      {index + 1}
                    </span>
                    <span className={cn('flex-1 truncate', selectedSceneId === scene.id && 'text-primary')}>
                      {scene.name}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TButton
                        variant="text"
                        size="small"
                        className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(scene); }}
                      >
                        <EditIcon size={13} />
                      </TButton>
                      <TButton
                        variant="text"
                        size="small"
                        className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(scene); }}
                      >
                        <DeleteIcon size={13} />
                      </TButton>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 新建场景输入 */}
          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2"
              >
                <TInput
                  size="small"
                  value={newSceneName}
                  onChange={(v) => setNewSceneName(v as string)}
                  placeholder="场景名称..."
                  className="h-7 flex-1 text-xs"
                  autofocus
                  onKeydown={(_value: string, context: { e: React.KeyboardEvent<HTMLDivElement> }) => {
                    if (context.e.key === 'Enter') handleCreate();
                    if (context.e.key === 'Escape') { setCreating(false); setNewSceneName(''); }
                  }}
                />
                <TButton
                  theme="success"
                  variant="text"
                  size="small"
                  className="h-6 w-6 p-0"
                  onClick={handleCreate}
                  disabled={!newSceneName.trim()}
                >
                  <CheckIcon size={14} />
                </TButton>
                <TButton
                  theme="danger"
                  variant="text"
                  size="small"
                  className="h-6 w-6 p-0"
                  onClick={() => { setCreating(false); setNewSceneName(''); }}
                >
                  <X size={14} />
                </TButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
