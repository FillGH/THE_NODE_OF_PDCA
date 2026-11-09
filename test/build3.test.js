import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { openStore } from '../src/store.js';
import { makeServer } from '../src/server.js';
import { exportData, exportFormats } from '../src/exports.js';
import { graphSnapshot } from '../web/changes.js';
import { actionOverview } from '../web/build3.js';

const day = 86_400_000;
const node = (cat, title) => ({
  id: randomUUID(), cat, title, sideNote: 'ฉบับแรก', pic: '', due: '', status: 'Not Started',
  snapY: 100, freeX: null, freeY: null, freeW: 200, freeH: 100, images: [], documents: [],
});
const edge = (from, to) => ({ id: randomUUID(), from, to, label: 'เส้นสมมติ', color: 'slate' });

function seed(store, graph, title = 'ผังสมมติ') {
  const ws = store.create(title);
  store.save(ws.id, { graph: { ...ws, ...graph }, revision: 0, saveId: randomUUID(), uploads: [], displayName: 'สมมติ' });
  return ws.id;
}

test('H-01–H-05: history restores text, category and edge as new saves while retaining current fields', t => {
  const store = openStore(':memory:');
  t.after(store.close);
  const fact = node(1, 'Fact'), action = { ...node(3, 'Action'), pic: 'PIC', due: '2026-11-08' };
  const link = edge(fact.id, action.id);
  const id = seed(store, { nodes: [fact, action], edges: [link] });
  const actor = { id: randomUUID(), displayName: 'ผู้ทดสอบ' };
  const write = (ops, restoredEdge) =>
    store.apply(id, { ops, uploads: [], saveId: randomUUID() }, actor, () => {}, restoredEdge);
  const initial = store.history(id).find(row => row.subject === action.id && row.kind === 'node-text');
  const base = store.revision(id);
  write([
    { kind: 'content', id: action.id, base, value: { ...action, cat: 1, title: 'ฉบับสอง', status: 'Blocked' } },
    { kind: 'edge-remove', id: link.id, base },
  ]);
  assert.throws(() => store.restoreOperation(id, initial.seq, base), { status: 409 });
  const restore = seq => write([store.restoreOperation(id, seq, store.revision(id))]);
  const entries = store.history(id);
  restore(initial.seq);
  restore(entries.find(row => row.kind === 'node-category').seq);
  const restoredEdge = store.restoreOperation(id, entries.find(row => row.kind === 'edge-deleted').seq, store.revision(id));
  write([restoredEdge], restoredEdge.id);
  const current = store.load(id);
  assert.deepEqual(current.edges, [link]);
  assert.deepEqual(current.nodes[1], { ...action, status: 'Blocked' });
  assert.equal(store.history(id).filter(row => row.kind === 'node-text' && row.subject === action.id).length, 3);
  assert.deepEqual(new Set(store.history(id).map(row => row.kind)),
    new Set(['node-text','node-category','edge-created','edge-deleted','edge-restored','action-status','action-due-date']));
});

test('H-06–H-08 and C-10: nested Trash, revision fences, deduplicated purge, and Audit retention', t => {
  let time = Date.parse('2026-11-01T00:00:00+07:00');
  const store = openStore(':memory:', { now: () => time });
  t.after(store.close);
  const a = node(1, 'Fact'), b = node(3, 'Action');
  const link = edge(a.id, b.id);
  const id = seed(store, { nodes: [a, b], edges: [link] });
  const sibling = seed(store, { nodes: [], edges: [] });
  const actor = { id: randomUUID(), displayName: 'ผู้ทดสอบ' };
  const base = store.revision(id);
  const change = (subject, restore = false) => store.setVisibility(id, subject, store.trash()
    .find(item => item.id === id)?.revision ?? store.revision(id), restore, actor);
  time += 400 * day;
  change(a.id);
  const old = store.trash()[0];
  assert.equal(store.load(id).edges.length, 0);
  assert.equal(store.search('Fact').length, 0);
  assert.equal(store.history(id).some(row => row.subject === a.id || row.subject === link.id), false);
  assert.throws(() => store.apply(id, { saveId: randomUUID(), uploads: [], ops: [
    { kind: 'content', id: a.id, base, value: { ...a, title: 'draft' } },
  ] }, actor, () => {}), { status: 409, code: 'TRASHED' });
  time += day;
  change(id);
  assert.deepEqual(store.trash().map(item => item.subject), [id]);
  change(id, true);
  assert.equal(store.trash()[0].expires, old.expires);
  assert.deepEqual(store.search('').map(item => item.id).sort(), [id, sibling].sort());
  time = old.expires;
  assert.throws(() => change(a.id, true), { status: 409 });
  store.purge();
  assert.deepEqual(store.load(id).nodes.map(item => item.id), [b.id]);
  change(id);
  time += 7 * day;
  store.purge();
  store.purge();
  assert.throws(() => store.load(id), { status: 404 });
  assert.equal(store.load(sibling).title, 'ผังสมมติ');
  const purge = store.auditLog().filter(event => event.event === 'purge');
  assert.deepEqual(new Set(purge.map(event => event.subject_id)), new Set([id, a.id, b.id]));
  assert.equal(purge.length, 3);
  assert.equal(purge.find(event => event.subject_id === id).operation_id, purge.find(event => event.subject_id === b.id).operation_id);
  assert.equal(purge.every(event => event.display_name === 'System Operation'), true);
  time = Math.max(...purge.map(event => event.retain_until));
  store.purge();
  assert.deepEqual(store.auditLog(), []);
});

