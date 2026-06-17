import { create } from 'zustand';

type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship';

interface TimelineState {
  viewMode: ViewMode;
  zoom: number;  // 0.1 - 5.0
  selectedEventId: string | null;
  selectedCharacterId: string | null;
  scrollToEventId: string | null;
  showConnectionLines: boolean;
  outlineFilterTrackId: string | null;
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedCharacter: (id: string | null) => void;
  scrollToEvent: (id: string | null) => void;
  toggleConnectionLines: () => void;
  setOutlineFilterTrackId: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  viewMode: 'timeline',
  zoom: 1,
  selectedEventId: null,
  selectedCharacterId: null,
  scrollToEventId: null,
  showConnectionLines: true,
  outlineFilterTrackId: null,
  setViewMode: (mode) => set({ viewMode: mode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(5, s.zoom * 1.2) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.1, s.zoom / 1.2) })),
  setSelectedEvent: (id) => set({ selectedEventId: id }),
  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),
  scrollToEvent: (id) => set({ scrollToEventId: id }),
  toggleConnectionLines: () => set((s) => ({ showConnectionLines: !s.showConnectionLines })),
  setOutlineFilterTrackId: (id) => set({ outlineFilterTrackId: id }),
}));
