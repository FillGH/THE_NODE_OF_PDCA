import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  categoryNames, documentLink, edgeColors, statuses, widthsDefault,
} from '../web/model.js';
import { applyGraphOps, graphSnapshot, scope } from '../web/changes.js';

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireValue(condition, message) {
  if (!condition) throw new RequestError(400, message);
}

const isId = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const isText = value => typeof value === 'string';
const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function requiredText(value, label) {
  requireValue(isText(value) && value.trim(), label);
  return value.trim();
}

function isDate(value) {
  if (value === '') return true;
  if (!isText(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeNode(node) {
  requireValue(node && isId(node.id), 'รหัส Node ไม่ถูกต้อง');
  const { id, cat, title, sideNote, pic, due, status, snapY, freeX, freeY, freeW, freeH, images, documents } = node;
  requireValue(Number.isInteger(cat) && categoryNames[cat], 'ประเภท Node ไม่ถูกต้อง');
  requireValue([title, sideNote, pic].every(isText) && isDate(due) && statuses.includes(status), 'ข้อมูล Node ไม่ถูกต้อง');
  requireValue([freeX, freeY].every(value => value === null || inRange(value, 0, Number.MAX_SAFE_INTEGER)) &&
    inRange(snapY, 0, Number.MAX_SAFE_INTEGER) && inRange(freeW, 1, Number.MAX_SAFE_INTEGER) &&
    inRange(freeH, 1, Number.MAX_SAFE_INTEGER), 'ตำแหน่ง Node ไม่ถูกต้อง');
  requireValue(Array.isArray(images) && images.every(isId) && new Set(images).size === images.length,
    'รายการรูปไม่ถูกต้อง');
  requireValue(Array.isArray(documents) && documents.every(value => isText(value) && documentLink(value)),
    'ลิงก์เอกสารไม่ถูกต้อง');
  return { id, cat, title, sideNote, pic, due, status, snapY, freeX, freeY, freeW, freeH, images, documents };
}

function normalizeWorkspace(input) {
  requireValue(input && Array.isArray(input.nodes) && Array.isArray(input.edges), 'ผังไม่ถูกต้อง');
  const title = requiredText(input.title, 'กรุณากรอกชื่อ PDCA');
  const nodes = input.nodes.map(normalizeNode);
  const nodeIds = new Set(nodes.map(node => node.id));
  requireValue(nodeIds.size === nodes.length, 'รหัส Node ซ้ำ');
  const edgeIds = new Set();
  const pairs = new Set();
  const edges = input.edges.map(edge => {
    requireValue(edge && isId(edge.id) && !edgeIds.has(edge.id), 'รหัสเส้นไม่ถูกต้องหรือซ้ำ');
    const { id, from, to, label, color } = edge;
    requireValue(nodeIds.has(from) && nodeIds.has(to), 'ปลายทั้งสองต้องอยู่ใน PDCA เดียวกัน');
    requireValue(from !== to, 'เชื่อม Node เข้าหาตัวเองไม่ได้');
    const pair = from + '/' + to;
    requireValue(!pairs.has(pair), 'มีเส้นทิศทางนี้แล้ว');
    requireValue(isText(label) && label.length <= 48 && edgeColors.some(([name]) => name === color), 'ข้อมูลเส้นไม่ถูกต้อง');
    edgeIds.add(id);
    pairs.add(pair);
    return { id, from, to, label, color };
  });
  const { mode, widths, collapsed } = input;
  requireValue(['snap', 'free'].includes(mode) && Array.isArray(widths) && widths.length === categoryNames.length &&
    widths.every(width => inRange(width, 119, 10000)) &&
    Array.isArray(collapsed) && collapsed.length === categoryNames.length &&
    collapsed.every(value => typeof value === 'boolean'), 'ข้อมูล Layout ไม่ถูกต้อง');
  return { title, nodes, edges, mode, widths, collapsed };
}

function graphChanges(previous, next, record) {
  const beforeNodes = new Map(previous.nodes.map(node => [node.id, node]));
  for (const node of next.nodes) {
    const before = beforeNodes.get(node.id);
    const currentText = { title: node.title, content: node.sideNote };
    const previousText = before ? { title: before.title, content: before.sideNote } : null;
    if (!same(previousText, currentText)) record('node-text', node.id, previousText, currentText);
    if (before && before.cat !== node.cat) {
      record('node-category', node.id, categoryNames[before.cat], categoryNames[node.cat]);
    }
    // A draft can change an Action field and then reclassify before the batch saves.
    for (const [field, kind, defaultValue] of [
      ['status', 'action-status', 'Not Started'], ['due', 'action-due-date', ''],
    ]) {
      const oldValue = before?.[field] ?? defaultValue;
      if (oldValue !== node[field]) record(kind, node.id, oldValue, node[field]);
    }
  }
  const edgeShape = ({ from, to }) => ({ from, to });
  const beforeEdges = new Map(previous.edges.map(edge => [edge.id, edge]));
  const afterIds = new Set(next.edges.map(edge => edge.id));
  for (const edge of next.edges) {
    const before = beforeEdges.get(edge.id);
    if (before) requireValue(same(edgeShape(before), edgeShape(edge)), 'แก้ปลายเส้นเดิมไม่ได้');
    else record('edge-created', edge.id, null, { ...edgeShape(edge), label: edge.label, color: edge.color });
  }
  for (const edge of previous.edges) {
    if (!afterIds.has(edge.id)) record('edge-deleted', edge.id, { ...edgeShape(edge), label: edge.label, color: edge.color }, null);
  }
}

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'image/gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function openStore(file, { now = Date.now } = {}) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY, graph TEXT NOT NULL, revision INTEGER NOT NULL, last_save_id TEXT
    ) STRICT;
    CREATE TABLE IF NOT EXISTS node_ids (
      id TEXT PRIMARY KEY, pdca_id TEXT NOT NULL REFERENCES workspaces(id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY, node_id TEXT NOT NULL REFERENCES node_ids(id), name TEXT NOT NULL,
      mime TEXT NOT NULL, bytes BLOB NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS scope_versions (
      pdca_id TEXT NOT NULL REFERENCES workspaces(id), scope TEXT NOT NULL,
      revision INTEGER NOT NULL, PRIMARY KEY (pdca_id, scope)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS save_receipts (
      pdca_id TEXT NOT NULL REFERENCES workspaces(id), session_id TEXT NOT NULL, save_id TEXT NOT NULL,
      digest TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY (pdca_id, session_id, save_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS history (
      seq INTEGER PRIMARY KEY, pdca_id TEXT NOT NULL REFERENCES workspaces(id), revision INTEGER NOT NULL,
      kind TEXT NOT NULL, subject_id TEXT NOT NULL, before_json TEXT NOT NULL, after_json TEXT NOT NULL,
      display_name TEXT NOT NULL, saved_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS trash (
      pdca_id TEXT NOT NULL, subject_id TEXT NOT NULL, deleted INTEGER NOT NULL,
      expires INTEGER NOT NULL, PRIMARY KEY (pdca_id, subject_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS deletion_audit (
      seq INTEGER PRIMARY KEY, operation_id TEXT NOT NULL, pdca_id TEXT NOT NULL,
      subject_id TEXT NOT NULL, kind TEXT NOT NULL, event TEXT NOT NULL, at INTEGER NOT NULL,
      expires INTEGER, display_name TEXT NOT NULL, session_id TEXT, retain_until INTEGER
    ) STRICT;
  `);
  const workspaceById = db.prepare('SELECT graph, revision, last_save_id FROM workspaces WHERE id = ?');
  const addWorkspace = db.prepare('INSERT INTO workspaces VALUES (?, ?, 0, NULL)');
  const putWorkspace = db.prepare('UPDATE workspaces SET graph = ?, revision = ?, last_save_id = ? WHERE id = ?');
  const addNodeId = db.prepare('INSERT OR IGNORE INTO node_ids VALUES (?, ?)');
  const imageMeta = db.prepare('SELECT node_id, name, mime FROM images WHERE id = ?');
  const addImage = db.prepare('INSERT INTO images VALUES (?, ?, ?, ?, ?)');
  const removeImage = db.prepare('DELETE FROM images WHERE id = ?');
  const readImage = db.prepare('SELECT node_id, mime, bytes FROM images WHERE id = ?');
  const addHistory = db.prepare(`INSERT INTO history
    (pdca_id, revision, kind, subject_id, before_json, after_json, display_name, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const getVersion = db.prepare('SELECT revision FROM scope_versions WHERE pdca_id = ? AND scope = ?');
  const setVersion = db.prepare(`INSERT INTO scope_versions VALUES (?, ?, ?)
    ON CONFLICT(pdca_id, scope) DO UPDATE SET revision = excluded.revision`);
  const getReceipt = db.prepare('SELECT digest, revision FROM save_receipts WHERE pdca_id = ? AND session_id = ? AND save_id = ?');
  const addReceipt = db.prepare('INSERT INTO save_receipts VALUES (?, ?, ?, ?, ?)');

  function transaction(write) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = write();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  const trashFor = db.prepare('SELECT subject_id, deleted, expires FROM trash WHERE pdca_id = ?');
  const getTrash = db.prepare('SELECT expires FROM trash WHERE pdca_id = ? AND subject_id = ?');
  const listHistory = db.prepare('SELECT * FROM history WHERE pdca_id = ? ORDER BY seq DESC');
  const setTrash = db.prepare('INSERT INTO trash VALUES (?, ?, ?, ?)');
  const removeTrash = db.prepare('DELETE FROM trash WHERE pdca_id = ? AND subject_id = ?');
  const addAudit = db.prepare(`INSERT INTO deletion_audit
    (operation_id, pdca_id, subject_id, kind, event, at, expires, display_name, session_id, retain_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const missing = message => Object.assign(new RequestError(409, message), { code: 'TRASHED' });
  const expiresAfter = 7 * 86_400_000;

  function audit(operation, id, subject, event, time, expires, actor, retainUntil = null) {
    addAudit.run(operation, id, subject, id === subject ? 'PDCA' : 'Node', event, time, expires,
      actor?.displayName ?? 'System Operation', actor?.id ?? null, retainUntil);
  }

  function row(id, includeTrash = false) {
    const found = workspaceById.get(id);
    if (!found) throw new RequestError(404, 'ไม่พบ PDCA');
    if (!includeTrash && getTrash.get(id, id)) throw missing('PDCA นี้อยู่ใน Trash');
    return found;
  }

  function visibleGraph(id, graph) {
    const hidden = new Set(trashFor.all(id).map(item => item.subject_id));
    return { ...graph, nodes: graph.nodes.filter(node => !hidden.has(node.id)),
      edges: graph.edges.filter(edge => !hidden.has(edge.from) && !hidden.has(edge.to)) };
  }

  function load(id) {
    const saved = row(id);
    const graph = visibleGraph(id, JSON.parse(saved.graph));
    for (const node of graph.nodes) {
      node.images = node.images.map(id => ({ id, name: imageMeta.get(id).name }));
    }
    return { id, revision: saved.revision, ...graph };
  }

  function decodeHistory(entry) {
    const {seq, revision, kind, subject_id: subject, before_json, after_json,
      display_name: displayName, saved_at: at} = entry;
    return { seq, revision, kind, subject, before: JSON.parse(before_json), after: JSON.parse(after_json), displayName, at };
  }

  function history(id) {
    const graph = load(id);
    const visible = new Set(graph.nodes.map(node => node.id));
    return listHistory.all(id).map(decodeHistory).filter(entry => {
      const edge = entry.kind.startsWith('edge-') && (entry.after || entry.before);
      return edge ? visible.has(edge.from) && visible.has(edge.to) : visible.has(entry.subject);
    });
  }

  function setVisibility(id, subject, expected, restore, actor) {
    return transaction(() => {
      const saved = row(id, true);
      const graph = JSON.parse(saved.graph);
      if (subject !== id && (getTrash.get(id, id) || !graph.nodes.some(node => node.id === subject))) {
        throw new RequestError(404, 'ไม่พบ Node ใน PDCA ที่เปิดใช้งาน');
      }
      const item = getTrash.get(id, subject);
      const time = now();
      if (restore && item?.expires <= time) throw missing('รายการนี้หมดเวลากู้แล้ว');
      if (!!item === !restore) return { revision: saved.revision };
      if (expected !== saved.revision) throw new RequestError(409, 'ผังเปลี่ยนแล้ว กรุณาตรวจรายการอีกครั้ง');
      const revision = saved.revision + 1;
      if (restore) removeTrash.run(id, subject);
      else setTrash.run(id, subject, time, time + expiresAfter);
      audit(randomUUID(), id, subject, restore ? 'restore' : 'delete', time, item?.expires ?? time + expiresAfter, actor);
      putWorkspace.run(saved.graph, revision, null, id);
      if (subject !== id) {
        for (const scope of ['content:', 'position:']) setVersion.run(id, scope + subject, revision);
        for (const edge of graph.edges.filter(edge => edge.from === subject || edge.to === subject)) {
          setVersion.run(id, 'edge:' + edge.id, revision);
        }
      }
      // Whole-PDCA visibility changes invalidate every old scoped write.
      if (subject === id) setVersion.run(id, 'lifecycle', revision);
      return { revision };
    });
  }

  function trash() {
    return db.prepare('SELECT * FROM trash ORDER BY expires').all().flatMap(item => {
      const {pdca_id: id, subject_id: subject, deleted, expires} = item;
      if (subject !== id && getTrash.get(id, id)) return [];
      const saved = row(id, true), graph = JSON.parse(saved.graph);
      const title = subject === id ? graph.title : graph.nodes.find(node => node.id === subject)?.title;
      return [{ id, subject, title, pdcaTitle: graph.title, deleted, expires, revision: saved.revision }];
    });
  }

  function purge() {
    const time = now();
    const due = db.prepare('SELECT * FROM trash WHERE expires <= ? ORDER BY pdca_id != subject_id').all(time);
    if (!due.length && !db.prepare('SELECT 1 FROM deletion_audit WHERE retain_until <= ? LIMIT 1').get(time)) return;
    transaction(() => {
      db.prepare('DELETE FROM deletion_audit WHERE retain_until <= ?').run(time);
      for (const {pdca_id: id, subject_id: subject, expires} of due) {
        if (!getTrash.get(id, subject)) continue;
        const saved = row(id, true), graph = JSON.parse(saved.graph);
        const operation = randomUUID();
        const day = new Date(time + 7 * 3_600_000).toISOString().slice(0, 10);
        const [year, month, date] = day.split('-').map(Number);
        const nextYear = year + 1;
        const lastDay = new Date(Date.UTC(nextYear, month, 0)).getUTCDate();
        const retainUntil = Date.UTC(nextYear, month - 1, Math.min(date, lastDay)) - 7 * 3_600_000;
        function recordPurge(target, deadline) {
          db.prepare('UPDATE deletion_audit SET retain_until = ? WHERE pdca_id = ? AND subject_id = ?')
            .run(retainUntil, id, target);
          audit(operation, id, target, 'purge', time, deadline, null, retainUntil);
        }
        function removeNode(node) {
          recordPurge(node.id, getTrash.get(id, node.id)?.expires ?? expires);
          db.prepare('DELETE FROM images WHERE node_id = ?').run(node.id);
          db.prepare('DELETE FROM node_ids WHERE id = ?').run(node.id);
          removeTrash.run(id, node.id);
        }
        if (subject === id) {
          recordPurge(id, expires);
          graph.nodes.forEach(removeNode);
          for (const table of ['history', 'scope_versions', 'save_receipts', 'trash']) {
            db.prepare('DELETE FROM ' + table + ' WHERE pdca_id = ?').run(id);
          }
          db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
        } else {
          removeNode(graph.nodes.find(node => node.id === subject));
          for (const entry of listHistory.all(id).map(decodeHistory)) {
            const edge = entry.kind.startsWith('edge-') && (entry.after || entry.before);
            if (entry.subject === subject || edge.from === subject || edge.to === subject) {
              db.prepare('DELETE FROM history WHERE seq = ?').run(entry.seq);
            }
          }
          graph.nodes = graph.nodes.filter(node => node.id !== subject);
          graph.edges = graph.edges.filter(edge => edge.from !== subject && edge.to !== subject);
          putWorkspace.run(JSON.stringify(graph), saved.revision + 1, null, id);
        }
      }
    });
  }

  function restoreOperation(id, seq, revision) {
    const graph = load(id);
    if (graph.revision !== revision) throw new RequestError(409, 'ผังเปลี่ยนแล้ว กรุณาเปิดประวัติใหม่');
    const entry = history(id).find(item => item.seq === seq);
    if (!entry) throw new RequestError(404, 'ไม่พบรายการประวัติ');
    const { kind, subject, before, after } = entry;
    const node = graphSnapshot(graph).nodes.find(node => node.id === subject);
    if (kind === 'node-text') return { kind: 'content', id: subject, base: revision,
      value: { ...node, title: after.title, sideNote: after.content } };
    if (kind === 'node-category') return { kind: 'content', id: subject, base: revision,
      value: { ...node, cat: categoryNames.indexOf(before) } };
    if (kind === 'edge-deleted') return { kind: 'edge-add', id: subject, base: revision,
      value: { id: subject, label: '', color: 'slate', ...before } };
    throw new RequestError(400, 'รายการประวัตินี้กู้ไม่ได้');
  }

  function persist(id, saved, previous, graph, files, displayName, saveId, restoredEdge) {
    requireValue(Array.isArray(files) && files.every(item => item && isId(item.id)), 'รายการอัปโหลดไม่ถูกต้อง');
    const uploads = new Map(files.map(item => [item.id, item]));
    const previousIds = new Set(previous.nodes.map(node => node.id));
    const nextIds = new Set(graph.nodes.map(node => node.id));
    requireValue([...previousIds].every(id => nextIds.has(id)), 'การลบ Node อยู่ในช่วงถัดไป');
    const retainedImages = new Set();
    for (const node of graph.nodes) {
      if (!previousIds.has(node.id)) {
        requireValue(addNodeId.run(node.id, id).changes === 1, 'Node นี้อยู่ใน PDCA อื่น');
      }
      for (const imageId of node.images) {
        const existing = imageMeta.get(imageId);
        if (existing) {
          requireValue(existing.node_id === node.id, 'รูปนี้อยู่ใน Node อื่น');
        } else {
          const upload = uploads.get(imageId);
          requireValue(upload && isText(upload.name) && isText(upload.data), 'ไม่พบข้อมูลรูป');
          const bytes = Buffer.from(upload.data, 'base64');
          const mime = imageType(bytes);
          requireValue(mime && bytes.length <= 16 * 1024 * 1024, 'รองรับ PNG, JPEG, GIF และ WebP ขนาดไม่เกิน 16 MiB ต่อรูป');
          addImage.run(imageId, node.id, upload.name, mime, bytes);
        }
        retainedImages.add(imageId);
      }
    }
    for (const node of previous.nodes) {
      for (const imageId of node.images) {
        if (!retainedImages.has(imageId)) removeImage.run(imageId);
      }
    }
    const revision = saved.revision + Number(!same(previous, graph));
    const savedAt = new Date(now()).toISOString();
    graphChanges(previous, graph, (kind, subject, before, after) => {
      const event = kind === 'edge-created' && subject === restoredEdge ? 'edge-restored' : kind;
      addHistory.run(id, revision, event, subject, JSON.stringify(before), JSON.stringify(after), displayName, savedAt);
    });
    putWorkspace.run(JSON.stringify(graph), revision, saveId, id);
    return revision;
  }

  // Used for constructing development fixtures. HTTP writes use scoped changes.
  function save(id, input) {
    requireValue(input && isId(input.saveId) && Number.isInteger(input.revision), 'ข้อมูลการบันทึกไม่ถูกต้อง');
    const displayName = requiredText(input.displayName, 'กรุณากรอก Display Name');
    const graph = normalizeWorkspace(input.graph);
    return transaction(() => {
      const saved = row(id);
      if (saved.last_save_id === input.saveId) return { revision: saved.revision };
      if (saved.revision !== input.revision) {
        throw new RequestError(409, 'ผังนี้มีฉบับบันทึกใหม่ กรุณาเปิดผังใหม่');
      }
      return { revision: persist(id, saved, JSON.parse(saved.graph), graph, input.uploads, displayName, input.saveId) };
    });
  }

  function apply(id, input, actor, authorize, restoredEdge) {
    requireValue(input && isId(input.saveId) && Array.isArray(input.ops), 'ข้อมูลการบันทึกไม่ถูกต้อง');
    const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return transaction(() => {
      const saved = row(id);
      const receipt = getReceipt.get(id, actor.id, input.saveId);
      if (receipt) {
        requireValue(receipt.digest === digest, 'รหัสคำขอนี้ใช้กับข้อมูลชุดอื่นแล้ว');
        return { revision: receipt.revision };
      }
      const previous = JSON.parse(saved.graph);
      const visible = visibleGraph(id, previous);
      const activeNodes = new Set(visible.nodes.map(node => node.id));
      for (const op of input.ops) if (op?.kind === 'node-add') activeNodes.add(op.id);
      const seen = new Set();
      for (const op of input.ops) {
        requireValue(op && ['rename', 'layout', 'node-add', 'content', 'position', 'edge-add', 'edge', 'edge-remove'].includes(op.kind)
          && (['rename', 'layout'].includes(op.kind) ? op.id === null : isId(op.id))
          && Number.isInteger(op.base) && op.base >= 0 && op.base <= saved.revision
          && (op.kind === 'edge-remove' || op.value && typeof op.value === 'object'), 'รายการแก้ไขไม่ถูกต้อง');
        const rawEdge = op.kind.startsWith('edge') && previous.edges.find(edge => edge.id === op.id);
        if ((getVersion.get(id, 'lifecycle')?.revision ?? 0) > op.base ||
            (['content', 'position'].includes(op.kind) && getTrash.get(id, op.id)) ||
            (rawEdge && !visible.edges.some(edge => edge.id === op.id)) ||
            (op.kind === 'edge-add' && (!activeNodes.has(op.value.from) || !activeNodes.has(op.value.to)))) {
          throw missing('รายการแก้ไขเกี่ยวข้องกับข้อมูลที่อยู่ใน Trash หรือถูกย้ายแล้ว');
        }
        const key = scope(op);
        requireValue(!seen.has(key), 'รายการแก้ไขซ้ำในคำขอเดียวกัน');
        seen.add(key);
        if ((getVersion.get(id, key)?.revision ?? 0) > op.base) {
          throw new RequestError(409, 'รายการนี้มีการเปลี่ยนแปลงหลังฉบับที่คุณเปิด');
        }
      }
      authorize(input);
      if (input.ops.some(op => op.kind === 'layout') || input.ops.filter(op => op.kind === 'position').length > 1) {
        requireValue(Number.isInteger(input.guard), 'ต้องระบุฉบับผังก่อนจัดผัง');
      }
      if (input.guard != null && input.guard !== saved.revision) {
        throw new RequestError(409, 'ผังมีฉบับใหม่ กรุณาตรวจการแก้ไขอีกครั้ง');
      }
      let merged;
      try {
        merged = applyGraphOps(previous, input.ops);
      } catch (error) {
        throw new RequestError(409, error.message);
      }
      const graph = normalizeWorkspace(merged);
      const revision = persist(id, saved, previous, graph, input.uploads, actor.displayName, input.saveId, restoredEdge);
      if (revision !== saved.revision) {
        for (const op of input.ops) {
          setVersion.run(id, scope(op), revision);
          if (op.kind === 'node-add') {
            setVersion.run(id, 'content:' + op.id, revision);
            setVersion.run(id, 'position:' + op.id, revision);
          }
        }
      }
      addReceipt.run(id, actor.id, input.saveId, digest, revision);
      return { revision };
    });
  }

  function search(term) {
    const query = term.trim().normalize('NFC').toLowerCase();
    const matches = value => value.normalize('NFC').toLowerCase().includes(query);
    const results = [];
    for (const { id, graph } of db.prepare('SELECT id, graph FROM workspaces ORDER BY rowid DESC').all()) {
      if (getTrash.get(id, id)) continue;
      const { title, nodes, edges } = visibleGraph(id, JSON.parse(graph));
      const pdca = { id, title, nodeCount: nodes.length, edgeCount: edges.length };
      if (!query || matches(title)) results.push(pdca);
      if (query) {
        for (const node of nodes) {
          if (matches(node.title) || matches(node.sideNote)) {
            results.push({ ...pdca, nodeId: node.id, nodeTitle: node.title, cat: node.cat });
          }
        }
      }
    }
    return results;
  }

  return {
    create(title) {
      const id = randomUUID();
      const graph = {
        title: requiredText(title, 'กรุณากรอกชื่อ PDCA'), nodes: [], edges: [],
        mode: 'snap', widths: widthsDefault, collapsed: categoryNames.map(() => false),
      };
      addWorkspace.run(id, JSON.stringify(graph));
      return { id, revision: 0, ...graph };
    },
    load, save, apply, search, history, restoreOperation, trash, setVisibility, purge,
    auditLog: () => db.prepare('SELECT * FROM deletion_audit ORDER BY seq DESC').all(),
    imageMetadata: id => imageMeta.get(id),
    revision: id => row(id).revision,
    hasNode: (id, nodeId) => !getTrash.get(id, nodeId) && JSON.parse(row(id).graph).nodes.some(node => node.id === nodeId),
    receipt(id, actor, saveId) {
      const receipt = getReceipt.get(id, actor.id, saveId);
      return receipt ? { revision: receipt.revision } : null;
    },
    image(id) {
      const image = readImage.get(id);
      const owner = image && db.prepare('SELECT pdca_id FROM node_ids WHERE id = ?').get(image.node_id);
      if (!owner || getTrash.get(owner.pdca_id, owner.pdca_id) || getTrash.get(owner.pdca_id, image.node_id)) {
        throw new RequestError(404, 'ไม่พบรูป');
      }
      return image;
    },
    close: () => db.close(),
  };
}
