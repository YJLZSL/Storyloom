import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'luosheng' | 'midnight' | 'forest' | 'ink-wash' | 'contrast' | 'system';

export type Theme = ThemeId;

const VALID_THEMES: ThemeId[] = ['luosheng', 'midnight', 'forest', 'ink-wash', 'contrast', 'system'];

const LEGACY_MAP: Record<string, ThemeId> = {
  light: 'luosheng',
  dark: 'midnight',
  paper: 'luosheng',
  ink: 'midnight',
  green: 'forest',
  parchment: 'luosheng',
};

function normalizeTheme(value: unknown): ThemeId {
  if (typeof value !== 'string') return 'luosheng';
  if (LEGACY_MAP[value]) return LEGACY_MAP[value];
  if ((VALID_THEMES as string[]).includes(value)) return value as ThemeId;
  return 'luosheng';
}

function getSystemTheme(): 'luosheng' | 'midnight' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'luosheng';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'luosheng';
}

function resolveTheme(theme: ThemeId): Exclude<ThemeId, 'system'> {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyThemeToDOM(theme: ThemeId): void {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle('dark', resolved === 'midnight' || resolved === 'contrast');
}

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId, event?: MouseEvent) => void;
  toggleTheme: () => void;
}

let systemMediaQuery: MediaQueryList | null = null;
let systemMediaListener: ((e: MediaQueryListEvent) => void) | null = null;

function ensureSystemListener(store: { getState: () => ThemeState }) {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (systemMediaQuery && systemMediaListener) return;
  systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemMediaListener = () => {
    if (store.getState().theme === 'system') {
      applyThemeToDOM('system');
    }
  };
  systemMediaQuery.addEventListener('change', systemMediaListener);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'luosheng',
      setTheme: (theme, event) => {
        const normalized = normalizeTheme(theme);
        const apply = () => {
          applyThemeToDOM(normalized);
          set({ theme: normalized });
        };
        if (event && 'startViewTransition' in document) {
          const x = event.clientX;
          const y = event.clientY;
          const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
          );
          document.documentElement.style.setProperty('--theme-transition-x', `${x}px`);
          document.documentElement.style.setProperty('--theme-transition-y', `${y}px`);
          document.documentElement.style.setProperty('--theme-transition-radius', `${radius}px`);
          (
            document as Document & {
              startViewTransition: (cb: () => void) => { finished: Promise<void> };
            }
          ).startViewTransition(apply);
        } else {
          apply();
        }
      },
      toggleTheme: () => {
        const current = get().theme;
        const resolved = resolveTheme(current);
        get().setTheme(resolved === 'midnight' ? 'luosheng' : 'midnight');
      },
    }),
    {
      name: 'theme-storage',
      migrate: (persisted: unknown) => {
        if (persisted && typeof persisted === 'object' && 'theme' in persisted) {
          const p = persisted as { theme: unknown };
          return { theme: normalizeTheme(p.theme) } as ThemeState;
        }
        return persisted as ThemeState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.theme = normalizeTheme(state.theme);
          applyThemeToDOM(state.theme);
        }
      },
    },
  ),
);

ensureSystemListener(useThemeStore);

if (typeof document !== 'undefined') {
  applyThemeToDOM(useThemeStore.getState().theme);
}
