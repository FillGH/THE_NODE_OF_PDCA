import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditPath, inspectWitnessPair, resealWitness } from '../src/audit.js';
import { adoptActive, activeStatus, activatePrepared, rollbackActive, readActiveState, inspectActivePair } from '../src/active-db.js';
import { operationsConfig } from '../src/ops.js';
import { createSnapshot, restoreSnapshot, prepareRestore, inspectWorkspaceFile } from '../src/recovery.js';
import { startHost } from '../src/server.js';
import { openStore } from '../src/store.js';

const key = 'test-it-key-not-for-factory-use-00000000';
function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'pdca-active-'));
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 3 }));
  const file = join(dir, 'workspace.sqlite');
  const auditFile = auditPath(file);
  const root = join(dir, 'backups'), recoveryRoot = join(dir, 'restore');
  mkdirSync(root);
  const env = { ...process.env, PDCA_DB: file, PDCA_AUDIT: auditFile, PDCA_BACKUP_DIR: root,
    PDCA_RESTORE_DIR: recoveryRoot, PDCA_OPS_LOG: join(dir, 'operations.jsonl'),
    PDCA_DATA_ROOT: dir, PDCA_ACTIVE_DB_POINTER: join(dir, 'active-db.json'),
    PDCA_PORT: '4173', PDCA_IT_KEY: key };
  const store = openStore(file, { auditFile });
  store.create('First PDCA');
  store.close();
  return { dir, file, auditFile, root, recoveryRoot, env };
}
const cli = (env, ...args) => spawnSync(process.execPath, ['src/ops.js', ...args], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...env, PDCA_OPERATOR_KEY: key }, encoding: 'utf8', timeout: 20000,
});
async function reserve(t) {
  const listener = createServer();
  await new Promise((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve));
  t.after(() => listener.close());
  return listener.address().port;
}

test('R-01 pointer fails closed, IT ADOPT enforced, port conflict and out-of-root path rejected', async t => {
  const f = setup(t);
  const port = await reserve(t);
  f.env.PDCA_PORT = String(port);
  assert.throws(() => operationsConfig(f.env), /pointer missing/);
  await assert.rejects(adoptActive(f.env, 'Phil', 'ADOPT'), /IT authorization/);
  await assert.rejects(adoptActive(f.env, 'IT', 'ADOPT'), /occupied/);
  f.env.PDCA_PORT = '42733';
  const adopted = await adoptActive(f.env, 'IT', 'ADOPT');
  assert.equal(adopted.current.workspace, f.file);
  assert.deepEqual((await activeStatus(f.env, 'IT')).currentCut, adopted.cut);
  assert.equal(operationsConfig(f.env).file, f.file);
  await assert.rejects(adoptActive(f.env, 'IT', 'ADOPT'), /exists/);
  const pointer = JSON.parse(readFileSync(f.env.PDCA_ACTIVE_DB_POINTER, 'utf8'));
  pointer.current.workspace = join(tmpdir(), 'outside.sqlite');
  writeFileSync(f.env.PDCA_ACTIVE_DB_POINTER, JSON.stringify(pointer));
  assert.throws(() => operationsConfig(f.env), /outside PDCA_DATA_ROOT/);
});

test('R-02 snapshot, stage, IT prepare, ACTIVATE, startup backup and safe ROLLBACK', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42734';
  const snapshot = await createSnapshot(f);
  await adoptActive(f.env, 'IT', 'ADOPT');
  const report = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  assert.equal(report.status, 'awaiting-it-review', report.reason);
  const prepared = await prepareRestore({ ...f, stageId: report.stageId, role: 'IT' });
  assert.equal(existsSync(prepared.candidate), true);
  await assert.rejects(activatePrepared(f.env, 'Phil', report.stageId, 'ACTIVATE'), /IT authorization/);
  await assert.rejects(activatePrepared(f.env, 'IT', report.stageId, 'wrong'), /confirmation/);
  const activated = await activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE');
  assert.notEqual(activated.current.workspace, prepared.candidate);
  assert.match(activated.current.workspace, /active-db.*workspace\.sqlite/);
  assert.equal(activated.previous.workspace, f.file);
  assert.equal(operationsConfig(f.env).file, activated.current.workspace);
  // F-01: IT may clean transient Restore Staging without deleting the running database.
  rmSync(f.recoveryRoot, { recursive: true, force: true });
  assert.equal((await activeStatus(f.env, 'IT')).projects, 1);
  const host = await startHost(f.env);
  try { await host.backups.first; } finally { await host.stop(); }
  assert.ok(readdirSync(f.root).length >= 2);
  const back = await rollbackActive(f.env, 'IT', 'ROLLBACK');
  assert.equal(back.current.workspace, f.file);
  assert.equal(operationsConfig(f.env).file, f.file);
  assert.equal((await activeStatus(f.env, 'IT')).projects, 1);
});

