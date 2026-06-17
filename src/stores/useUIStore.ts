import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PanelType = 'properties' | 'event-editor' | 'ai' | 'characters' | 'worldview' | 'foreshadowing' | 'connections' | 'consistency' | 'shortcuts' | null;

interface UIState {
  activePanel: PanelType;
  panelWidth: number;  // 280-480
  focusMode: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  setActivePanel: (panel: PanelType) => void;
  togglePanel: (panel: PanelType) => void;
  setPanelWidth: (width: number) => void;
  toggleFocusMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activePanel: 'properties',
      panelWidth: 360,
      focusMode: false,
      commandPaletteOpen: false,
      settingsOpen: false,
      setActivePanel: (panel) => set({ activePanel: panel }),
      togglePanel: (panel) => set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
      setPanelWidth: (width) => set({ panelWidth: Math.max(280, Math.min(480, width)) }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
    }),
    { name: 'ui-storage', partialize: (s) => ({ panelWidth: s.panelWidth }) }
  )
);
