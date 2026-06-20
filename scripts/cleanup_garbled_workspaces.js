import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'data', 'dev.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function isGarbled(text) {
  if (text == null) return false;
  const str = String(text).trim();
  return str.length > 0 && /^[?？]+$/.test(str);
}

const rows = db.prepare('SELECT id, name, description FROM workspaces').all();
let deletedCount = 0;

for (const row of rows) {
  if (isGarbled(row.name) || isGarbled(row.description)) {
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(row.id);
    console.log('deleted garbled workspace:', row.id, JSON.stringify(row.name), JSON.stringify(row.description));
    deletedCount++;
  }
}

console.log('');
console.log('deleted count:', deletedCount);

db.close();