test('R-03 tampered candidate rejected; rollback with new Audit entries fails closed', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42735';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const snapshot = await createSnapshot(f);
  const report = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  const prepared = await prepareRestore({ ...f, stageId: report.stageId, role: 'IT' });
  // Direct SQL tamper simulates an external file modification, not a sanctioned app write.
  const tamper = new DatabaseSync(prepared.candidate);
  try {
    const row = tamper.prepare('SELECT id, graph FROM workspaces LIMIT 1').get();
    const graph = JSON.parse(row.graph);
    graph.title = 'Tampered after IT prepare';
    tamper.prepare('UPDATE workspaces SET graph = ? WHERE id = ?').run(JSON.stringify(graph), row.id);
  } finally { tamper.close(); }
  await assert.rejects(activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE'), /differ from reviewed/);
  rmSync(prepared.candidate);
  const report2 = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  const prepared2 = await prepareRestore({ ...f, stageId: report2.stageId, role: 'IT' });
  const activated = await activatePrepared(f.env, 'IT', report2.stageId, 'ACTIVATE');
  const live = openStore(activated.current.workspace, { auditFile: f.auditFile });
  const graph = live.search('First PDCA')[0];
  live.setVisibility(graph.id, graph.id, 0, false, { id: randomUUID(), displayName: 'QA' });
  live.close();
  await assert.rejects(rollbackActive(f.env, 'IT', 'ROLLBACK'), /newer Audit events|newer events|lose post-cutover/);
  assert.equal(operationsConfig(f.env).file, activated.current.workspace);
});

test('R-04 offline CLI shares pointer, rejects invalid credentials, forbids live service cutover', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42736';
  assert.equal(cli(f.env, 'adopt', 'ADOPT').status, 0);
  assert.equal(cli(f.env, 'status').status, 0);
  const noKey = spawnSync(process.execPath, ['src/ops.js', 'rollback', 'ROLLBACK'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...f.env, PDCA_OPERATOR_KEY: 'wrong' }, encoding: 'utf8',
  });
  assert.equal(noKey.status, 1);
  const snapshot = await createSnapshot(f);
  const restore = cli(f.env, 'restore', snapshot.id);
  assert.equal(restore.status, 0, restore.stderr);
  const stageId = JSON.parse(restore.stdout).stageId;
  assert.equal(cli(f.env, 'prepare', stageId).status, 0);
  const listener = createServer();
  await new Promise((resolve, reject) => listener.once('error', reject).listen(42736, '127.0.0.1', resolve));
  const blocked = cli(f.env, 'activate', stageId, 'ACTIVATE');
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /occupied/);
  await new Promise(resolve => listener.close(resolve));
  const ok = cli(f.env, 'activate', stageId, 'ACTIVATE');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(readActiveState(f.env).state.action, 'activate');
});

test('R-05 unlogged edits reject ordinary activation and reject destructive rollback', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42737';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const snapshot = await createSnapshot(f);
  const live = openStore(f.file, { auditFile: f.auditFile });
  live.create('New unlogged work');
  live.close();
  const report = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  assert.equal(report.status, 'awaiting-it-review');
  const prepared = await prepareRestore({ ...f, stageId: report.stageId, role: 'IT' });
  await assert.rejects(activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE'), /differs from live data/);
  assert.equal(operationsConfig(f.env).file, f.file);
  const activated = await activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE-RECOVERY');
  assert.notEqual(activated.current.workspace, prepared.candidate);
  await assert.rejects(rollbackActive(f.env, 'IT', 'ROLLBACK'), /lose post-cutover changes/);
});

test('R-06 lost live Workspace recovers only with explicit IT recovery-point approval', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42738';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const snapshot = await createSnapshot(f);
  rmSync(f.file, { force: true });
  assert.throws(() => inspectActivePair(f.file, f.auditFile), /open|database/i);
  const report = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  assert.equal(report.status, 'awaiting-it-review', report.reason);
  const prepared = await prepareRestore({ ...f, stageId: report.stageId, role: 'IT' });
  await assert.rejects(activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE'), /explicit ACTIVATE-RECOVERY/);
  const approved = await activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE-RECOVERY');
  assert.notEqual(approved.current.workspace, prepared.candidate);
  assert.equal((await activeStatus(f.env, 'IT')).projects, 1);
});

