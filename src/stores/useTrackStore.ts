import { create } from 'zustand';

interface TrackState {
  selectedTrackId: string | null;
  editingTrackId: string | null;
  setSelectedTrack: (id: string | null) => void;
  setEditingTrack: (id: string | null) => void;
}

export const useTrackStore = create<TrackState>((set) => ({
  selectedTrackId: null,
  editingTrackId: null,
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
  setEditingTrack: (id) => set({ editingTrackId: id }),
}));
