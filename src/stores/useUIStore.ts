import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PanelType = 'properties' | 'event-editor' | 'ai' | 'characters' | 'worldview' | 'foreshadowing' | 'connections' | 'consistency' | 'shortcuts' | 'bookmarks' | 'maps' | null;

interface UIState {
  activePanel: PanelType;
  panelWidth: number;  // 280-480
  focusMode: boolean;
  zenMode: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  detailEventId: string | null;
  setActivePanel: (panel: PanelType) => void;
  togglePanel: (panel: PanelType) => void;
  setPanelWidth: (width: number) => void;
  toggleFocusMode: () => void;
  setZenMode: (enabled: boolean) => void;
  toggleZenMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setDetailEvent: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activePanel: null,
      panelWidth: 360,
      focusMode: false,
      zenMode: false,
      commandPaletteOpen: false,
      settingsOpen: false,
      detailEventId: null,
      setActivePanel: (panel) => set({ activePanel: panel }),
      togglePanel: (panel) => set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
      setPanelWidth: (width) => set({ panelWidth: Math.max(280, Math.min(480, width)) }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      setZenMode: (enabled) => set({ zenMode: enabled }),
      toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setDetailEvent: (id) => set({ detailEventId: id }),
    }),
    { name: 'ui-storage', partialize: (s) => ({ panelWidth: s.panelWidth }) }
  )
);
