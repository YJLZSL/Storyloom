import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import pino from 'pino';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

const dbLog = pino({ name: 'db' });

// 环境分离：开发环境使用项目目录 ./data/dev.db；生产环境使用 Electron 设置的 DATA_DIR/timeline.db
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const DATA_DIR = isDev
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));

const DB_FILENAME = isDev ? 'dev.db' : 'timeline.db';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDb(): ReturnType<typeof drizzle> {
  if (dbInstance) return dbInstance;

  // 确保 data 目录存在
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'EACCES') {
        dbLog.error({ err, dataDir: DATA_DIR }, '创建数据目录失败（权限不足）');
        process.exit(1);
      }
      dbLog.error({ err, dataDir: DATA_DIR }, '创建数据目录失败（已忽略，继续启动）');
    }
  }

  const dbPath = path.join(DATA_DIR, DB_FILENAME);

  sqliteInstance = new Database(dbPath);

  // 启用 WAL 模式（提升并发读写性能）
  sqliteInstance.pragma('journal_mode = WAL');
  // 启用外键约束
  sqliteInstance.pragma('foreign_keys = ON');
  // 设置 busy 超时（ms）
  sqliteInstance.pragma('busy_timeout = 5000');

  dbInstance = drizzle(sqliteInstance, { schema });

  return dbInstance;
}

export function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    getDb(); // 初始化
  }
  return sqliteInstance!;
}

/** 检查表是否存在 */
function tableExists(table: string): boolean {
  if (!sqliteInstance) return false;
  const rows = sqliteInstance
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .all(table) as Array<{ name: string }>;
  return rows.length > 0;
}

