import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';  // 素纸/墨黑

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme, event?: MouseEvent) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme, event) => {
        // View Transitions API 圆形扩散
        if (event && 'startViewTransition' in document) {
          const x = event.clientX;
          const y = event.clientY;
          const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );
          document.documentElement.style.setProperty('--theme-transition-x', `${x}px`);
          document.documentElement.style.setProperty('--theme-transition-y', `${y}px`);
          document.documentElement.style.setProperty('--theme-transition-radius', `${radius}px`);
          (document as Document & { startViewTransition: (cb: () => void) => { finished: Promise<void> } }).startViewTransition(() => {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            set({ theme });
          });
        } else {
          document.documentElement.classList.toggle('dark', theme === 'dark');
          set({ theme });
        }
      },
      toggleTheme: () => {
        const current = get().theme;
        get().setTheme(current === 'light' ? 'dark' : 'light');
      },
    }),
    { name: 'theme-storage' }
  )
);
