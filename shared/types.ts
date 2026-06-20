// ============================================
// AI Timeline Creator V4.0 — 共享类型定义
// ============================================

// --- 基础类型 ---

/** 连接类型 */
export type ConnectionType = '因果' | '闪回' | '伏笔' | '平行' | '对比' | '呼应' | '转折';

/** 伏笔状态 */
export type ForeshadowingStatus = 'planted' | 'developed' | 'resolved' | 'abandoned';

// --- 数据模型类型 ---

/** 工作区 */
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  settingsJson: string | null;
  calendarConfigJson: string | null;  // 自定义日历配置
  createdAt: Date;
  updatedAt: Date;
}

/** 工作区设置（settingsJson 解析后的结构） */
export interface WorkspaceSettings {
  theme?: string;
  aiProvider?: 'siliconflow' | 'openai';
  aiModel?: string;
  aiApiKey?: string;
  [key: string]: unknown;
}

/** 轨道 */
export interface Track {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  orderIndex: number;
  isVisible: boolean;
}

/** 时间轴事件 */
export interface TimelineEvent {
  id: string;
  workspaceId: string;
  trackId: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  startTime: Date | null;
  endTime: Date | null;
  orderIndex: number;
  narrativeOrder: number | null;  // 叙事顺序，独立于时间顺序
  color: string | null;
  tagsJson: string | null;  // JSON string of string[]
  characterIds?: string[];  // 关联角色 ID 列表（API 返回时附带）
  worldSettingIds?: string[];  // 关联世界观设定 ID 列表（API 返回时附带）
  createdAt: Date;
  updatedAt: Date;
}

/** 事件标签（tagsJson 解析后） */
export type EventTags = string[];

/** 角色 */
export interface Character {
  id: string;
  workspaceId: string;
  name: string;
  role: string | null;
  description: string | null;
  avatarUrl: string | null;
  traitsJson: string | null;  // JSON string of string[]
}

/** 角色特征（traitsJson 解析后） */
export type CharacterTraits = string[];

/** 事件-角色关联 */
export interface EventCharacter {
  eventId: string;
  characterId: string;
  roleDescription: string | null;
}

/** 事件关联 */
export interface Connection {
  id: string;
  workspaceId: string;
  sourceEventId: string;
  targetEventId: string;
  type: string;
  description: string | null;
}

/** 伏笔 */
export interface Foreshadowing {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  plantedEventId: string | null;
  resolvedEventId: string | null;
  relatedForeshadowingIds?: string[];  // 关联伏笔 ID 列表（API 返回时附带）
  createdAt: Date;
  updatedAt: Date;
}

/** 世界观设定 */
export interface WorldSetting {
  id: string;
  workspaceId: string;
  category: string;
  key: string;
  value: string | null;
  description: string | null;
}

/** 自动保存 */
export interface AutoSave {
  id: string;
  workspaceId: string;
  dataJson: string;
  createdAt: Date;
}

/** 大纲版本（细纲演进历史） */
export interface OutlineVersion {
  id: string;
  workspaceId: string;
  content: string;
  description: string | null;
  createdAt: Date;
}

/** 创建大纲版本请求 */
export interface CreateOutlineVersionRequest {
  id?: string;
  content: string;
  description?: string;
}

// --- 视觉小说数据模型类型 (v1.2) ---

/** 节拍类型 */
export type BeatKind = 'line' | 'choice' | 'jump' | 'sfx' | 'anim';

/** 资产类型 */
export type AssetKind = 'avatar' | 'portrait' | 'scene' | 'map' | 'bgm' | 'sfx';

/** 角色资产角色 */
export type CharacterAssetRole = 'avatar' | 'portrait_default' | 'portrait_smile' | 'portrait_sad' | 'portrait_angry' | 'portrait_surprise';

/** 事件资产角色 */
export type EventAssetRole = 'scene_thumb' | 'reference';

/** 场景资产角色 */
export type SceneAssetRole = 'background' | 'overlay' | 'bgm';

/** 资产 */
export interface Asset {
  id: string;
  workspaceId: string;
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  width: number | null;
  height: number | null;
  metadataJson: string | null;
  createdAt: Date;
}

