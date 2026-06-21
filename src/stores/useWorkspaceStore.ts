import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';
import { useTimelineStore } from './useTimelineStore';
import { useTrackStore } from './useTrackStore';
import { useSelectionStore } from './useSelectionStore';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  settingsJson: string;
  calendarConfigJson?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceState {
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  setCurrentWorkspace: (id: string | null) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Pick<Workspace, 'name' | 'description' | 'settingsJson' | 'calendarConfigJson'>>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      workspaces: [],
      loading: false,
      error: null,

      setCurrentWorkspace: (id) => {
        const prev = get().currentWorkspaceId;
        if (prev === id) return;
        set({ currentWorkspaceId: id });
        const timeline = useTimelineStore.getState();
        timeline.setVisibleDateRange(null);
        useSelectionStore.getState().clear();
        const tracks = useTrackStore.getState();
        tracks.setSelectedTrack(null);
        tracks.setEditingTrack(null);
      },

      fetchWorkspaces: async () => {
        set({ loading: true, error: null });
        try {
          const data = await api.get<Workspace[]>('/api/workspaces');
          set({ workspaces: data || [], loading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message || '获取工作区失败', loading: false });
        }
      },

      createWorkspace: async (name, description = '') => {
        set({ loading: true, error: null });
        try {
          const data = await api.post<Workspace>('/api/workspaces', { name, description });
          await get().fetchWorkspaces();
          set({ loading: false });
          return data;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message || '创建工作区失败', loading: false });
          throw err;
        }
      },

      updateWorkspace: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          const data = await api.patch<Workspace>(`/api/workspaces/${id}`, updates);
          await get().fetchWorkspaces();
          set({ loading: false });
          return data;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message || '更新工作区失败', loading: false });
          throw err;
        }
      },

      deleteWorkspace: async (id) => {
        set({ loading: true, error: null });
        try {
          await api.delete(`/api/workspaces/${id}`);
          const currentId = get().currentWorkspaceId;
          if (currentId === id) {
            get().setCurrentWorkspace(null);
          }
          await get().fetchWorkspaces();
          set({ loading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message || '删除工作区失败', loading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'workspace-storage' }
  )
);
