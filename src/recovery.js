import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { copyFile, mkdir, open, readFile, readdir, rename, rm, stat, statfs, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { auditSuffix, stagedApplicationId, workspacePoint } from './audit.js';
import { imageType, normalizeWorkspace, reconcileWorkspace, trashLifetime } from './store.js';

const hour = 3_600_000;
const retention = 30 * 24 * hour;
const snapshotId = /^(\d{13})-[a-f0-9-]{36}$/;
const databaseName = 'workspace.sqlite';
const digest = value => createHash('sha256').update(value).digest('hex');

async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function syncFile(file) {
  const handle = await open(file, 'r+');
  try { await handle.sync(); } finally { await handle.close(); }
}

function check(condition, reason) {
  if (!condition) throw new Error(reason);
}

// Verify SQLite plus the application references that SQLite cannot see inside graph JSON.
export function inspectWorkspace(db) {
  check(db.prepare('PRAGMA integrity_check').all().every(row => row.integrity_check === 'ok'), 'SQLite integrity check failed');
  check(!db.prepare('PRAGMA foreign_key_check').get(), 'Broken SQLite foreign key');
  check(!db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'deletion_audit'").get(), 'Unexpected legacy Audit inside Workspace');
  const cut = workspacePoint(db);
  check(cut && /^[a-f0-9-]{36}$/.test(cut.ledger) && Number.isSafeInteger(cut.seq) && cut.seq >= 0 &&
    /^[a-f0-9]{64}$/.test(cut.head), 'Missing or invalid snapshot cutoff');
  const image = db.prepare('SELECT node_id, name, mime, bytes FROM images WHERE id = ?');
  const nodeIds = new Map(db.prepare('SELECT id, pdca_id FROM node_ids').all().map(row => [row.id, row.pdca_id]));
  const imageIds = new Set(db.prepare('SELECT id FROM images').all().map(row => row.id));
  const historyFor = db.prepare('SELECT * FROM history WHERE pdca_id = ? ORDER BY seq');
  const workspaces = db.prepare('SELECT id, graph, revision FROM workspaces ORDER BY id').all().map(row => {
    const { id, revision } = row;
    const graph = normalizeWorkspace(JSON.parse(row.graph));
    const history = historyFor.all(id);
    for (const entry of history) {
      JSON.parse(entry.before_json);
      JSON.parse(entry.after_json);
    }
    const trash = db.prepare('SELECT subject_id, deleted, expires FROM trash WHERE pdca_id = ? ORDER BY subject_id').all(id);
    const subjects = new Set([id, ...graph.nodes.map(node => node.id)]);
    check(trash.every(item => subjects.has(item.subject_id) && item.expires === item.deleted + trashLifetime), 'Invalid Trash entry');
    const nodes = graph.nodes.map(node => {
      check(nodeIds.get(node.id) === id, 'Node ID does not match its Workspace');
      nodeIds.delete(node.id);
      const images = node.images.map(id => {
        const asset = image.get(id);
        const bytes = asset && Buffer.from(asset.bytes);
        check(imageIds.delete(id) && asset?.node_id === node.id && imageType(bytes) === asset.mime, 'Unreadable or misplaced image');
        return { id, name: asset.name, mime: asset.mime, sha256: digest(bytes) };
      });
      return { id: node.id, documents: node.documents, images };
    });
    return { id, revision, graphSha256: digest(row.graph), nodes, edges: graph.edges,
      history: { count: history.length, sha256: digest(JSON.stringify(history)) }, trash };
  });
  check(!nodeIds.size && !imageIds.size, 'Orphan Node or image');
  check(!db.prepare('SELECT 1 FROM trash WHERE pdca_id NOT IN (SELECT id FROM workspaces)').get(), 'Orphan Trash entry');
  return { cut, workspaces };
}

export function inspectWorkspaceFile(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try { return inspectWorkspace(db); } finally { db.close(); }
}

async function readSnapshot(file, manifest) {
  check(manifest.version === 1 && await hashFile(file) === manifest.sha256, 'Snapshot checksum does not match');
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    check(db.prepare('PRAGMA application_id').get().application_id === stagedApplicationId, 'Snapshot is not marked as isolated');
    const inventory = inspectWorkspace(db);
    check(['ledger', 'seq', 'head'].every(key => inventory.cut[key] === manifest.cut?.[key]), 'Snapshot cutoff does not match manifest');
    return inventory;
  } finally {
    db.close();
  }
}

export async function createSnapshot({ file, auditFile, root, now = Date.now }) {
  const capturedAt = now();
  const id = capturedAt + '-' + randomUUID();
  const pending = join(root, '.pending-' + id);
  await mkdir(pending);
  try {
    const destination = join(pending, databaseName);
    const source = new DatabaseSync(file, { readOnly: true });
    try {
      source.exec('PRAGMA busy_timeout = 3000');
      await backup(source, destination);
    } finally {
      source.close();
    }
    const copy = new DatabaseSync(destination);
    let cut;
    try {
      copy.exec('PRAGMA application_id = ' + stagedApplicationId);
      copy.exec('VACUUM');
      cut = workspacePoint(copy);
    } finally {
      copy.close();
    }
    auditSuffix(auditFile, cut);
    await syncFile(destination);
    const manifest = { version: 1, id, capturedAt, cut, sha256: await hashFile(destination) };
    await readSnapshot(destination, manifest);
    const metadata = join(pending, 'snapshot.json');
    await writeFile(metadata, JSON.stringify(manifest, null, 2), { flag: 'wx' });
    await syncFile(metadata);
    await rename(pending, join(root, id));
    return manifest;
  } catch (error) {
    await rm(pending, { recursive: true, force: true });
    throw error;
  }
}

function survivingPoint(file) {
  if (!file) return null;
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    db.exec('PRAGMA busy_timeout = 3000');
    return workspacePoint(db);
  } catch {
    // Restore must also work when the Workspace was destroyed and only Audit survives.
    return null;
  } finally {
    db?.close();
  }
}

