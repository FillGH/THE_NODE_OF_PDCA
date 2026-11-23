import { timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditPath, auditSuffix } from './audit.js';
import { createSnapshot, inspectWorkspaceFile, prepareRestore, restoreSnapshot } from './recovery.js';
import { selectedFiles, adoptActive, activeStatus, activatePrepared, rollbackActive, inspectActivePair } from './active-db.js';

export function secretMatches(value, secret) {
  if (!secret || typeof value !== 'string') return false;
  const input = Buffer.from(value), expected = Buffer.from(secret);
  return input.length === expected.length && timingSafeEqual(input, expected);
}

export function operationsConfig(env, { skipPointer = false } = {}) {
  const original = resolve(env.PDCA_DB || '.pdca-dev/pdca.sqlite');
  const selected = !skipPointer && selectedFiles(env);
  const file = selected?.workspace || original;
  const auditFile = selected?.audit || resolve(env.PDCA_AUDIT || auditPath(original));
  const root = resolve(env.PDCA_BACKUP_DIR || resolve(dirname(original), 'backups'));
  const recoveryRoot = resolve(env.PDCA_RESTORE_DIR || resolve(dirname(original), 'restore'));
  const { PDCA_ORIGIN: origin, PDCA_INGRESS_KEY: ingress, PDCA_IT_KEY: it, PDCA_PHIL_KEY: phil } = env;
  const keys = [ingress, it, phil].filter(Boolean);
  if (keys.some(key => !/^[A-Za-z0-9_-]{32,}$/.test(key)) || new Set(keys).size !== keys.length ||
      (origin && (new URL(origin).origin !== origin || !origin.startsWith('https://') || !ingress)) ||
      (ingress && !origin)) throw new Error('Invalid Host origin or operation keys');
  if (file.toLowerCase() === auditFile.toLowerCase() || root.toLowerCase() === recoveryRoot.toLowerCase()) {
    throw new Error('Workspace, Audit, Backup and Restore require separate locations');
  }
  function authorize(key) {
    if (secretMatches(key, it)) return 'IT';
    if (secretMatches(key, phil)) return 'Phil';
    return null;
  }
  return { file, auditFile, root, recoveryRoot, origin, ingress, authorize };
}

export function inspectPair(file, auditFile) {
  const inventory = inspectWorkspaceFile(file);
  if (auditSuffix(auditFile, inventory.cut).events.length) throw new Error('Workspace is behind the Audit ledger');
  return inventory;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [command, id, confirmation] = process.argv.slice(2);
  try {
    const { PDCA_OPERATOR_KEY: key } = process.env;
    const config = operationsConfig(process.env, { skipPointer: command === 'adopt' });
    const role = config.authorize(key);
    let result;
    if (command === 'adopt') result = await adoptActive(process.env, role, id);
    else if (command === 'status') result = await activeStatus(process.env, role);
    else if (command === 'activate') result = await activatePrepared(process.env, role, id, confirmation);
    else if (command === 'rollback') result = await rollbackActive(process.env, role, id);
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
      if (process.env.PDCA_ACTIVE_DB_POINTER) inspectActivePair(config.file, config.auditFile);
      await mkdir(config.root, { recursive: true });
      result = await createSnapshot(config);
    } else throw new Error('Use status, backups, adopt ADOPT, restore <snapshot ID>, prepare <stage ID>, activate <stage ID> ACTIVATE|ACTIVATE-RECOVERY, rollback ROLLBACK, inspect, or backup with the required role');
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'held') process.exitCode = 2;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
