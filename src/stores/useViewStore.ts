import { create } from 'zustand';
import { useTimelineStore } from '@/stores/useTimelineStore';

export type ViewId =
  | 'timeline'
  | 'outline'
  | 'narrative'
  | 'gantt'
  | 'tree'
  | 'stats'
  | 'relationship';

type ViewMode = 'timeline' | 'outline' | 'narrative' | 'gantt' | 'statistics' | 'relationship' | 'tree';

const TIMELINE_TO_VIEW: Record<ViewMode, ViewId> = {
  timeline: 'timeline',
  outline: 'outline',
  narrative: 'narrative',
  gantt: 'gantt',
  tree: 'tree',
  statistics: 'stats',
  relationship: 'relationship',
};

const VIEW_TO_TIMELINE: Record<ViewId, ViewMode> = {
  timeline: 'timeline',
  outline: 'outline',
  narrative: 'narrative',
  gantt: 'gantt',
  tree: 'tree',
  stats: 'statistics',
  relationship: 'relationship',
};

interface ViewState {
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
}

function getActiveViewFromTimeline(): ViewId {
  const mode = useTimelineStore.getState().viewMode;
  return TIMELINE_TO_VIEW[mode] ?? 'timeline';
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: getActiveViewFromTimeline(),
  setActiveView: (view) => {
    set({ activeView: view });
    useTimelineStore.getState().setViewMode(VIEW_TO_TIMELINE[view]);
  },
}));

useTimelineStore.subscribe((state) => {
  const next = TIMELINE_TO_VIEW[state.viewMode] ?? 'timeline';
  useViewStore.setState((s) => (s.activeView === next ? s : { activeView: next }));
});
