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
