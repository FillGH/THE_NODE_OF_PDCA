import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { auditPath } from '../src/audit.js';
import { inspectPair } from '../src/ops.js';
import { createSnapshot, inspectWorkspaceFile, prepareRestore, restoreSnapshot, startBackups } from '../src/recovery.js';
import { startHost } from '../src/server.js';
import { openStore } from '../src/store.js';

const hour = 3_600_000, day = 24 * hour;
const epoch = Date.parse('2026-11-09T02:00:00Z');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=', 'base64');
const doc = 'https://example.invalid/synthetic-report';
const actor = { id: randomUUID(), displayName: 'QA fictional' };

function fixture(t, name) {
  const evidence = process.env.PDCA_BUILD4_EVIDENCE;
  const base = evidence ? resolve(evidence) : tmpdir();
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, name + '-'));
  const cleanups = [];
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) await cleanup();
    if (!evidence) rmSync(dir, { recursive: true, force: true });
  });
  const file = join(dir, 'live.sqlite');
  const root = join(dir, 'backups');
  const recoveryRoot = join(dir, 'restore');
  mkdirSync(root);
  let time = epoch;
  return { dir, file, auditFile: auditPath(file), root, recoveryRoot,
    now: () => time, advance(ms) { time += ms; }, cleanup: fn => cleanups.push(fn) };
}

const node = (title, extra = {}) => ({
  id: randomUUID(), cat: 1, title, sideNote: '', pic: '', due: '', status: 'Not Started',
  snapY: 100, freeX: null, freeY: null, freeW: 200, freeH: 100, images: [], documents: [], ...extra,
});

function populate(store) {
  const graph = store.create('Fictional PDCA');
  const image = randomUUID();
  const kept = node('Keep', { images: [image], documents: [doc] });
  const recovered = node('Restore later');
  const purged = node('Purge later');
  const hidden = node('Delete later');
  const edge = { id: randomUUID(), from: kept.id, to: recovered.id, label: 'Synthetic trace', color: 'slate' };
  const removedEdge = { ...edge, id: randomUUID(), to: purged.id };
  graph.nodes.push(kept, recovered, purged, hidden);
  graph.edges.push(edge, removedEdge);
  store.save(graph.id, { graph, revision: 0, saveId: randomUUID(), displayName: actor.displayName,
    uploads: [{ id: image, name: 'fictional.png', data: png.toString('base64') }] });
  return { graph, kept, recovered, purged, hidden, edge, removedEdge, image };
}

function visibility(store, id, subject, restore, revision = store.load(id).revision) {
  return store.setVisibility(id, subject, revision, restore, actor);
}

function exec(file, sql) {
  const db = new DatabaseSync(file);
  try { db.exec(sql); } finally { db.close(); }
}

const stageFile = (fixture, report) => join(fixture.recoveryRoot, report.stageId, 'workspace.sqlite');

test('B4-01 legacy migration and an injected fault leave Workspace and Audit at the same cutoff', t => {
  const f = fixture(t, 'migration');
  exec(f.file, `
    CREATE TABLE deletion_audit (
      seq INTEGER PRIMARY KEY, operation_id TEXT, pdca_id TEXT, subject_id TEXT,
      kind TEXT, event TEXT, at INTEGER, expires INTEGER, display_name TEXT, session_id TEXT, retain_until INTEGER
    );
    INSERT INTO deletion_audit VALUES (42, 'legacy-op', 'legacy-id', 'legacy-id', 'PDCA', 'restore', 0, 0, 'QA', NULL, NULL);
  `);
  const store = openStore(f.file, f);
  f.cleanup(() => store.close());
  assert.equal(store.auditLog()[0].seq, 42);
  const legacy = inspectPair(f.file, f.auditFile).cut;
  assert.equal(legacy.seq, 42);
  const graph = store.create('Rollback fixture');
  exec(f.file, "CREATE TRIGGER fault BEFORE UPDATE ON recovery_cut BEGIN SELECT RAISE(ABORT, 'QA commit fault'); END");
  assert.throws(() => visibility(store, graph.id, graph.id, false), /QA commit fault/);
  assert.equal(store.trash().length, 0);
  assert.equal(store.auditLog().length, 1);
  assert.deepEqual(inspectPair(f.file, f.auditFile).cut, legacy);
  exec(f.file, 'DROP TRIGGER fault');
  visibility(store, graph.id, graph.id, false);
  assert.equal(store.auditLog()[0].seq, 43);
  assert.equal(inspectPair(f.file, f.auditFile).cut.seq, 43);
});

