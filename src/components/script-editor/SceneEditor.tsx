import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Music } from 'lucide-react';
import { SaveIcon, SettingIcon } from '@/lib/icons';
import { TButton, TInput } from '@/components/ui-tdesign';
import { useUpdateScene } from '@/services/api-hooks';
import { toast } from 'sonner';
import type { Scene } from '../../../shared/types';

interface SceneEditorProps {
  scene: Scene;
  onUpdate: () => void;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const updateScene = useUpdateScene();
  const [name, setName] = useState(scene.name);
  const [backgroundAssetId, setBackgroundAssetId] = useState(scene.backgroundAssetId ?? '');
  const [bgm, setBgm] = useState(scene.bgm ?? '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setName(scene.name);
    setBackgroundAssetId(scene.backgroundAssetId ?? '');
    setBgm(scene.bgm ?? '');
    setHasChanges(false);
  }, [scene.id]);

  const handleSave = () => {
    updateScene.mutate(
      {
        id: scene.id,
        data: {
          name: name.trim(),
          backgroundAssetId: backgroundAssetId.trim() || undefined,
          bgm: bgm.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('场景属性已保存');
          setHasChanges(false);
          onUpdate();
        },
        onError: (err) => toast.error(`保存失败: ${err.message}`),
      }
    );
  };

  const handleChange = (field: 'name' | 'background' | 'bgm', value: string) => {
    if (field === 'name') setName(value);
    if (field === 'background') setBackgroundAssetId(value);
    if (field === 'bgm') setBgm(value);
    setHasChanges(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="border-b border-border/40 bg-background/60 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SettingIcon size={16} className="text-primary/70" />
          <span className="text-sm font-semibold">场景属性</span>
        </div>
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <TButton
                theme="primary"
                size="small"
                className="h-7 gap-1"
                onClick={handleSave}
                disabled={updateScene.isPending}
              >
                <SaveIcon size={14} />
                保存
              </TButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            场景名称
          </label>
          <TInput
            size="small"
            value={name}
            onChange={(v) => handleChange('name', v as string)}
            placeholder="输入场景名称..."
            className="h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Image size={13} className="text-muted-foreground/50" />
              背景图
            </label>
            <TInput
              size="small"
              value={backgroundAssetId}
              onChange={(v) => handleChange('background', v as string)}
              placeholder="Asset ID..."
              className="h-8 text-xs font-mono"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Music size={13} className="text-muted-foreground/50" />
              BGM
            </label>
            <TInput
              size="small"
              value={bgm}
              onChange={(v) => handleChange('bgm', v as string)}
              placeholder="音乐文件..."
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

