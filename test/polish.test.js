import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { auditPath } from '../src/audit.js';
import { createSnapshot, prepareRestore, restoreSnapshot } from '../src/recovery.js';
import { openStore, trashLifetime } from '../src/store.js';
import { diffGraph, graphSnapshot } from '../web/changes.js';

const actor = { id: randomUUID(), displayName: 'QA สมมติ' };

test('Action references adopt legacy creation order and remain stable through Trash, purge, reclassification, and reopen', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdca-action-number-'));
  const file = join(dir, 'workspace.sqlite');
  let time = Date.now();
  const now = () => time;
  let store = openStore(file, { now });
  t.after(async () => { store.close(); await rm(dir, { recursive: true }); });
  const workspace = store.create('Action number QA');
  const makeNode = (cat, title) => ({
    id: randomUUID(), cat, title, sideNote: '', pic: '', due: '', status: 'Not Started',
    snapY: 20, freeX: null, freeY: null, freeW: 200, freeH: 98, images: [], documents: [],
  });
  const fact = makeNode(1, 'Old Fact'), first = makeNode(3, 'First'), second = makeNode(3, 'Second');
  workspace.nodes.push(fact, first, second);
  store.save(workspace.id, { graph: workspace, revision: 0, saveId: randomUUID(), displayName: actor.displayName, uploads: [] });
  const db = new DatabaseSync(file);
  try {
    const legacy = graphSnapshot(workspace);
    db.prepare('UPDATE workspaces SET graph = ? WHERE id = ?').run(JSON.stringify(legacy), workspace.id);
  } finally { db.close(); }
  const read = () => store.load(workspace.id);
  const refs = () => read().nodes.filter(node => node.cat === 3).map(node => node.actionNumber);
  const update = edit => {
    const before = read();
    const next = graphSnapshot(before);
    edit(next.nodes);
    const ops = diffGraph(graphSnapshot(before), next).map(op => ({ ...op, base: before.revision }));
    store.apply(workspace.id, { saveId: randomUUID(), ops, uploads: [] }, actor, () => {});
  };
  assert.deepEqual(refs(), [1, 2]);
  store.setVisibility(workspace.id, first.id, read().revision, false, actor);
  assert.deepEqual(refs(), [2]);
  store.setVisibility(workspace.id, first.id, read().revision, true, actor);
  assert.deepEqual(refs(), [1, 2]);
  store.setVisibility(workspace.id, second.id, read().revision, false, actor);
  time += trashLifetime + 1;
  store.purge();
  update(nodes => { nodes.find(node => node.id === fact.id).cat = 3; });
  update(nodes => { nodes.find(node => node.id === first.id).cat = 1; });
  update(nodes => { nodes.find(node => node.id === first.id).cat = 3; });
  update(nodes => { nodes.push(makeNode(3, 'Newest')); });
  store.close();
  store = openStore(file, { now });
  assert.deepEqual(refs(), [3, 1, 4]);
});

test('the saved size lock shares the layout scope, protects dimensions, and permits movement and unlock', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdca-size-'));
  const file = join(dir, 'workspace.sqlite');
  let store = openStore(file);
  t.after(async () => { store.close(); await rm(dir, { recursive: true }); });
  const workspace = store.create('Size lock QA');
  const id = randomUUID();
  workspace.nodes.push({ id, cat: 1, title: 'ภาพหลักฐาน', sideNote: '', pic: '', due: '', status: 'Not Started',
    snapY: 20, freeX: 20, freeY: 20, freeW: 200, freeH: 98, images: [], documents: [] });
  store.save(workspace.id, { graph: workspace, revision: 0, saveId: randomUUID(), displayName: actor.displayName, uploads: [] });
  const read = () => store.load(workspace.id);
  const change = (before, changes) => {
    const after = graphSnapshot(before);
    Object.assign(after.nodes[0], changes);
    const ops = diffGraph(graphSnapshot(before), after).map(op => ({ ...op, base: before.revision }));
    return store.apply(workspace.id, { saveId: randomUUID(), ops, uploads: [] }, actor, () => {});
  };
  const legacy = read();
  assert.equal(legacy.nodes[0].sizeLocked, undefined);
  change(legacy, { freeW: 310, freeH: 190, sizeLocked: true });
  assert.throws(() => change(legacy, { freeX: 80 }), error => error.status === 409);
  change(read(), { freeX: 180, freeY: 120, snapY: 90, freeW: 170, freeH: 82 });
  store.close();
  store = openStore(file);
  const locked = read().nodes[0];
  assert.deepEqual([locked.freeX, locked.freeY, locked.snapY, locked.freeW, locked.freeH, locked.sizeLocked],
    [180, 120, 90, 310, 190, true]);
  change(read(), { sizeLocked: false });
  change(read(), { freeW: 280, freeH: 152 });
  assert.deepEqual([read().nodes[0].freeW, read().nodes[0].freeH, !!read().nodes[0].sizeLocked], [280, 152, false]);
});

test('Workspace category management persists and restores assignments, including safe removal and PDCA purge', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdca-categories-'));
  const file = join(dir, 'workspace.sqlite');
  const root = join(dir, 'backups'), recoveryRoot = join(dir, 'restore');
  let time = Date.now();
  const now = () => time;
  let store = openStore(file, { now });
  t.after(async () => { store.close(); await rm(dir, { recursive: true }); });
  await mkdir(root);
  const first = store.create('ผังสมมติ A'), second = store.create('ผังสมมติ B');
  const group = store.changeCategory(null, ' QA ');
  assert.throws(() => store.changeCategory(null, 'qa'), error => error.status === 409);
  store.assignCategory(first.id, group.id, null);
  store.assignCategory(second.id, group.id, null);
  assert.throws(() => store.assignCategory(first.id, null, null), error => error.status === 409);
  const renamed = store.changeCategory(group.id, 'คุณภาพ', group.name);
  assert.throws(() => store.removeCategory(group.id, group.name), error => error.status === 409);
  store.close();
  store = openStore(file, { now });
  assert.equal(store.search('สมมติ A')[0].categoryId, group.id);
  assert.deepEqual(store.listCategories().map(row => ({ ...row })), [renamed]);
  const options = { file, auditFile: auditPath(file), root, recoveryRoot, now };
  const snapshot = await createSnapshot(options);
  store.setVisibility(second.id, second.id, second.revision, false, actor);
  time += trashLifetime + 1;
  store.purge();
  store.removeCategory(group.id, renamed.name);
  assert.equal(store.search('สมมติ A')[0].categoryId, null);
  assert.equal(store.search('สมมติ B').length, 0);
  const restored = await restoreSnapshot({ ...options, id: snapshot.id, role: 'IT' });
  assert.equal(restored.status, 'awaiting-it-review', restored.reason);
  assert.deepEqual(restored.inventory.categoryAssignments.map(row => ({ ...row })), [
    { pdca_id: first.id, category_id: group.id },
  ]);
  const prepared = await prepareRestore({ ...options, stageId: restored.stageId, role: 'IT' });
  const candidate = openStore(prepared.candidate, { auditFile: options.auditFile, now });
  try { assert.equal(candidate.search('สมมติ A')[0].categoryId, group.id); }
  finally { candidate.close(); }
});