test('B4-02/03 snapshot round trip, preserved Trash timestamps, nested PDCA purge and repeat replay', async t => {
  const f = fixture(t, 'roundtrip');
  const store = openStore(f.file, f);
  f.cleanup(() => store.close());
  const { graph, kept, recovered, purged, hidden, edge, image } = populate(store);
  const doomed = populate(store);
  visibility(store, graph.id, recovered.id, false);
  visibility(store, graph.id, purged.id, false);
  visibility(store, doomed.graph.id, doomed.graph.id, false);
  // The save after the asynchronous backup request starts is in the copied DB. The cut must be read from the copy.
  const pending = createSnapshot(f);
  const fresh = store.create('Saved while backup was starting');
  visibility(store, fresh.id, fresh.id, false);
  const snapshot = await pending;
  assert.equal(snapshot.cut.seq, 4);
  const sourceFile = join(f.root, snapshot.id, 'workspace.sqlite');
  const original = inspectWorkspaceFile(sourceFile);
  assert.deepEqual(original.cut, snapshot.cut);
  assert.equal(original.workspaces.length, 3);
  assert.equal(original.workspaces.find(row => row.id === graph.id).nodes.length, 4);
  const same = await restoreSnapshot({ ...f, id: snapshot.id, role: 'Phil' });
  assert.deepEqual(same.inventory, original);
  f.advance(day);
  visibility(store, graph.id, recovered.id, true);
  f.advance(6 * day + 1);
  store.purge();
  visibility(store, graph.id, hidden.id, false);
  const originalExpiry = store.trash()[0];
  const start = performance.now();
  const first = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  const elapsedMs = Math.round(performance.now() - start);
  const repeat = await restoreSnapshot({ ...f, file: join(f.dir, 'lost-live.sqlite'), id: snapshot.id, role: 'Phil' });
  assert.equal(first.status, 'awaiting-it-review', first.reason);
  assert.deepEqual(first.inventory, repeat.inventory);
  assert.deepEqual(first.applied, { delete: 1, restore: 1, purge: 3, absent: 4 });
  assert.equal(first.inventory.workspaces.length, 1);
  const result = first.inventory.workspaces[0];
  assert.equal(result.id, graph.id);
  assert.deepEqual(result.nodes.map(item => item.id), [kept.id, recovered.id, hidden.id]);
  assert.deepEqual(result.edges.map(item => item.id), [edge.id]);
  assert.deepEqual(result.nodes[0].documents, [doc]);
  assert.equal(result.history.count, 4);
  assert.deepEqual(result.trash.map(item => ({ ...item })), [{ subject_id: hidden.id,
    deleted: originalExpiry.deleted, expires: originalExpiry.expires }]);
  const db = new DatabaseSync(stageFile(f, first), { readOnly: true });
  try {
    assert.deepEqual(Buffer.from(db.prepare('SELECT bytes FROM images WHERE id = ?').get(image).bytes), png);
  } finally { db.close(); }
  assert.throws(() => openStore(stageFile(f, first), f), /isolated/);
  await assert.rejects(prepareRestore({ ...f, stageId: first.stageId, role: 'Phil' }), /Only IT/);
  const prepared = await prepareRestore({ ...f, stageId: first.stageId, role: 'IT' });
  assert.deepEqual(inspectPair(prepared.candidate, f.auditFile), first.inventory);
  t.diagnostic(JSON.stringify({ snapshot: snapshot.id, sha256: snapshot.sha256, cutoff: snapshot.cut.seq, through: first.through.seq,
    repeatStage: repeat.stageId, stage: first.stageId, reconciledSha256: first.sha256, pdca: graph.id, nodes: result.nodes.map(n => n.id),
    edge: edge.id, image, document: doc, history: result.history.count, trashExpires: originalExpiry.expires,
    reconcileMs: elapsedMs, applied: first.applied }));
});

