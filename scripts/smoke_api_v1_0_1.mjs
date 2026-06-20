// API 烟测脚本（v1.0.1）
const base = 'http://localhost:3001';

async function main() {
  const results = [];

  // 1. health
  try {
    const r = await fetch(`${base}/api/health`);
    results.push({ name: 'GET /api/health', status: r.status, ok: r.ok });
  } catch (e) { results.push({ name: 'GET /api/health', error: e.message }); }

  // 2. POST 合法 name
  let createdId = null;
  try {
    const r = await fetch(`${base}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'API 烟测工作区', description: '正常描述' }),
    });
    const j = await r.json();
    createdId = j.id;
    results.push({ name: 'POST /api/workspaces 合法', status: r.status, id: createdId });
  } catch (e) { results.push({ name: 'POST /api/workspaces 合法', error: e.message }); }

  // 3. POST 全问号
  try {
    const r = await fetch(`${base}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '?????' }),
    });
    const j = await r.json().catch(() => ({}));
    results.push({ name: 'POST /api/workspaces 全问号', status: r.status, body: j });
  } catch (e) { results.push({ name: 'POST /api/workspaces 全问号', error: e.message }); }

  // 4. POST 空 name
  try {
    const r = await fetch(`${base}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    const j = await r.json().catch(() => ({}));
    results.push({ name: 'POST /api/workspaces 空 name', status: r.status, body: j });
  } catch (e) { results.push({ name: 'POST /api/workspaces 空 name', error: e.message }); }

  // 5. GET 列表
  try {
    const r = await fetch(`${base}/api/workspaces`);
    const j = await r.json();
    const items = Array.isArray(j) ? j : j.items || [];
    const garbled = items.filter(w => /^[?？]+$/.test((w.name || '').trim()));
    results.push({ name: 'GET /api/workspaces', status: r.status, count: items.length, garbledCount: garbled.length });
  } catch (e) { results.push({ name: 'GET /api/workspaces', error: e.message }); }

  // 6. DELETE 创建的测试工作区
  if (createdId) {
    try {
      const r = await fetch(`${base}/api/workspaces/${createdId}`, { method: 'DELETE' });
      results.push({ name: 'DELETE /api/workspaces/:id', status: r.status });
    } catch (e) { results.push({ name: 'DELETE /api/workspaces/:id', error: e.message }); }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
