import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// 工作区
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),              // UUID
  name: text('name').notNull(),
  description: text('description').default(''),
  settingsJson: text('settings_json').default('{}'),  // JSON string for theme, AI config etc
  calendarConfigJson: text('calendar_config_json').default('{}'),  // 自定义日历配置
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 轨道
export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').default('#3b82f6'),
  orderIndex: integer('order_index').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  workspaceIdx: index('tracks_workspace_idx').on(table.workspaceId),
}));

// 事件
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  summary: text('summary').default(''),
  description: text('description').default(''),
  location: text('location').default(''),
  startTime: integer('start_time', { mode: 'timestamp' }),
  endTime: integer('end_time', { mode: 'timestamp' }),
  orderIndex: integer('order_index').notNull().default(0),
  narrativeOrder: integer('narrative_order').default(0),  // 叙事顺序，独立于时间顺序
  color: text('color').default(''),
  tagsJson: text('tags_json').default('[]'),     // JSON array of tag strings
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('events_workspace_idx').on(table.workspaceId),
  trackIdx: index('events_track_idx').on(table.trackId),
  startTimeIdx: index('events_start_time_idx').on(table.startTime),
}));

// 角色
export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').default(''),
  description: text('description').default(''),
  avatarUrl: text('avatar_url').default(''),
  traitsJson: text('traits_json').default('[]'),  // JSON array of trait strings
}, (table) => ({
  workspaceIdx: index('characters_workspace_idx').on(table.workspaceId),
}));

// 事件-角色关联（多对多）
export const eventCharacters = sqliteTable('event_characters', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  roleDescription: text('role_description').default(''),
}, (table) => ({
  pk: uniqueIndex('event_characters_pk').on(table.eventId, table.characterId),
  eventIdx: index('event_characters_event_idx').on(table.eventId),
  characterIdx: index('event_characters_character_idx').on(table.characterId),
}));

// 事件-世界观设定关联（多对多）
export const eventWorldSettings = sqliteTable('event_world_settings', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  worldSettingId: text('world_setting_id').notNull().references(() => worldSettings.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: uniqueIndex('event_world_settings_pk').on(table.eventId, table.worldSettingId),
  eventIdx: index('event_world_settings_event_idx').on(table.eventId),
  worldSettingIdx: index('event_world_settings_ws_idx').on(table.worldSettingId),
}));

// 事件关联
export const connections = sqliteTable('connections', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceEventId: text('source_event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  targetEventId: text('target_event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),  // 因果/闪回/伏笔/平行/对比/呼应/转折
  description: text('description').default(''),
}, (table) => ({
  workspaceIdx: index('connections_workspace_idx').on(table.workspaceId),
  sourceIdx: index('connections_source_idx').on(table.sourceEventId),
  targetIdx: index('connections_target_idx').on(table.targetEventId),
}));

// 伏笔
export const foreshadowings = sqliteTable('foreshadowings', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  status: text('status').notNull().default('planted'),  // planted/developed/resolved/abandoned
  plantedEventId: text('planted_event_id').references(() => events.id, { onDelete: 'set null' }),
  resolvedEventId: text('resolved_event_id').references(() => events.id, { onDelete: 'set null' }),
  relatedForeshadowingIds: text('related_foreshadowing_ids').default('[]'),  // JSON array of foreshadowing IDs
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('foreshadowings_workspace_idx').on(table.workspaceId),
  statusIdx: index('foreshadowings_status_idx').on(table.status),
}));

// 世界观设定
export const worldSettings = sqliteTable('world_settings', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('general'),
  key: text('key').notNull(),
  value: text('value').default(''),
  description: text('description').default(''),
}, (table) => ({
  workspaceIdx: index('world_settings_workspace_idx').on(table.workspaceId),
  categoryIdx: index('world_settings_category_idx').on(table.category),
}));

// 自动保存
export const autoSaves = sqliteTable('auto_saves', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  dataJson: text('data_json').notNull(),  // Full workspace snapshot as JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('auto_saves_workspace_idx').on(table.workspaceId),
  createdIdx: index('auto_saves_created_idx').on(table.createdAt),
}));

// 大纲版本（细纲演进历史）
export const outlineVersions = sqliteTable('outline_versions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  description: text('description').default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('outline_versions_workspace_idx').on(table.workspaceId),
  createdIdx: index('outline_versions_created_idx').on(table.createdAt),
}));

// ============================================
// 视觉小说数据模型 (v1.2)
// ============================================

// 资产（图片/音频/地图底图等）
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),  // avatar/portrait/scene/map/bgm/sfx
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  sha256: text('sha256').notNull(),
  width: integer('width'),
  height: integer('height'),
  metadataJson: text('metadata_json').default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('assets_workspace_idx').on(table.workspaceId),
  sha256Idx: index('assets_sha256_idx').on(table.sha256),
  kindIdx: index('assets_kind_idx').on(table.kind),
}));

// 地图（Konva.js 标记地图，含场景/事件锚点）
export const maps = sqliteTable('maps', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  backgroundAssetId: text('background_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  width: integer('width').notNull().default(1920),
  height: integer('height').notNull().default(1080),
  markersJson: text('markers_json').default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('maps_workspace_idx').on(table.workspaceId),
}));

