import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { createTopLevelHooks, createNestedHooks } from './api-hooks-factory.js';
import type {
  Workspace, TimelineEvent, Track, Character, Connection,
  Foreshadowing, WorldSetting, OutlineVersion, Map, Bookmark,
  Note, NoteFolder, NoteTag,
  Scene, Beat, Choice,
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
  CreateNoteRequest, UpdateNoteRequest, CreateNoteFolderRequest, CreateNoteTagRequest,
  CreateSceneRequest, UpdateSceneRequest,
  CreateBeatRequest, UpdateBeatRequest,
  CreateChoiceRequest, UpdateChoiceRequest,
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
  listResponseTransformer: (result) => {
    if (Array.isArray(result)) return result as Connection[];
    return ((result as Record<string, unknown>)?.items ?? []) as Connection[];
  },
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
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['noteFolders', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['noteTags', vars.workspaceId] });
    },
  });
}

// ============================================
// 资料库（笔记本）API Hooks (v1.5)
// ============================================

/** 笔记列表查询（支持按文件夹筛选） */
export function useNotes(workspaceId: string | null, folderId?: string | null) {
  return useQuery({
    queryKey: ['notes', workspaceId, folderId ?? 'all'],
    queryFn: async () => {
      if (!workspaceId) return { items: [] as Note[], total: 0 };
      const params = folderId !== undefined && folderId !== null ? `?folderId=${folderId}` : '';
      const res = await api.get<{ items: Note[]; total: number }>(`/api/workspaces/${workspaceId}/notes${params}`);
      return res;
    },
    enabled: !!workspaceId,
  });
}

/** 单篇笔记详情查询 */
export function useNote(workspaceId: string | null, noteId: string | null) {
  return useQuery({
    queryKey: ['notes', workspaceId, noteId],
    queryFn: async () => {
      if (!workspaceId || !noteId) return null as unknown as Note;
      const res = await api.get<Note>(`/api/workspaces/${workspaceId}/notes/${noteId}`);
      return res;
    },
    enabled: !!workspaceId && !!noteId,
  });
}

/** 创建笔记 */
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: CreateNoteRequest }) => {
      const res = await api.post<Note>(`/api/workspaces/${workspaceId}/notes`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId] });
    },
  });
}

/** 更新笔记 */
export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, noteId, data }: { workspaceId: string; noteId: string; data: UpdateNoteRequest }) => {
      const res = await api.patch<Note>(`/api/workspaces/${workspaceId}/notes/${noteId}`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId, vars.noteId] });
    },
  });
}

/** 删除笔记 */
export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, noteId }: { workspaceId: string; noteId: string }) => {
      const res = await api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/notes/${noteId}`);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId] });
    },
  });
}

// ─── 资料库文件夹 ───

/** 文件夹列表查询 */
export function useNoteFolders(workspaceId: string | null) {
  return useQuery({
    queryKey: ['noteFolders', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as NoteFolder[];
      const res = await api.get<NoteFolder[]>(`/api/workspaces/${workspaceId}/note-folders`);
      return res;
    },
    enabled: !!workspaceId,
  });
}

/** 创建文件夹 */
export function useCreateNoteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: CreateNoteFolderRequest }) => {
      const res = await api.post<NoteFolder>(`/api/workspaces/${workspaceId}/note-folders`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['noteFolders', vars.workspaceId] });
    },
  });
}

/** 删除文件夹 */
export function useDeleteNoteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, folderId }: { workspaceId: string; folderId: string }) => {
      const res = await api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/note-folders/${folderId}`);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['noteFolders', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId] });
    },
  });
}

// ─── 资料库标签 ───

/** 标签列表查询 */
export function useNoteTags(workspaceId: string | null) {
  return useQuery({
    queryKey: ['noteTags', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as NoteTag[];
      const res = await api.get<NoteTag[]>(`/api/workspaces/${workspaceId}/note-tags`);
      return res;
    },
    enabled: !!workspaceId,
  });
}

