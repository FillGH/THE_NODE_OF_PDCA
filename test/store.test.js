import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { openStore } from '../src/store.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAIAAAUAAWJVMogAAAAASUVORK5CYII=';
const node = (cat, fields = {}) => ({
  id: randomUUID(), cat, title: 'Node ' + cat, sideNote: '', pic: '', due: '', status: 'Not Started',
  snapY: 100, freeX: null, freeY: null, freeW: 200, freeH: 100, images: [], documents: [], ...fields,
});
const edge = (from, to) => ({ id: randomUUID(), from: from.id, to: to.id, label: '', color: 'slate' });

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'pdca-test-'));
  const file = join(dir, 'test.sqlite');
  const store = openStore(file);
  const db = new DatabaseSync(file);
  t.after(() => {
    db.close();
    store.close();
    rmSync(dir, { recursive: true });
  });
  const history = id => db.prepare('SELECT * FROM history WHERE pdca_id = ? ORDER BY seq').all(id);
  return { file, store, db, history };
}

function request(graph, uploads = []) {
  return { graph, revision: graph.revision, saveId: randomUUID(), displayName: 'ผู้ทดสอบ', uploads };
}

function save(store, graph, uploads = []) {
  graph.revision = store.save(graph.id, request(graph, uploads)).revision;
}

test('blank and duplicate PDCA names, stable identity, saved title/content search and reopen', t => {
  const { file, store } = setup(t);
  assert.throws(() => store.create(' \t\n '), /กรุณากรอกชื่อ PDCA/);
  const first = store.create('  ซีลสมมติ ');
  const second = store.create('ซีลสมมติ');
  assert.notEqual(first.id, second.id);
  assert.equal(store.load(second.id).nodes.length, 0);
  assert.equal(store.search('ซีลสมมติ').length, 2);
  first.title = 'ตรวจซีลสมมติ';
  first.nodes.push(node(0, { title: 'Synthetic Gap', sideNote: 'รอยยับจุดทดสอบ' }));
  assert.equal(store.search('รอยยับ').length, 0);
  save(store, first);
  const reopened = openStore(file);
  try {
    assert.equal(reopened.load(first.id).title, first.title);
    assert.equal(reopened.load(second.id).title, second.title);
    assert.deepEqual(reopened.search('synthetic gap'), reopened.search('รอยยับ'));
    assert.equal(reopened.search('รอยยับ')[0].id, first.id);
    assert.equal(reopened.search('รอยยับ')[0].nodeId, first.nodes[0].id);
  } finally {
    reopened.close();
  }
});

test('all categories, isolated nodes, evidence, saved layout and lossless reclassification', t => {
  const { store, file, history } = setup(t);
  const graph = store.create('ผังสมมติ');
  graph.nodes = Array.from({ length: 7 }, (_, cat) => node(cat));
  const action = graph.nodes[3];
  const imageId = randomUUID();
  const documents = ['https://example.invalid/fictional', '\\\\test-share\\fake\\file.pdf'];
  Object.assign(action, { pic: 'ผู้รับผิดชอบสมมติ', due: '2026-11-15', status: 'In Progress',
    sideNote: 'ข้อความสมมติ', images: [imageId], documents, freeX: 501.25, freeY: 254 });
  graph.edges = [edge(graph.nodes[0], action)];
  graph.mode = 'free';
  save(store, graph, [{ id: imageId, name: 'fixture.png', data: png }]);
  action.cat = 1;
  save(store, graph);
  assert.equal(store.load(graph.id).nodes[3].cat, 1);
  action.cat = 3;
  save(store, graph);
  const reopened = openStore(file);
  try {
    const persisted = reopened.load(graph.id);
    assert.equal(persisted.mode, 'free');
    assert.equal(persisted.nodes.length, 7);
    assert.deepEqual(persisted.edges, graph.edges);
    assert.deepEqual(persisted.nodes[3], { ...action, images: [{ id: imageId, name: 'fixture.png' }] });
    assert.equal(reopened.image(imageId).mime, 'image/png');
    assert.deepEqual(Buffer.from(reopened.image(imageId).bytes), Buffer.from(png, 'base64'));
    assert.equal(history(graph.id).filter(row => row.kind === 'node-category').length, 2);
  } finally {
    reopened.close();
  }
});

