const UUID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

// 通用 id 参数（用于 workspaces 路由的 :id 参数）
export const idParam = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const workspaceIdParam = {
  type: 'object',
  required: ['workspaceId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const eventIdParam = {
  type: 'object',
  required: ['workspaceId', 'eventId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    eventId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const trackIdParam = {
  type: 'object',
  required: ['workspaceId', 'trackId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    trackId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const characterIdParam = {
  type: 'object',
  required: ['workspaceId', 'charId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    charId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const foreshadowingIdParam = {
  type: 'object',
  required: ['workspaceId', 'foreshadowingId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    foreshadowingId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const settingIdParam = {
  type: 'object',
  required: ['workspaceId', 'settingId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    settingId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const connectionIdParam = {
  type: 'object',
  required: ['workspaceId', 'connectionId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    connectionId: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const createEventBody = {
  type: 'object',
  required: ['title'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    trackId: { anyOf: [{ type: 'string', pattern: UUID_PATTERN }, { type: 'null' }] },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    summary: { type: 'string', maxLength: 500 },
    description: { type: 'string', maxLength: 5000 },
    location: { type: 'string', maxLength: 200 },
    startTime: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    endTime: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    orderIndex: { type: 'integer' },
    narrativeOrder: { type: 'integer' },
    color: { type: 'string', maxLength: 50 },
    tagsJson: { type: 'string' },
    characterIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN } },
  },
} as const;

export const updateEventBody = {
  type: 'object',
  properties: {
    trackId: { anyOf: [{ type: 'string', pattern: UUID_PATTERN }, { type: 'null' }] },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    summary: { type: 'string', maxLength: 500 },
    description: { type: 'string', maxLength: 5000 },
    location: { type: 'string', maxLength: 200 },
    startTime: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    endTime: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    orderIndex: { type: 'integer' },
    narrativeOrder: { type: 'integer' },
    color: { type: 'string', maxLength: 50 },
    tagsJson: { type: 'string' },
    characterIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN } },
  },
} as const;

export const createTrackBody = {
  type: 'object',
  required: ['name'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    color: { type: 'string', maxLength: 50 },
    orderIndex: { type: 'integer' },
    isVisible: { type: 'boolean' },
  },
} as const;

export const updateTrackBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    color: { type: 'string', maxLength: 50 },
    orderIndex: { type: 'integer' },
    isVisible: { type: 'boolean' },
  },
} as const;

export const createCharacterBody = {
  type: 'object',
  required: ['name'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    role: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 2000 },
    avatarUrl: { type: 'string', maxLength: 500 },
    traitsJson: { type: 'string' },
  },
} as const;

export const updateCharacterBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    role: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 2000 },
    avatarUrl: { type: 'string', maxLength: 500 },
    traitsJson: { type: 'string' },
  },
} as const;

export const createForeshadowingBody = {
  type: 'object',
  required: ['title'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    status: { type: 'string', enum: ['planted', 'developed', 'resolved', 'abandoned'] },
    plantedEventId: { anyOf: [{ type: 'string', pattern: UUID_PATTERN }, { type: 'null' }] },
    resolvedEventId: { anyOf: [{ type: 'string', pattern: UUID_PATTERN }, { type: 'null' }] },
  },
} as const;

export const updateForeshadowingBody = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    status: { type: 'string', enum: ['planted', 'developed', 'resolved', 'abandoned'] },
    plantedEventId: { anyOf: [{ type: 'string', pattern: UUID_PATTERN }, { type: 'null' }] },
    resolvedEventId: { anyOf: [{ type: 'string', pattern: UUID_PATTERN }, { type: 'null' }] },
  },
} as const;

export const createWorldSettingBody = {
  type: 'object',
  required: ['category', 'key'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    key: { type: 'string', minLength: 1, maxLength: 100 },
    value: { type: 'string', maxLength: 2000 },
    description: { type: 'string', maxLength: 2000 },
  },
} as const;

export const updateWorldSettingBody = {
  type: 'object',
  properties: {
    category: { type: 'string', minLength: 1, maxLength: 100 },
    key: { type: 'string', minLength: 1, maxLength: 100 },
    value: { type: 'string', maxLength: 2000 },
    description: { type: 'string', maxLength: 2000 },
  },
} as const;

export const createConnectionBody = {
  type: 'object',
  required: ['sourceEventId', 'targetEventId', 'type'],
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    sourceEventId: { type: 'string', pattern: UUID_PATTERN },
    targetEventId: { type: 'string', pattern: UUID_PATTERN },
    type: { type: 'string', enum: ['因果', '闪回', '伏笔', '平行', '对比', '呼应', '转折'] },
    description: { type: 'string', maxLength: 500 },
  },
} as const;

export const updateConnectionBody = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['因果', '闪回', '伏笔', '平行', '对比', '呼应', '转折'] },
    description: { type: 'string', maxLength: 500 },
  },
} as const;

export const createWorkspaceBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    settingsJson: { type: 'string' },
  },
} as const;

export const updateWorkspaceBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    settingsJson: { type: 'string' },
    calendarConfigJson: { type: 'string' },
  },
} as const;

export const autoSaveBody = {
  type: 'object',
  required: ['dataJson'],
  properties: {
    dataJson: { type: 'string', minLength: 1 },
  },
} as const;

// AI 对话请求 body
export const aiChatBody = {
  type: 'object',
  required: ['messages'],
  properties: {
    messages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['role', 'content'],
        properties: {
          role: { type: 'string', enum: ['system', 'user', 'assistant'] },
          content: { type: 'string', minLength: 1 },
        },
      },
    },
    provider: { type: 'string', enum: ['siliconflow', 'openai'] },
    apiKey: { type: 'string' },
    model: { type: 'string' },
    stream: { type: 'boolean' },
  },
} as const;

// AI 连接测试 body
export const aiTestBody = {
  type: 'object',
  properties: {
    provider: { type: 'string', enum: ['siliconflow', 'openai'] },
    apiKey: { type: 'string' },
  },
} as const;
