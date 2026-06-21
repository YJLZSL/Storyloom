/* eslint-disable no-console */
// CLI / standalone migration script — console output goes to terminal
import { getDb, getSqlite, runMigrations, DATA_DIR } from './index.js';
import path from 'path';
import fs from 'fs';

/**
 * 初始化数据库：运行迁移 + 创建启动备份
 */
export async function initDatabase(): Promise<void> {
  console.log(`[DB] Data directory: ${DATA_DIR}`);

  // 运行迁移（迁移文件已使用 IF NOT EXISTS 保证幂等）
  try {
    runMigrations();
    console.log('[DB] Migrations applied');
  } catch (err) {
    // v3.0.2+ 迁移兜底逻辑已在 runMigrations() 中大幅增强（3 层 fallback + 硬编码 DDL）。
    // 若仍然抛出，说明所有 fallback 均失败 — 必须中断启动，不能带空库继续。
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB] Migration FATAL:', msg);
    throw new Error(`Database migration failed: ${msg}`);
  }

  // 验证：核心表必须存在
  const sqlite = getSqlite();
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('workspaces','events','tracks')")
    .all() as Array<{ name: string }>;
  if (tables.length < 3) {
    const missing = ['workspaces', 'events', 'tracks'].filter(
      (t) => !tables.some((r) => r.name === t),
    );
    const errMsg = `Essential tables missing after migration: ${missing.join(', ')}`;
    console.error(`[DB] ${errMsg}`);
    throw new Error(errMsg);
  }

  // 创建启动备份
  createStartupBackup();
}

/**
 * 启动时创建数据库备份，保留最近 10 个
 */
function createStartupBackup(): void {
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `storyloom-${timestamp}.db`);

  try {
    const sqlite = getSqlite();
    sqlite.backup(backupPath);
    console.log(`[DB] Backup created: ${backupPath}`);

    // 清理旧备份，保留最近 10 个（同时匹配新旧前缀）
    const backups = fs.readdirSync(backupDir)
      .filter(f => (f.startsWith('storyloom-') || f.startsWith('timeline-creator-')) && f.endsWith('.db'))
      .sort()
      .reverse();

    for (let i = 10; i < backups.length; i++) {
      const oldBackup = path.join(backupDir, backups[i]);
      fs.unlinkSync(oldBackup);
      console.log(`[DB] Old backup removed: ${oldBackup}`);
    }
  } catch (err) {
    console.error('[DB] Backup failed:', err);
  }
}

/**
 * 检查数据库完整性
 */
export function checkDatabaseIntegrity(): boolean {
  try {
    const sqlite = getSqlite();
    const result = sqlite.pragma('integrity_check') as Array<{ integrity_check: string }>;
    return result[0]?.integrity_check === 'ok';
  } catch {
    return false;
  }
}
