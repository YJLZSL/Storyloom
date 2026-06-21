import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PanelType = 'properties' | 'event-editor' | 'ai' | 'characters' | 'worldview' | 'foreshadowing' | 'connections' | 'consistency' | 'shortcuts' | 'bookmarks' | 'maps' | 'script-editor' | null;

// 页面 ID：新增 narrative/gantt/tree 以兼容时间轴子视图
export type PageId = 'timeline' | 'characters' | 'outline' | 'narrative' | 'gantt' | 'tree' | 'notebook' | 'writing' | 'ai' | 'world' | 'stats' | 'relationship' | 'script-editor';

interface UIState {
  activePanel: PanelType;
  panelWidth: number;  // 280-480
  focusMode: boolean;
  zenMode: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  detailEventId: string | null;
  showLeftPanel: boolean; // 是否显示左侧边栏（默认true，仅在时间轴视图显示）
  currentPage: PageId; // 当前页面（替代 viewMode 的页面导航概念）
  setActivePanel: (panel: PanelType) => void;
  togglePanel: (panel: PanelType) => void;
  setPanelWidth: (width: number) => void;
  toggleFocusMode: () => void;
  setZenMode: (enabled: boolean) => void;
  toggleZenMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setDetailEvent: (id: string | null) => void;
  toggleLeftPanel: () => void; // 切换左侧边栏显示
  setCurrentPage: (page: PageId) => void; // 设置当前页面
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
      showLeftPanel: true, // 默认显示左侧边栏
      currentPage: 'timeline', // 默认当前页面为时间轴
      setActivePanel: (panel) => set({ activePanel: panel }),
      togglePanel: (panel) => set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
      setPanelWidth: (width) => set({ panelWidth: Math.max(280, Math.min(480, width)) }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      setZenMode: (enabled) => set({ zenMode: enabled }),
      toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setDetailEvent: (id) => set({ detailEventId: id }),
      toggleLeftPanel: () => set((s) => ({ showLeftPanel: !s.showLeftPanel })),
      setCurrentPage: (page) => set({ currentPage: page }),
    }),
    { name: 'ui-storage', partialize: (s) => ({ panelWidth: s.panelWidth, showLeftPanel: s.showLeftPanel, currentPage: s.currentPage }) }
  )
);