/** 地图 */
export interface StoryMap {
  id: string;
  workspaceId: string;
  name: string;
  backgroundAssetId: string | null;
  width: number;
  height: number;
  markersJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 地图标记点 */
export interface MapMarker {
  id: string;
  x: number;
  y: number;
  label: string;
  sceneId: string | null;
  eventId: string | null;
  iconKey: string;
}

/** 场景 */
export interface Scene {
  id: string;
  workspaceId: string;
  name: string;
  backgroundAssetId: string | null;
  bgm: string | null;
  sceneOrder: number;
  mapId: string | null;
  settingsJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 节拍（场景内最小叙事单元） */
export interface Beat {
  id: string;
  sceneId: string;
  kind: BeatKind;
  characterId: string | null;
  portraitAssetId: string | null;
  text: string | null;
  metadataJson: string | null;
  beatOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 选项 */
export interface Choice {
  id: string;
  beatId: string;
  label: string;
  nextSceneId: string | null;
  condition: string | null;
  choiceOrder: number;
}

/** 标志变量 */
export interface Flag {
  id: string;
  workspaceId: string;
  name: string;
  defaultValueJson: string | null;
  description: string | null;
}

/** 角色-资产关联 */
export interface CharacterAsset {
  characterId: string;
  assetId: string;
  role: string;
  displayOrder: number;
}

/** 事件-资产关联 */
export interface EventAsset {
  eventId: string;
  assetId: string;
  role: string;
}

/** 场景-资产关联 */
export interface SceneAsset {
  sceneId: string;
  assetId: string;
  role: string;
}

/** 操作历史修订记录 */
export type RevisionOp = 'create' | 'update' | 'delete';

export interface Revision {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  op: RevisionOp;
  beforeJson: string | null;
  afterJson: string | null;
  summary: string | null;
  createdAt: Date;
}

/** 创建修订记录请求 */
export interface CreateRevisionRequest {
  entityType: string;
  entityId: string;
  op: RevisionOp;
  beforeJson?: string;
  afterJson?: string;
  summary?: string;
}

// --- 视觉小说 API 请求类型 ---

/** 创建资产请求（元数据，物理文件通过 multipart 上传） */
export interface CreateAssetRequest {
  id?: string;
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  width?: number;
  height?: number;
  metadataJson?: string;
}

/** 创建地图请求 */
export interface CreateMapRequest {
  id?: string;
  name: string;
  backgroundAssetId?: string | null;
  width?: number;
  height?: number;
  markersJson?: string;
}

/** 更新地图请求 */
export interface UpdateMapRequest {
  name?: string;
  backgroundAssetId?: string | null;
  width?: number;
  height?: number;
  markersJson?: string;
}

/** 创建场景请求 */
export interface CreateSceneRequest {
  id?: string;
  name: string;
  backgroundAssetId?: string | null;
  bgm?: string;
  sceneOrder?: number;
  mapId?: string | null;
  settingsJson?: string;
}

/** 更新场景请求 */
export interface UpdateSceneRequest {
  name?: string;
  backgroundAssetId?: string | null;
  bgm?: string;
  sceneOrder?: number;
  mapId?: string | null;
  settingsJson?: string;
}

/** 创建节拍请求 */
export interface CreateBeatRequest {
  id?: string;
  kind: BeatKind;
  characterId?: string | null;
  portraitAssetId?: string | null;
  text?: string;
  metadataJson?: string;
  beatOrder?: number;
}

/** 更新节拍请求 */
export interface UpdateBeatRequest {
  kind?: BeatKind;
  characterId?: string | null;
  portraitAssetId?: string | null;
  text?: string;
  metadataJson?: string;
  beatOrder?: number;
}

/** 创建选项请求 */
export interface CreateChoiceRequest {
  id?: string;
  label: string;
  nextSceneId?: string | null;
  condition?: string;
  choiceOrder?: number;
}

/** 更新选项请求 */
export interface UpdateChoiceRequest {
  label?: string;
  nextSceneId?: string | null;
  condition?: string;
  choiceOrder?: number;
}

/** 创建标志变量请求 */
export interface CreateFlagRequest {
  id?: string;
  name: string;
  defaultValueJson?: string;
  description?: string;
}

/** 更新标志变量请求 */
export interface UpdateFlagRequest {
  name?: string;
  defaultValueJson?: string;
  description?: string;
}

/** 批量排序请求 */
export interface ReorderRequest {
  items: Array<{ id: string; order: number }>;
}

/** 角色资产绑定请求 */
export interface BindCharacterAssetRequest {
  assetId: string;
  role: string;
  displayOrder?: number;
}

/** 事件资产绑定请求 */
export interface BindEventAssetRequest {
  assetId: string;
  role: string;
}

/** 场景资产绑定请求 */
export interface BindSceneAssetRequest {
  assetId: string;
  role: string;
}

// --- API 请求/响应类型 ---

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;     // 从 1 开始，默认 1
  pageSize?: number; // 默认 50，最大 200
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 事件列表过滤参数 */
export interface EventFilterParams extends PaginationParams {
  trackId?: string;
  search?: string;
  startDate?: number;
  endDate?: number;
  sortBy?: 'startTime' | 'orderIndex' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/** 创建工作区请求 */
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

/** 更新工作区请求 */
export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settingsJson?: string;
  calendarConfigJson?: string;  // 自定义日历配置 JSON
}

/** 创建事件请求 */
export interface CreateEventRequest {
  id?: string;
  trackId?: string;
  title: string;
  summary?: string;
  description?: string;
  location?: string;
  startTime?: number | null;
  endTime?: number | null;
  orderIndex?: number;
  narrativeOrder?: number;  // 叙事顺序
  color?: string;
  tagsJson?: string;
  characterIds?: string[];  // 关联角色 ID 列表
  worldSettingIds?: string[];  // 关联世界观设定 ID 列表
}

/** 更新事件请求 */
export interface UpdateEventRequest {
  trackId?: string | null;
  title?: string;
  summary?: string;
  description?: string;
  location?: string;
  startTime?: number | null;
  endTime?: number | null;
  orderIndex?: number;
  narrativeOrder?: number;  // 叙事顺序
  color?: string;
  tagsJson?: string;
  characterIds?: string[];
  worldSettingIds?: string[];
}

/** 批量操作项 */
export interface BatchOperation<T = unknown> {
  type: 'create' | 'update' | 'delete' | 'reorder';
  data: T;
}

/** 批量事件操作请求 */
export interface BatchEventsRequest {
  operations: BatchOperation[];
}

/** 创建轨道请求 */
export interface CreateTrackRequest {
  id?: string;
  name: string;
  color?: string;
  orderIndex?: number;
  isVisible?: boolean;
}

/** 更新轨道请求 */
export interface UpdateTrackRequest {
  name?: string;
  color?: string;
  orderIndex?: number;
  isVisible?: boolean;
}

/** 创建角色请求 */
export interface CreateCharacterRequest {
  id?: string;
  name: string;
  role?: string;
  description?: string;
  avatarUrl?: string;
  traitsJson?: string;
}

/** 更新角色请求 */
export interface UpdateCharacterRequest {
  name?: string;
  role?: string;
  description?: string;
  avatarUrl?: string;
  traitsJson?: string;
}

/** 创建关联请求 */
export interface CreateConnectionRequest {
  id?: string;
  sourceEventId: string;
  targetEventId: string;
  type: ConnectionType;
  description?: string;
}

/** 更新关联请求 */
export interface UpdateConnectionRequest {
  type?: ConnectionType;
  description?: string;
}

/** 创建伏笔请求 */
export interface CreateForeshadowingRequest {
  id?: string;
  title: string;
  description?: string;
  status?: ForeshadowingStatus;
  plantedEventId?: string | null;
  resolvedEventId?: string | null;
  relatedForeshadowingIds?: string[];
}

/** 更新伏笔请求 */
export interface UpdateForeshadowingRequest {
  title?: string;
  description?: string;
  status?: ForeshadowingStatus;
  plantedEventId?: string | null;
  resolvedEventId?: string | null;
  relatedForeshadowingIds?: string[];
}

/** 创建世界观设定请求 */
export interface CreateWorldSettingRequest {
  id?: string;
  category: string;
  key: string;
  value?: string;
  description?: string;
}

/** 更新世界观设定请求 */
export interface UpdateWorldSettingRequest {
  category?: string;
  key?: string;
  value?: string;
  description?: string;
}

/** AI 对话请求 */
export interface AIChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  provider?: 'siliconflow' | 'openai';
  apiKey?: string;
  model?: string;
  stream?: boolean;
}

/** AI 对话响应（非流式） */
export interface AIChatResponse {
  content: string;
  model: string;
  provider: string;
  degraded?: boolean;
  error?: string;
}

/** 导出数据结构 */
export interface ExportData {
  version: '4.0';
  workspace: Record<string, unknown>;
  events: Record<string, unknown>[];
  tracks: Record<string, unknown>[];
  characters: Record<string, unknown>[];
  eventCharacters: Record<string, unknown>[];
  eventWorldSettings?: Array<{ eventId: string; worldSettingId: string }>;
  connections: Record<string, unknown>[];
  foreshadowings: Record<string, unknown>[];
  worldSettings: Record<string, unknown>[];
  outlineVersions?: Record<string, unknown>[];
  // 视觉小说数据 (v1.2)
  scenes?: Record<string, unknown>[];
  beats?: Record<string, unknown>[];
  choices?: Record<string, unknown>[];
  flags?: Record<string, unknown>[];
  maps?: Record<string, unknown>[];
  assets?: Record<string, unknown>[];
  characterAssets?: Record<string, unknown>[];
  eventAssets?: Record<string, unknown>[];
  sceneAssets?: Record<string, unknown>[];
  exportedAt: number;
}

/** 健康检查响应 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: number;
  database: {
    connected: boolean;
    walMode: boolean;
    integrity: boolean;
    workspaceCount: number;
  };
  dbStats?: {
    walMode: string;
    userVersion: number;
  };
}