test('O-01–O-05: Bangkok midnight, statuses, blank dates and active Action type', () => {
  const rows = ['Not Started','In Progress','Blocked','Completed','Canceled']
    .map(status => ({ ...node(3, status), due: '2026-11-08', status }));
  const workspace = { nodes: [...rows, node(3, 'No due'), { ...node(1, 'Former Action'), due: '2026-11-08' }] };
  const before = Date.parse('2026-11-08T23:59:59+07:00');
  assert.equal(actionOverview(workspace, before).some(row => row.overdue), false);
  assert.deepEqual(actionOverview(workspace, before + 1000).map(row => row.overdue), [true,true,true,false,false,false]);
  workspace.nodes[3].status = 'Blocked';
  workspace.nodes[1].due = '';
  assert.deepEqual(actionOverview(workspace, before + 1000).map(row => row.overdue), [true,false,true,true,false,false]);
});

test('Export E-01–E-04: scoped saved data, typed dates, PDF, and two-sheet Excel', async t => {
  const store = openStore(':memory:');
  t.after(store.close);
  const fact = { ...node(1, 'ข้อมูลสมมติภาษาไทย'), pic: 'hidden PIC', due: '2026-11-07', status: 'Blocked' };
  const action = { ...node(3, 'งานสมมติ'), due: '2026-11-08' };
  const hidden = node(1, 'ข้อมูลใน Trash');
  const nodes = [fact, action, hidden, ...Array.from({ length: 197 }, (_, i) => node(1, 'ข้อเท็จจริง ' + (i + 1)))];
  const id = seed(store, { nodes, edges: [edge(fact.id, action.id), edge(action.id, nodes.at(-1).id), edge(fact.id, hidden.id)] });
  seed(store, { nodes: [node(1, 'ข้อมูลคนละผัง')], edges: [] });
  store.setVisibility(id, hidden.id, store.revision(id), false, { id: randomUUID(), displayName: 'QA' });
  const data = exportData(store, id);
  assert.equal(data.pdca.id, id);
  assert.equal(data.nodes.length, 199);
  assert.equal(data.relationships.length, 2);
  assert.equal(data.nodes[0].action, undefined);
  const json = await exportFormats.json[1](data);
  assert.doesNotMatch(json.toString(), /ข้อมูลใน Trash|ข้อมูลคนละผัง|hidden PIC|deletion_audit/);
  const xlsx = await exportFormats.xlsx[1](data);
  const book = await new ExcelJS.Workbook().xlsx.load(xlsx);
  assert.deepEqual(book.worksheets.map(sheet => sheet.name), ['Nodes', 'Relationships']);
  assert.equal(book.getWorksheet('Nodes').getCell('F2').value, null);
  assert.equal(book.getWorksheet('Nodes').getCell('F3').value.toISOString(), '2026-11-08T00:00:00.000Z');
  const pdf = await exportFormats.pdf[1](data);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok([...pdf.toString('latin1').matchAll(/\/Type \/Page\b/g)].length >= 17);
  if (process.env.PDCA_BUILD3_EVIDENCE) {
    const folder = process.env.PDCA_BUILD3_EVIDENCE;
    await mkdir(folder, { recursive: true });
    for (const [ext, bytes] of [['json', json], ['xlsx', xlsx], ['pdf', pdf]]) {
      await writeFile(join(folder, 'build3-synthetic.' + ext), bytes);
    }
  }
});

test('HTTP: stale Node writes are fenced on Trash, and Audit requires independent authorization', async t => {
  const store = openStore(':memory:');
  const fact = node(1, 'Fact');
  const id = seed(store, { nodes: [fact], edges: [] });
  const server = makeServer(store, undefined, () => true, req => req.headers['x-qa-audit'] === 'yes').listen(0, '127.0.0.1');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); });
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  async function request(path, method = 'GET', body, token, audit = false) {
    return fetch(base + path, { method, headers: { ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' }), ...(audit && { 'x-qa-audit': 'yes' }) },
    body: body && JSON.stringify(body) });
  }
  const a = await (await request('/api/session', 'POST', { displayName: 'A' })).json();
  const b = await (await request('/api/session', 'POST', { displayName: 'B' })).json();
  const ws = '/api/pdca/' + id, tabId = randomUUID();
  const grant = await (await request(ws + '/edit/' + fact.id, 'POST', { tabId }, a.token)).json();
  const pending = { saveId: randomUUID(), tabId, tabToken: grant.editTab.token,
    nodeTokens: { [fact.id]: grant.nodeToken }, uploads: [], ops: [{ kind: 'content', id: fact.id,
      base: grant.workspace.revision, value: { ...graphSnapshot(grant.workspace).nodes[0], sideNote: 'stale' } }] };
  assert.equal((await request(ws + '/trash/' + fact.id, 'POST', { revision: grant.workspace.revision }, b.token)).status, 200);
  assert.equal((await request(ws, 'PUT', pending, a.token)).status, 409);
  assert.deepEqual((await (await request(ws, 'GET', undefined, a.token)).json()).nodes, []);
  assert.equal((await request('/api/deletion-audit', 'GET', undefined, b.token)).status, 403);
  assert.equal((await (await request('/api/deletion-audit', 'GET', undefined, b.token, true)).json()).length, 1);
  assert.equal((await request(ws + '/export/json')).status, 403);
});