test('B4-04 held cases for missing Audit, gap, altered tail, unprovable cutoff and corrupt snapshot', async t => {
  const f = fixture(t, 'held');
  const store = openStore(f.file, f);
  const { graph, kept, recovered } = populate(store);
  const snapshot = await createSnapshot(f);
  visibility(store, graph.id, kept.id, false);
  visibility(store, graph.id, recovered.id, false);
  const reviewed = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  assert.equal(reviewed.status, 'awaiting-it-review', reviewed.reason);
  const rolledBackAudit = join(f.dir, 'rolled-back.sqlite');
  copyFileSync(f.auditFile, rolledBackAudit);
  visibility(store, graph.id, kept.id, true);
  await assert.rejects(prepareRestore({ ...f, stageId: reviewed.stageId, role: 'IT' }), /Audit has advanced/);
  store.close();
  const cases = [
    ['missing', null, /unable to open/],
    ['gap', 'DELETE FROM events WHERE seq = 2', /gap/],
    ['missing-tail', 'DELETE FROM events WHERE seq = 3', /recorded ledger head/],
    ['tampered', "UPDATE events SET display_name = 'modified' WHERE seq = 1", /disagrees with the surviving Workspace point/],
    ['foreign', "UPDATE ledger_state SET ledger = 'foreign'", /cannot identify/],
  ];
  for (const [name, sql, expected] of cases) {
    const auditFile = join(f.dir, name + '.sqlite');
    if (sql) {
      copyFileSync(f.auditFile, auditFile);
      exec(auditFile, sql);
    }
    const result = await restoreSnapshot({ ...f, auditFile, id: snapshot.id, role: 'IT' });
    assert.equal(result.status, 'held', name);
    assert.match(result.reason, expected, name);
    assert.throws(() => openStore(stageFile(f, result), f), /isolated/);
    await assert.rejects(prepareRestore({ ...f, stageId: result.stageId, role: 'IT' }), /still held/);
    t.diagnostic(name + ': ' + result.reason);
  }
  const oldLedger = await restoreSnapshot({ ...f, auditFile: rolledBackAudit, id: snapshot.id, role: 'IT' });
  assert.equal(oldLedger.status, 'held');
  assert.match(oldLedger.reason, /surviving Workspace point/);
  exec(join(f.root, snapshot.id, 'workspace.sqlite'), "UPDATE recovery_cut SET head = 'changed'");
  const corrupt = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  assert.equal(corrupt.status, 'held');
  assert.match(corrupt.reason, /checksum/);
  assert.equal(inspectPair(f.file, f.auditFile).workspaces[0].trash.length, 1);
});

test('B4-05 first backup, two-hour cadence, disk alerts, retry and rolling retention', async t => {
  const f = fixture(t, 'timer');
  const store = openStore(f.file, f);
  f.cleanup(() => store.close());
  let free = 2 ** 30, writeFailure = false, scheduled;
  const events = [];
  const scheduler = startBackups({ ...f, freeSpace: async () => free, lowSpaceBytes: 128 * 1024 ** 2,
    setTimer: (run, ms) => (scheduled = { run, ms }), clearTimer() {},
    notify: event => events.push(event),
    async snapshot(options) {
      if (writeFailure) throw new Error('Injected backup write failure');
      return createSnapshot(options);
    },
  });
  f.cleanup(() => scheduler.stop());
  await scheduler.first;
  assert.equal(events[0].event, 'backup-verified');
  const first = events[0].id;
  assert.equal(scheduled.ms, 2 * hour);
  f.advance(scheduled.ms);
  writeFailure = true;
  await scheduled.run();
  assert.match(events.at(-1).reason, /write failure/);
  assert.equal(scheduled.ms, 300_000);
  assert.deepEqual(readdirSync(f.root), [first]);
  f.advance(scheduled.ms);
  free = 0;
  await scheduled.run();
  assert.deepEqual(events.slice(-2).map(event => event.event), ['backup-low-space', 'backup-failed']);
  const ageAtIncident = f.now() + scheduled.ms - 1 - events.find(event => event.id === first).capturedAt;
  assert.equal(ageAtIncident, 2 * hour + 10 * 60_000 - 1);
  assert.ok(ageAtIncident <= 4 * hour);
  free = 64 * 1024 ** 2;
  writeFailure = false;
  f.advance(scheduled.ms);
  await scheduled.run();
  assert.deepEqual(events.slice(-2).map(event => event.event), ['backup-low-space', 'backup-verified']);
  f.advance(30 * day - (f.now() - epoch));
  free = 2 ** 30;
  await scheduled.run();
  assert.ok(!readdirSync(f.root).includes(first));
  assert.equal(readdirSync(f.root).length, 2);
  t.diagnostic(JSON.stringify({ events: events.map(event => event.event), retained: readdirSync(f.root).length, ageAtIncident }));
});