/** 创建标签 */
export function useCreateNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: CreateNoteTagRequest }) => {
      const res = await api.post<NoteTag>(`/api/workspaces/${workspaceId}/note-tags`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['noteTags', vars.workspaceId] });
    },
  });
}

export function useDeleteNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, tagId }: { workspaceId: string; tagId: string }) => {
      const res = await api.delete<{ id: string }>(`/api/workspaces/${workspaceId}/note-tags/${tagId}`);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['noteTags', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['notes', vars.workspaceId] });
    },
  });
}

// ============================================
// 视觉小说（剧本编辑器）API Hooks (v1.2)
// ============================================

/** 场景列表 */
export function useScenes(workspaceId: string | null) {
  return useQuery({
    queryKey: ['scenes', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as Scene[];
      const res = await api.get<Scene[]>(`/api/workspaces/${workspaceId}/scenes`);
      return res;
    },
    enabled: !!workspaceId,
  });
}

/** 创建场景 */
export function useCreateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: CreateSceneRequest }) => {
      const res = await api.post<Scene>(`/api/workspaces/${workspaceId}/scenes`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['scenes', vars.workspaceId] });
    },
  });
}

/** 更新场景 */
export function useUpdateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSceneRequest }) => {
      const res = await api.put<Scene>(`/api/scenes/${id}`, data);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes'] });
    },
  });
}

/** 删除场景 */
export function useDeleteScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ id: string }>(`/api/scenes/${id}`);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes'] });
    },
  });
}

/** 节拍列表 */
export function useBeats(sceneId: string | null) {
  return useQuery({
    queryKey: ['beats', sceneId],
    queryFn: async () => {
      if (!sceneId) return [] as Beat[];
      const res = await api.get<Beat[]>(`/api/scenes/${sceneId}/beats`);
      return res;
    },
    enabled: !!sceneId,
  });
}

/** 创建节拍 */
export function useCreateBeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sceneId, data }: { sceneId: string; data: CreateBeatRequest }) => {
      const res = await api.post<Beat>(`/api/scenes/${sceneId}/beats`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['beats', vars.sceneId] });
    },
  });
}

/** 更新节拍 */
export function useUpdateBeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBeatRequest }) => {
      const res = await api.put<Beat>(`/api/beats/${id}`, data);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beats'] });
    },
  });
}

/** 删除节拍 */
export function useDeleteBeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ id: string }>(`/api/beats/${id}`);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beats'] });
    },
  });
}

/** 选项列表 */
export function useChoices(beatId: string | null) {
  return useQuery({
    queryKey: ['choices', beatId],
    queryFn: async () => {
      if (!beatId) return [] as Choice[];
      const res = await api.get<Choice[]>(`/api/beats/${beatId}/choices`);
      return res;
    },
    enabled: !!beatId,
  });
}

/** 创建选项 */
export function useCreateChoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ beatId, data }: { beatId: string; data: CreateChoiceRequest }) => {
      const res = await api.post<Choice>(`/api/beats/${beatId}/choices`, data);
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['choices', vars.beatId] });
    },
  });
}

/** 更新选项 */
export function useUpdateChoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateChoiceRequest }) => {
      const res = await api.put<Choice>(`/api/choices/${id}`, data);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['choices'] });
    },
  });
}

/** 删除选项 */
export function useDeleteChoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ id: string }>(`/api/choices/${id}`);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['choices'] });
    },
  });
}

// 批量重新排序场景
export function useReorderScenes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, items }: { workspaceId: string; items: Array<{ id: string; sceneOrder: number }> }) => {
      const res = await api.post<{ success: boolean }>(`/api/workspaces/${workspaceId}/scenes/reorder`, { items });
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['scenes', vars.workspaceId] });
    },
  });
}

// 批量重新排序节拍
export function useReorderBeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sceneId, items }: { sceneId: string; items: Array<{ id: string; beatOrder: number }> }) => {
      const res = await api.post<{ success: boolean }>(`/api/scenes/${sceneId}/beats/reorder`, { items });
      return res;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['beats', vars.sceneId] });
    },
  });
}