// 场景（视觉小说场景，对应 WebGAL 的一个 .txt 文件）
export const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  backgroundAssetId: text('background_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  bgm: text('bgm').default(''),
  sceneOrder: integer('scene_order').notNull().default(0),
  mapId: text('map_id').references(() => maps.id, { onDelete: 'set null' }),
  settingsJson: text('settings_json').default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('scenes_workspace_idx').on(table.workspaceId),
  orderIdx: index('scenes_order_idx').on(table.sceneOrder),
}));

// 节拍（场景内的最小叙事单元：台词/选项/跳转/音效/动画）
export const beats = sqliteTable('beats', {
  id: text('id').primaryKey(),
  sceneId: text('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),  // line/choice/jump/sfx/anim
  characterId: text('character_id').references(() => characters.id, { onDelete: 'set null' }),
  portraitAssetId: text('portrait_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  text: text('text').default(''),
  metadataJson: text('metadata_json').default('{}'),
  beatOrder: integer('beat_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  sceneIdx: index('beats_scene_idx').on(table.sceneId),
  orderIdx: index('beats_order_idx').on(table.beatOrder),
}));

// 选项（挂在 kind=choice 的 beat 下）
export const choices = sqliteTable('choices', {
  id: text('id').primaryKey(),
  beatId: text('beat_id').notNull().references(() => beats.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  nextSceneId: text('next_scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  condition: text('condition').default(''),  // Flag 表达式描述
  choiceOrder: integer('choice_order').notNull().default(0),
}, (table) => ({
  beatIdx: index('choices_beat_idx').on(table.beatId),
  orderIdx: index('choices_order_idx').on(table.choiceOrder),
}));

// 标志变量（控制剧情分支的条件变量）
export const flags = sqliteTable('flags', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  defaultValueJson: text('default_value_json').default('null'),
  description: text('description').default(''),
}, (table) => ({
  workspaceIdx: index('flags_workspace_idx').on(table.workspaceId),
  nameIdx: uniqueIndex('flags_name_idx').on(table.workspaceId, table.name),
}));

// 角色-资产关联（头像/立绘/表情变体）
export const characterAssets = sqliteTable('character_assets', {
  characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),  // avatar/portrait_default/portrait_smile 等
  displayOrder: integer('display_order').notNull().default(0),
}, (table) => ({
  pk: uniqueIndex('character_assets_pk').on(table.characterId, table.assetId, table.role),
  characterIdx: index('character_assets_character_idx').on(table.characterId),
  assetIdx: index('character_assets_asset_idx').on(table.assetId),
}));

// 事件-资产关联（场景缩略图/参考资料）
export const eventAssets = sqliteTable('event_assets', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),  // scene_thumb/reference
}, (table) => ({
  pk: uniqueIndex('event_assets_pk').on(table.eventId, table.assetId, table.role),
  eventIdx: index('event_assets_event_idx').on(table.eventId),
  assetIdx: index('event_assets_asset_idx').on(table.assetId),
}));

// 场景-资产关联（背景/叠加层/BGM）
export const sceneAssets = sqliteTable('scene_assets', {
  sceneId: text('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),  // background/overlay/bgm
}, (table) => ({
  pk: uniqueIndex('scene_assets_pk').on(table.sceneId, table.assetId, table.role),
  sceneIdx: index('scene_assets_scene_idx').on(table.sceneId),
  assetIdx: index('scene_assets_asset_idx').on(table.assetId),
}));

// 操作历史 / 时光机（通用修订记录）
export const revisions = sqliteTable('revisions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),  // event/scene/beat/character/track/foreshadowing/worldsetting/connection/flag/map
  entityId: text('entity_id').notNull(),
  op: text('op').notNull(),  // create/update/delete
  beforeJson: text('before_json').default('{}'),  // 操作前的完整快照
  afterJson: text('after_json').default('{}'),    // 操作后的完整快照
  summary: text('summary').default(''),           // 可选的人类可读描述
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('revisions_workspace_idx').on(table.workspaceId),
  entityIdx: index('revisions_entity_idx').on(table.entityType, table.entityId),
  createdIdx: index('revisions_created_idx').on(table.createdAt),
}));

// 书签（快速定位时间轴事件）
export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').default('#3b82f6'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('bookmarks_workspace_idx').on(table.workspaceId),
  eventIdx: index('bookmarks_event_idx').on(table.eventId),
}));

// ============================================
// AI 对话历史缓存表 (v3.5)
// ============================================
export const aiConversations = sqliteTable('ai_conversations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('新对话'),
  messagesJson: text('messages_json').notNull().default('[]'),  // JSON array of {role, content, timestamp}
  summary: text('summary').default(''),  // 自动生成的对话摘要
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('ai_conversations_workspace_idx').on(table.workspaceId),
  createdIdx: index('ai_conversations_created_idx').on(table.createdAt),
}));

// ============================================
// AI 语义缓存表 (v3.5) — 缓存相似查询的响应，减少 API 调用
// ============================================
export const aiCache = sqliteTable('ai_cache', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  queryHash: text('query_hash').notNull(),  // 查询文本的 SHA-256 哈希
  queryText: text('query_text').notNull(),  // 原始查询文本（用于调试和显示）
  response: text('response').notNull(),      // 缓存的 AI 响应
  model: text('model').notNull(),             // 使用的模型
  hitCount: integer('hit_count').notNull().default(0),  // 命中次数
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  workspaceIdx: index('ai_cache_workspace_idx').on(table.workspaceId),
  hashIdx: uniqueIndex('ai_cache_hash_idx').on(table.workspaceId, table.queryHash),
  hitIdx: index('ai_cache_hit_idx').on(table.hitCount),
}));