test('reverse and cyclic edges persist, duplicate/self/cross-workspace edges are rejected atomically', t => {
  const { store, history } = setup(t);
  const graph = store.create('A');
  const another = store.create('B');
  const [problem, result, outside] = [node(0), node(4), node(1)];
  graph.nodes.push(problem, result);
  another.nodes.push(outside);
  save(store, another);
  graph.edges.push(edge(problem, result), edge(result, problem));
  save(store, graph);
  for (const [invalid, error] of [
    [edge(problem, result), /มีเส้นทิศทางนี้แล้ว/],
    [edge(problem, problem), /เข้าหาตัวเองไม่ได้/],
    [edge(problem, outside), /PDCA เดียวกัน/],
  ]) {
    const draft = structuredClone(graph);
    draft.edges.push(invalid);
    assert.throws(() => save(store, draft), error);
  }
  const forged = structuredClone(graph);
  forged.nodes.push(outside);
  forged.edges.push(edge(problem, outside));
  assert.throws(() => save(store, forged), /PDCA อื่น/);
  assert.equal(store.load(graph.id).edges.length, 2);
  assert.equal(history(graph.id).filter(row => row.kind === 'edge-created').length, 2);
});

test('five history groups, rollback on write failure, identical retry and no-op save', t => {
  const { store, db, history } = setup(t);
  const graph = store.create('History fixture');
  const action = node(3);
  const problem = node(0);
  graph.nodes.push(problem, action);
  const initialEdge = edge(problem, action);
  graph.edges.push(initialEdge);
  save(store, graph);
  const before = history(graph.id);
  action.sideNote = 'ฉบับแก้ไข';
  action.cat = 1;
  action.status = 'Completed';
  action.due = '2026-11-08';
  graph.edges.pop();
  const imageId = randomUUID();
  action.images.push(imageId);
  const batch = request(graph, [{ id: imageId, name: 'test.png', data: png }]);
  db.exec(`CREATE TRIGGER fail_history BEFORE INSERT ON history
    WHEN NEW.kind = 'edge-deleted' BEGIN SELECT RAISE(ABORT, 'synthetic disk failure'); END;`);
  assert.throws(() => store.save(graph.id, batch), /synthetic disk failure/);
  assert.deepEqual(history(graph.id), before);
  assert.equal(store.load(graph.id).nodes[1].sideNote, '');
  assert.equal(store.load(graph.id).edges.length, 1);
  assert.throws(() => store.image(imageId), /ไม่พบรูป/);
  db.exec('DROP TRIGGER fail_history');
  graph.revision = store.save(graph.id, batch).revision;
  assert.equal(store.save(graph.id, batch).revision, graph.revision);
  save(store, graph);
  const changes = history(graph.id).slice(before.length);
  assert.deepEqual(changes.map(row => row.kind),
    ['node-text', 'node-category', 'action-status', 'action-due-date', 'edge-deleted']);
  assert.deepEqual(changes.map(row => row.subject_id), [action.id, action.id, action.id, action.id, initialEdge.id]);
  assert.equal(changes[4].before_json, JSON.stringify({ from: problem.id, to: action.id, label: '', color: 'slate' }));
  assert.ok(changes.every(row => row.display_name === 'ผู้ทดสอบ' && !Number.isNaN(Date.parse(row.saved_at))));
  action.cat = 3;
  action.status = 'Blocked';
  action.due = '';
  action.images = [];
  save(store, graph);
  const end = history(graph.id);
  assert.deepEqual(end.slice(-2).map(row => [JSON.parse(row.before_json), JSON.parse(row.after_json)]),
    [['Completed', 'Blocked'], ['2026-11-08', '']]);
  assert.throws(() => store.image(imageId), /ไม่พบรูป/);
});