const it = 'fictional-it-key-for-build4-only-000000';
const phil = 'fictional-phil-key-for-build4-only-0000';
const ingress = 'fictional-ingress-build4-only-00000000';
const origin = 'https://pdca.fixture.invalid';

function http(host, path, { key, proxy = ingress, session, body, method = body ? 'POST' : 'GET', requestOrigin = origin } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: host.server.address().port, path, method,
      headers: { Host: new URL(origin).host, Origin: requestOrigin, ...(proxy && { 'x-pdca-ingress-key': proxy }),
        ...(key && { 'x-pdca-operator-key': key }), ...(session && { Authorization: 'Bearer ' + session }),
        ...(body && { 'Content-Type': 'application/json' }) } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, data: Buffer.concat(chunks), type: res.headers['content-type'] }));
    });
    req.on('error', reject);
    req.end(body && JSON.stringify(body));
  });
}

function hostEnv(f) {
  return { PDCA_PORT: '0', PDCA_DB: f.file, PDCA_AUDIT: f.auditFile, PDCA_BACKUP_DIR: f.root,
    PDCA_RESTORE_DIR: f.recoveryRoot, PDCA_OPS_LOG: join(f.dir, 'operations.jsonl'),
    PDCA_ORIGIN: origin, PDCA_INGRESS_KEY: ingress, PDCA_IT_KEY: it, PDCA_PHIL_KEY: phil };
}

