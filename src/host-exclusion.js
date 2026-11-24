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

// Resolve the actual file identity, including a missing leaf below an existing
// directory alias. Reject hard-linked files and ambiguous/dangling aliases.
// IT must still prevent concurrent legacy binaries and local filesystem changes.
function existingAncestor(candidate) {
  let current = resolve(candidate);
  let leaf = true;
  while (true) {
    let info;
    try { info = lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(current);
      if (parent === current) throw new Error('Cannot establish database file identity');
      current = parent;
      leaf = false;
      continue;
    }
    // realpath on a dangling link or inaccessible target must fail closed.
    const actual = realpathSync(current);
    const target = statSync(actual);
    if (leaf ? (!target.isFile() || target.nlink !== 1) : !target.isDirectory())
      throw new Error('Ambiguous database file identity (non-file or hard link)');
    return leaf ? dirname(actual) : actual;
  }
}

function rejectManagedAncestor(current) {
  while (true) {
    try {
      lstatSync(join(current, '.pdca-host-exclusion.sqlite'));
      throw new Error('STOP: managed data root requires Active DB Pointer; unmanaged launch refused');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

export function rejectUnmanagedManagedRoot(file, auditFile) {
  for (const candidate of [file, auditFile]) {
    try {
      // Check both lexical and canonical ancestors, not just the alias directory.
      const canonical = existingAncestor(candidate);
      rejectManagedAncestor(dirname(resolve(candidate)));
      rejectManagedAncestor(canonical);
    } catch (error) {
      throw new Error('STOP: cannot admit unmanaged database: ' + error.message);
    }
  }
}
