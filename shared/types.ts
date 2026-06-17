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
}

/** 更新伏笔请求 */
export interface UpdateForeshadowingRequest {
  title?: string;
  description?: string;
  status?: ForeshadowingStatus;
  plantedEventId?: string | null;
  resolvedEventId?: string | null;
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
}
