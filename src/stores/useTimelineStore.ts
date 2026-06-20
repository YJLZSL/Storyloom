import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship' | 'tree';

export interface VisibleDateRange {
  startMs: number;
  endMs: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;

interface TimelineState {
  viewMode: ViewMode;
  /** Continuous zoom level, range [0.5, 3.0], default 1.0 */
  zoom: number;
  selectedEventId: string | null;
  selectedCharacterId: string | null;
  scrollToEventId: string | null;
  showConnectionLines: boolean;
  outlineFilterTrackId: string | null;
  visibleDateRange: VisibleDateRange | null;
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  resetZoom: () => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedCharacter: (id: string | null) => void;
  scrollToEvent: (id: string | null) => void;
  toggleConnectionLines: () => void;
  setOutlineFilterTrackId: (id: string | null) => void;
  setVisibleDateRange: (range: VisibleDateRange | null) => void;
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set) => ({
      viewMode: 'timeline',
      zoom: DEFAULT_ZOOM,
      selectedEventId: null,
      selectedCharacterId: null,
      scrollToEventId: null,
      showConnectionLines: true,
      outlineFilterTrackId: null,
      visibleDateRange: null,
      setViewMode: (mode) => set({ viewMode: mode }),
      setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
      zoomIn: (step = 0.1) => set((s) => ({ zoom: Math.min(MAX_ZOOM, s.zoom + step) })),
      zoomOut: (step = 0.1) => set((s) => ({ zoom: Math.max(MIN_ZOOM, s.zoom - step) })),
      resetZoom: () => set({ zoom: DEFAULT_ZOOM }),
      setSelectedEvent: (id) => set({ selectedEventId: id }),
      setSelectedCharacter: (id) => set({ selectedCharacterId: id }),
      scrollToEvent: (id) => set({ scrollToEventId: id }),
      toggleConnectionLines: () => set((s) => ({ showConnectionLines: !s.showConnectionLines })),
      setOutlineFilterTrackId: (id) => set({ outlineFilterTrackId: id }),
      setVisibleDateRange: (range) => set({ visibleDateRange: range }),
    }),
    {
      name: 'timeline-storage',
      partialize: (s) => ({
        viewMode: s.viewMode,
        zoom: s.zoom,
        showConnectionLines: s.showConnectionLines,
        visibleDateRange: s.visibleDateRange,
      }),
    },
  ),
);
