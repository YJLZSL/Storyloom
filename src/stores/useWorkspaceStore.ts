import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTimelineStore } from './useTimelineStore';
import { useTrackStore } from './useTrackStore';
import { useSelectionStore } from './useSelectionStore';

interface WorkspaceState {
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      setCurrentWorkspace: (id) => {
        const prev = get().currentWorkspaceId;
        if (prev === id) return;
        set({ currentWorkspaceId: id });
        const timeline = useTimelineStore.getState();
        timeline.setSelectedEvent(null);
        timeline.setSelectedCharacter(null);
        timeline.setVisibleDateRange(null);
        useSelectionStore.getState().clear();
        const tracks = useTrackStore.getState();
        tracks.setSelectedTrack(null);
        tracks.setEditingTrack(null);
      },
    }),
    { name: 'workspace-storage' }
  )
);
