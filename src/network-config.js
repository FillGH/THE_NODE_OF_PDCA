import { isIPv4 } from 'node:net';
import { networkInterfaces } from 'node:os';
import { existsSync, realpathSync, statSync, lstatSync } from 'node:fs';
import { isAbsolute, join, resolve, relative, dirname } from 'node:path';

export function privateIPv4(ip) {
  if (!isIPv4(ip)) return false;
  const [a,b] = ip.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function networkConfig(env, interfaces = networkInterfaces()) {
  const bind = env.PDCA_BIND_HOST ?? '127.0.0.1';
  const direct = bind !== '127.0.0.1';
  const rawPort = env.PDCA_PORT ?? '4173';
  if (!/^\d+$/.test(String(rawPort))) throw new Error('Invalid PDCA_PORT');
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < (direct ? 1024 : 0) || port > 65535) throw new Error('Invalid PDCA_PORT');
  if (!direct) return { bind, port, direct, origin: env.PDCA_ORIGIN || undefined };
  if (!privateIPv4(bind) || !Object.values(interfaces).flat().some(n => n && !n.internal && n.address === bind))
    throw new Error('PDCA_BIND_HOST must be an assigned RFC1918 IPv4 on this Host');
  const origin = new URL('http://' + bind + ':' + port).origin;
  if ((env.PDCA_ORIGIN !== undefined && env.PDCA_ORIGIN !== origin) || env.PDCA_INGRESS_KEY)
    throw new Error('Direct LAN requires the exact derived HTTP origin and no proxy ingress key');
  return { bind, port, direct, origin };
}

export function normalizeEnv(input) {
  const env = { ...input };
  const network = networkConfig(env);
  if (!network.direct) return env;
  if (!env.PDCA_PORT) throw new Error('Direct LAN requires explicit PDCA_PORT');
  if (!env.PDCA_DATA_ROOT || !isAbsolute(env.PDCA_DATA_ROOT))
    throw new Error('Direct LAN requires an absolute local PDCA_DATA_ROOT');
  if (/^(?:\\\\|\/\/)/.test(env.PDCA_DATA_ROOT)) throw new Error('Network share is not a local data root');
  const root = realpathSync(resolve(env.PDCA_DATA_ROOT));
  if (!statSync(root).isDirectory()) throw new Error('PDCA_DATA_ROOT must be a directory');
  env.PDCA_DATA_ROOT = root;
  const names = {
    PDCA_DB: 'workspace.sqlite', PDCA_AUDIT: 'workspace.sqlite.audit.sqlite',
    PDCA_ACTIVE_DB_POINTER: 'active-db.json', PDCA_BACKUP_DIR: 'backups',
    PDCA_RESTORE_DIR: 'restore', PDCA_OPS_LOG: 'operations.jsonl'
  };
  // Derive Audit from an explicit original Workspace path, never from a second authority.
  for (const [key,name] of Object.entries(names)) {
    if (env[key] !== undefined && !env[key]) throw new Error('Empty explicit path: ' + key);
    env[key] ??= key === 'PDCA_AUDIT' ? env.PDCA_DB + '.audit.sqlite' : join(root,name);
    if (!isAbsolute(env[key])) throw new Error('Managed database paths must be absolute: ' + key);
  }
  return env;
}

// Validate both existing entries and the nearest existing ancestor of missing paths.
export function pathUnderRoot(root, value) {
  const full = resolve(value);
  const inside = p => { const rel = relative(root,p); return rel && rel !== '..' &&
    !rel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && !isAbsolute(rel); };
  if (!inside(full)) throw new Error('Managed database path outside PDCA_DATA_ROOT: ' + full);
  if (relative(root,full).split(/[\\/]/).some(part => part.toLowerCase() === '.pdca-host-exclusion.sqlite'))
    throw new Error('Reserved managed exclusion path');
  // lstat also detects dangling symlinks; reject traversal through any junction/symlink.
  for (let p = full; relative(root,p) !== ''; p = dirname(p)) {
    try { if (lstatSync(p).isSymbolicLink()) throw new Error('Managed database symlink/junction is prohibited'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (dirname(p) === p) throw new Error('Managed path cannot reach canonical root');
  }
  let ancestor = full;
  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error('Cannot resolve managed path ancestor');
    ancestor = parent;
  }
  const actual = realpathSync(ancestor);
  if (actual !== root && !inside(actual)) throw new Error('Managed database symlink escapes PDCA_DATA_ROOT');
  return full;
}
