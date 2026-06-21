import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { createTopLevelHooks, createNestedHooks } from './api-hooks-factory.js';
import type {
  Workspace, TimelineEvent, Track, Character, Connection,
  Foreshadowing, WorldSetting, OutlineVersion, Map, Bookmark,
  CreateWorkspaceRequest, UpdateWorkspaceRequest,
  CreateEventRequest, UpdateEventRequest,
  CreateTrackRequest, UpdateTrackRequest,
  CreateCharacterRequest, UpdateCharacterRequest,
  CreateConnectionRequest, UpdateConnectionRequest,
  CreateForeshadowingRequest, UpdateForeshadowingRequest,
  CreateWorldSettingRequest, UpdateWorldSettingRequest,
  CreateOutlineVersionRequest,
  CreateMapRequest, UpdateMapRequest,
  CreateBookmarkRequest, UpdateBookmarkRequest,
  ExportData,
} from '../../shared/types.js';

// ─── Workspace（顶层资源）───
const workspaceHooks = createTopLevelHooks<Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest>(
  'workspaces',
  'workspaces',
);

export const useWorkspaces = workspaceHooks.useList;
export const useWorkspace = workspaceHooks.useOne;
export const useCreateWorkspace = workspaceHooks.useCreate;
export const useUpdateWorkspace = workspaceHooks.useUpdate;
export const useDeleteWorkspace = workspaceHooks.useDelete;

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

// ─── Event（嵌套资源，带乐观更新）───
const eventHooks = createNestedHooks<
  TimelineEvent,
  CreateEventRequest,
  UpdateEventRequest,
  'eventId',
  { items: TimelineEvent[]; total: number }
>('events', 'events', {
  listUrl: (wsId) => `/api/workspaces/${wsId}/events?pageSize=200`,
  optimisticUpdate: {
    listDataPath: 'items',
    fields: ['title', 'summary', 'description', 'location', 'tagsJson'],
  },
  idFieldName: 'eventId',
});

export const useEvents = eventHooks.useList;
export const useEvent = eventHooks.useOne;
export const useCreateEvent = eventHooks.useCreate;
export const useUpdateEvent = eventHooks.useUpdate;
export const useDeleteEvent = eventHooks.useDelete;

// ─── Track ───
const trackHooks = createNestedHooks<Track, CreateTrackRequest, UpdateTrackRequest, 'trackId'>(
  'tracks',
  'tracks',
  { idFieldName: 'trackId' },
);

export const useTracks = trackHooks.useList;
export const useCreateTrack = trackHooks.useCreate;
export const useUpdateTrack = trackHooks.useUpdate;
export const useDeleteTrack = trackHooks.useDelete;

// ─── Character ───
const characterHooks = createNestedHooks<Character, CreateCharacterRequest, UpdateCharacterRequest, 'characterId'>(
  'characters',
  'characters',
  { idFieldName: 'characterId' },
);

export const useCharacters = characterHooks.useList;
export const useCreateCharacter = characterHooks.useCreate;
export const useUpdateCharacter = characterHooks.useUpdate;
export const useDeleteCharacter = characterHooks.useDelete;

// ─── Connection（列表响应需要转换）───
const connectionHooks = createNestedHooks<
  Connection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  'connectionId',
  Connection[]
>('connections', 'connections', {
  idFieldName: 'connectionId',
  listResponseTransformer: (result) => (Array.isArray(result) ? result : (result?.items ?? [])),
});

export const useConnections = connectionHooks.useList;
export const useCreateConnection = connectionHooks.useCreate;
export const useUpdateConnection = connectionHooks.useUpdate;
export const useDeleteConnection = connectionHooks.useDelete;

// ─── Auto-save ───
export function useCreateAutoSave() {
  return useMutation({
    mutationFn: ({ workspaceId, dataJson }: { workspaceId: string; dataJson: string }) =>
      api.post<{ id: string; workspaceId: string; dataJson: string; createdAt: Date }>(
        `/api/workspaces/${workspaceId}/auto-saves`,
        { dataJson },
      ),
  });
}

