import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

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
    fs.mkdirSync(DATA_DIR, { recursive: true });
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

export function runMigrations(): void {
  const db = getDb();

  // 优先从环境变量获取迁移目录，然后尝试相对于当前模块的路径，最后尝试 cwd
  let migrationsPath = process.env.MIGRATIONS_DIR;

  if (!migrationsPath) {
    // 尝试相对于当前文件的位置（ESM 模式）
    const moduleDir = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')));
    const moduleMigrationsPath = path.join(moduleDir, 'drizzle');
    const cwdMigrationsPath = path.join(process.cwd(), 'drizzle');

    // 优先使用模块相对路径（适用于 Electron 打包模式）
    migrationsPath = fs.existsSync(moduleMigrationsPath) ? moduleMigrationsPath : cwdMigrationsPath;
  }

  if (fs.existsSync(migrationsPath)) {
    migrate(db, { migrationsFolder: migrationsPath });
  } else {
    // 如果没有迁移文件，使用 push 模式（开发阶段）
    console.warn('No migration files found. Use `npm run db:generate` to generate migrations.');
  }
}

export function closeDb(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
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
