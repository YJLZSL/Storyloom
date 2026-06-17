import { getDb, getSqlite, runMigrations, closeDb, DATA_DIR } from './index.js';
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
    // 兼容旧数据库：若迁移因对象已存在而失败，记录警告但继续启动
    console.warn('[DB] Migration warning:', err instanceof Error ? err.message : err);
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
  const backupPath = path.join(backupDir, `timeline-creator-${timestamp}.db`);

  try {
    const sqlite = getSqlite();
    sqlite.backup(backupPath);
    console.log(`[DB] Backup created: ${backupPath}`);

    // 清理旧备份，保留最近 10 个
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('timeline-creator-') && f.endsWith('.db'))
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
