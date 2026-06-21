import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useScenes, useBeats } from '@/services/api-hooks';
import { SceneList } from './SceneList';
import { SceneEditor } from './SceneEditor';
import { BeatList } from './BeatList';
import { ChoiceList } from './ChoiceList';
import type { Beat } from '../../../shared/types';

export function ScriptEditorView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: scenes, isLoading } = useScenes(workspaceId);

  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [creatingBeat, setCreatingBeat] = useState(false);
  const [editingChoice, setEditingChoice] = useState<string | null>(null);

  const selectedScene = scenes?.find((s) => s.id === selectedSceneId) ?? null;
  const { data: beats } = useBeats(selectedSceneId);
  const selectedBeat = beats?.find((b) => b.id === selectedBeatId) ?? null;
  const isChoiceBeat = selectedBeat?.kind === 'choice';

  const handleSelectScene = useCallback((sceneId: string | null) => {
    setSelectedSceneId(sceneId);
    setSelectedBeatId(null);
    setEditingBeat(null);
    setCreatingBeat(false);
    setEditingChoice(null);
  }, []);

  const handleSelectBeat = useCallback((beatId: string | null) => {
    setSelectedBeatId(beatId);
    setEditingBeat(null);
    setCreatingBeat(false);
    setEditingChoice(null);
  }, []);

  const handleEditBeat = useCallback((beat: Beat | null) => {
    setEditingBeat(beat);
    setCreatingBeat(false);
    setEditingChoice(null);
  }, []);

  const handleCreateBeat = useCallback(() => {
    setCreatingBeat(true);
    setEditingBeat(null);
    setEditingChoice(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingBeat(null);
    setCreatingBeat(false);
    setEditingChoice(null);
  }, []);

  const handleEditChoice = useCallback((choiceId: string | null) => {
    setEditingChoice(choiceId);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* 左栏：场景列表 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-64 shrink-0 flex-col border-r border-border/40 bg-background/50"
      >
        <SceneList
          scenes={scenes ?? []}
          selectedSceneId={selectedSceneId}
          onSelectScene={handleSelectScene}
          isLoading={isLoading}
        />
      </motion.div>

      {/* 中栏：场景编辑器 + 节拍列表 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="flex min-w-0 flex-1 flex-col border-r border-border/40"
      >
        {selectedScene ? (
          <>
            <SceneEditor
              scene={selectedScene}
              onUpdate={() => {}}
            />
            <div className="flex-1 overflow-hidden">
              <BeatList
                sceneId={selectedScene.id}
                selectedBeatId={selectedBeatId}
                onSelectBeat={handleSelectBeat}
                onEditBeat={handleEditBeat}
                onCreateBeat={handleCreateBeat}
                editingBeat={editingBeat}
                creatingBeat={creatingBeat}
                onCancelEdit={handleCancelEdit}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-muted-foreground/60">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                  <path d="M7 9h4M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">选择一个场景开始编辑</p>
              <p className="text-xs text-muted-foreground/60 mt-1">或创建新场景</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* 右栏：选择编辑（仅在 kind='choice' 时显示） */}
      <AnimatePresence>
        {selectedSceneId && selectedBeatId && isChoiceBeat && (
          <motion.div
            key="choice-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-72 shrink-0 flex-col bg-background/50"
          >
            <ChoiceList
              beatId={selectedBeatId}
              sceneId={selectedSceneId}
              editingChoice={editingChoice}
              onEditChoice={handleEditChoice}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
