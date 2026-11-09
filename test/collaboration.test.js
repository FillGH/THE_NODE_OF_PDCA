import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { collaboration } from '../src/collaboration.js';
import { makeServer } from '../src/server.js';
import { openStore } from '../src/store.js';
import { diffGraph, graphSnapshot } from '../web/changes.js';

const node = cat => ({
  id: randomUUID(), cat, title: cat === 1 ? 'Fact' : 'Action', sideNote: 'r1', pic: '', due: '',
  status: 'Not Started', snapY: 100, freeX: null, freeY: null, freeW: 200, freeH: 100,
  images: [], documents: [],
});

function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'pdca-collab-'));
  const file = join(directory, 'test.sqlite');
  const store = openStore(file);
  const db = new DatabaseSync(file);
  t.after(() => { db.close(); store.close(); unlinkSync(file); rmdirSync(directory); });
  let time = 0;
  const revoked = new Set();
  const sessions = collaboration({ now: () => time, duration: 20, allow: actor => !revoked.has(actor.id) });
  const pdca = store.create('ผังสมมติ');
  const { id } = pdca;
  const [fact, action] = [node(1), node(3)];
  pdca.nodes.push(fact, action);
  store.save(id, { graph: pdca, revision: 0, saveId: randomUUID(), displayName: 'Seed', uploads: [] });
  const snapshot = () => store.load(id);
  const login = () => sessions.authenticate(sessions.create('ชื่อซ้ำ').token);
  const A = login(), B = login();
  const A1 = randomUUID(), A2 = randomUUID(), B1 = randomUUID();
  function edit(actor, tabId, ...ids) {
    const token = sessions.takeTab(actor, id, tabId).editTab.token;
    const nodeTokens = Object.fromEntries(ids.map(nodeId =>
      [nodeId, sessions.takeNode(actor, id, tabId, token, nodeId).token]));
    return { tabId, tabToken: token, nodeTokens };
  }
  function change(auth, base, update, guard = null) {
    const before = graphSnapshot(base), after = structuredClone(before);
    update(after);
    return { ...auth, saveId: randomUUID(), uploads: [], guard,
      ops: diffGraph(before, after).map(op => ({ ...op, base: base.revision })) };
  }
  function commit(actor, body) {
    sessions.authenticate(actor.token);
    return store.apply(id, body, actor, input => sessions.authorize(actor, id, input));
  }
  const history = () => db.prepare('SELECT * FROM history WHERE pdca_id = ? ORDER BY seq').all(id);
  return { store, db, id, fact, action, A, B, A1, A2, B1, login, sessions, revoked,
    snapshot, edit, change, commit, history, advance: ms => { time += ms; } };
}

test('C-01/C-05/C-07: independent sessions, one tab per PDCA, one editor per Node, concurrent scoped commits', t => {
  const h = setup(t);
  const { A, B, A1, A2, B1, id, sessions, fact, action } = h;
  assert.equal(A.displayName, B.displayName);
  assert.notEqual(A.id, B.id);
  const a = h.edit(A, A1, fact.id), b = h.edit(B, B1, action.id);
  assert.throws(() => h.edit(A, A2), { status: 409, code: 'TAB_OCCUPIED' });
  assert.throws(() => sessions.takeNode(B, id, B1, b.tabToken, fact.id), /กำลังแก้โดย/);
  assert.deepEqual(sessions.state(A, id, A2).editTab, { occupied: true });
  assert.equal(sessions.state(B, id, B1).locks.find(item => item.nodeId === fact.id).mine, false);
  const base = h.snapshot();
  const a1 = h.change(a, base, graph => { graph.nodes[0].sideNote = 'a1'; });
  const b1 = h.change(b, base, graph => { graph.nodes[1].sideNote = 'b1'; });
  assert.deepEqual(h.snapshot().nodes.map(node => node.sideNote), ['r1', 'r1']);
  h.commit(A, a1);
  h.commit(B, b1);
  assert.deepEqual(h.snapshot().nodes.map(node => node.sideNote), ['a1', 'b1']);
  sessions.releaseTab(A, id, A1, a.tabToken);
  assert.ok(h.edit(A, A2, fact.id).nodeTokens[fact.id]);
});

