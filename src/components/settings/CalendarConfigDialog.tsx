import { useState, useEffect } from 'react';
import { X, Save, Calendar, Globe, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkspace, useUpdateWorkspace } from '@/services/api-hooks.js';
import {
  CALENDAR_PRESETS,
  DEFAULT_CALENDAR,
  parseCalendarConfig,
  serializeCalendarConfig,
  formatCustomDate,
  type CalendarConfig,
} from '@/lib/custom-calendar.js';

interface CalendarConfigDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
}

export function CalendarConfigDialog({ open, onClose, workspaceId }: CalendarConfigDialogProps) {
  const { data: workspace } = useWorkspace(workspaceId);
  const updateWorkspace = useUpdateWorkspace();

  const [config, setConfig] = useState<CalendarConfig>(DEFAULT_CALENDAR);
  const [activePreset, setActivePreset] = useState<string>('earth');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 从工作区加载已有配置
  useEffect(() => {
    if (open && workspace?.calendarConfigJson) {
      const parsed = parseCalendarConfig(workspace.calendarConfigJson);
      if (parsed) {
        setConfig(parsed);
        // 检测匹配的预设
        const matchedPreset = Object.entries(CALENDAR_PRESETS).find(([, p]) =>
          p.config.yearLength === parsed.yearLength &&
          p.config.monthCount === parsed.monthCount &&
          p.config.dayLength === parsed.dayLength
        );
        setActivePreset(matchedPreset ? matchedPreset[0] : 'custom');
      }
    } else if (open) {
      setConfig(DEFAULT_CALENDAR);
      setActivePreset('earth');
    }
  }, [open, workspace]);

  useEffect(() => {
    if (!open) {
      setSaved(false);
    }
  }, [open]);

  const handlePresetSelect = (key: string) => {
    const preset = CALENDAR_PRESETS[key];
    if (!preset) return;
    setConfig({ ...preset.config });
    setActivePreset(key);
  };

  const handleFieldChange = <K extends keyof CalendarConfig>(field: K, value: CalendarConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setActivePreset('custom');
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await updateWorkspace.mutateAsync({
        id: workspaceId,
        data: { calendarConfigJson: serializeCalendarConfig(config) },
      });
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // 预览时间
  const previewDate = new Date();

  const inputClass =
    'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow font-sans';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="p-[1px] rounded-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.5) 0%, hsl(var(--border)) 50%, hsl(var(--primary) / 0.3) 100%)',
        }}
      >
        <motion.div
          className="bg-card rounded-xl w-full max-w-lg mx-4 p-6"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              自定义日历
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 预设选择 */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2 font-sans">
                历法预设
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CALENDAR_PRESETS).map(([key, preset]) => {
                  const Icon = key === 'earth' ? Globe : key === 'xianxiu' ? Sparkles : Wand2;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-md border text-xs transition-all font-sans ${
                        activePreset === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-accent/50 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 自定义字段 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 font-sans">
                  年长（天/年）
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.yearLength}
                  onChange={(e) => handleFieldChange('yearLength', Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 font-sans">
                  月数（月/年）
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.monthCount}
                  onChange={(e) => handleFieldChange('monthCount', Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 font-sans">
                  日长（时/日）
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.dayLength}
                  onChange={(e) => handleFieldChange('dayLength', Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 font-sans">
                  纪元名
                </label>
                <input
                  type="text"
                  value={config.epochName}
                  onChange={(e) => handleFieldChange('epochName', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* 月份名（可选） */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 font-sans">
                月份名（可选，用逗号分隔）
              </label>
              <input
                type="text"
                value={config.monthNames?.join(',') ?? ''}
                onChange={(e) => {
                  const names = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  handleFieldChange('monthNames', names.length > 0 ? names : undefined);
                }}
                placeholder="如：正月,二月,三月..."
                className={inputClass}
              />
            </div>

            {/* 预览 */}
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <div className="text-xs text-muted-foreground mb-1 font-sans">当前时刻预览</div>
              <div className="text-sm font-mono text-foreground">
                {formatCustomDate(previewDate, config)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-sans">
                每月 {Math.floor(config.yearLength / config.monthCount)} 天 · 每日 {config.dayLength} 时
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors font-sans"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !workspaceId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 font-sans"
              >
                {saved ? (
                  <>已保存</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
