import { create } from 'zustand';

export type HistoryEntityType = 'event' | 'track' | 'character' | 'foreshadowing' | 'worldSetting' | 'connection';

export interface HistoryRecord {
  /** Unique ID of this history record */
  id: string;
  workspaceId: string;
  entityType: HistoryEntityType;
  action: 'create' | 'update' | 'delete';
  /** ID of the affected entity */
  entityId: string;
  /** Entity data needed to reverse the action */
  data: Record<string, unknown>;
  /** Additional context needed to reverse the action */
  meta?: Record<string, unknown>;
}

interface HistoryState {
  past: HistoryRecord[];
  future: HistoryRecord[];
  canUndo: boolean;
  canRedo: boolean;
  push: (record: HistoryRecord) => void;
  clear: () => void;
  undo: () => HistoryRecord | null;
  redo: () => HistoryRecord | null;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  push: (record) => {
    set((state) => ({
      past: [...state.past, record],
      future: [],
      canUndo: true,
      canRedo: false,
    }));
  },
  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
  undo: () => {
    const state = get();
    if (state.past.length === 0) return null;
    const record = state.past[state.past.length - 1];
    const past = state.past.slice(0, -1);
    set({
      past,
      future: [record, ...state.future],
      canUndo: past.length > 0,
      canRedo: true,
    });
    return record;
  },
  redo: () => {
    const state = get();
    if (state.future.length === 0) return null;
    const record = state.future[0];
    const future = state.future.slice(1);
    set({
      past: [...state.past, record],
      future,
      canUndo: true,
      canRedo: future.length > 0,
    });
    return record;
  },
}));