export function useLatestAutoSave(workspaceId: string | null) {
  return useQuery({
    queryKey: ['autoSaves', workspaceId, 'latest'],
    queryFn: () =>
      api.get<{ id: string; workspaceId: string; dataJson: string; createdAt: Date }>(
        `/api/workspaces/${workspaceId}/auto-saves/latest`,
      ),
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

// ─── Foreshadowing ───
const foreshadowingHooks = createNestedHooks<
  Foreshadowing,
  CreateForeshadowingRequest,
  UpdateForeshadowingRequest,
  'foreshadowingId'
>('foreshadowings', 'foreshadowings', { idFieldName: 'foreshadowingId' });

export const useForeshadowings = foreshadowingHooks.useList;
export const useCreateForeshadowing = foreshadowingHooks.useCreate;
export const useUpdateForeshadowing = foreshadowingHooks.useUpdate;
export const useDeleteForeshadowing = foreshadowingHooks.useDelete;

// ─── WorldSetting ───
const worldSettingHooks = createNestedHooks<
  WorldSetting,
  CreateWorldSettingRequest,
  UpdateWorldSettingRequest,
  'settingId'
>('worldSettings', 'world-settings', { idFieldName: 'settingId' });

export const useWorldSettings = worldSettingHooks.useList;
export const useCreateWorldSetting = worldSettingHooks.useCreate;
export const useUpdateWorldSetting = worldSettingHooks.useUpdate;
export const useDeleteWorldSetting = worldSettingHooks.useDelete;

// ─── Export/Import ───
export function useExportWorkspace(workspaceId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['export', workspaceId],
    queryFn: () => api.get<ExportData>(`/api/workspaces/${workspaceId}/export`),
    enabled: options?.enabled ?? !!workspaceId,
  });
}

// ─── OutlineVersion ───
const outlineVersionHooks = createNestedHooks<
  OutlineVersion,
  CreateOutlineVersionRequest,
  never,
  'versionId'
>('outlineVersions', 'outline-versions', { idFieldName: 'versionId' });

export const useOutlineVersions = outlineVersionHooks.useList;
export const useOutlineVersion = outlineVersionHooks.useOne;
export const useCreateOutlineVersion = outlineVersionHooks.useCreate;
export const useDeleteOutlineVersion = outlineVersionHooks.useDelete;

export function useRestoreOutlineVersion() {
  return useMutation({
    mutationFn: ({ workspaceId, versionId }: { workspaceId: string; versionId: string }) =>
      api.post<{ content: string; description: string | null }>(
        `/api/workspaces/${workspaceId}/outline-versions/${versionId}/restore`,
        {},
      ),
  });
}

// ─── Map ───
const mapHooks = createNestedHooks<Map, CreateMapRequest, UpdateMapRequest, 'mapId'>(
  'maps',
  'maps',
  { idFieldName: 'mapId' },
);

export const useMaps = mapHooks.useList;
export const useMap = mapHooks.useOne;
export const useCreateMap = mapHooks.useCreate;
export const useUpdateMap = mapHooks.useUpdate;
export const useDeleteMap = mapHooks.useDelete;

// ─── Bookmark ───
const bookmarkHooks = createNestedHooks<Bookmark, CreateBookmarkRequest, UpdateBookmarkRequest, 'bookmarkId'>(
  'bookmarks',
  'bookmarks',
  { idFieldName: 'bookmarkId' },
);

export const useBookmarks = bookmarkHooks.useList;
export const useCreateBookmark = bookmarkHooks.useCreate;
export const useUpdateBookmark = bookmarkHooks.useUpdate;
export const useDeleteBookmark = bookmarkHooks.useDelete;

// 导入工作区数据（支持冲突处理策略）
export function useImportWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
      strategy,
    }: {
      workspaceId: string;
      data: ExportData;
      strategy?: 'overwrite' | 'merge' | 'skip';
    }) =>
      api.post<{ imported: boolean }>(
        `/api/workspaces/${workspaceId}/import?strategy=${strategy ?? 'skip'}`,
        data,
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
