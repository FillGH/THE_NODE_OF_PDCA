import { DatabaseSync } from 'node:sqlite';
import { existsSync, realpathSync, statSync, lstatSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

// Persistent lock database is infrastructure, not the PDCA Workspace/Audit.
// Never remove/replace it. OS-backed SQLite locks release on process death.
// All cooperating processes use one canonical managed root, independent of IP/port.
export function acquireManagedLease(env) {
  if (!env.PDCA_ACTIVE_DB_POINTER) return () => {};
  const root = realpathSync(resolve(env.PDCA_DATA_ROOT));
  if (!statSync(root).isDirectory()) throw new Error('Invalid managed root');
  const file = join(root, '.pdca-host-exclusion.sqlite');
  try {
    const st = lstatSync(file);
    if (!st.isFile() || st.nlink !== 1 || realpathSync(file) !== file)
      throw new Error('STOP: ambiguous managed exclusion file');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let db;
  try {
    db = new DatabaseSync(file);
    db.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE');
    if (db.prepare('SELECT count(*) AS n FROM sqlite_schema').get().n !== 0 || db.prepare('PRAGMA journal_mode').get().journal_mode !== 'delete') throw new Error('Unexpected exclusion journal mode');
  } catch (err) {
    try { db?.close(); } catch {}
    throw new Error('STOP: managed Host or maintenance occupied / exclusion unavailable: ' + err.message);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try { db.exec('ROLLBACK'); } finally { db.close(); }
  };
}

// An accidental unmanaged launch of the new binary must not bypass a managed root lease.
export function rejectUnmanagedManagedRoot(file, auditFile) {
  for (const candidate of [file, auditFile]) {
    let current = dirname(resolve(candidate));
    while (true) {
      if (existsSync(join(current,'.pdca-host-exclusion.sqlite')))
        throw new Error('STOP: managed data root requires Active DB Pointer; unmanaged launch refused');
      const parent=dirname(current);
      if (parent===current) break;
      current=parent;
    }
  }
}
