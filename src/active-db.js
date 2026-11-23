import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { constants } from 'node:fs';
import { copyFile, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { auditSuffix, inspectWitnessPair, resealWitness } from './audit.js';
import { inspectWorkspaceFile } from './recovery.js';
import { openStore } from './store.js';

function requireState(ok, message) {
  if (!ok) throw new Error(message);
}

function managed(env) {
  if (!env.PDCA_ACTIVE_DB_POINTER) return null;
  for (const name of ['PDCA_DATA_ROOT', 'PDCA_DB', 'PDCA_AUDIT', 'PDCA_BACKUP_DIR',
    'PDCA_RESTORE_DIR', 'PDCA_OPS_LOG', 'PDCA_PORT']) {
    requireState(env[name], 'Managed recovery requires ' + name);
  }
  const root = realpathSync(resolve(env.PDCA_DATA_ROOT));
  const pointer = resolve(env.PDCA_ACTIVE_DB_POINTER);
  const permitted = path => {
    requireState(typeof path === 'string' && isAbsolute(path), 'Managed database paths must be absolute');
    const full = resolve(path);
    const rel = relative(root, full);
    requireState(rel && rel !== '..' && !rel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) &&
      !isAbsolute(rel), 'Managed database path outside PDCA_DATA_ROOT: ' + full);
    if (existsSync(full)) {
      const actual = realpathSync(full);
      const realRel = relative(root, actual);
      requireState(realRel && realRel !== '..' && !realRel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) &&
        !isAbsolute(realRel), 'Managed database symlink escapes PDCA_DATA_ROOT');
    }
    return full;
  };
  for (const key of ['PDCA_DB', 'PDCA_AUDIT', 'PDCA_BACKUP_DIR', 'PDCA_RESTORE_DIR', 'PDCA_OPS_LOG']) permitted(resolve(env[key]));
  permitted(pointer);
  const port = Number(env.PDCA_PORT);
  requireState(Number.isInteger(port) && port > 0 && port < 65536, 'Managed recovery needs a fixed PDCA_PORT');
  return { root, pointer, permitted, port };
}

function pair(config, value) {
  requireState(value && typeof value === 'object' && !Array.isArray(value), 'Malformed database pair');
  const workspace = config.permitted(value.workspace);
  const audit = config.permitted(value.audit);
  requireState(workspace !== audit, 'Workspace and Audit cannot be the same file');
  return { workspace, audit };
}

// Native SQLite hot-journal rollback may require a writable connection after abrupt exit.
// Never create a missing Workspace or Audit. Strict read-only checks run AFTER rollback.
export function recoverExistingJournals(file, auditFile) {
  requireState(existsSync(file) && existsSync(auditFile),
    'Workspace or Audit missing; native crash recovery must not create a database');
  const workspace = new DatabaseSync(file, { create: false });
  try {
    workspace.exec('PRAGMA busy_timeout = 3000');
    workspace.prepare('ATTACH DATABASE ? AS audit').run(auditFile);
    workspace.prepare('SELECT count(*) AS n FROM main.sqlite_schema').get();
    workspace.prepare('SELECT count(*) AS n FROM audit.sqlite_schema').get();
  } finally { workspace.close(); }
}

export function inspectActivePair(file, auditFile, { busyTimeoutMs = 0 } = {}) {
  recoverExistingJournals(file, auditFile);
  const inventory = inspectWorkspaceFile(file, { busyTimeoutMs });
  const db = new DatabaseSync(file, { readOnly: true, timeout: busyTimeoutMs });
  try {
    requireState(db.prepare('PRAGMA application_id').get().application_id === 0,
      'Cannot activate an isolated snapshot (prepare it first)');
  } finally { db.close(); }
  requireState(auditSuffix(auditFile, inventory.cut).events.length === 0,
    'Workspace/Audit mismatch: Audit has newer events; recover instead of selecting a stale database');
  inspectWitnessPair(file, auditFile);
  return inventory;
}

