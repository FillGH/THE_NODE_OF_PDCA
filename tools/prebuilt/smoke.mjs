import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(process.argv[2] || fileURLToPath(new URL('../../', import.meta.url)));
const scratch = await mkdtemp(join(tmpdir(), 'pdca-prebuilt-smoke-'));
const dataDir = join(scratch, 'demo-data');
const port = await new Promise((done, fail) => {
  const socket = createServer();
  socket.once('error', fail);
  socket.listen(0, '127.0.0.1', () => {
    const selected = socket.address().port;
    socket.close(() => done(selected));
  });
});
const base = 'http://127.0.0.1:' + port;
const env = { ...process.env, PDCA_PORT: String(port), PDCA_DEMO_DIR: dataDir };
for (const key of [
  'PDCA_ORIGIN', 'PDCA_INGRESS_KEY', 'PDCA_IT_KEY', 'PDCA_PHIL_KEY', 'PDCA_DB',
  'PDCA_AUDIT', 'PDCA_BACKUP_DIR', 'PDCA_RESTORE_DIR', 'PDCA_OPS_LOG',
]) delete env[key];
let server;
let output = '';
async function start() {
  output = '';
  server = spawn(process.execPath, ['demo/demo.mjs', 'serve'], {
    cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { output += chunk.toString().slice(-10000); });
  server.stderr.on('data', chunk => { output += chunk.toString().slice(-10000); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Demo server exited: ' + output);
    try {
      const response = await fetch(base + '/', { signal: AbortSignal.timeout(1200) });
      if (response.status === 200 && (await response.text()).includes('<html')) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Demo server did not become ready: ' + output);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const closed = new Promise(resolve => server.once('exit', resolve));
  server.kill();
  await closed;
}
async function request(path, method = 'GET', body, token) {
  return fetch(base + path, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: 'Bearer ' + token }),
    },
    ...(body && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
}
try {
  const seeded = spawnSync(process.execPath, ['demo/demo.mjs', 'seed'], {
    cwd: root, env, encoding: 'utf8', windowsHide: true,
    timeout: 180000, maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(seeded.status, 0, 'Demo seed failed: ' + seeded.stderr + seeded.stdout);
  const demo = JSON.parse(await readFile(join(dataDir, 'demo.json'), 'utf8'));
  assert.ok(demo.workspaces.length >= 3, 'Missing demo workspaces');
  await start();
  const login = await request('/api/session', 'POST', { displayName: 'Prebuilt QA' });
  assert.equal(login.status, 201, 'Could not create local smoke session');
  const actor = await login.json();
  assert.ok(actor.token);
  const id = demo.workspaces[0].id;
  const graphResponse = await request('/api/pdca/' + id, 'GET', undefined, actor.token);
  assert.equal(graphResponse.status, 200, 'Cannot read seeded PDCA');
  const graph = await graphResponse.json();
  assert.ok(graph.nodes.length > 0, 'Empty seeded PDCA');
  for (const format of ['json', 'xlsx', 'pdf']) {
    const response = await request('/api/pdca/' + id + '/export/' + format, 'GET', undefined, actor.token);
    assert.equal(response.status, 200, format + ' export returned HTTP ' + response.status);
    const file = Buffer.from(await response.arrayBuffer());
    assert.ok(file.length > 50, format + ' export empty');
    if (format === 'json') assert.equal(JSON.parse(file.toString('utf8')).pdca.id, id);
    if (format === 'xlsx') assert.equal(file.subarray(0, 2).toString(), 'PK', 'Invalid XLSX ZIP');
    if (format === 'pdf') assert.equal(file.subarray(0, 5).toString(), '%PDF-', 'Invalid PDF');
  }
  const created = await request('/api/pdca', 'POST', { title: 'Prebuilt smoke persistence' }, actor.token);
  assert.equal(created.status, 201, 'Unable to create PDCA');
  const newPdca = await created.json();
  assert.ok(newPdca.id, 'Created PDCA missing ID');
  await stop();
  await start();
  const relogin = await request('/api/session', 'POST', { displayName: 'Prebuilt Restart QA' });
  assert.equal(relogin.status, 201);
  const newActor = await relogin.json();
  const restored = await request('/api/pdca/' + newPdca.id, 'GET', undefined, newActor.token);
  assert.equal(restored.status, 200, 'PDCA missing after restart');
  assert.equal((await restored.json()).title, 'Prebuilt smoke persistence');
  console.log('PREBUILT SMOKE PASS: local HTTP, session, seeded graph, PDF/Excel/JSON, create, restart persistence; no npm invoked');
} finally {
  await stop();
  await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}
