import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KeyboardIcon, UndoIcon, CheckIcon, PencilIcon } from '@/lib/icons';
import { Button as TButton, NotificationPlugin, DialogPlugin } from 'tdesign-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUIStore } from '@/stores/useUIStore';
import {
  getAllShortcuts,
  subscribeShortcuts,
  setShortcut,
  resetShortcut,
  clearCustomShortcuts,
  findConflicts,
  getCategoryLabel,
  type ShortcutBinding,
  type ShortcutCategory,
  type WhenContext,
} from '@/lib/shortcut-registry';
import { getModKeyName } from '@/lib/platform';

const CATEGORY_ORDER: ShortcutCategory[] = ['view', 'action', 'edit', 'system', 'theme'];

const WHEN_LABELS: Record<WhenContext, string> = {
  global: '全局',
  timelineFocus: '时间轴聚焦',
  editorFocus: '编辑器聚焦',
  modalOpen: '模态打开',
};

function formatKey(k: string): string {
  return k === 'Mod' ? getModKeyName() : k;
}

function isValidShortcut(keys: string[]): boolean {
  if (keys.length === 0) return false;
  const last = keys[keys.length - 1];
  if (!last) return false;
  return last !== 'Mod' && last !== 'Shift' && last !== 'Alt' && last !== 'Ctrl' && last !== 'Meta';
}

export function ShortcutsTab() {
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(getAllShortcuts());
  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);
  const pendingConflictRef = useRef<{ id: string; keys: string[] } | null>(null);

  useEffect(() => {
    return subscribeShortcuts(() => setShortcuts(getAllShortcuts()));
  }, []);

  const applyShortcut = useCallback((id: string, keys: string[]) => {
    setShortcut(id, keys);
    setRecordingCommandId(null);
  }, []);

  const promptConflictOverride = useCallback(
    (id: string, keys: string[], conflicts: ShortcutBinding[]) => {
      pendingConflictRef.current = { id, keys };
      const conflictName = conflicts[0]?.description ?? '其他命令';
      const keysLabel = keys.map(formatKey).join('+');
      NotificationPlugin.warning({
        title: '快捷键冲突',
        content: `${keysLabel} 已被「${conflictName}」占用，是否覆盖？`,
        duration: 0,
        closeBtn: true,
        footer: (
          <div className="flex gap-2 justify-end mt-2">
            <TButton
              size="small"
              variant="outline"
              onClick={() => {
                NotificationPlugin.closeAll();
                pendingConflictRef.current = null;
                setRecordingCommandId(null);
              }}
            >
              取消
            </TButton>
            <TButton
              size="small"
              theme="danger"
              onClick={() => {
                NotificationPlugin.closeAll();
                const pending = pendingConflictRef.current;
                pendingConflictRef.current = null;
                if (pending) {
                  for (const c of conflicts) {
                    setShortcut(c.id, []);
                  }
                  applyShortcut(pending.id, pending.keys);
                }
              }}
            >
              覆盖
            </TButton>
          </div>
        ),
      });
    },
    [applyShortcut]
  );

  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!recordingCommandId) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingCommandId(null);
        return;
      }

      if (['Control', 'Meta', 'Shift', 'Alt', 'Command'].includes(e.key)) return;

      const keys: string[] = [];
      if (e.metaKey || e.ctrlKey) keys.push('Mod');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');

      const key = e.key;
      keys.push(key.length === 1 ? key.toUpperCase() : key);

      if (!isValidShortcut(keys)) return;

      const conflicts = findConflicts(keys, recordingCommandId);
      if (conflicts.length > 0) {
        promptConflictOverride(recordingCommandId, keys, conflicts);
        return;
      }

      applyShortcut(recordingCommandId, keys);
    },
    [recordingCommandId, applyShortcut, promptConflictOverride]
  );

  useEffect(() => {
    if (!recordingCommandId) return;
    window.addEventListener('keydown', handleKeyCapture, true);
    return () => window.removeEventListener('keydown', handleKeyCapture, true);
  }, [recordingCommandId, handleKeyCapture]);

  const grouped = useMemo(() => {
    const map = new Map<ShortcutCategory, ShortcutBinding[]>();
    for (const s of shortcuts) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [shortcuts]);

  const handleResetAll = () => {
    const dialog = DialogPlugin.confirm({
      header: '重置所有快捷键',
      body: '确定将所有快捷键重置为默认值？此操作不可撤销。',
      confirmBtn: { content: '重置', theme: 'danger' },
      cancelBtn: '取消',
      onConfirm: () => {
        clearCustomShortcuts();
        setRecordingCommandId(null);
        dialog.destroy();
      },
      onClose: () => dialog.destroy(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          快捷键列表
        </div>
        <TButton size="small" theme="danger" variant="outline" onClick={handleResetAll}>
          <UndoIcon size={14} className="mr-1" />
          全部重置
        </TButton>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const items = grouped.get(category);
        if (!items || items.length === 0) return null;
        return (
          <div key={category} className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {getCategoryLabel(category)}
            </div>
            {items.map((s) => {
              const isRecording = recordingCommandId === s.id;
              const isModified = JSON.stringify(s.keys) !== JSON.stringify(s.defaultKeys);
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border border-border transition-colors ${
                    isRecording ? 'ring-2 ring-primary' : ''
                  } ${s.enabled ? '' : 'opacity-40'}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">{s.description}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {WHEN_LABELS[s.when]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRecording ? (
                      <span className="text-xs text-primary animate-pulse px-2">
                        请按下新快捷键...（Esc 取消）
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {s.keys.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground italic px-1.5 py-0.5">
                            未设置
                          </span>
                        ) : (
                          s.keys.map((k, i) => (
                            <kbd
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border"
                            >
                              {formatKey(k)}
                            </kbd>
                          ))
                        )}
                        {isModified && (
                          <CheckIcon size={14} className="text-muted-foreground ml-0.5" />
                        )}
                      </div>
                    )}
                    <TButton
                      size="small"
                      variant="outline"
                      disabled={isRecording}
                      onClick={() => setRecordingCommandId(s.id)}
                    >
                      <PencilIcon size={14} className="mr-1" />
                      修改
                    </TButton>
                    {isModified && (
                      <TButton size="small" variant="text" onClick={() => resetShortcut(s.id)}>
                        <UndoIcon size={14} className="mr-1" />
                        还原默认
                      </TButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ShortcutSettings() {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyboardIcon size={20} />
            设置
          </DialogTitle>
          <DialogDescription>
            调整快捷键。点击「修改」按钮重新绑定，按 Esc 取消。{getModKeyName()} 键根据平台自动映射。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 pr-1">
          <ShortcutsTab />
        </div>

        <DialogFooter>
          <TButton size="small" onClick={() => setOpen(false)}>
            完成
          </TButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
