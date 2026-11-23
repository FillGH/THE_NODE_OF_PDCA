import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditPath } from '../src/audit.js';
import { adoptActive, activeStatus, activatePrepared, rollbackActive, readActiveState, inspectActivePair } from '../src/active-db.js';
import { operationsConfig } from '../src/ops.js';
import { createSnapshot, restoreSnapshot, prepareRestore } from '../src/recovery.js';
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
  assert.equal(activated.current.workspace, prepared.candidate);
  assert.equal(activated.previous.workspace, f.file);
  assert.equal(operationsConfig(f.env).file, prepared.candidate);
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
  const staged = openStore(prepared.candidate, { auditFile: f.auditFile });
  staged.create('Tampered after IT prepare');
  staged.close();
  await assert.rejects(activatePrepared(f.env, 'IT', report.stageId, 'ACTIVATE'), /differ from reviewed/);
  rmSync(prepared.candidate);
  const report2 = await restoreSnapshot({ ...f, id: snapshot.id, role: 'IT' });
  const prepared2 = await prepareRestore({ ...f, stageId: report2.stageId, role: 'IT' });
  await activatePrepared(f.env, 'IT', report2.stageId, 'ACTIVATE');
  const live = openStore(prepared2.candidate, { auditFile: f.auditFile });
  const graph = live.search('First PDCA')[0];
  live.setVisibility(graph.id, graph.id, 0, false, { id: randomUUID(), displayName: 'QA' });
  live.close();
  await assert.rejects(rollbackActive(f.env, 'IT', 'ROLLBACK'), /newer events|lose post-cutover/);
  assert.equal(operationsConfig(f.env).file, prepared2.candidate);
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
  assert.equal(activated.current.workspace, prepared.candidate);
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
  assert.equal(approved.current.workspace, prepared.candidate);
  assert.equal((await activeStatus(f.env, 'IT')).projects, 1);
});
