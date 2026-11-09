import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const eventFields = 'seq, operation_id, pdca_id, subject_id, kind, event, at, expires, display_name, session_id';
export const stagedApplicationId = 0x50444341;
export const auditPath = file => file === ':memory:' ? file : file + '.audit.sqlite';

export function transaction(db, write, begin = 'BEGIN IMMEDIATE') {
  db.exec(begin);
  try {
    const result = write();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  }
}

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const advance = (head, event) => hash([head, ...eventFields.split(', ').map(field => event[field])]);
const tableExists = (db, schema, table) =>
  !!db.prepare('SELECT 1 FROM ' + schema + '.sqlite_schema WHERE type = ? AND name = ?').get('table', table);
const getPoint = (db, table) => db.prepare('SELECT ledger, seq, head FROM ' + table + ' WHERE singleton = 1').get();
export const workspacePoint = db => getPoint(db, 'main.recovery_cut');
const matches = (a, b) => a && b && a.ledger === b.ledger && a.seq === b.seq && a.head === b.head;

export function attachAudit(db, file) {
  const migrated = tableExists(db, 'main', 'recovery_cut');
  if (migrated && file !== ':memory:' && !existsSync(file)) throw new Error('Audit ledger is missing');
  db.prepare('ATTACH DATABASE ? AS audit').run(file);
  if (file !== ':memory:') {
    // The SQLite multi-file commit requires an on-disk main DB and rollback journals.
    for (const schema of ['main', 'audit']) {
      if (db.prepare('PRAGMA ' + schema + '.journal_mode = DELETE').get().journal_mode !== 'delete') {
        throw new Error('Audit requires DELETE journal mode');
      }
      db.exec('PRAGMA ' + schema + '.synchronous = FULL');
    }
  }
  transaction(db, () => {
    if (migrated) {
      if (!matches(workspacePoint(db), getPoint(db, 'audit.ledger_state'))) {
        throw new Error('Workspace and Audit ledger do not have the same recovery point');
      }
      return;
    }
    if (tableExists(db, 'audit', 'ledger_state')) throw new Error('Audit ledger already belongs to a Workspace');
    db.exec(`
      CREATE TABLE main.recovery_cut (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1), ledger TEXT NOT NULL,
        seq INTEGER NOT NULL, head TEXT NOT NULL
      ) STRICT;
      CREATE TABLE audit.ledger_state (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1), ledger TEXT NOT NULL,
        seq INTEGER NOT NULL, head TEXT NOT NULL
      ) STRICT;
      CREATE TABLE audit.events (
        seq INTEGER PRIMARY KEY, operation_id TEXT NOT NULL, pdca_id TEXT NOT NULL,
        subject_id TEXT NOT NULL, kind TEXT NOT NULL, event TEXT NOT NULL, at INTEGER NOT NULL,
        expires INTEGER, display_name TEXT NOT NULL, session_id TEXT, retain_until INTEGER
      ) STRICT;
      CREATE INDEX audit.events_subject ON events(pdca_id, subject_id);
      CREATE INDEX audit.events_purged_node ON events(subject_id) WHERE event = 'purge';
      CREATE INDEX audit.events_retention ON events(retain_until);
    `);
    if (tableExists(db, 'main', 'deletion_audit')) {
      db.exec('PRAGMA main.secure_delete = ON');
      db.exec('INSERT INTO audit.events SELECT * FROM main.deletion_audit; DROP TABLE main.deletion_audit');
    }
    const ledger = randomUUID();
    const { seq } = db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM audit.events').get();
    const head = hash([ledger, seq]);
    for (const table of ['main.recovery_cut', 'audit.ledger_state']) {
      db.prepare('INSERT INTO ' + table + ' VALUES (1, ?, ?, ?)').run(ledger, seq, head);
    }
  });

  const read = db.prepare('SELECT ledger, seq, head FROM audit.ledger_state WHERE singleton = 1');
  const insert = db.prepare('INSERT INTO audit.events (' + eventFields + ', retain_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ' + eventFields);
  const updateLedger = db.prepare('UPDATE audit.ledger_state SET seq = ?, head = ? WHERE singleton = 1');
  const updateWorkspace = db.prepare('UPDATE main.recovery_cut SET seq = ?, head = ? WHERE singleton = 1');
  return (...values) => {
    const { seq, head } = read.get();
    const event = insert.get(seq + 1, ...values);
    const nextHead = advance(head, event);
    updateLedger.run(event.seq, nextHead);
    updateWorkspace.run(event.seq, nextHead);
  };
}

export function auditSuffix(file, cut, witness) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    db.exec('PRAGMA busy_timeout = 3000');
    return transaction(db, () => {
      const tip = getPoint(db, 'main.ledger_state');
      if (!tip || tip.ledger !== cut.ledger || tip.seq < cut.seq) {
        throw new Error('Audit ledger cannot identify the snapshot cutoff');
      }
      if (witness && (witness.ledger !== cut.ledger || witness.seq > tip.seq)) {
        throw new Error('Audit ledger does not cover the surviving Workspace point');
      }
      const events = db.prepare('SELECT ' + eventFields + ' FROM events WHERE seq > ? ORDER BY seq').all(cut.seq);
      let { seq, head } = cut;
      function checkWitness() {
        if (witness?.seq === seq && witness.head !== head) {
          throw new Error('Audit ledger disagrees with the surviving Workspace point');
        }
      }
      checkWitness();
      for (const event of events) {
        if (event.seq !== ++seq) throw new Error('Audit sequence has a gap after the snapshot cutoff');
        head = advance(head, event);
        checkWitness();
      }
      if (!matches(tip, { ledger: cut.ledger, seq, head })) {
        throw new Error('Audit evidence does not reach the recorded ledger head');
      }
      return { tip, events };
    }, 'BEGIN');
  } finally {
    db.close();
  }
}
