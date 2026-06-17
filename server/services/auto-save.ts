import { getDb, getSqlite, DATA_DIR } from '../db/index.js';
import { autoSaves, workspaces, events, tracks, characters, eventCharacters, eventWorldSettings, connections, foreshadowings, worldSettings } from '../db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const MAX_AUTO_SAVES = 20;
const MAX_BACKUPS = 10;

/**
 * 创建工作区自动保存快照
 */
export function createAutoSave(workspaceId: string, dataJson: string) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date();

  const result = db.insert(autoSaves).values({
    id,
    workspaceId,
    dataJson,
    createdAt: now,
  }).returning().get();

  // 清理旧自动保存
  pruneAutoSaves(workspaceId);

  return result;
}

/**
 * 清理旧自动保存，保留最近 MAX_AUTO_SAVES 个
 */
function pruneAutoSaves(workspaceId: string): void {
  const db = getDb();

  const saves = db.select().from(autoSaves)
    .where(eq(autoSaves.workspaceId, workspaceId))
    .orderBy(desc(autoSaves.createdAt))
    .all();

  if (saves.length > MAX_AUTO_SAVES) {
    const toDelete = saves.slice(MAX_AUTO_SAVES);
    for (const save of toDelete) {
      db.delete(autoSaves).where(eq(autoSaves.id, save.id)).run();
    }
  }
}

/**
 * 获取工作区最新自动保存
 */
export function getLatestAutoSave(workspaceId: string) {
  const db = getDb();
  return db.select().from(autoSaves)
    .where(eq(autoSaves.workspaceId, workspaceId))
    .orderBy(desc(autoSaves.createdAt))
    .limit(1)
    .get();
}

/**
 * 列出工作区自动保存
 */
export function listAutoSaves(workspaceId: string, limit = 20) {
  const db = getDb();
  return db.select().from(autoSaves)
    .where(eq(autoSaves.workspaceId, workspaceId))
    .orderBy(desc(autoSaves.createdAt))
    .limit(limit)
    .all();
}

/**
 * 创建数据库备份（使用 SQLite backup API，不锁定数据库）
 */
export function createDatabaseBackup(): string {
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `timeline-creator-${timestamp}.db`);

  const sqlite = getSqlite();
  sqlite.backup(backupPath);

  // 清理旧备份
  pruneBackups(backupDir);

  return backupPath;
}

/**
 * 清理旧备份，保留最近 MAX_BACKUPS 个
 */
function pruneBackups(backupDir: string): void {
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('timeline-creator-') && f.endsWith('.db'))
    .sort()
    .reverse();

  for (let i = MAX_BACKUPS; i < backups.length; i++) {
    const oldBackup = path.join(backupDir, backups[i]);
    try {
      fs.unlinkSync(oldBackup);
    } catch {
      // 忽略删除失败
    }
  }
}

/**
 * 检测是否需要崩溃恢复
 * 通过比较工作区 updatedAt 和最新自动保存时间来判断
 */
export function checkCrashRecovery(): Array<{
  workspaceId: string;
  workspaceName: string;
  lastAutoSaveTime: number;
  lastUpdateTime: number;
  needsRecovery: boolean;
}> {
  const db = getDb();

  const allWorkspaces = db.select().from(workspaces).all();

  return allWorkspaces.map(ws => {
    const latestSave = db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, ws.id))
      .orderBy(desc(autoSaves.createdAt))
      .limit(1)
      .get();

    const lastAutoSaveTime = latestSave?.createdAt?.getTime() ?? 0;
    const lastUpdateTime = ws.updatedAt?.getTime() ?? 0;

    // 如果自动保存时间晚于工作区更新时间，说明可能需要恢复
    const needsRecovery = latestSave != null && lastAutoSaveTime > lastUpdateTime;

    return {
      workspaceId: ws.id,
      workspaceName: ws.name,
      lastAutoSaveTime,
      lastUpdateTime,
      needsRecovery,
    };
  });
}

/**
 * 从自动保存恢复工作区数据
 */
export function recoverFromAutoSave(workspaceId: string): boolean {
  const db = getDb();
  const sqlite = getSqlite();

  const latestSave = getLatestAutoSave(workspaceId);
  if (!latestSave) return false;

  try {
    const data = JSON.parse(latestSave.dataJson);

    sqlite.transaction(() => {
      // 恢复事件
      if (data.events?.length) {
        db.delete(events).where(eq(events.workspaceId, workspaceId)).run();
        for (const event of data.events) {
          db.insert(events).values({ ...event, workspaceId }).run();
        }
      }

      // 恢复轨道
      if (data.tracks?.length) {
        db.delete(tracks).where(eq(tracks.workspaceId, workspaceId)).run();
        for (const track of data.tracks) {
          db.insert(tracks).values({ ...track, workspaceId }).run();
        }
      }

      // 恢复角色
      if (data.characters?.length) {
        db.delete(characters).where(eq(characters.workspaceId, workspaceId)).run();
        for (const char of data.characters) {
          db.insert(characters).values({ ...char, workspaceId }).run();
        }
      }

      // 恢复事件-角色关联
      if (data.eventCharacters?.length) {
        const wsEventIds = (data.events ?? []).map((e: { id: string }) => e.id);
        if (wsEventIds.length > 0) {
          db.delete(eventCharacters).where(inArray(eventCharacters.eventId, wsEventIds)).run();
        }
        for (const ec of data.eventCharacters) {
          db.insert(eventCharacters).values(ec).run();
        }
      }

      // 恢复事件-世界观设定关联
      if (data.eventWorldSettings?.length) {
        const wsEventIds = (data.events ?? []).map((e: { id: string }) => e.id);
        if (wsEventIds.length > 0) {
          db.delete(eventWorldSettings).where(inArray(eventWorldSettings.eventId, wsEventIds)).run();
        }
        for (const ews of data.eventWorldSettings) {
          db.insert(eventWorldSettings).values(ews).run();
        }
      }

      // 恢复关联
      if (data.connections?.length) {
        db.delete(connections).where(eq(connections.workspaceId, workspaceId)).run();
        for (const conn of data.connections) {
          db.insert(connections).values({ ...conn, workspaceId }).run();
        }
      }

      // 恢复伏笔
      if (data.foreshadowings?.length) {
        db.delete(foreshadowings).where(eq(foreshadowings.workspaceId, workspaceId)).run();
        for (const fs of data.foreshadowings) {
          db.insert(foreshadowings).values({ ...fs, workspaceId }).run();
        }
      }

      // 恢复世界观设定
      if (data.worldSettings?.length) {
        db.delete(worldSettings).where(eq(worldSettings.workspaceId, workspaceId)).run();
        for (const ws of data.worldSettings) {
          db.insert(worldSettings).values({ ...ws, workspaceId }).run();
        }
      }
    })();

    return true;
  } catch {
    return false;
  }
}
