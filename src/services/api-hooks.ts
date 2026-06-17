import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import type {
  Workspace, TimelineEvent, Track, Character, Connection,
  Foreshadowing, WorldSetting, CreateWorkspaceRequest, UpdateWorkspaceRequest,
  CreateEventRequest, UpdateEventRequest, CreateTrackRequest, UpdateTrackRequest,
  CreateCharacterRequest, UpdateCharacterRequest,
  CreateConnectionRequest, UpdateConnectionRequest,
  CreateForeshadowingRequest, UpdateForeshadowingRequest,
  CreateWorldSettingRequest, UpdateWorldSettingRequest,
  ExportData,
} from '../../shared/types.js';

// Workspace hooks
export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get<Workspace[]>('/api/workspaces'),
  });
}

export function useWorkspace(id: string | null) {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => api.get<Workspace>(`/api/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) =>
      api.post<Workspace>('/api/workspaces', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceRequest }) =>
      api.patch<Workspace>(`/api/workspaces/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['workspaces', vars.id] });
    },
  });
}

// 更新工作区日历配置（复用 useUpdateWorkspace 的便捷封装）
export function useUpdateWorkspaceCalendar() {
  const updateWorkspace = useUpdateWorkspace();
  return {
    mutate: ({ workspaceId, calendarConfigJson }: { workspaceId: string; calendarConfigJson: string }) =>
      updateWorkspace.mutate({ id: workspaceId, data: { calendarConfigJson } }),
    mutateAsync: ({ workspaceId, calendarConfigJson }: { workspaceId: string; calendarConfigJson: string }) =>
      updateWorkspace.mutateAsync({ id: workspaceId, data: { calendarConfigJson } }),
    isPending: updateWorkspace.isPending,
  };
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/api/workspaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

// Event hooks
export function useEvents(workspaceId: string | null) {
  return useQuery({
    queryKey: ['events', workspaceId],
    queryFn: () => api.get<{ items: TimelineEvent[]; total: number }>(`/api/workspaces/${workspaceId}/events?pageSize=200`),
    enabled: !!workspaceId,
  });
}

export function useEvent(workspaceId: string | null, eventId: string | null) {
  return useQuery({
    queryKey: ['events', workspaceId, eventId],
    queryFn: () => api.get<TimelineEvent>(`/api/workspaces/${workspaceId}/events/${eventId}`),
    enabled: !!workspaceId && !!eventId,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateEventRequest }) =>
      api.post<TimelineEvent>(`/api/workspaces/${workspaceId}/events`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['events', vars.workspaceId] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, eventId, data }: { workspaceId: string; eventId: string; data: UpdateEventRequest }) =>
      api.patch<TimelineEvent>(`/api/workspaces/${workspaceId}/events/${eventId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['events', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['events', vars.workspaceId, vars.eventId] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, eventId }: { workspaceId: string; eventId: string }) =>
      api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/events/${eventId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['events', vars.workspaceId] });
    },
  });
}

// Track hooks
export function useTracks(workspaceId: string | null) {
  return useQuery({
    queryKey: ['tracks', workspaceId],
    queryFn: () => api.get<Track[]>(`/api/workspaces/${workspaceId}/tracks`),
    enabled: !!workspaceId,
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateTrackRequest }) =>
      api.post<Track>(`/api/workspaces/${workspaceId}/tracks`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['tracks', vars.workspaceId] }),
  });
}

export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, trackId, data }: { workspaceId: string; trackId: string; data: UpdateTrackRequest }) =>
      api.patch<Track>(`/api/workspaces/${workspaceId}/tracks/${trackId}`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['tracks', vars.workspaceId] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, trackId }: { workspaceId: string; trackId: string }) =>
      api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/tracks/${trackId}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['tracks', vars.workspaceId] }),
  });
}

// Character hooks
export function useCharacters(workspaceId: string | null) {
  return useQuery({
    queryKey: ['characters', workspaceId],
    queryFn: () => api.get<Character[]>(`/api/workspaces/${workspaceId}/characters`),
    enabled: !!workspaceId,
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateCharacterRequest }) =>
      api.post<Character>(`/api/workspaces/${workspaceId}/characters`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['characters', vars.workspaceId] }),
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, characterId, data }: { workspaceId: string; characterId: string; data: UpdateCharacterRequest }) =>
      api.patch<Character>(`/api/workspaces/${workspaceId}/characters/${characterId}`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['characters', vars.workspaceId] }),
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, characterId }: { workspaceId: string; characterId: string }) =>
      api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/characters/${characterId}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['characters', vars.workspaceId] }),
  });
}

// Connection hooks
export function useConnections(workspaceId: string | null) {
  return useQuery({
    queryKey: ['connections', workspaceId],
    queryFn: () => api.get<Connection[]>(`/api/workspaces/${workspaceId}/connections`),
    enabled: !!workspaceId,
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateConnectionRequest }) =>
      api.post<Connection>(`/api/workspaces/${workspaceId}/connections`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['connections', vars.workspaceId] }),
  });
}

export function useUpdateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, connectionId, data }: { workspaceId: string; connectionId: string; data: UpdateConnectionRequest }) =>
      api.patch<Connection>(`/api/workspaces/${workspaceId}/connections/${connectionId}`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['connections', vars.workspaceId] }),
  });
}

export function useDeleteConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, connectionId }: { workspaceId: string; connectionId: string }) =>
      api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/connections/${connectionId}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['connections', vars.workspaceId] }),
  });
}

// Auto-save hooks
export function useCreateAutoSave() {
  return useMutation({
    mutationFn: ({ workspaceId, dataJson }: { workspaceId: string; dataJson: string }) =>
      api.post<{ id: string; workspaceId: string; dataJson: string; createdAt: Date }>(`/api/workspaces/${workspaceId}/auto-saves`, { dataJson }),
  });
}

export function useLatestAutoSave(workspaceId: string | null) {
  return useQuery({
    queryKey: ['autoSaves', workspaceId, 'latest'],
    queryFn: () => api.get<{ id: string; workspaceId: string; dataJson: string; createdAt: Date }>(`/api/workspaces/${workspaceId}/auto-saves/latest`),
    enabled: !!workspaceId,
  });
}

export function useRecoverAutoSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) =>
      api.post<{ recovered: boolean }>(`/api/workspaces/${workspaceId}/auto-saves/recover`, {}),
    onSuccess: (_, workspaceId) => {
      // 恢复后刷新所有相关查询
      qc.invalidateQueries({ queryKey: ['events', workspaceId] });
      qc.invalidateQueries({ queryKey: ['tracks', workspaceId] });
      qc.invalidateQueries({ queryKey: ['characters', workspaceId] });
      qc.invalidateQueries({ queryKey: ['connections', workspaceId] });
      qc.invalidateQueries({ queryKey: ['foreshadowings', workspaceId] });
      qc.invalidateQueries({ queryKey: ['worldSettings', workspaceId] });
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
    },
  });
}

// Foreshadowing hooks
export function useForeshadowings(workspaceId: string | null) {
  return useQuery({
    queryKey: ['foreshadowings', workspaceId],
    queryFn: () => api.get<Foreshadowing[]>(`/api/workspaces/${workspaceId}/foreshadowings`),
    enabled: !!workspaceId,
  });
}

export function useCreateForeshadowing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateForeshadowingRequest }) =>
      api.post<Foreshadowing>(`/api/workspaces/${workspaceId}/foreshadowings`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['foreshadowings', vars.workspaceId] }),
  });
}

export function useUpdateForeshadowing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, foreshadowingId, data }: { workspaceId: string; foreshadowingId: string; data: UpdateForeshadowingRequest }) =>
      api.patch<Foreshadowing>(`/api/workspaces/${workspaceId}/foreshadowings/${foreshadowingId}`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['foreshadowings', vars.workspaceId] }),
  });
}

export function useDeleteForeshadowing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, foreshadowingId }: { workspaceId: string; foreshadowingId: string }) =>
      api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/foreshadowings/${foreshadowingId}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['foreshadowings', vars.workspaceId] }),
  });
}

// WorldSetting hooks
export function useWorldSettings(workspaceId: string | null) {
  return useQuery({
    queryKey: ['worldSettings', workspaceId],
    queryFn: () => api.get<WorldSetting[]>(`/api/workspaces/${workspaceId}/world-settings`),
    enabled: !!workspaceId,
  });
}

export function useCreateWorldSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateWorldSettingRequest }) =>
      api.post<WorldSetting>(`/api/workspaces/${workspaceId}/world-settings`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['worldSettings', vars.workspaceId] }),
  });
}

export function useUpdateWorldSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, settingId, data }: { workspaceId: string; settingId: string; data: UpdateWorldSettingRequest }) =>
      api.patch<WorldSetting>(`/api/workspaces/${workspaceId}/world-settings/${settingId}`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['worldSettings', vars.workspaceId] }),
  });
}

export function useDeleteWorldSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, settingId }: { workspaceId: string; settingId: string }) =>
      api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/world-settings/${settingId}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['worldSettings', vars.workspaceId] }),
  });
}

// Export/Import
export function useExportWorkspace(workspaceId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['export', workspaceId],
    queryFn: () => api.get<ExportData>(`/api/workspaces/${workspaceId}/export`),
    enabled: options?.enabled ?? !!workspaceId,
  });
}

// 导入工作区数据（支持冲突处理策略）
export function useImportWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, data, strategy }: {
      workspaceId: string;
      data: ExportData;
      strategy?: 'overwrite' | 'merge' | 'skip';
    }) => api.post<{ imported: boolean }>(
      `/api/workspaces/${workspaceId}/import?strategy=${strategy ?? 'skip'}`,
      data
    ),
    onSuccess: (_, vars) => {
      // 导入成功后使所有相关查询失效，触发重新获取
      qc.invalidateQueries({ queryKey: ['workspaces', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['events', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['tracks', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['characters', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['connections', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['foreshadowings', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['worldSettings', vars.workspaceId] });
    },
  });
}