export function readActiveState(env) {
  const config = managed(env);
  if (!config) return null;
  requireState(existsSync(config.pointer), 'Active DB pointer missing; service startup blocked until IT ADOPT');
  const state = JSON.parse(readFileSync(config.pointer, 'utf8'));
  requireState(state?.version === 1 && Number.isSafeInteger(state.serial) && state.serial >= 1,
    'Malformed Active DB pointer');
  const current = pair(config, state.current);
  const restoreRoot = config.permitted(resolve(env.PDCA_RESTORE_DIR));
  const within = (path, folder) => {
    const rel = relative(folder, path);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  };
  requireState(!within(current.workspace, restoreRoot),
    'Active Workspace is inside temporary Restore Staging; migrate to a durable directory before startup');
  return { config, state: { ...state, current,
    previous: state.previous === null ? null : pair(config, state.previous) } };
}

export function selectedFiles(env) {
  const selection = readActiveState(env);
  return selection?.state.current || null;
}

async function atomicPointer(path, data) {
  const temp = path + '.' + randomUUID() + '.pending';
  const descriptor = await open(temp, 'wx', 0o600);
  try {
    await descriptor.writeFile(JSON.stringify(data, null, 2) + '\n');
    await descriptor.sync();
  } finally { await descriptor.close(); }
  try { await rename(temp, path); }
  catch (error) { throw new Error('Active DB pointer replacement failed; previous pointer remains authoritative: ' + error.message); }
}

async function withStoppedServer(env, task) {
  const config = managed(env);
  requireState(config, 'PDCA_ACTIVE_DB_POINTER is required for managed recovery');
  const server = createServer();
  try {
    await new Promise((done, fail) => {
      server.once('error', fail);
      server.listen(config.port, '127.0.0.1', done);
    });
  } catch (error) {
    throw new Error('STOP: PDCA server port is occupied or cannot be reserved. Stop/disable the service: ' + error.message);
  }
  try { return await task(config); }
  finally { await new Promise(done => server.close(done)); }
}

export async function adoptActive(env, role, confirmation) {
  requireState(role === 'IT' && confirmation === 'ADOPT', 'IT authorization and ADOPT confirmation required');
  return withStoppedServer(env, async config => {
    requireState(!existsSync(config.pointer), 'Active DB pointer exists: ADOPT refused');
    const current = pair(config, { workspace: resolve(env.PDCA_DB), audit: resolve(env.PDCA_AUDIT) });
    const inventory = inspectActivePair(current.workspace, current.audit);
    resealWitness(current.workspace, current.audit); // make previously copied files stale
    const state = { version: 1, serial: 1, current, previous: null, action: 'adopt',
      changedAtUtc: new Date().toISOString(), cut: inventory.cut };
    await atomicPointer(config.pointer, state);
    return { action: 'adopt', current, cut: inventory.cut, serial: state.serial };
  });
}

