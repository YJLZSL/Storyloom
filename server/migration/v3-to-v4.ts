/* eslint-disable no-console */
// CLI / standalone migration script — console output goes to terminal
import fs from 'fs';
import path from 'path';
import { getDb, getSqlite, DATA_DIR } from '../db/index.js';
import { workspaces, events, tracks, characters, eventCharacters, connections, foreshadowings, worldSettings } from '../db/schema.js';

interface V3Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  settings?: Record<string, unknown>;
}

interface V3Event {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  location?: string;
  startTime?: string | number | null;
  endTime?: string | number | null;
  trackId?: string;
  order?: number;
  color?: string;
  tags?: string[];
  characterIds?: string[];
}

interface V3Track {
  id: string;
  name: string;
  color?: string;
  order?: number;
  isVisible?: boolean;
}

interface V3Character {
  id: string;
  name: string;
  role?: string;
  description?: string;
  avatarUrl?: string;
  traits?: string[];
}

interface V3Connection {
  id: string;
  sourceEventId: string;
  targetEventId: string;
  type: string;
  description?: string;
}

interface V3Foreshadowing {
  id: string;
  title: string;
  description?: string;
  status?: string;
  plantedEventId?: string | null;
  resolvedEventId?: string | null;
  createdAt?: string | number;
  updatedAt?: string | number;
}

interface V3WorldBuilding {
  id: string;
  category?: string;
  key?: string;
  value?: string;
  description?: string;
}

/** 将 v3 时间戳转换为 Date 对象 */
function toTimestamp(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null) return null;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) return null;
  return new Date(num);
}

/** 将 v3 时间戳转换为 Date（带默认值） */
function toTimestampNow(value: string | number | undefined): Date {
  const result = toTimestamp(value);
  return result || new Date();
}

/** 读取 JSON 文件，不存在则返回默认值 */
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 检测是否存在 v3.1 数据需要迁移
 */
export function hasV3Data(): boolean {
  const v3Dir = path.join(DATA_DIR, 'workspaces');
  if (!fs.existsSync(v3Dir)) return false;

  const entries = fs.readdirSync(v3Dir, { withFileTypes: true });
  return entries.some(e => e.isDirectory() && e.name.startsWith('ws-'));
}

/**
 * 执行 v3.1 → v4.0 数据迁移
 * @returns 迁移的工作区数量
 */
