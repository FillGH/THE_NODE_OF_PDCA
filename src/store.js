import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  categoryNames, documentLink, edgeColors, statuses, widthsDefault,
} from '../web/model.js';

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
    else record('edge-created', edge.id, null, edgeShape(edge));
  }
  for (const edge of previous.edges) {
    if (!afterIds.has(edge.id)) record('edge-deleted', edge.id, edgeShape(edge), null);
  }
}

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'image/gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function openStore(file) {
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
    CREATE TABLE IF NOT EXISTS history (
      seq INTEGER PRIMARY KEY, pdca_id TEXT NOT NULL REFERENCES workspaces(id), revision INTEGER NOT NULL,
      kind TEXT NOT NULL, subject_id TEXT NOT NULL, before_json TEXT NOT NULL, after_json TEXT NOT NULL,
      display_name TEXT NOT NULL, saved_at TEXT NOT NULL
    ) STRICT;
  `);
  const workspaceById = db.prepare('SELECT graph, revision, last_save_id FROM workspaces WHERE id = ?');
  const addWorkspace = db.prepare('INSERT INTO workspaces VALUES (?, ?, 0, NULL)');
  const putWorkspace = db.prepare('UPDATE workspaces SET graph = ?, revision = ?, last_save_id = ? WHERE id = ?');
  const addNodeId = db.prepare('INSERT OR IGNORE INTO node_ids VALUES (?, ?)');
  const imageMeta = db.prepare('SELECT node_id, name FROM images WHERE id = ?');
  const addImage = db.prepare('INSERT INTO images VALUES (?, ?, ?, ?, ?)');
  const removeImage = db.prepare('DELETE FROM images WHERE id = ?');
  const readImage = db.prepare('SELECT mime, bytes FROM images WHERE id = ?');
  const addHistory = db.prepare(`INSERT INTO history
    (pdca_id, revision, kind, subject_id, before_json, after_json, display_name, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  function row(id) {
    const found = workspaceById.get(id);
    if (!found) throw new RequestError(404, 'ไม่พบ PDCA');
    return found;
  }

  function load(id) {
    const saved = row(id);
    const graph = JSON.parse(saved.graph);
    for (const node of graph.nodes) {
      node.images = node.images.map(id => ({ id, name: imageMeta.get(id).name }));
    }
    return { id, revision: saved.revision, ...graph };
  }

  function save(id, input) {
    requireValue(input && isId(input.saveId) && Number.isInteger(input.revision), 'ข้อมูลการบันทึกไม่ถูกต้อง');
    const displayName = requiredText(input.displayName, 'กรุณากรอก Display Name');
    const graph = normalizeWorkspace(input.graph);
    requireValue(Array.isArray(input.uploads) && input.uploads.every(item => item && isId(item.id)), 'รายการอัปโหลดไม่ถูกต้อง');
    const uploads = new Map(input.uploads.map(item => [item.id, item]));

    db.exec('BEGIN IMMEDIATE');
    try {
      const saved = row(id);
      if (saved.last_save_id === input.saveId) {
        db.exec('COMMIT');
        return { revision: saved.revision };
      }
      if (saved.revision !== input.revision) {
        throw new RequestError(409, 'ผังนี้มีฉบับบันทึกใหม่ กรุณาเปิดผังใหม่');
      }
      const previous = JSON.parse(saved.graph);
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
      const savedAt = new Date().toISOString();
      graphChanges(previous, graph, (kind, subject, before, after) =>
        addHistory.run(id, revision, kind, subject, JSON.stringify(before), JSON.stringify(after), displayName, savedAt));
      putWorkspace.run(JSON.stringify(graph), revision, input.saveId, id);
      db.exec('COMMIT');
      return { revision };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function search(term) {
    const query = term.trim().normalize('NFC').toLowerCase();
    const matches = value => value.normalize('NFC').toLowerCase().includes(query);
    const results = [];
    for (const { id, graph } of db.prepare('SELECT id, graph FROM workspaces ORDER BY rowid DESC').all()) {
      const { title, nodes, edges } = JSON.parse(graph);
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
    load, save, search,
    image(id) {
      const image = readImage.get(id);
      if (!image) throw new RequestError(404, 'ไม่พบรูป');
      return image;
    },
    close: () => db.close(),
  };
}