// IT-only enrollment of EXISTING pre-witness BUILD 4 databases on NEW copies.
// Never modifies originals or creates the Active Pointer; service must be stopped.
export async function prepareLegacyAdoption(env, role, confirmation) {
  requireState(role === 'IT' && confirmation === 'MIGRATE-LEGACY',
    'IT authorization and MIGRATE-LEGACY confirmation required');
  return withStoppedServer(env, async config => {
    requireState(!existsSync(config.pointer), 'Active DB pointer exists; legacy migration refused');
    const original = pair(config, { workspace: resolve(env.PDCA_DB), audit: resolve(env.PDCA_AUDIT) });
    recoverExistingJournals(original.workspace, original.audit);
    const inventory = inspectWorkspaceFile(original.workspace);
    requireState(auditSuffix(original.audit, inventory.cut).events.length === 0,
      'Legacy Workspace/Audit cutoff mismatch');
    const inspectLegacy = new DatabaseSync(original.workspace, { readOnly: true });
    const audit = new DatabaseSync(original.audit, { readOnly: true });
    try {
      const has = db => !!db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='workspace_generation'").get();
      requireState(!has(inspectLegacy) && !has(audit),
        'Legacy migration requires a pre-witness Workspace/Audit pair; use ADOPT for current data');
    } finally { inspectLegacy.close(); audit.close(); }
    const destination = config.permitted(join(config.root, 'legacy-upgrade-' + randomUUID()));
    await mkdir(destination);
    const next = { workspace: config.permitted(join(destination, 'workspace.sqlite')),
      audit: config.permitted(join(destination, 'workspace.sqlite.audit.sqlite')) };
    await copyFile(original.workspace, next.workspace, constants.COPYFILE_EXCL);
    await copyFile(original.audit, next.audit, constants.COPYFILE_EXCL);
    const store = openStore(next.workspace, { auditFile: next.audit });
    try { /* migration runs during openStore on the new pair only */ }
    finally { store.close(); }
    const migrated = inspectActivePair(next.workspace, next.audit);
    requireState(JSON.stringify(migrated) === JSON.stringify(inventory),
      'Legacy copy content changed during witness enrollment');
    return { action: 'legacy-upgrade-candidate', original, candidate: next,
      projects: migrated.workspaces.length, cutoff: migrated.cut,
      nextStep: 'IT verify original+candidate, then set PDCA_DB/PDCA_AUDIT to candidate in external env and ADOPT' };
  });
}

export async function activeStatus(env, role) {
  requireState(role === 'IT', 'IT authorization required');
  const selection = readActiveState(env);
  requireState(selection, 'Managed recovery is not configured');
  const { state, config } = selection;
  // F-07: Retry only transient SQLITE_BUSY on administrative Status.
  // Permanent integrity, cutoff, witness, missing-file and authorization failures propagate.
  // A sustained writer may still cause a bounded BUSY/RETRY response; never claim PASS.
  const deadline = Date.now() + 5000;
  let inventory;
  for (;;) {
    try {
      inventory = inspectActivePair(state.current.workspace, state.current.audit, { busyTimeoutMs: 1500 });
      break;
    } catch (error) {
      const busy = error?.code === 'SQLITE_BUSY' || /^database is locked$/i.test(error?.message || '');
      if (!busy) throw error;
      if (Date.now() >= deadline) {
        throw new Error('IT Status temporarily BUSY after bounded retries; retry when writes settle', { cause: error });
      }
      await new Promise(resolve => setTimeout(resolve, 75));
    }
  }
  return { action: 'status', pointer: config.pointer, serial: state.serial, current: state.current,
    previous: state.previous, currentCut: inventory.cut, projects: inventory.workspaces.length };
}