test('E-02: the edit endpoint grants both permissions or leaves no new tab lease', async t => {
  const h = setup(t);
  const { A, B, A1, A2, B1, id, sessions, fact, action } = h;
  const server = makeServer(h.store, sessions).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  const root = 'http://127.0.0.1:' + server.address().port + '/api/pdca/' + id;
  const edit = async (actor, tabId, nodeId) => {
    const response = await fetch(root + '/edit/' + nodeId, {
      method: 'POST', headers: { Authorization: 'Bearer ' + actor.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId }),
    });
    return { status: response.status, body: await response.json() };
  };
  const results = await Promise.all([edit(A, A1, fact.id), edit(B, B1, fact.id)]);
  const winner = results[0].status === 200 ? A : B;
  const winnerTab = winner === A ? A1 : B1;
  const loser = winner === A ? B : A;
  const loserTab = winner === A ? B1 : A1;
  const [granted, rejected] = winner === A ? results : results.toReversed();
  assert.equal(granted.status, 200);
  assert.equal(granted.body.createdTab, true);
  assert.equal(granted.body.createdNode, true);
  assert.equal(granted.body.workspace.revision, h.snapshot().revision);
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.code, 'NODE_LOCKED');
  assert.equal(sessions.state(loser, id, loserTab, false).editTab, null);
  const different = await edit(loser, loser === A ? A2 : randomUUID(), action.id);
  assert.equal(different.status, 200);
  const occupied = await edit(loser, loserTab, action.id);
  assert.equal(occupied.status, 409);
  assert.equal(occupied.body.code, 'TAB_OCCUPIED');
  const retry = await edit(winner, winnerTab, fact.id);
  assert.equal(retry.body.editTab.token, granted.body.editTab.token);
  assert.equal(retry.body.nodeToken, granted.body.nodeToken);
  assert.equal(retry.body.createdTab, false);
  assert.equal(retry.body.createdNode, false);
  assert.equal((await edit(A, A2, randomUUID())).status, 404);
});

test('E-04: reading unaccepted edit permissions does not extend their lifetime', t => {
  const { A, A1, A2, fact, id, sessions, advance } = setup(t);
  sessions.startEdit(A, id, A1, fact.id);
  advance(19);
  assert.ok(sessions.state(A, id, A1, false).editTab.token);
  advance(2);
  assert.equal(sessions.state(A, id, A2, false).editTab, null);
  assert.equal(sessions.state(A, id, A2, false).locks.length, 0);
  assert.ok(sessions.startEdit(A, id, A2, fact.id).nodeToken);
});

test('C-02/C-03: failed transaction leaves no receipt, delayed and duplicate requests return the original committed revision', t => {
  const h = setup(t);
  const a = h.edit(h.A, h.A1, h.fact.id), b = h.edit(h.B, h.B1, h.action.id);
  const base = h.snapshot();
  const input = h.change(a, base, graph => { graph.nodes[0].sideNote = 'a1'; });
  const initial = h.history();
  h.db.exec(`CREATE TRIGGER fail_history BEFORE INSERT ON history
    BEGIN SELECT RAISE(ABORT, 'synthetic transaction failure'); END;`);
  assert.throws(() => h.commit(h.A, input), /synthetic transaction failure/);
  assert.deepEqual(h.history(), initial);
  assert.equal(h.store.receipt(h.id, h.A, input.saveId), null);
  assert.equal(h.snapshot().nodes[0].sideNote, 'r1');
  h.db.exec('DROP TRIGGER fail_history');
  const saved = h.commit(h.A, input);
  assert.deepEqual(h.store.receipt(h.id, h.A, input.saveId), saved);
  h.commit(h.B, h.change(b, base, graph => { graph.nodes[1].sideNote = 'b1'; }));
  assert.deepEqual(h.commit(h.A, input), saved);
  assert.throws(() => h.commit(h.A, { ...input, guard: 1 }), /ข้อมูลชุดอื่น/);
  assert.equal(h.history().length, initial.length + 2);
  assert.equal(h.snapshot().nodes[1].sideNote, 'b1');
});

