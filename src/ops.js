import { timingSafeEqual } from 'node:crypto';
import { networkConfig, normalizeEnv } from './network-config.js';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditPath, auditSuffix } from './audit.js';
import { createSnapshot, inspectWorkspaceFile, prepareRestore, restoreSnapshot } from './recovery.js';
import { selectedFiles, adoptActive, prepareLegacyAdoption, activeStatus, activatePrepared, rollbackActive, inspectActivePair, readDeletionAudit } from './active-db.js';

export function secretMatches(value, secret) {
  if (!secret || typeof value !== 'string') return false;
  const input = Buffer.from(value), expected = Buffer.from(secret);
  return input.length === expected.length && timingSafeEqual(input, expected);
}

export function operationsConfig(env, { skipPointer = false } = {}) {
  env = normalizeEnv(env);
  const network = networkConfig(env);
  const original = resolve(env.PDCA_DB || '.pdca-dev/pdca.sqlite');
  const selected = !skipPointer && selectedFiles(env);
  const file = selected?.workspace || original;
  const auditFile = selected?.audit || resolve(env.PDCA_AUDIT || auditPath(original));
  const root = resolve(env.PDCA_BACKUP_DIR || resolve(dirname(original), 'backups'));
  const recoveryRoot = resolve(env.PDCA_RESTORE_DIR || resolve(dirname(original), 'restore'));
  const { PDCA_INGRESS_KEY: ingress, PDCA_IT_KEY: it, PDCA_PHIL_KEY: phil } = env;
  const { origin, direct, bind, port } = network;
  const keys = [ingress, it, phil].filter(Boolean);
  if (keys.some(key => !/^[A-Za-z0-9_-]{32,}$/.test(key)) || new Set(keys).size !== keys.length ||
      (!direct && origin && (new URL(origin).origin !== origin || !origin.startsWith('https://') || !ingress)) ||
      (ingress && !origin) || (direct && (!it || !phil))) throw new Error('Invalid Host origin or operation keys');
  if (file.toLowerCase() === auditFile.toLowerCase() || root.toLowerCase() === recoveryRoot.toLowerCase()) {
    throw new Error('Workspace, Audit, Backup and Restore require separate locations');
  }
  if (direct) {
    const protectedPaths = [file,auditFile,root,recoveryRoot,resolve(env.PDCA_ACTIVE_DB_POINTER),resolve(env.PDCA_OPS_LOG)].map(p=>p.toLowerCase());
    if (new Set(protectedPaths).size !== protectedPaths.length) throw new Error('Active managed paths must be distinct');
  }
  function authorize(key) {
    if (secretMatches(key, it)) return 'IT';
    if (secretMatches(key, phil)) return 'Phil';
    return null;
  }
  return { file, auditFile, root, recoveryRoot, origin, ingress, authorize, direct, bind, port };
}

export function inspectPair(file, auditFile) {
  const inventory = inspectWorkspaceFile(file);
  if (auditSuffix(auditFile, inventory.cut).events.length) throw new Error('Workspace is behind the Audit ledger');
  return inventory;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [command, id, confirmation] = process.argv.slice(2);
  try {
    const env = normalizeEnv(process.env);
    const { PDCA_OPERATOR_KEY: key } = env;
    const config = operationsConfig(env, { skipPointer: command === 'adopt' || command === 'migrate-legacy' });
    const role = config.authorize(key);
    let result;
    if (command === 'adopt') result = await adoptActive(env, role, id);
    else if (command === 'migrate-legacy') result = await prepareLegacyAdoption(env, role, id);
    else if (command === 'status') result = await activeStatus(env, role);
    else if (command === 'deletion-audit') result = await readDeletionAudit(env, role);
    else if (command === 'activate') result = await activatePrepared(env, role, id, confirmation);
    else if (command === 'rollback') result = await rollbackActive(env, role, id);
    else if (command === 'backups' && role === 'IT') {
      const records = [];
      await mkdir(config.root, { recursive: true });
      for (const dir of await readdir(config.root, { withFileTypes: true })) {
        if (!dir.isDirectory() || !/^\d{13}-[a-f0-9-]{36}$/.test(dir.name)) continue;
        try {
          const item = JSON.parse(await readFile(resolve(config.root, dir.name, 'snapshot.json'), 'utf8'));
          if (item.id === dir.name) records.push({ id: item.id, capturedAt: item.capturedAt,
            cut: item.cut, integrity: 'NOT VERIFIED — restore validates before use' });
        } catch { records.push({ id: dir.name, integrity: 'INVALID MANIFEST' }); }
      }
      result = { snapshots: records.sort((a, b) => b.id.localeCompare(a.id)) };
    }
    else if (command === 'restore') result = await restoreSnapshot({ ...config, id, role });
    else if (command === 'prepare') result = await prepareRestore({ ...config, stageId: id, role });
    else if (command === 'inspect' && role === 'IT') result = inspectPair(config.file, config.auditFile);
    else if (command === 'backup' && role === 'IT') {
      if (env.PDCA_ACTIVE_DB_POINTER) inspectActivePair(config.file, config.auditFile);
      await mkdir(config.root, { recursive: true });
      result = await createSnapshot(config);
    } else throw new Error('Use status, deletion-audit (stopped Host; IT only), backups, migrate-legacy MIGRATE-LEGACY, adopt ADOPT, restore <snapshot ID>, prepare <stage ID>, activate <stage ID> ACTIVATE|ACTIVATE-RECOVERY, rollback ROLLBACK, inspect, or backup with the required role');
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'held') process.exitCode = 2;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
