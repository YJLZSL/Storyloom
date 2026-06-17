import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, RotateCcw, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/useUIStore';
import {
  getAllShortcuts,
  subscribeShortcuts,
  rebindShortcut,
  resetShortcut,
  resetAllShortcuts,
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

export function ShortcutSettings() {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(getAllShortcuts());
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeShortcuts(() => setShortcuts(getAllShortcuts()));
  }, []);

  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!listeningId) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setListeningId(null);
        setConflictMsg(null);
        return;
      }

      // 忽略纯修饰键按下
      if (['Control', 'Meta', 'Shift', 'Alt', 'Command'].includes(e.key)) return;

      const keys: string[] = [];
      if (e.metaKey || e.ctrlKey) keys.push('Mod');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');

      const key = e.key;
      keys.push(key.length === 1 ? key.toUpperCase() : key);

      const conflicts = findConflicts(keys, listeningId);
      if (conflicts.length > 0) {
        setConflictMsg(`与「${conflicts[0].description}」冲突`);
        return;
      }

      rebindShortcut(listeningId, keys);
      setListeningId(null);
      setConflictMsg(null);
    },
    [listeningId],
  );

  useEffect(() => {
    if (!listeningId) return;
    window.addEventListener('keydown', handleKeyCapture, true);
    return () => window.removeEventListener('keydown', handleKeyCapture, true);
  }, [listeningId, handleKeyCapture]);

  const grouped = useMemo(() => {
    const map = new Map<ShortcutCategory, ShortcutBinding[]>();
    for (const s of shortcuts) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [shortcuts]);

  const handleResetAll = () => {
    resetAllShortcuts();
    setConflictMsg(null);
    setListeningId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            快捷键设置
          </DialogTitle>
          <DialogDescription>
            点击快捷键重新绑定，按 Esc 取消。{getModKeyName()} 键根据平台自动映射。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 pr-1">
          {CATEGORY_ORDER.map((category) => {
            const items = grouped.get(category);
            if (!items || items.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {getCategoryLabel(category)}
                </div>
                {items.map((s) => {
                  const isListening = listeningId === s.id;
                  const isModified =
                    JSON.stringify(s.keys) !== JSON.stringify(s.defaultKeys);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-md border border-border transition-colors ${
                        isListening ? 'ring-2 ring-primary' : ''
                      } ${s.enabled ? '' : 'opacity-40'}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{s.description}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {WHEN_LABELS[s.when]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isListening ? (
                          <span className="text-xs text-primary animate-pulse">
                            按下新组合...
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setListeningId(s.id);
                              setConflictMsg(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-accent transition-colors"
                          >
                            {s.keys.map((k, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border"
                              >
                                {formatKey(k)}
                              </span>
                            ))}
                            {isModified && (
                              <Check className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            resetShortcut(s.id);
                            setConflictMsg(null);
                          }}
                          className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                          title="重置为默认"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {conflictMsg && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {conflictMsg}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="w-4 h-4" />
            全部重置
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