export async function restoreSnapshot({ id, root, recoveryRoot, file: liveFile, auditFile, role, now = Date.now }) {
  check(['IT', 'Phil'].includes(role), 'Restore permission required');
  check(typeof id === 'string' && snapshotId.test(id), 'Invalid snapshot ID');
  const startedAt = now();
  await mkdir(recoveryRoot, { recursive: true });
  const stageId = randomUUID();
  const stage = join(recoveryRoot, stageId);
  await mkdir(stage);
  let report = { stageId, snapshot: id, role, startedAt, status: 'held' };
  const reportFile = join(stage, 'restore.json');
  // A stopped or interrupted restore remains isolated, with an initial held record.
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  try {
    const source = join(root, id);
    const file = join(stage, databaseName);
    const manifest = JSON.parse(await readFile(join(source, 'snapshot.json'), 'utf8'));
    check(manifest.id === id && manifest.capturedAt === Number(snapshotId.exec(id)[1]), 'Snapshot identity does not match manifest');
    await copyFile(join(source, databaseName), file);
    const before = await readSnapshot(file, manifest);
    const witness = survivingPoint(liveFile);
    const evidence = auditSuffix(auditFile, before.cut, witness);
    const db = new DatabaseSync(file);
    let inventory, applied;
    try {
      db.exec('PRAGMA secure_delete = ON');
      applied = reconcileWorkspace(db, evidence);
      // Repack the isolated copy to remove old pages that held purged data.
      db.exec('VACUUM');
      inventory = inspectWorkspace(db);
    } finally {
      db.close();
    }
    await syncFile(file);
    const sha256 = await hashFile(file);
    report = { ...report, status: 'awaiting-it-review', capturedAt: manifest.capturedAt, from: before.cut,
      through: evidence.tip, survivingWorkspace: witness, applied, sha256, inventory };
  } catch (error) {
    report.reason = error.message;
  }
  report.completedAt = now();
  const pending = reportFile + '.pending';
  await writeFile(pending, JSON.stringify(report, null, 2));
  await syncFile(pending);
  await rename(pending, reportFile);
  return report;
}