export function runMigrations(): void {
  const db = getDb();
  const sqlite = sqliteInstance!;

  // ── Step 1: 解析迁移目录 ──
  let migrationsPath = process.env.MIGRATIONS_DIR;

  if (!migrationsPath) {
    const moduleDir = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')));
    const moduleMigrationsPath = path.join(moduleDir, 'drizzle');
    const cwdMigrationsPath = path.join(process.cwd(), 'drizzle');
    migrationsPath = fs.existsSync(moduleMigrationsPath) ? moduleMigrationsPath : cwdMigrationsPath;
  }

  dbLog.info({ migrationsPath }, '[migration] starting');

  // ── Step 2: 尝试标准 drizzle migrate() ──
  if (fs.existsSync(migrationsPath)) {
    try {
      migrate(db, { migrationsFolder: migrationsPath });
      dbLog.info('[migration] drizzle migrate() completed');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        dbLog.warn({ err, migrationsPath }, '[migration] meta file missing, will use fallback');
      } else {
        dbLog.error({ err }, '[migration] drizzle migrate() failed, will try manual fallback');
      }
    }
  } else {
    dbLog.warn({ migrationsPath }, '[migration] folder not found, will use fallback');
  }

  // ── Step 3: 检查迁移是否成功 ──
  if (tableExists('workspaces')) {
    dbLog.info('[migration] workspaces table exists — migration OK');
    ensureSchemaCompatibility();
    return;
  }

  // ── Step 4: 手动读取并执行迁移 SQL（绕过 drizzle migrate 在 asar 内的静默失败） ──
  dbLog.warn('[migration] workspaces table missing — trying manual SQL execution');
  if (fs.existsSync(migrationsPath)) {
    try {
      const journalPath = path.join(migrationsPath, 'meta', '_journal.json');
      if (fs.existsSync(journalPath)) {
        const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
        const entries = (journal.entries || []) as Array<{ tag: string }>;
        dbLog.info({ count: entries.length }, '[migration] journal entries found');

        // 临时关闭外键约束以允许乱序建表
        sqlite.pragma('foreign_keys = OFF');

        for (const entry of entries) {
          const sqlFile = path.join(migrationsPath, `${entry.tag}.sql`);
          if (!fs.existsSync(sqlFile)) {
            dbLog.warn({ sqlFile }, '[migration] SQL file missing, skipping');
            continue;
          }
          const content = fs.readFileSync(sqlFile, 'utf-8');
          // drizzle 用 --> statement-breakpoint 分隔多条语句
          const statements = content.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
          for (const stmt of statements) {
            try {
              sqlite.exec(stmt);
            } catch (stmtErr) {
              // "already exists" 是幂等的，忽略；其它错误记录但不中断
              const msg = (stmtErr as Error).message || '';
              if (msg.includes('already exists')) continue;
              dbLog.warn({ err: stmtErr, stmt: stmt.slice(0, 120) }, '[migration] statement failed (ignored)');
            }
          }
          dbLog.info({ tag: entry.tag }, '[migration] applied');
        }

        // 恢复外键约束
        sqlite.pragma('foreign_keys = ON');

        if (tableExists('workspaces')) {
          dbLog.info('[migration] manual SQL execution succeeded');
          ensureSchemaCompatibility();
          return;
        }
      } else {
        dbLog.warn('[migration] _journal.json not found');
      }
    } catch (err) {
      dbLog.error({ err }, '[migration] manual SQL execution failed');
    }
  }

  // ── Step 5: 最终兜底 — 用 readMigrationFiles API 尝试 ──
  dbLog.warn('[migration] trying drizzle readMigrationFiles API fallback');
  try {
    const migrations = readMigrationFiles({ migrationsFolder: migrationsPath });
    sqlite.pragma('foreign_keys = OFF');
    for (const migration of migrations) {
      for (const stmt of migration.sql) {
        try {
          sqlite.exec(stmt);
        } catch (stmtErr) {
          const msg = (stmtErr as Error).message || '';
          if (msg.includes('already exists')) continue;
          dbLog.warn({ err: stmtErr }, '[migration] readMigrationFiles stmt failed (ignored)');
        }
      }
    }
    sqlite.pragma('foreign_keys = ON');
    if (tableExists('workspaces')) {
      dbLog.info('[migration] readMigrationFiles fallback succeeded');
      ensureSchemaCompatibility();
      return;
    }
  } catch (err) {
    dbLog.error({ err }, '[migration] readMigrationFiles fallback failed');
  }

  // ── Step 6: 终极兜底 — 硬编码建表 DDL（按依赖顺序） ──
  dbLog.warn('[migration] all migration methods failed — executing hardcoded DDL');
  sqlite.pragma('foreign_keys = OFF');
  try {
    // 第一批：无外键依赖的表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        description text DEFAULT '',
        settings_json text DEFAULT '{}',
        calendar_config_json text DEFAULT '{}',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS flags (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        name text NOT NULL,
        default_value_json text DEFAULT 'null',
        description text DEFAULT ''
      );
    `);

    // 第二批：依赖 workspaces 的表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS tracks (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        name text NOT NULL,
        color text DEFAULT '#3b82f6',
        order_index integer DEFAULT 0 NOT NULL,
        is_visible integer DEFAULT 1 NOT NULL
      );
      CREATE TABLE IF NOT EXISTS characters (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        name text NOT NULL,
        role text DEFAULT '',
        description text DEFAULT '',
        avatar_url text DEFAULT '',
        traits_json text DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS world_settings (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        category text DEFAULT 'general' NOT NULL,
        key text NOT NULL,
        value text DEFAULT '',
        description text DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS auto_saves (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        data_json text NOT NULL,
        created_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS outline_versions (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        content text NOT NULL,
        description text DEFAULT '',
        created_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assets (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        kind text NOT NULL,
        file_name text NOT NULL,
        mime_type text NOT NULL,
        file_size integer NOT NULL,
        sha256 text NOT NULL,
        width integer,
        height integer,
        metadata_json text DEFAULT '{}',
        created_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS maps (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        name text NOT NULL,
        background_asset_id text,
        width integer DEFAULT 1920 NOT NULL,
        height integer DEFAULT 1080 NOT NULL,
        markers_json text DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bookmarks (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        event_id text NOT NULL,
        name text NOT NULL,
        color text DEFAULT '#3b82f6',
        created_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS revisions (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        op text NOT NULL,
        before_json text DEFAULT '{}',
        after_json text DEFAULT '{}',
        summary text DEFAULT '',
        created_at integer NOT NULL
      );
    `);

    // 第三批：依赖 tracks 的表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        track_id text,
        title text NOT NULL,
        summary text DEFAULT '',
        description text DEFAULT '',
        location text DEFAULT '',
        start_time integer,
        end_time integer,
        order_index integer DEFAULT 0 NOT NULL,
        narrative_order integer DEFAULT 0,
        color text DEFAULT '',
        tags_json text DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
    `);

    // 第四批：依赖 events 的表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        source_event_id text NOT NULL,
        target_event_id text NOT NULL,
        type text NOT NULL,
        description text DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS event_characters (
        event_id text NOT NULL,
        character_id text NOT NULL,
        role_description text DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS event_world_settings (
        event_id text NOT NULL,
        world_setting_id text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS event_assets (
        event_id text NOT NULL,
        asset_id text NOT NULL,
        role text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS foreshadowings (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        title text NOT NULL,
        description text DEFAULT '',
        status text DEFAULT 'planted' NOT NULL,
        planted_event_id text,
        resolved_event_id text,
        related_foreshadowing_ids text DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
    `);

    // 第五批：VN 模型表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS scenes (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        name text NOT NULL,
        background_asset_id text,
        bgm text DEFAULT '',
        scene_order integer DEFAULT 0 NOT NULL,
        map_id text,
        settings_json text DEFAULT '{}',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS beats (
        id text PRIMARY KEY NOT NULL,
        scene_id text NOT NULL,
        kind text NOT NULL,
        character_id text,
        portrait_asset_id text,
        text text DEFAULT '',
        metadata_json text DEFAULT '{}',
        beat_order integer DEFAULT 0 NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS choices (
        id text PRIMARY KEY NOT NULL,
        beat_id text NOT NULL,
        label text NOT NULL,
        next_scene_id text,
        condition text DEFAULT '',
        choice_order integer DEFAULT 0 NOT NULL
      );
      CREATE TABLE IF NOT EXISTS character_assets (
        character_id text NOT NULL,
        asset_id text NOT NULL,
        role text NOT NULL,
        display_order integer DEFAULT 0 NOT NULL
      );
      CREATE TABLE IF NOT EXISTS scene_assets (
        scene_id text NOT NULL,
        asset_id text NOT NULL,
        role text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        title text DEFAULT '新对话' NOT NULL,
        messages_json text DEFAULT '[]' NOT NULL,
        summary text DEFAULT '',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ai_cache (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL,
        query_hash text NOT NULL,
        query_text text NOT NULL,
        response text NOT NULL,
        model text NOT NULL,
        hit_count integer DEFAULT 0 NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
    `);

    // 索引（IF NOT EXISTS 保证幂等）
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS tracks_workspace_idx ON tracks (workspace_id);
      CREATE INDEX IF NOT EXISTS events_workspace_idx ON events (workspace_id);
      CREATE INDEX IF NOT EXISTS events_track_idx ON events (track_id);
      CREATE INDEX IF NOT EXISTS events_start_time_idx ON events (start_time);
      CREATE INDEX IF NOT EXISTS characters_workspace_idx ON characters (workspace_id);
      CREATE INDEX IF NOT EXISTS connections_workspace_idx ON connections (workspace_id);
      CREATE INDEX IF NOT EXISTS connections_source_idx ON connections (source_event_id);
      CREATE INDEX IF NOT EXISTS connections_target_idx ON connections (target_event_id);
      CREATE UNIQUE INDEX IF NOT EXISTS event_characters_pk ON event_characters (event_id, character_id);
      CREATE INDEX IF NOT EXISTS event_characters_event_idx ON event_characters (event_id);
      CREATE INDEX IF NOT EXISTS event_characters_character_idx ON event_characters (character_id);
      CREATE UNIQUE INDEX IF NOT EXISTS event_world_settings_pk ON event_world_settings (event_id, world_setting_id);
      CREATE INDEX IF NOT EXISTS event_world_settings_event_idx ON event_world_settings (event_id);
      CREATE INDEX IF NOT EXISTS event_world_settings_ws_idx ON event_world_settings (world_setting_id);
      CREATE INDEX IF NOT EXISTS foreshadowings_workspace_idx ON foreshadowings (workspace_id);
      CREATE INDEX IF NOT EXISTS foreshadowings_status_idx ON foreshadowings (status);
      CREATE INDEX IF NOT EXISTS world_settings_workspace_idx ON world_settings (workspace_id);
      CREATE INDEX IF NOT EXISTS world_settings_category_idx ON world_settings (category);
      CREATE INDEX IF NOT EXISTS auto_saves_workspace_idx ON auto_saves (workspace_id);
      CREATE INDEX IF NOT EXISTS auto_saves_created_idx ON auto_saves (created_at);
      CREATE INDEX IF NOT EXISTS outline_versions_workspace_idx ON outline_versions (workspace_id);
      CREATE INDEX IF NOT EXISTS outline_versions_created_idx ON outline_versions (created_at);
      CREATE INDEX IF NOT EXISTS assets_workspace_idx ON assets (workspace_id);
      CREATE INDEX IF NOT EXISTS assets_sha256_idx ON assets (sha256);
      CREATE INDEX IF NOT EXISTS assets_kind_idx ON assets (kind);
      CREATE INDEX IF NOT EXISTS maps_workspace_idx ON maps (workspace_id);
      CREATE INDEX IF NOT EXISTS bookmarks_workspace_idx ON bookmarks (workspace_id);
      CREATE INDEX IF NOT EXISTS bookmarks_event_idx ON bookmarks (event_id);
      CREATE INDEX IF NOT EXISTS scenes_workspace_idx ON scenes (workspace_id);
      CREATE INDEX IF NOT EXISTS scenes_order_idx ON scenes (scene_order);
      CREATE INDEX IF NOT EXISTS beats_scene_idx ON beats (scene_id);
      CREATE INDEX IF NOT EXISTS beats_order_idx ON beats (beat_order);
      CREATE INDEX IF NOT EXISTS choices_beat_idx ON choices (beat_id);
      CREATE INDEX IF NOT EXISTS choices_order_idx ON choices (choice_order);
      CREATE INDEX IF NOT EXISTS flags_workspace_idx ON flags (workspace_id);
      CREATE UNIQUE INDEX IF NOT EXISTS flags_name_idx ON flags (workspace_id, name);
      CREATE UNIQUE INDEX IF NOT EXISTS character_assets_pk ON character_assets (character_id, asset_id, role);
      CREATE INDEX IF NOT EXISTS character_assets_character_idx ON character_assets (character_id);
      CREATE INDEX IF NOT EXISTS character_assets_asset_idx ON character_assets (asset_id);
      CREATE UNIQUE INDEX IF NOT EXISTS event_assets_pk ON event_assets (event_id, asset_id, role);
      CREATE INDEX IF NOT EXISTS event_assets_event_idx ON event_assets (event_id);
      CREATE INDEX IF NOT EXISTS event_assets_asset_idx ON event_assets (asset_id);
      CREATE UNIQUE INDEX IF NOT EXISTS scene_assets_pk ON scene_assets (scene_id, asset_id, role);
      CREATE INDEX IF NOT EXISTS scene_assets_scene_idx ON scene_assets (scene_id);
      CREATE INDEX IF NOT EXISTS scene_assets_asset_idx ON scene_assets (asset_id);
      CREATE INDEX IF NOT EXISTS revisions_workspace_idx ON revisions (workspace_id);
      CREATE INDEX IF NOT EXISTS revisions_entity_idx ON revisions (entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS revisions_created_idx ON revisions (created_at);
      CREATE INDEX IF NOT EXISTS ai_conversations_workspace_idx ON ai_conversations (workspace_id);
      CREATE INDEX IF NOT EXISTS ai_conversations_created_idx ON ai_conversations (created_at);
      CREATE INDEX IF NOT EXISTS ai_cache_workspace_idx ON ai_cache (workspace_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_hash_idx ON ai_cache (workspace_id, query_hash);
      CREATE INDEX IF NOT EXISTS ai_cache_hit_idx ON ai_cache (hit_count);
    `);

    sqlite.pragma('foreign_keys = ON');

    if (tableExists('workspaces')) {
      dbLog.info('[migration] hardcoded DDL fallback succeeded — all tables created');
    } else {
      dbLog.error('[migration] FATAL: hardcoded DDL failed to create workspaces table');
      throw new Error('Database initialization failed: unable to create essential tables after all migration attempts');
    }
  } catch (ddlErr) {
    sqlite.pragma('foreign_keys = ON');
    dbLog.error({ err: ddlErr }, '[migration] FATAL: hardcoded DDL threw unexpected error');
    throw ddlErr;
  }

  ensureSchemaCompatibility();
}