test('C-04/C-05/C-06: elapsed tab lease frees Node, fences queued writes and requires current revision after takeover', t => {
  const h = setup(t);
  const a = h.edit(h.A, h.A1, h.fact.id);
  const before = h.snapshot();
  const waiting = h.change(a, before, graph => { graph.nodes[0].sideNote = 'late a1'; });
  h.advance(21);
  const b = h.edit(h.B, h.B1, h.fact.id);
  assert.throws(() => h.commit(h.A, waiting), /หมดอายุ/);
  h.commit(h.B, h.change(b, before, graph => { graph.nodes[0].sideNote = 'b1'; }));
  assert.equal(h.snapshot().nodes[0].sideNote, 'b1');
  assert.equal(h.store.receipt(h.id, h.A, waiting.saveId), null);
  h.sessions.releaseTab(h.B, h.id, h.B1, b.tabToken);
  const a2 = h.edit(h.A, h.A2, h.fact.id);
  assert.throws(() => h.commit(h.A, h.change(a2, before, graph => { graph.nodes[0].sideNote = 'stale'; })),
    /หลังฉบับที่คุณเปิด/);
  const review = h.snapshot();
  h.commit(h.A, h.change(a2, review, graph => { graph.nodes[0].sideNote = 'confirmed'; }, review.revision));
  assert.equal(h.snapshot().nodes[0].sideNote, 'confirmed');
});

test('C-09/C-10: ended or revoked session cannot reopen a lease, read a receipt via actor authorization or write', t => {
  const h = setup(t);
  const a = h.edit(h.A, h.A1, h.fact.id);
  const input = h.change(a, h.snapshot(), graph => { graph.nodes[0].sideNote = 'in-flight'; });
  h.sessions.end(h.A);
  assert.throws(() => h.commit(h.A, input), { status: 403 });
  assert.throws(() => h.sessions.state(h.A, h.id, h.A2), { status: 403 });
  assert.equal(h.snapshot().nodes[0].sideNote, 'r1');
  const b = h.edit(h.B, h.B1, h.fact.id);
  h.revoked.add(h.B.id);
  assert.throws(() => h.commit(h.B, h.change(b, h.snapshot(), graph => { graph.nodes[0].sideNote = 'revoked'; })), { status: 403 });
  const C = h.login();
  assert.ok(h.edit(C, randomUUID(), h.fact.id).tabToken);
});

test('C-11: ordered edge uniqueness, reverse edge, non-overlapping merges and stale layout guards', t => {
  const h = setup(t);
  const a = h.edit(h.A, h.A1, h.fact.id), b = h.edit(h.B, h.B1);
  const base = h.snapshot();
  const forward = { id: randomUUID(), from: h.fact.id, to: h.action.id, color: 'slate', label: '' };
  const reverse = { id: randomUUID(), from: h.action.id, to: h.fact.id, color: 'slate', label: '' };
  h.commit(h.A, h.change(a, base, graph => { graph.edges.push(forward); graph.nodes[0].sideNote = 'text'; }));
  assert.throws(() => h.commit(h.B, h.change(b, base, graph => { graph.edges.push({ ...forward, id: randomUUID() }); })), /ทิศทางนี้/);
  h.commit(h.B, h.change(b, base, graph => { graph.edges.push(reverse); graph.nodes[0].snapY = 200; }));
  assert.equal(h.snapshot().nodes[0].sideNote, 'text');
  assert.equal(h.snapshot().nodes[0].snapY, 200);
  assert.equal(h.snapshot().edges.length, 2);
  assert.throws(() => h.commit(h.A, h.change(a, base, graph => { graph.nodes[0].snapY = 300; })), /หลังฉบับที่คุณเปิด/);
  assert.throws(() => h.commit(h.A, h.change(a, base, graph => { graph.widths[0] = 280; }, base.revision)), /ผังมีฉบับใหม่/);
});