export function migrateV3ToV4(): number {
  const v3Dir = path.join(DATA_DIR, 'workspaces');
  if (!fs.existsSync(v3Dir)) {
    console.log('[Migration] No v3 data directory found');
    return 0;
  }

  const db = getDb();
  const sqlite = getSqlite();
  let migratedCount = 0;

  const workspaceDirs = fs.readdirSync(v3Dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('ws-'));

  for (const dir of workspaceDirs) {
    const wsDir = path.join(v3Dir, dir.name);

    try {
      sqlite.transaction(() => {
        // 1. 读取工作区元信息
        const wsData = readJsonFile<V3Workspace>(path.join(wsDir, 'workspace.json'), {
          id: dir.name,
          name: dir.name,
        });

        const settings = readJsonFile<Record<string, unknown>>(path.join(wsDir, 'settings.json'), {});

        // 插入工作区
        db.insert(workspaces).values({
          id: wsData.id,
          name: wsData.name,
          description: wsData.description || '',
          settingsJson: JSON.stringify(settings),
          createdAt: toTimestampNow(wsData.createdAt),
          updatedAt: toTimestampNow(wsData.updatedAt),
        }).onConflictDoNothing().run();

        // 2. 迁移轨道
        const tracksData = readJsonFile<V3Track[]>(path.join(wsDir, 'tracks.json'), []);
        for (const track of tracksData) {
          db.insert(tracks).values({
            id: track.id,
            workspaceId: wsData.id,
            name: track.name,
            color: track.color || '#3b82f6',
            orderIndex: track.order ?? 0,
            isVisible: track.isVisible ?? true,
          }).onConflictDoNothing().run();
        }

        // 3. 迁移角色
        const charsData = readJsonFile<V3Character[]>(path.join(wsDir, 'characters.json'), []);
        for (const char of charsData) {
          db.insert(characters).values({
            id: char.id,
            workspaceId: wsData.id,
            name: char.name,
            role: char.role || '',
            description: char.description || '',
            avatarUrl: char.avatarUrl || '',
            traitsJson: JSON.stringify(char.traits || []),
          }).onConflictDoNothing().run();
        }

        // 4. 迁移事件
        const eventsData = readJsonFile<V3Event[]>(path.join(wsDir, 'events.json'), []);
        for (const event of eventsData) {
          db.insert(events).values({
            id: event.id,
            workspaceId: wsData.id,
            trackId: event.trackId || null,
            title: event.title,
            summary: event.summary || '',
            description: event.description || '',
            location: event.location || '',
            startTime: toTimestamp(event.startTime),
            endTime: toTimestamp(event.endTime),
            orderIndex: event.order ?? 0,
            color: event.color || '',
            tagsJson: JSON.stringify(event.tags || []),
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing().run();

          // 处理事件-角色关联
          if (event.characterIds?.length) {
            for (const charId of event.characterIds) {
              db.insert(eventCharacters).values({
                eventId: event.id,
                characterId: charId,
                roleDescription: '',
              }).onConflictDoNothing().run();
            }
          }
        }

        // 5. 迁移关联
        const connectionsData = readJsonFile<V3Connection[]>(path.join(wsDir, 'connections.json'), []);
        for (const conn of connectionsData) {
          db.insert(connections).values({
            id: conn.id,
            workspaceId: wsData.id,
            sourceEventId: conn.sourceEventId,
            targetEventId: conn.targetEventId,
            type: conn.type,
            description: conn.description || '',
          }).onConflictDoNothing().run();
        }

        // 6. 迁移伏笔
        const foreshadowingsData = readJsonFile<V3Foreshadowing[]>(path.join(wsDir, 'foreshadowings.json'), []);
        for (const fs of foreshadowingsData) {
          db.insert(foreshadowings).values({
            id: fs.id,
            workspaceId: wsData.id,
            title: fs.title,
            description: fs.description || '',
            status: fs.status || 'planted',
            plantedEventId: fs.plantedEventId || null,
            resolvedEventId: fs.resolvedEventId || null,
            createdAt: toTimestampNow(fs.createdAt),
            updatedAt: toTimestampNow(fs.updatedAt),
          }).onConflictDoNothing().run();
        }

        // 7. 迁移世界观设定
        const worldbuildingData = readJsonFile<V3WorldBuilding[]>(path.join(wsDir, 'worldbuilding.json'), []);
        for (const ws of worldbuildingData) {
          db.insert(worldSettings).values({
            id: ws.id,
            workspaceId: wsData.id,
            category: ws.category || 'general',
            key: ws.key || '',
            value: ws.value || '',
            description: ws.description || '',
          }).onConflictDoNothing().run();
        }

        migratedCount++;
        console.log(`[Migration] Migrated workspace: ${wsData.name} (${wsData.id})`);
      })();
    } catch (err) {
      console.error(`[Migration] Failed to migrate workspace ${dir.name}:`, err);
    }
  }

  // 迁移完成后重命名旧数据目录
  if (migratedCount > 0) {
    const backupDir = path.join(DATA_DIR, 'workspaces.v3.bak');
    try {
      if (!fs.existsSync(backupDir)) {
        fs.renameSync(v3Dir, backupDir);
        console.log(`[Migration] Renamed old data directory to: ${backupDir}`);
      }
    } catch (err) {
      console.error('[Migration] Failed to rename old data directory:', err);
    }
  }

  return migratedCount;
}
