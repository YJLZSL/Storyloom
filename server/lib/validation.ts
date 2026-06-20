import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';

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
  required: ['workspaceId', 'foresId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    foresId: { type: 'string', pattern: UUID_PATTERN },
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
  required: ['workspaceId', 'connId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    connId: { type: 'string', pattern: UUID_PATTERN },
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
    characterIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN }, default: [] },
    worldSettingIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN }, default: [] },
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
    characterIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN }, default: [] },
    worldSettingIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN }, default: [] },
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
    relatedForeshadowingIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN }, default: [] },
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
    relatedForeshadowingIds: { type: 'array', items: { type: 'string', pattern: UUID_PATTERN }, default: [] },
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

// ============================================
// 视觉小说校验 Schema (v1.2)
// ============================================

// 灵活 ID 模式：接受 UUID 或任何非空字符串（兼容 nanoid 等短 ID）
const FLEXIBLE_ID = '^.+$';

// --- 路由参数 ---

export const sceneIdParam = {
  type: 'object',
  required: ['workspaceId', 'sceneId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    sceneId: { type: 'string', pattern: FLEXIBLE_ID },
  },
} as const;

export const beatIdParam = {
  type: 'object',
  required: ['sceneId', 'beatId'],
  properties: {
    sceneId: { type: 'string', pattern: FLEXIBLE_ID },
    beatId: { type: 'string', pattern: FLEXIBLE_ID },
  },
} as const;

export const choiceIdParam = {
  type: 'object',
  required: ['beatId', 'choiceId'],
  properties: {
    beatId: { type: 'string', pattern: FLEXIBLE_ID },
    choiceId: { type: 'string', pattern: FLEXIBLE_ID },
  },
} as const;

export const flagIdParam = {
  type: 'object',
  required: ['workspaceId', 'flagId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    flagId: { type: 'string', pattern: FLEXIBLE_ID },
  },
} as const;

export const assetIdParam = {
  type: 'object',
  required: ['assetId'],
  properties: {
    assetId: { type: 'string', pattern: FLEXIBLE_ID },
  },
} as const;

export const mapIdParam = {
  type: 'object',
  required: ['workspaceId', 'mapId'],
  properties: {
    workspaceId: { type: 'string', pattern: UUID_PATTERN },
    mapId: { type: 'string', pattern: FLEXIBLE_ID },
  },
} as const;

// --- 场景 Body ---

export const createSceneBody = {
  type: 'object',
  required: ['name'],
  properties: {
    id: { type: 'string', pattern: FLEXIBLE_ID },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    backgroundAssetId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    bgm: { type: 'string', maxLength: 500 },
    sceneOrder: { type: 'integer' },
    mapId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    settingsJson: { type: 'string' },
  },
} as const;

export const updateSceneBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    backgroundAssetId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    bgm: { type: 'string', maxLength: 500 },
    sceneOrder: { type: 'integer' },
    mapId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    settingsJson: { type: 'string' },
  },
} as const;

// --- 节拍 Body ---

export const createBeatBody = {
  type: 'object',
  required: ['kind'],
  properties: {
    id: { type: 'string', pattern: FLEXIBLE_ID },
    kind: { type: 'string', enum: ['line', 'choice', 'jump', 'sfx', 'anim'] },
    characterId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    portraitAssetId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    text: { type: 'string', maxLength: 5000 },
    metadataJson: { type: 'string' },
    beatOrder: { type: 'integer' },
  },
} as const;

export const updateBeatBody = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['line', 'choice', 'jump', 'sfx', 'anim'] },
    characterId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    portraitAssetId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    text: { type: 'string', maxLength: 5000 },
    metadataJson: { type: 'string' },
    beatOrder: { type: 'integer' },
  },
} as const;

// --- 选项 Body ---

export const createChoiceBody = {
  type: 'object',
  required: ['label'],
  properties: {
    id: { type: 'string', pattern: FLEXIBLE_ID },
    label: { type: 'string', minLength: 1, maxLength: 200 },
    nextSceneId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    condition: { type: 'string', maxLength: 500 },
    choiceOrder: { type: 'integer' },
  },
} as const;

export const updateChoiceBody = {
  type: 'object',
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 200 },
    nextSceneId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    condition: { type: 'string', maxLength: 500 },
    choiceOrder: { type: 'integer' },
  },
} as const;

