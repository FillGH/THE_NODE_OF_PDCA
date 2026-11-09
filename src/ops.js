import { timingSafeEqual } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditPath, auditSuffix } from './audit.js';
import { createSnapshot, inspectWorkspaceFile, prepareRestore, restoreSnapshot } from './recovery.js';

export function secretMatches(value, secret) {
  if (!secret || typeof value !== 'string') return false;
  const input = Buffer.from(value), expected = Buffer.from(secret);
  return input.length === expected.length && timingSafeEqual(input, expected);
}

export function operationsConfig(env) {
  const file = resolve(env.PDCA_DB || '.pdca-dev/pdca.sqlite');
  const auditFile = resolve(env.PDCA_AUDIT || auditPath(file));
  const root = resolve(env.PDCA_BACKUP_DIR || resolve(dirname(file), 'backups'));
  const recoveryRoot = resolve(env.PDCA_RESTORE_DIR || resolve(dirname(file), 'restore'));
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
  const [command, id] = process.argv.slice(2);
  try {
    const { PDCA_OPERATOR_KEY: key } = process.env;
    const config = operationsConfig(process.env);
    const role = config.authorize(key);
    let result;
    if (command === 'restore') result = await restoreSnapshot({ ...config, id, role });
    else if (command === 'prepare') result = await prepareRestore({ ...config, stageId: id, role });
    else if (command === 'inspect' && role === 'IT') result = inspectPair(config.file, config.auditFile);
    else if (command === 'backup' && role === 'IT') {
      await mkdir(config.root, { recursive: true });
      result = await createSnapshot(config);
    } else throw new Error('Use restore <snapshot ID>, prepare <stage ID>, inspect, or backup with the required role');
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'held') process.exitCode = 2;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