export async function activatePrepared(env, role, stageId, confirmation) {
  requireState(role === 'IT' && ['ACTIVATE','ACTIVATE-RECOVERY'].includes(confirmation),
    'IT authorization and ACTIVATE or ACTIVATE-RECOVERY confirmation required');
  requireState(/^[a-f0-9-]{36}$/.test(stageId || ''), 'Invalid prepared stage ID');
  return withStoppedServer(env, async config => {
    const selection = readActiveState(env);
    const { state } = selection;
    let current = null, currentError = null;
    try { current = inspectActivePair(state.current.workspace, state.current.audit); }
    catch (error) { currentError = error.message; }
    const restoreRoot = config.permitted(resolve(env.PDCA_RESTORE_DIR));
    const stage = config.permitted(join(restoreRoot, stageId));
    const report = JSON.parse(await readFile(join(stage, 'restore.json'), 'utf8'));
    requireState(report.stageId === stageId && report.status === 'awaiting-it-review', 'Stage not IT-reviewed');
    const candidate = config.permitted(join(stage, 'candidate.sqlite'));
    // Prepared candidates can come from older snapshots, so their witness is old until IT cutover.
    const prepared = inspectWorkspaceFile(candidate);
    const check = new DatabaseSync(candidate, { readOnly: true });
    try { requireState(check.prepare('PRAGMA application_id').get().application_id === 0,
      'Prepared candidate is still isolated'); } finally { check.close(); }
    requireState(auditSuffix(state.current.audit, prepared.cut).events.length === 0,
      'Audit has advanced since IT prepared this candidate');
    requireState(JSON.stringify(prepared) === JSON.stringify(report.inventory),
      'Prepared candidate contents differ from reviewed restore inventory');
    requireState(['ledger','seq','head'].every(k => prepared.cut[k] === report.through?.[k]),
      'Prepared candidate cutoff does not match restore report');
    const sameAsLive = current && JSON.stringify(current) === JSON.stringify(prepared);
    requireState(confirmation === 'ACTIVATE-RECOVERY' || sameAsLive,
      'Candidate differs from live data (including unlogged edits), or live DB is unreadable; use explicit ACTIVATE-RECOVERY after IT recovery-point approval');
    // F-01: promote into immutable per-cutover storage outside transient Restore Staging.
    const activeRoot = config.permitted(join(config.root, 'active-db'));
    await mkdir(activeRoot, { recursive: true });
    const permanentDir = config.permitted(join(activeRoot, 'release-' + stageId + '-' + (state.serial + 1)));
    await mkdir(permanentDir); // fail if already activated; never overwrite existing storage
    const permanent = config.permitted(join(permanentDir, 'workspace.sqlite'));
    await copyFile(candidate, permanent, constants.COPYFILE_EXCL);
    const descriptor = await open(permanent, 'r+');
    try { await descriptor.sync(); } finally { await descriptor.close(); }
    // The new active Workspace gets a fresh cross-file witness, invalidating the old copy.
    // A crash before pointer replacement intentionally fails closed; IT can re-run recovery.
    resealWitness(permanent, state.current.audit);
    const selected = inspectActivePair(permanent, state.current.audit);
    requireState(JSON.stringify(selected) === JSON.stringify(prepared), 'Promoted Workspace content changed');
    const next = { ...state, serial: state.serial + 1,
      previous: state.current, current: { workspace: permanent, audit: state.current.audit },
      action: confirmation === 'ACTIVATE' ? 'activate' : 'activate-recovery',
      previousReadable: Boolean(current), previousError: currentError,
      changedAtUtc: new Date().toISOString(), cut: prepared.cut };
    await atomicPointer(config.pointer, next);
    return { action: next.action, current: next.current, previous: next.previous,
      serial: next.serial, cut: next.cut };
  });
}

export async function rollbackActive(env, role, confirmation) {
  requireState(role === 'IT' && confirmation === 'ROLLBACK', 'IT authorization and ROLLBACK confirmation required');
  return withStoppedServer(env, async () => {
    const { config, state } = readActiveState(env);
    requireState(state.previous, 'No previous database to roll back to');
    const current = inspectActivePair(state.current.workspace, state.current.audit);
    // Previous Workspace has an older witness by design. Compare the FULL persisted inventory
    // and deletion Audit cutoff before re-sealing it as the only active pair.
    const prior = inspectWorkspaceFile(state.previous.workspace);
    requireState(auditSuffix(state.previous.audit, prior.cut).events.length === 0,
      'Rollback would discard newer Audit events; recover/reconcile with IT instead');
    requireState(JSON.stringify(current) === JSON.stringify(prior),
      'Rollback would lose post-cutover changes (even those not in Audit): recover/reconcile with IT instead');
    resealWitness(state.previous.workspace, state.previous.audit);
    inspectActivePair(state.previous.workspace, state.previous.audit);
    const next = { ...state, serial: state.serial + 1, current: state.previous, previous: state.current,
      action: 'rollback', changedAtUtc: new Date().toISOString(), cut: prior.cut };
    await atomicPointer(config.pointer, next);
    return { action: 'rollback', current: next.current, previous: next.previous,
      serial: next.serial, cut: next.cut };
  });
}
