import { MonitorIcon, CheckIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { TButton, TTag } from '@/components/ui-tdesign';
import { useThemeStore, type ThemeId } from '@/stores/useThemeStore';
import { getThemePreviewGradient } from '@/lib/colors';

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'luosheng', name: '洛圣', description: '默认浅色' },
  { id: 'midnight', name: '子夜', description: '深色护眼' },
  { id: 'forest', name: '森林', description: '舒缓绿调' },
  { id: 'ink-wash', name: '水墨', description: '灰白晕染' },
  { id: 'contrast', name: '高对比', description: '黑底亮字' },
  { id: 'system', name: '跟随系统', description: '随系统切换' },
];

export function ThemeSelector() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((opt) => {
          const selected = theme === opt.id;
          return (
            <TButton
              key={opt.id}
              variant="outline"
              className={cn(
                'group relative h-auto flex-col items-stretch gap-2 rounded-lg border p-2 text-left transition-all',
                selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
              )}
              onClick={() => setTheme(opt.id)}
            >
              <div
                className="relative h-14 w-full overflow-hidden rounded-md border border-border"
                style={{ background: getThemePreviewGradient(opt.id) }}
              >
                {opt.id === 'system' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MonitorIcon size={20} className="text-white drop-shadow" />
                  </div>
                )}
                {selected && (
                  <TTag
                    theme="primary"
                    variant="light"
                    size="small"
                    className="absolute right-1 top-1 inline-flex items-center gap-0.5"
                  >
                    <CheckIcon size={10} />
                    已选
                  </TTag>
                )}
              </div>
              <div className="flex flex-col gap-0.5 px-0.5">
                <span className="text-sm font-medium leading-none">{opt.name}</span>
                <span className="text-[11px] text-muted-foreground leading-none">{opt.description}</span>
              </div>
            </TButton>
          );
        })}
      </div>
    </div>
  );
}
