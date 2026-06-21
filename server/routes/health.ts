import type { FastifyInstance } from 'fastify';
import { getSqlite } from '../db/index.js';

/**
 * 数据库健康检查端点
 * GET /api/health/db
 */
export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health/db', async () => {
    const sqlite = getSqlite();

    const essentialTables = [
      'workspaces', 'tracks', 'events', 'characters', 'connections',
      'foreshadowings', 'world_settings', 'bookmarks', 'maps',
      'event_characters', 'event_world_settings', 'revisions',
      'ai_conversations', 'ai_cache', 'scenes', 'beats', 'choices',
      'assets', 'flags', 'auto_saves', 'outline_versions',
      'notes', 'note_folders', 'note_tags',
      'character_assets', 'event_assets', 'scene_assets',
    ];

    const results: Record<string, boolean> = {};
    for (const table of essentialTables) {
      try {
        const rows = sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
          .all(table) as Array<{ name: string }>;
        results[table] = rows.length > 0;
      } catch {
        results[table] = false;
      }
    }

    const allHealthy = Object.values(results).every(Boolean);

    return {
      success: true,
      data: {
        tables: results,
        allHealthy,
        timestamp: new Date().toISOString(),
      }
    };
  });
}