export async function prepareRestore({ stageId, recoveryRoot, file: liveFile, auditFile, role }) {
  check(role === 'IT', 'Only IT can prepare a reviewed candidate');
  check(typeof stageId === 'string' && /^[a-f0-9-]{36}$/.test(stageId), 'Invalid restore ID');
  const stage = join(recoveryRoot, stageId);
  const report = JSON.parse(await readFile(join(stage, 'restore.json'), 'utf8'));
  check(report.stageId === stageId && report.status === 'awaiting-it-review', 'Restore is still held');
  const source = join(stage, databaseName);
  check(await hashFile(source) === report.sha256, 'Reviewed database checksum changed');
  const { cut } = inspectWorkspaceFile(source);
  check(['ledger', 'seq', 'head'].every(key => cut[key] === report.through?.[key]), 'Reviewed cutoff changed');
  check(!auditSuffix(auditFile, cut, survivingPoint(liveFile)).events.length, 'Audit has advanced; reconcile again before preparing');
  const candidate = join(stage, 'candidate.sqlite');
  await copyFile(source, candidate, constants.COPYFILE_EXCL);
  try {
    const db = new DatabaseSync(candidate);
    try { db.exec('PRAGMA application_id = 0'); } finally { db.close(); }
    await syncFile(candidate);
    return { candidate, sha256: await hashFile(candidate), cut };
  } catch (error) {
    await rm(candidate, { force: true });
    throw error;
  }
}

async function prune(root, now) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const match = snapshotId.exec(entry.name.replace(/^\.pending-/, ''));
    if (entry.isDirectory() && match && Number(match[1]) <= now - retention) {
      await rm(join(root, entry.name), { recursive: true });
    }
  }
}

// Integrity checks, image hashing and VACUUM can be expensive on a full Host.
// Keep them off the request thread so leases and saves can continue.
export function runRecovery(job, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { job, options } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => reject(new Error('Recovery worker exited before reporting a result (' + code + ')')));
  });
}

if (!isMainThread && workerData?.job) {
  const run = workerData.job === 'backup' ? createSnapshot : restoreSnapshot;
  parentPort.postMessage(await run(workerData.options));
}

export function startBackups({ file, auditFile, root, notify, lowSpaceBytes = 1024 ** 3,
  now = Date.now, freeSpace = async root => {
    const { bsize, bavail } = await statfs(root);
    return bsize * bavail;
  }, snapshot = createSnapshot, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const interval = 2 * hour;
  const retry = 5 * 60_000;
  let timer, active, stopped = false;
  const emit = (event, detail = {}) => notify({ event, at: now(), ...detail });

  async function run() {
    const started = now();
    let delay = interval;
    try {
      await mkdir(root, { recursive: true });
      const freeBytes = await freeSpace(root);
      const workspaceBytes = (await stat(file)).size;
      if (freeBytes < Math.max(workspaceBytes, lowSpaceBytes)) {
        emit('backup-low-space', { freeBytes, workspaceBytes, lowSpaceBytes });
      }
      check(freeBytes >= workspaceBytes, 'Insufficient space for a Workspace snapshot');
      const saved = await snapshot({ file, auditFile, root, now });
      emit('backup-verified', saved);
    } catch (error) {
      emit('backup-failed', { reason: error.message, retryInMs: retry });
      delay = retry;
    }
    try {
      await prune(root, now());
    } catch (error) {
      emit('backup-retention-failed', { reason: error.message, retryInMs: retry });
      delay = retry;
    }
    if (!stopped) timer = setTimer(launch, Math.max(0, started + delay - now()));
  }

  function launch() { active = run(); return active; }
  const first = launch();
  return { first, async stop() { stopped = true; clearTimer(timer); await active; } };
}