/**
 * 兼容老库（v2.x 用户覆盖升级到 v3.x 时使用）。
 * 对所有 v3.0 schema.ts 中带 default 的列做幂等检测：
 * - 如表存在但缺列 → ALTER TABLE 补列
 * - 如表不存在 → 跳过（仅迁移失败导致；此时直接抛错由用户重启或反馈）
 *
 * 仅覆盖最关键的几张主表；其它表如缺列会在使用时报 SQL 错误，
 * 由 v3.0.1 的 5xx error-handler 把 error.code (SQLITE_ERROR) 暴露给用户。
 */
function ensureSchemaCompatibility(): void {
  if (!sqliteInstance) return;
  const sqlite = sqliteInstance;

  const ensureColumn = (
    table: string,
    column: string,
    type: string,
    defaultExpr?: string,
  ): void => {
    try {
      const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      if (cols.length === 0) return; // 表不存在
      if (cols.some((c) => c.name === column)) return; // 列已存在
      const def = defaultExpr ? ` DEFAULT ${defaultExpr}` : '';
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def}`);
      dbLog.info({ table, column }, '[compat] added missing column');
    } catch (err) {
      dbLog.warn({ err, table, column }, '[compat] ensureColumn 失败（已忽略）');
    }
  };

  // ── v1.0 主表 ──

  // workspaces — v3.0 schema.ts 全部带 default 的列
  ensureColumn('workspaces', 'description', 'text', "''");
  ensureColumn('workspaces', 'settings_json', 'text', "'{}'");
  ensureColumn('workspaces', 'calendar_config_json', 'text', "'{}'");

  // tracks
  ensureColumn('tracks', 'color', 'text', "'#3b82f6'");
  ensureColumn('tracks', 'order_index', 'integer', '0');
  ensureColumn('tracks', 'is_visible', 'integer', '1');

  // events — v2.x 可能缺 narrative_order / tags_json
  ensureColumn('events', 'summary', 'text', "''");
  ensureColumn('events', 'description', 'text', "''");
  ensureColumn('events', 'location', 'text', "''");
  ensureColumn('events', 'narrative_order', 'integer', '0');
  ensureColumn('events', 'color', 'text', "''");
  ensureColumn('events', 'tags_json', 'text', "'[]'");

  // connections
  ensureColumn('connections', 'description', 'text', "''");

  // foreshadowings
  ensureColumn('foreshadowings', 'description', 'text', "''");
  ensureColumn('foreshadowings', 'related_foreshadowing_ids', 'text', "'[]'");

  // world_settings
  ensureColumn('world_settings', 'value', 'text', "''");
  ensureColumn('world_settings', 'description', 'text', "''");

  // characters
  ensureColumn('characters', 'role', 'text', "''");
  ensureColumn('characters', 'description', 'text', "''");
  ensureColumn('characters', 'avatar_url', 'text', "''");
  ensureColumn('characters', 'traits_json', 'text', "'[]'");

  // event_characters
  ensureColumn('event_characters', 'role_description', 'text', "''");

  // outline_versions
  ensureColumn('outline_versions', 'description', 'text', "''");

  // ── v1.2 VN 表 ──

  // assets
  ensureColumn('assets', 'metadata_json', 'text', "'{}'");
  ensureColumn('assets', 'width', 'integer');
  ensureColumn('assets', 'height', 'integer');

  // maps
  ensureColumn('maps', 'markers_json', 'text', "'[]'");
  ensureColumn('maps', 'width', 'integer', '1920');
  ensureColumn('maps', 'height', 'integer', '1080');

  // scenes
  ensureColumn('scenes', 'bgm', 'text', "''");
  ensureColumn('scenes', 'scene_order', 'integer', '0');
  ensureColumn('scenes', 'settings_json', 'text', "'{}'");

  // beats
  ensureColumn('beats', 'text', 'text', "''");
  ensureColumn('beats', 'metadata_json', 'text', "'{}'");
  ensureColumn('beats', 'beat_order', 'integer', '0');

  // choices
  ensureColumn('choices', 'condition', 'text', "''");
  ensureColumn('choices', 'choice_order', 'integer', '0');

  // flags
  ensureColumn('flags', 'default_value_json', 'text', "'null'");
  ensureColumn('flags', 'description', 'text', "''");

  // revisions
  ensureColumn('revisions', 'before_json', 'text', "'{}'");
  ensureColumn('revisions', 'after_json', 'text', "'{}'");
  ensureColumn('revisions', 'summary', 'text', "''");

  // character_assets
  ensureColumn('character_assets', 'display_order', 'integer', '0');

  // ai_conversations (v3.5)
  ensureColumn('ai_conversations', 'title', 'text', "'新对话'");
  ensureColumn('ai_conversations', 'messages_json', 'text', "'[]'");
  ensureColumn('ai_conversations', 'summary', 'text', "''");

  // ai_cache (v3.5)
  ensureColumn('ai_cache', 'query_hash', 'text', "''");
  ensureColumn('ai_cache', 'query_text', 'text', "''");
  ensureColumn('ai_cache', 'response', 'text', "''");
  ensureColumn('ai_cache', 'model', 'text', "''");
  ensureColumn('ai_cache', 'hit_count', 'integer', '0');

  // ── v1.2 新表补建 ──
  // 当老库（< v1.2）通过 drizzle 迁移部分成功（workspaces 表存在）
  // 但 bookmarks/maps 等新表未建时，在此幂等补建。
  if (!tableExists('bookmarks')) {
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id text PRIMARY KEY NOT NULL,
          workspace_id text NOT NULL,
          event_id text NOT NULL,
          name text NOT NULL,
          color text DEFAULT '#3b82f6',
          created_at integer NOT NULL
        );
        CREATE INDEX IF NOT EXISTS bookmarks_workspace_idx ON bookmarks (workspace_id);
        CREATE INDEX IF NOT EXISTS bookmarks_event_idx ON bookmarks (event_id);
      `);
      dbLog.info('[compat] created missing bookmarks table');
    } catch (err) {
      dbLog.warn({ err }, '[compat] failed to create bookmarks table (ignored)');
    }
  }
  if (!tableExists('maps')) {
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS maps (
          id text PRIMARY KEY NOT NULL,
          workspace_id text NOT NULL,
          name text NOT NULL,
          background_asset_id text,
          width integer DEFAULT 1920 NOT NULL,
          height integer DEFAULT 1080 NOT NULL,
          markers_json text DEFAULT '[]',
          created_at integer NOT NULL,
          updated_at integer NOT NULL
        );
        CREATE INDEX IF NOT EXISTS maps_workspace_idx ON maps (workspace_id);
      `);
      dbLog.info('[compat] created missing maps table');
    } catch (err) {
      dbLog.warn({ err }, '[compat] failed to create maps table (ignored)');
    }
  }
}

export function closeDb(): void {
  if (sqliteInstance) {
    try {
      sqliteInstance.close();
    } catch (err) {
      dbLog.error({ err }, 'closeDb 关闭 sqlite 实例失败（已忽略）');
    }
    sqliteInstance = null;
    dbInstance = null;
  }
}

// 数据库备份
export function backupDatabase(backupPath: string): void {
  const sqlite = getSqlite();
  sqlite.backup(backupPath);
}

export { DATA_DIR };