// --- 标志变量 Body ---

export const createFlagBody = {
  type: 'object',
  required: ['name'],
  properties: {
    id: { type: 'string', pattern: FLEXIBLE_ID },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    defaultValueJson: { type: 'string' },
    description: { type: 'string', maxLength: 500 },
  },
} as const;

export const updateFlagBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    defaultValueJson: { type: 'string' },
    description: { type: 'string', maxLength: 500 },
  },
} as const;

// --- 资产 Body（元数据，物理文件通过 multipart 上传） ---

export const createAssetBody = {
  type: 'object',
  required: ['kind', 'fileName', 'mimeType', 'fileSize', 'sha256'],
  properties: {
    id: { type: 'string', pattern: FLEXIBLE_ID },
    kind: { type: 'string', enum: ['avatar', 'portrait', 'scene', 'map', 'bgm', 'sfx'] },
    fileName: { type: 'string', minLength: 1, maxLength: 500 },
    mimeType: { type: 'string', minLength: 1, maxLength: 200 },
    fileSize: { type: 'integer', minimum: 0 },
    sha256: { type: 'string', minLength: 1, maxLength: 100 },
    width: { type: 'integer' },
    height: { type: 'integer' },
    metadataJson: { type: 'string' },
  },
} as const;

// --- 地图 Body ---

export const createMapBody = {
  type: 'object',
  required: ['name'],
  properties: {
    id: { type: 'string', pattern: FLEXIBLE_ID },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    backgroundAssetId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    width: { type: 'integer', minimum: 100, maximum: 10000 },
    height: { type: 'integer', minimum: 100, maximum: 10000 },
    markersJson: { type: 'string' },
  },
} as const;

export const updateMapBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    backgroundAssetId: { anyOf: [{ type: 'string', pattern: FLEXIBLE_ID }, { type: 'null' }] },
    width: { type: 'integer', minimum: 100, maximum: 10000 },
    height: { type: 'integer', minimum: 100, maximum: 10000 },
    markersJson: { type: 'string' },
  },
} as const;

// --- 通用排序 Body ---

export const reorderBody = {
  type: 'object',
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'order'],
        properties: {
          id: { type: 'string', pattern: FLEXIBLE_ID },
          order: { type: 'integer', minimum: 0 },
        },
      },
    },
  },
} as const;

// --- 资产绑定 Body ---

export const bindCharacterAssetBody = {
  type: 'object',
  required: ['assetId', 'role'],
  properties: {
    assetId: { type: 'string', pattern: FLEXIBLE_ID },
    role: { type: 'string', minLength: 1, maxLength: 50 },
    displayOrder: { type: 'integer' },
  },
} as const;

export const bindEventAssetBody = {
  type: 'object',
  required: ['assetId', 'role'],
  properties: {
    assetId: { type: 'string', pattern: FLEXIBLE_ID },
    role: { type: 'string', minLength: 1, maxLength: 50 },
  },
} as const;

export const bindSceneAssetBody = {
  type: 'object',
  required: ['assetId', 'role'],
  properties: {
    assetId: { type: 'string', pattern: FLEXIBLE_ID },
    role: { type: 'string', minLength: 1, maxLength: 50 },
  },
} as const;

// ============================================
// 全文搜索 / 替换 (v1.3)
// ============================================

export const searchQuery = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string', minLength: 1, maxLength: 500 },
    scope: { type: 'string', maxLength: 500 },
  },
} as const;

export const replaceBody = {
  type: 'object',
  required: ['q', 'replacement'],
  properties: {
    q: { type: 'string', minLength: 1, maxLength: 500 },
    replacement: { type: 'string', maxLength: 500 },
    scope: {
      anyOf: [
        { type: 'string', maxLength: 500 },
        { type: 'array', items: { type: 'string' } },
      ],
    },
    dryRun: { type: 'boolean' },
  },
} as const;

// ============================================
// 公共校验函数 (v1.3)
// ============================================

export async function validateWorkspaceExists(
  app: FastifyInstance,
  workspaceId: string,
  reply: FastifyReply
): Promise<boolean> {
  const { workspaces } = await import('../db/schema.js');
  const ws = app.db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  if (!ws) {
    reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    return false;
  }
  return true;
}
