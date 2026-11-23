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

export const witnessPoint = (db, schema = 'main') => db.prepare(
  'SELECT generation, token FROM ' + schema + '.workspace_generation WHERE singleton = 1').get();

// Every successful application transaction updates BOTH files as one SQLite multi-file commit.
// This closes the gap left by deletion-only Audit events (create/save/category changes).
export function advanceWorkspaceWitness(db) {
  const current = witnessPoint(db);
  const next = { generation: current.generation + 1, token: randomUUID() };
  if (!Number.isSafeInteger(next.generation)) throw new Error('Workspace witness counter overflow');
  for (const schema of ['main', 'audit']) {
    db.prepare('UPDATE ' + schema + '.workspace_generation SET generation = ?, token = ? WHERE singleton = 1')
      .run(next.generation, next.token);
  }
  return next;
}

export function inspectWitnessPair(workspaceFile, auditFile) {
  const workspace = new DatabaseSync(workspaceFile, { readOnly: true });
  const audit = new DatabaseSync(auditFile, { readOnly: true });
  try {
    const main = witnessPoint(workspace);
    const counterpart = witnessPoint(audit);
    if (!main || !counterpart || main.generation !== counterpart.generation || main.token !== counterpart.token) {
      throw new Error('Workspace/Audit witness mismatch (stale or substituted Workspace)');
    }
    return main;
  } finally { workspace.close(); audit.close(); }
}

// Enroll a pre-witness snapshot ONLY after independent Snapshot/Audit validation,
// on a staged candidate paired with a COPIED Preview Audit, never with LIVE Audit.
export function enrollLegacyPreviewWitness(candidate, previewAudit) {
  const db = new DatabaseSync(candidate, { create: false });
  try {
    db.prepare('ATTACH DATABASE ? AS audit').run(previewAudit);
    const wsCut = workspacePoint(db), auditCut = getPoint(db, 'audit.ledger_state');
    if (!matches(wsCut, auditCut)) throw new Error('Legacy preview cutoff does not match Audit');
    const mainHas = tableExists(db, 'main', 'workspace_generation');
    const auditHas = tableExists(db, 'audit', 'workspace_generation');
    if (!auditHas) throw new Error('Preview Audit witness missing; cannot enroll legacy candidate');
    if (mainHas) return false;
    const point = witnessPoint(db, 'audit');
    if (!point) throw new Error('Preview Audit witness is incomplete');
    return transaction(db, () => {
      db.exec('CREATE TABLE main.workspace_generation (' +
        'singleton INTEGER PRIMARY KEY CHECK(singleton=1), generation INTEGER NOT NULL, token TEXT NOT NULL) STRICT');
      db.prepare('INSERT INTO main.workspace_generation VALUES (1, ?, ?)').run(point.generation, point.token);
      return true;
    });
  } finally { db.close(); }
}

// IT-only reseal of an approved recovery candidate or validated rollback target.
// Must be called only while the server and all other writers are stopped.
export function resealWitness(workspaceFile, auditFile) {
  const db = new DatabaseSync(workspaceFile);
  try {
    db.prepare('ATTACH DATABASE ? AS audit').run(auditFile);
    for (const schema of ['main', 'audit']) {
      if (db.prepare('PRAGMA ' + schema + '.journal_mode = DELETE').get().journal_mode !== 'delete') {
        throw new Error('IT recovery witness requires DELETE journal mode');
      }
      db.exec('PRAGMA ' + schema + '.synchronous = FULL');
    }
    const wsCut = workspacePoint(db), auditCut = getPoint(db, 'audit.ledger_state');
    if (!matches(wsCut, auditCut)) throw new Error('Recovery candidate does not match Audit cutoff');
    return transaction(db, () => {
      const latest = witnessPoint(db, 'audit');
      const newPoint = { generation: latest.generation + 1, token: randomUUID() };
      if (!Number.isSafeInteger(newPoint.generation)) throw new Error('Recovery witness counter overflow');
      for (const schema of ['main', 'audit']) {
        db.prepare('UPDATE ' + schema + '.workspace_generation SET generation = ?, token = ? WHERE singleton = 1')
          .run(newPoint.generation, newPoint.token);
      }
      return newPoint;
    });
  } finally { db.close(); }
}

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

  transaction(db, () => {
    const mainHas = tableExists(db, 'main', 'workspace_generation');
    const auditHas = tableExists(db, 'audit', 'workspace_generation');
    if (mainHas !== auditHas) throw new Error('Workspace/Audit witness is incomplete; IT review required');
    if (!mainHas) {
      for (const schema of ['main', 'audit']) {
        db.exec('CREATE TABLE ' + schema + '.workspace_generation (' +
          'singleton INTEGER PRIMARY KEY CHECK(singleton=1), generation INTEGER NOT NULL, token TEXT NOT NULL) STRICT');
      }
      const token = randomUUID();
      for (const schema of ['main', 'audit']) {
        db.prepare('INSERT INTO ' + schema + '.workspace_generation VALUES(1, 0, ?)').run(token);
      }
    } else {
      const main = witnessPoint(db), paired = witnessPoint(db, 'audit');
      if (!main || !paired || main.generation !== paired.generation || main.token !== paired.token) {
        throw new Error('Workspace/Audit witness mismatch (stale or substituted Workspace)');
      }
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
