import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'data', 'dev.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const rows = db.prepare(
  'SELECT id, name, description, hex(name) as name_hex, hex(description) as desc_hex, created_at, updated_at FROM workspaces'
).all();

console.log('workspaces count:', rows.length);
console.log('');

let garbledCount = 0;
for (const row of rows) {
  const isGarbled =
    /^[?？]+$/.test(row.name || '') ||
    /^[?？]+$/.test(row.description || '') ||
    row.name === '?????' ||
    row.description === '????';

  console.log('id:', row.id);
  console.log('name:', JSON.stringify(row.name));
  console.log('description:', JSON.stringify(row.description));
  console.log('name_hex:', row.name_hex);
  console.log('desc_hex:', row.desc_hex);
  console.log('created_at:', row.created_at, new Date(row.created_at).toISOString());
  console.log('updated_at:', row.updated_at, new Date(row.updated_at).toISOString());
  console.log('is_garbled:', isGarbled);
  console.log('---');

  if (isGarbled) garbledCount++;
}

console.log('');
console.log('garbled workspaces:', garbledCount);

db.close();