test('R-07 F-05 stale Workspace substitution without deletion Audit event fails closed', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42739';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const staleCopy = join(f.dir, 'stale-workspace.sqlite');
  copyFileSync(f.file, staleCopy);
  const live = openStore(f.file, { auditFile: f.auditFile });
  live.create('Second PDCA (no deletion audit event)');
  live.close();
  assert.equal((await activeStatus(f.env, 'IT')).projects, 2);
  copyFileSync(staleCopy, f.file);
  await assert.rejects(activeStatus(f.env, 'IT'), /witness mismatch/);
  await assert.rejects(startHost(f.env), /witness mismatch/);
  assert.equal(readdirSync(f.root).length, 0, 'Blocked stale host must not take new backups');
});

test('R-08 F-06 full inventory covers last_save_id, scope_versions and save_receipts', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42740';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const baseline = inspectWorkspaceFile(f.file);
  const id = baseline.workspaces[0].id;
  const db = new DatabaseSync(f.file);
  try {
    db.prepare('UPDATE workspaces SET last_save_id = ? WHERE id = ?').run(randomUUID(), id);
    assert.notDeepEqual(inspectWorkspaceFile(f.file), baseline, 'last_save_id must affect inventory');
    db.prepare('INSERT INTO scope_versions VALUES (?, ?, ?)').run(id, 'layout', 1);
    db.prepare('INSERT INTO save_receipts VALUES (?, ?, ?, ?, ?)')
      .run(id, randomUUID(), randomUUID(), 'digest', 1);
  } finally { db.close(); }
  const changed = inspectWorkspaceFile(f.file);
  assert.equal(changed.workspaces[0].scopeVersions.count, 1);
  assert.equal(changed.workspaces[0].saveReceipts.count, 1);
  assert.notDeepEqual(changed, baseline);
  const snapshot = await createSnapshot(f);
  const report = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  assert.equal(report.status, 'awaiting-it-review');
});

test('R-09 F-06 post-cutover hidden metadata edit blocks ROLLBACK', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42741';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const snapshot = await createSnapshot(f);
  const report = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  await prepareRestore({ ...f, stageId: report.stageId, role: 'IT' });
  const activated = await activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE');
  const db = new DatabaseSync(activated.current.workspace);
  try { db.exec("UPDATE workspaces SET last_save_id='tampered-metadata'"); }
  finally { db.close(); }
  await assert.rejects(rollbackActive(f.env, 'IT', 'ROLLBACK'), /lose post-cutover changes/);
});

test('R-10 interrupted reseal before pointer swap fails closed, does not start stale Workspace', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42742';
  await adoptActive(f.env, 'IT', 'ADOPT');
  const stagingCopy = join(f.dir, 'unpublished-cutover.sqlite');
  copyFileSync(f.file, stagingCopy);
  resealWitness(stagingCopy, f.auditFile); // fault injection: process crashes before atomicPointer()
  await assert.rejects(activeStatus(f.env, 'IT'), /witness mismatch/);
  await assert.rejects(startHost(f.env), /witness mismatch/);
  assert.equal(readdirSync(f.root).length, 0);
});

test('R-11 all ordinary Create, Category, Save paths advance Workspace and Audit witness atomically', async t => {
  const f = setup(t);
  f.env.PDCA_PORT = '42743';
  await adoptActive(f.env, 'IT', 'ADOPT');
  let previous = inspectWitnessPair(f.file, f.auditFile);
  const store = openStore(f.file, { auditFile: f.auditFile });
  try {
    const next = store.create('Non deletion create');
    let current = inspectWitnessPair(f.file, f.auditFile);
    assert.ok(current.generation > previous.generation);
    previous = current;
    const category = store.changeCategory(null, 'Factory Testing');
    current = inspectWitnessPair(f.file, f.auditFile);
    assert.ok(current.generation > previous.generation);
    previous = current;
    store.assignCategory(next.id, category.id, null);
    current = inspectWitnessPair(f.file, f.auditFile);
    assert.ok(current.generation > previous.generation);
    previous = current;
    const graph = store.load(next.id);
    const saved = store.save(next.id, { graph, revision: graph.revision, saveId: randomUUID(), displayName: 'QA' , uploads: [] });
    assert.ok(saved.revision >= 0);
    current = inspectWitnessPair(f.file, f.auditFile);
    assert.ok(current.generation > previous.generation);
    previous = current;
    store.removeCategory(category.id, category.name);
    current = inspectWitnessPair(f.file, f.auditFile);
    assert.ok(current.generation > previous.generation);
  } finally { store.close(); }
});
