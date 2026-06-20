import { create } from 'zustand';
import { useTimelineStore } from './useTimelineStore';

export type SelectionEntity =
  | 'event'
  | 'character'
  | 'foreshadowing'
  | 'worldSetting'
  | 'scene'
  | 'beat'
  | 'choice';

interface SelectionState {
  selectedEventId: string | null;
  selectedCharacterId: string | null;
  selectedForeshadowingId: string | null;
  selectedWorldSettingId: string | null;
  selectedSceneId: string | null;
  selectedBeatId: string | null;
  selectedChoiceId: string | null;

  selectEvent: (id: string | null) => void;
  selectCharacter: (id: string | null) => void;
  selectForeshadowing: (id: string | null) => void;
  selectWorldSetting: (id: string | null) => void;
  selectScene: (id: string | null) => void;
  selectBeat: (id: string | null) => void;
  selectChoice: (id: string | null) => void;
  clear: () => void;
}

const NULL_SELECTION = {
  selectedEventId: null,
  selectedCharacterId: null,
  selectedForeshadowingId: null,
  selectedWorldSettingId: null,
  selectedSceneId: null,
  selectedBeatId: null,
  selectedChoiceId: null,
} as const;

export const useSelectionStore = create<SelectionState>((set) => ({
  ...NULL_SELECTION,

  selectEvent: (id) => {
    set({ ...NULL_SELECTION, selectedEventId: id });
    useTimelineStore.getState().setSelectedEvent(id);
  },

  selectCharacter: (id) => {
    set({ ...NULL_SELECTION, selectedCharacterId: id });
    useTimelineStore.getState().setSelectedCharacter(id);
  },

  selectForeshadowing: (id) => set({ ...NULL_SELECTION, selectedForeshadowingId: id }),

  selectWorldSetting: (id) => set({ ...NULL_SELECTION, selectedWorldSettingId: id }),

  selectScene: (id) => set({ ...NULL_SELECTION, selectedSceneId: id }),

  selectBeat: (id) => set({ ...NULL_SELECTION, selectedBeatId: id }),

  selectChoice: (id) => set({ ...NULL_SELECTION, selectedChoiceId: id }),

  clear: () => {
    set(NULL_SELECTION);
    useTimelineStore.getState().setSelectedEvent(null);
    useTimelineStore.getState().setSelectedCharacter(null);
  },
}));