test('B4-06 actual HTTP ingress and role checks, restored image, and startup backup after restart', async t => {
  const f = fixture(t, 'service');
  const store = openStore(f.file);
  const { graph, image } = populate(store);
  store.close();
  const env = hostEnv(f);
  let host = await startHost(env);
  f.cleanup(async () => { if (host) await host.stop(); });
  await host.backups.first;
  const [snapshot] = readdirSync(f.root);
  assert.equal((await http(host, '/', { proxy: null })).status, 403);
  assert.equal((await http(host, '/', { requestOrigin: 'https://other.invalid' })).status, 403);
  assert.equal((await http(host, '/')).status, 200);
  const response = await http(host, '/api/session', { body: { displayName: 'Phil' } });
  assert.equal(response.status, 201);
  const session = JSON.parse(response.data).token;
  const endpoint = '/api/operations/restore';
  const restore = key => http(host, endpoint, { key, session, body: { snapshot } });
  assert.equal((await restore()).status, 403);
  assert.equal((await restore(session)).status, 403);
  assert.equal((await restore(ingress)).status, 403);
  assert.equal((await http(host, '/api/deletion-audit', { session, key: phil })).status, 403);
  assert.equal((await http(host, '/api/deletion-audit', { session, key: it })).status, 200);
  assert.equal((await restore(phil)).status, 200);
  const incident = performance.now();
  const result = await restore(it);
  assert.equal(result.status, 200);
  const report = JSON.parse(result.data);
  const candidate = await prepareRestore({ ...f, stageId: report.stageId, role: 'IT' });
  const next = { ...f, dir: join(f.dir, 'preview'), file: candidate.candidate, auditFile: join(f.dir, 'preview-audit.sqlite'),
    root: join(f.dir, 'preview-backups'), recoveryRoot: join(f.dir, 'preview-restore') };
  await host.stop();
  host = null;
  copyFileSync(f.auditFile, next.auditFile);
  const preview = await startHost(hostEnv(next));
  try {
    const login = await http(preview, '/api/session', { body: { displayName: 'QA reader' } });
    const viewer = JSON.parse(login.data).token;
    const response = await http(preview, '/api/images/' + image, { session: viewer });
    assert.equal(response.status, 200);
    assert.equal(response.type, 'image/png');
    assert.deepEqual(response.data, png);
    const view = await http(preview, '/api/pdca/' + graph.id, { session: viewer });
    assert.equal(view.status, 200);
    assert.deepEqual(JSON.parse(view.data).nodes[0].documents, [doc]);
    t.diagnostic('Dev restore through app and image HTTP reads: ' + Math.round(performance.now() - incident) + ' ms');
  } finally { await preview.stop(); }
  host = await startHost(env);
  await host.backups.first;
  assert.equal(readdirSync(f.root).length, 2);
  assert.equal((await http(host, '/api/session', { session })).status, 403);
  const log = readFileSync(env.PDCA_OPS_LOG, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(log.filter(event => event.event === 'backup-verified').length, 2);
  assert.deepEqual(log.filter(event => event.event === 'restore-awaiting-it-review').map(event => event.role), ['Phil', 'IT']);
});

test('B4-07 offline Restore gate and laptop/server rehearsal return post-cutover writes to the laptop', async t => {
  const laptop = fixture(t, 'laptop');
  const server = fixture(t, 'server');
  const started = openStore(laptop.file);
  const { graph, recovered } = populate(started);
  const snapshot = await createSnapshot(laptop);
  started.close();
  const env = { ...process.env, ...hostEnv(laptop) };
  const offline = (key, command, id) => spawnSync(process.execPath, ['src/ops.js', command, id], {
    env: { ...env, PDCA_OPERATOR_KEY: key }, encoding: 'utf8',
  });
  assert.equal(offline('invalid', 'restore', snapshot.id).status, 1);
  const restored = offline(phil, 'restore', snapshot.id);
  assert.equal(restored.status, 0, restored.stderr);
  const stage = JSON.parse(restored.stdout).stageId;
  assert.equal(offline(phil, 'prepare', stage).status, 1);
  assert.equal(offline(it, 'prepare', stage).status, 0);

  const transfer = (from, to) => {
    copyFileSync(from.file, to.file);
    copyFileSync(from.auditFile, to.auditFile);
    assert.deepEqual(inspectPair(to.file, to.auditFile), inspectPair(from.file, from.auditFile));
  };
  transfer(laptop, server);
  const destination = openStore(server.file);
  destination.create('New saved server work');
  visibility(destination, graph.id, recovered.id, false);
  destination.close();
  assert.equal(inspectPair(laptop.file, laptop.auditFile).workspaces.length, 1);
  const stale = join(laptop.dir, 'frozen-before-cutover.sqlite');
  copyFileSync(laptop.file, stale);
  transfer(server, laptop);
  assert.throws(() => openStore(stale, { auditFile: laptop.auditFile }), /same recovery point/);
  const returned = openStore(laptop.file);
  laptop.cleanup(() => returned.close());
  assert.equal(returned.search('New saved server work').length, 1);
  assert.equal(returned.trash()[0].subject, recovered.id);
  assert.equal(returned.auditLog()[0].event, 'delete');
  unlinkSync(stale);
});

test('B4-08 non-interactive Node entry point starts a verified backup on two process launches', async t => {
  const f = fixture(t, 'boot');
  const env = hostEnv(f);
  for (let round = 1; round <= 2; round++) {
    const child = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, ...env }, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const exited = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    try {
      for (let poll = 0; poll < 100; poll++) {
        if (stdout.includes('PDCA BUILD 4') && readdirSync(f.root).filter(name => !name.startsWith('.')).length === round) break;
        if (child.exitCode !== null) break;
        await sleep(50);
      }
      assert.match(stdout, /PDCA BUILD 4/, stderr);
      assert.equal(readdirSync(f.root).filter(name => !name.startsWith('.')).length, round, stderr);
    } finally {
      child.kill();
      await exited;
    }
  }
});

test('B4-09 a readable SQLite file with a broken image fails verification and is never published', async t => {
  const f = fixture(t, 'invalid-backup');
  const store = openStore(f.file, f);
  f.cleanup(() => store.close());
  populate(store);
  exec(f.file, "UPDATE images SET bytes = X'00'");
  await assert.rejects(createSnapshot(f), /Unreadable or misplaced image/);
  assert.deepEqual(readdirSync(f.root), []);
});
