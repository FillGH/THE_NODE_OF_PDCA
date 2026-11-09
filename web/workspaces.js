import { ApiError, autosave } from './autosave.js';
import { categoryNames } from './model.js';
import { applyGraphOps, diffGraph, graphSnapshot, scope } from './changes.js';
import { browserSession } from './session.js';

const $ = id => document.getElementById(id);
const imageUrls = new Map();
export const imageUrl = id => imageUrls.get(id) || '';
export const defaultCamera = () => ({ x: 0, y: 0, zoom: 1 });

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function installWorkspaces({ onOpen, onHome, onSync, onImagesSaved, canvasBusy }) {
  let current, lastId, committed, saver, baseline, initialRevision, forceGuard;
  let online = false, busy = false, checking = 0, searching = 0, searchTimer, attachmentPending;
  let tab, locks = [], editing, blocked, review, layoutGuard = false;
  let graphAction, startingEdit, handoff, finishing, draining, reconciling;
  let stopping = false;
  const drafts = new Map();
  const versions = new Map();
  const uploads = new Map();
  const imageLoads = new Set();
  const uncertainNodes = new Map();
  const identity = $('identityDialog'), reviewDialog = $('draftDialog'), nameDialog = $('pdcaDialog');
  const control = browserSession({ onEnter, onExit, onLogin, onMessage });
  const request = (...args) => control.request(...args);
  const url = (suffix = '') => '/api/pdca/' + current.id + suffix;
  const credentials = () => ({ tabId: control.tabId, tabToken: tab?.token });
  const canWrite = () => !!(current && online && tab?.token && !blocked && !review && !stopping && !busy && !startingEdit && !reconciling);
  const canEditGraph = (action = graphAction) => !!action && graphAction === action && canWrite();
  const lockFor = id => locks.find(lock => lock.nodeId === id);
  const canEditNode = id => canWrite() && editing === id && !!lockFor(id)?.mine;
  const needsReview = () => blocked || (!saver?.dirty() && draftForCurrent());

  const canStart = () => !!(current && online && !busy && !stopping && !startingEdit &&
    !review && !reconciling && (!needsReview() || tab?.occupied));
  const requestingNode = id => startingEdit?.workspace === current && !startingEdit.cancelled &&
    startingEdit.nodeId === id;

  function show(state, message = '') {
    const status = $('saveStatus');
    status.dataset.state = state;
    status.textContent = { saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว',
      error: 'บันทึกไม่สำเร็จ · ' + message, idle: '' }[state];
    if (state === 'saving' || state === 'error') document.querySelector('.topbar').classList.remove('hidden');
  }
  function refreshControls(redraw = false) {
    $('editorMenu').hidden = !control.active();
    $('connectionState').textContent = !control.active() ? '' : !online ? 'ขาดการเชื่อมต่อ · หยุดแก้ไข' :
      startingEdit && !startingEdit.cancelled ? 'กำลังขอสิทธิ์…' :
        current ? (graphAction ? 'กำลังแก้ผัง' : editing ? 'กำลังแก้ Node' : '') : '';
    $('retrySave').hidden = !current || !draftForCurrent() || !!saver?.dirty();
    $('retrySave').disabled = !online || !!tab?.occupied || busy || !!startingEdit || !!handoff || !!reconciling;
    $('createPdca').disabled = !online;
    onSync(redraw);
  }

  async function refreshSearch() {
    if (!control.active()) return;
    const seq = ++searching;
    const results = $('workspaceCards');
    results.textContent = 'กำลังค้นหา…';
    try {
      const query = $('search').value.trim();
      const records = await request('/api/pdca?q=' + encodeURIComponent(query));
      if (seq !== searching) return;
      results.innerHTML = records.map(record => `
        <button type="button" class="workspace-card" data-pdca="${record.id}" data-node="${record.nodeId || ''}">
          <span class="workspace-type">${record.nodeId ? escapeHTML(categoryNames[record.cat]) + ' · NODE' : 'PDCA'}</span>
          <strong>${escapeHTML(record.nodeId ? record.nodeTitle || 'Node ไม่มีชื่อ' : record.title)}</strong>
          <span class="workspace-count">${record.nodeId ? escapeHTML(record.title) + ' · ' + record.nodeId :
            record.nodeCount + ' Nodes · ' + record.edgeCount + ' เส้น'}</span>
          <span class="workspace-id">${record.id}</span><span class="workspace-open">เปิด Canvas ↗</span>
        </button>`).join('');
      if (!records.length) results.textContent = query ? 'ไม่พบรายการที่ตรงกับคำค้น' : 'ยังไม่มี PDCA · เริ่มด้วยการสร้างผังเปล่า';
    } catch (error) {
      if (seq === searching && control.active()) results.textContent = 'อ่านรายการไม่สำเร็จ · ' + error.message;
    }
  }
  function showError(error) {
    if (control.active()) $('navigationError').textContent = error.message;
  }
  function showHome() {
    show('idle');
    onHome();
    refreshControls();
    refreshSearch();
  }

  function makeDraft() {
    if (!current || !saver?.dirty()) return null;
    return {
      id: current.id, base: baseline, graph: graphSnapshot(current),
      pending: saver.pending(), uploads: [...uploads.values()],
    };
  }
  function broadcastDraft(draft) {
    if (!draft) return;
    drafts.set(draft.id, draft);
    control.send('draft', { draft });
  }
  function clearDraft(id) {
    drafts.delete(id);
    control.send('draft-clear', { workspace: id });
  }
  function draftForCurrent() {
    return current && (blocked || drafts.get(current.id));
  }
  function block(message) {
    const draft = makeDraft();
    if (draft) {
      blocked = draft;
      broadcastDraft(draft);
      saver.stop();
      saver = null;
    }
    if (blocked) show('error', message);
    refreshControls();
  }

  function replaceGraph(saved) {
    const equal = JSON.stringify(graphSnapshot(current)) === JSON.stringify(graphSnapshot(saved));
    if (!equal) Object.assign(current, saved);
    else current.revision = saved.revision;
    baseline = graphSnapshot(saved);
    initialRevision = saved.revision;
    versions.clear();
    return !equal;
  }
  function startSaver(saved) {
    saver?.stop();
    baseline = graphSnapshot(saved);
    initialRevision = saved.revision;
    versions.clear();
    saver = autosave({
      snapshot() {
        const local = graphSnapshot(current);
        const ops = diffGraph(baseline, local).map(op => ({ ...op, base: versions.get(scope(op)) ?? initialRevision }));
        const guard = forceGuard ?? (layoutGuard || ops.some(op => op.kind === 'layout') ? initialRevision : null);
        layoutGuard = false;
        const ids = new Set(local.nodes.flatMap(node => node.images));
        const body = { ...credentials(), ops, guard, saveId: crypto.randomUUID(),
          nodeTokens: Object.fromEntries(locks.filter(lock => lock.mine).map(lock => [lock.nodeId, lock.token])),
          uploads: [...uploads.values()].filter(image => ids.has(image.id)) };
        return { body, local };
      },
      send(batch) {
        broadcastDraft(makeDraft());
        return request(url(), 'PUT', batch.body);
      },
      acknowledge(batch, result) {
        baseline = batch.local;
        for (const op of batch.body.ops) {
          versions.set(scope(op), result.revision);
          if (op.kind === 'node-add') {
            versions.set('position:' + op.id, result.revision);
            versions.set('content:' + op.id, result.revision);
          }
        }
        current.revision = result.revision;
        forceGuard = null;
        for (const image of batch.body.uploads) uploads.delete(image.id);
        if (batch.body.uploads.length) requestAnimationFrame(onImagesSaved);
      },
      show(state, message) {
        if (state === 'error') { block(message); return; }
        show(state, message);
        if (state === 'saved') {
          uploads.clear();
          clearDraft(current.id);
          poll();
        }
      },
    });
  }

  async function readState(full = false) {
    const query = '?tab=' + control.tabId + (tab?.token ? '' : '&renew=0') +
      (full ? '' : '&revision=' + committed.revision);
    return request(url('/state') + query, 'GET', undefined, { timeout: 2500 });
  }
  async function reconcilePermissions(info) {
    const unknownTab = info.editTab?.token && info.editTab.token !== tab?.token;
    const uncertain = uncertainNodes.get(current.id);
    const unknownLocks = !unknownTab && info.editTab?.token && uncertain
      ? info.locks.filter(lock => lock.mine && uncertain.has(lock.nodeId) && editing !== lock.nodeId) : [];
    if (!unknownTab && !unknownLocks.length) return;
    const workspace = reconciling = current;
    refreshControls();
    try {
      if (unknownTab) {
        // A lost or cancelled acquisition is not permission to edit.
        await request(url('/tab'), 'DELETE', { tabId: control.tabId, tabToken: info.editTab.token }).catch(() => {});
        info.editTab = undefined;
        info.locks = info.locks.filter(lock => !lock.mine);
        return;
      }
      for (const lock of unknownLocks) {
        if (current !== workspace) break;
        const released = await request(url('/lock/' + lock.nodeId), 'DELETE', {
          ...credentials(), nodeToken: lock.token,
        }).then(() => true, () => false);
        if (released) {
          uncertain.delete(lock.nodeId);
          info.locks = info.locks.filter(item => item !== lock);
        }
      }
    } finally {
      if (reconciling === workspace) reconciling = undefined;
    }
  }
  async function poll() {
    if (!control.active() || reconciling) return;
    if (busy || startingEdit) {
      // A save/attachment can outlast one heartbeat while the UI is finishing.
      if (draining && draining === current && tab?.token) await readState().catch(() => {});
      return;
    }
    const id = current?.id;
    const seq = ++checking;
    try {
      if (!id) {
        await request('/api/session', 'GET', undefined, { timeout: 2500 });
        if (seq !== checking || current) return;
        if (!online) refreshSearch();
        online = true;
        refreshControls();
        return;
      }
      const info = await readState(!saver?.dirty() && (blocked || committed.revision !== current.revision));
      if (seq !== checking || id !== current?.id) return;
      await reconcilePermissions(info);
      if (seq !== checking || id !== current?.id) return;
      online = true;
      const lost = (tab?.token && tab.token !== info.editTab?.token) ||
        (editing && !info.locks.some(lock => lock.nodeId === editing && lock.mine));
      tab = info.editTab;
      locks = info.locks;
      if (lost) {
        graphAction = undefined;
        editing = undefined;
        block('สิทธิ์แก้ไขสิ้นสุด กรุณาตรวจฉบับร่าง');
      }
      if (info.workspace) committed = info.workspace;
      // Keep the editor's local baseline while a batch is outstanding. Every
      // other tab sees the committed revision without waiting for the reply.
      const redraw = !saver?.dirty() && !canvasBusy() && replaceGraph(committed);
      refreshControls(redraw);
    } catch (error) {
      if (seq !== checking || id !== current?.id || !control.active()) return;
      disconnect(error);
    }
  }
  function disconnect(error) {
    if (error instanceof ApiError) { showError(error); return; }
    online = false;
    cancelEditIntent();
    block('เชื่อมต่อที่เก็บข้อมูลไม่ได้ · เก็บฉบับร่างใน Session นี้');
  }

  function open(saved, nodeId) {
    checking++;
    current = { ...structuredClone(saved), camera: defaultCamera() };
    committed = saved;
    lastId = saved.id;
    tab = undefined;
    graphAction = undefined;
    locks = [];
    editing = undefined;
    blocked = undefined;
    review = undefined;
    forceGuard = null;
    layoutGuard = false;
    uploads.clear();
    online = true;
    startSaver(saved);
    show('saved');
    onOpen(current, nodeId);
    refreshControls();
  }
  async function leaveWorkspace() {
    if (!current) return true;
    if (attachmentPending) await attachmentPending.catch(() => {});
    if (saver?.dirty() && !await saver.flush()) return false;
    if (blocked) { showError(new Error('ตรวจหรือทิ้งฉบับร่างก่อนออกจากผัง')); return false; }
    if (tab?.token) {
      await request(url('/tab'), 'DELETE', credentials()).catch(error => {
        if (error.status !== 409) throw error;
      });
    }
    saver?.stop();
    current = undefined;
    return true;
  }
  async function navigate(action) {
    if (busy || reconciling || !control.active()) return;
    cancelEditIntent();
    busy = true;
    checking++;
    refreshControls();
    $('navigationError').textContent = '';
    try {
      if (await leaveWorkspace()) await action();
    } catch (error) { showError(error); }
    finally { busy = false; refreshControls(); poll(); }
  }

  async function takeTab(rotate = false) {
    const info = await request(url('/tab'), 'POST', { tabId: control.tabId, rotate });
    tab = info.editTab;
    locks = info.locks;
    if (!saver?.dirty()) blocked ||= drafts.get(current.id);
  }
  function cancelEditIntent() {
    if (startingEdit) startingEdit.cancelled = true;
    handoff?.complete(false);
  }
  function askHandoff(intent) {
    return new Promise(resolve => {
      const requestId = crypto.randomUUID();
      const timer = setTimeout(() => {
        showError(new Error('แท็บเดิมยังไม่คืนสิทธิ์ กรุณาลองอีกครั้ง'));
        complete(false);
      }, 20_000);
      function complete(ready) {
        clearTimeout(timer);
        if (handoff?.requestId === requestId) handoff = undefined;
        resolve(ready);
      }
      handoff = { workspace: intent.workspace, requestId, complete };
      control.send('handoff', { workspace: intent.workspace.id, requestId });
      showError(new Error('กำลังรอแท็บเดิมคืนสิทธิ์'));
    });
  }
  async function acquire(intent, send) {
    // Ask first when a sibling's draft is visible. Otherwise let the Host
    // decide whether a cached occupied state still needs a handoff.
    if (tab?.occupied && needsReview() && !await askHandoff(intent)) return;
    if (!intent.valid()) return;
    if (needsReview()) throw new Error('ตรวจฉบับร่างก่อนเริ่มแก้');
    try { return await send(); }
    catch (error) {
      if (error.code !== 'TAB_OCCUPIED' || !intent.valid()) throw error;
      tab = { occupied: true };
      if (await askHandoff(intent) && intent.valid()) return send();
    }
  }
  function beginIntent(isCurrent, nodeId) {
    const intent = { workspace: current, nodeId,
      valid: () => !intent.cancelled && current === intent.workspace && isCurrent() };
    startingEdit = intent;
    checking++;
    $('navigationError').textContent = '';
    refreshControls();
    return intent;
  }
  function endIntent(intent, redraw = false) {
    if (startingEdit !== intent) return;
    startingEdit = undefined;
    refreshControls(redraw);
    poll();
  }
  async function reconcileAcquisition(intent, error) {
    if (current !== intent.workspace || (error instanceof ApiError && error.status < 500)) return;
    try {
      const info = await readState(true);
      if (current === intent.workspace) await reconcilePermissions(info);
    } catch { if (current === intent.workspace) online = false; }
  }
  async function settleEdits() {
    const workspace = draining = current;
    try {
      if (attachmentPending) await attachmentPending;
      if (blocked || (saver?.dirty() && !await saver.flush()) || needsReview()) {
        throw new Error('ตรวจฉบับร่างก่อนจบการแก้');
      }
    } finally { if (draining === workspace) draining = undefined; }
  }
  function finishTab() {
    if (current && finishing?.workspace === current) return finishing.result;
    if (!current || busy || startingEdit || reconciling || !tab?.token) return Promise.resolve(false);
    const operation = finishing = { workspace: current };
    operation.result = releaseTab(operation.workspace).finally(() => {
      if (finishing === operation) finishing = undefined;
    });
    return operation.result;
  }
  async function releaseTab(workspace) {
    busy = true;
    checking++;
    refreshControls();
    try {
      await settleEdits();
      if (current !== workspace) return false;
      // Stop renewing locally even when the release acknowledgement is lost.
      // The next state check can clean up the unused lease.
      const released = await request(url('/tab'), 'DELETE', credentials(), { timeout: 2500 })
        .then(() => true, error => error.status === 409);
      if (current !== workspace) return false;
      tab = undefined;
      graphAction = undefined;
      locks = locks.filter(lock => !lock.mine);
      editing = undefined;
      if (!released) showError(new Error('ยังยืนยันการคืนสิทธิ์ไม่ได้ กรุณาลองอีกครั้ง'));
      return released;
    } catch (error) { if (current === workspace) showError(error); return false; }
    finally { if (current === workspace) { busy = false; refreshControls(); poll(); } }
  }
  async function startGraph(isCurrent = () => true) {
    if (!canStart() || graphAction) return false;
    const workspace = current;
    if (!isCurrent() || (editing && !await finishTab())) return false;
    if (current !== workspace || !isCurrent() || !canStart()) return false;
    const path = url();
    const intent = beginIntent(isCurrent);
    const previousToken = tab?.token;
    let info;
    try {
      info = await acquire(intent, () => request(path + '/tab', 'POST', { tabId: control.tabId }));
      if (!info) return false;
      if (intent.valid()) {
        const latest = await readState(true);
        if (intent.valid() && latest.editTab?.token === info.editTab.token) {
          tab = latest.editTab;
          locks = latest.locks;
          committed = latest.workspace;
          graphAction = intent;
          $('navigationError').textContent = '';
          const redraw = replaceGraph(committed);
          endIntent(intent, redraw);
          return intent;
        }
      }
    } catch (error) {
      if (!info) await reconcileAcquisition(intent, error);
      if (intent.valid()) showError(error);
    } finally {
      if (info?.editTab?.token && info.editTab.token !== previousToken && graphAction !== intent) {
        await request(path + '/tab', 'DELETE', {
          tabId: control.tabId, tabToken: info.editTab.token,
        }).catch(() => {});
      }
      endIntent(intent);
    }
    return false;
  }
  function finishGraph(action) {
    if (graphAction === action) return finishTab();
  }
  async function runGraph(action, isCurrent) {
    const permit = await startGraph(isCurrent);
    if (!permit) return false;
    try {
      if (!canEditGraph(permit) || (isCurrent && !isCurrent())) return false;
      action();
      return true;
    } catch (error) { showError(error); return false; }
    finally { await finishGraph(permit); }
  }
  function leaveInspector(nextId, apply) {
    if (busy || reconciling) return;
    if (nextId !== editing && needsReview() && !tab?.occupied && blocked) {
      showError(new Error('ตรวจฉบับร่างก่อนออกจากการแก้ Node'));
      return;
    }
    if (startingEdit?.nodeId && startingEdit.nodeId !== nextId) cancelEditIntent();
    if (!editing || nextId === editing) return apply();
    const workspace = current;
    return finishTab().then(finished => {
      if (finished && current === workspace) apply();
    });
  }
  async function releaseUnusedEdit(path, id, info) {
    const credentials = { tabId: control.tabId, tabToken: info.editTab.token };
    if (info.createdTab) await request(path + '/tab', 'DELETE', credentials);
    else if (info.createdNode) await request(path + '/lock/' + id, 'DELETE', { ...credentials, nodeToken: info.nodeToken });
  }
  async function editNode(id, isCurrent) {
    if (canEditNode(id)) return isCurrent();
    if (!canStart() || graphAction || (editing && editing !== id)) return false;
    const lock = lockFor(id);
    if (lock && !lock.mine && !lock.sameSession) return false;
    const workspace = current;
    const path = url();
    const intent = beginIntent(isCurrent, id);
    let attempted = false;
    try {
      if (!tab?.occupied) await settleEdits();
      const info = await acquire(intent, () => {
        attempted = true;
        return request(path + '/edit/' + id, 'POST', { tabId: control.tabId });
      });
      if (!info) return false;
      if (!intent.valid()) {
        await releaseUnusedEdit(path, id, info);
        return false;
      }
      tab = info.editTab;
      locks = info.locks;
      committed = info.workspace;
      const redraw = replaceGraph(committed);
      uncertainNodes.get(workspace.id)?.delete(id);
      editing = id;
      $('navigationError').textContent = '';
      endIntent(intent, redraw);
      return true;
    } catch (error) {
      if (attempted && (!(error instanceof ApiError) || error.status >= 500) && current === workspace) {
        if (!uncertainNodes.has(workspace.id)) uncertainNodes.set(workspace.id, new Set());
        uncertainNodes.get(workspace.id).add(id);
        await reconcileAcquisition(intent, error);
      }
      if (intent.valid()) showError(error);
      return false;
    } finally { endIntent(intent); }
  }

  function onMessage(event) {
    if (event.type === 'draft' && event.draft) {
      drafts.set(event.draft.id, event.draft);
      refreshControls();
    } else if (event.type === 'draft-clear') {
      drafts.delete(event.workspace);
      refreshControls();
    } else if (event.type === 'draft-request') {
      broadcastDraft(blocked || makeDraft());
    } else if (event.type === 'handoff' && current?.id === event.workspace && tab?.token) {
      const id = current.id;
      finishTab().then(ready => {
        if (control.active() && current?.id === id) {
          control.send(ready ? 'handoff-ready' : 'handoff-blocked', { workspace: id, requestId: event.requestId });
        }
      });
    } else if (handoff && handoff.workspace === current && current?.id === event.workspace &&
        handoff.requestId === event.requestId) {
      const ready = event.type === 'handoff-ready';
      if (ready) tab = undefined;
      else $('navigationError').textContent = 'แท็บเดิมยังมีงานค้าง กรุณาตรวจในแท็บเดิมก่อน';
      handoff.complete(ready);
    }
  }

  function summary(graph, ops) {
    const labels = { rename: 'ชื่อ PDCA', layout: 'การจัดผัง', 'node-add': 'สร้าง Node',
      content: 'ข้อมูล Node', position: 'ตำแหน่ง Node', 'edge-add': 'สร้างเส้น', edge: 'แก้เส้น', 'edge-remove': 'ลบเส้น' };
    const titleOf = id => graph.nodes.find(node => node.id === id)?.title ?? id;
    return ops.map(op => {
      const node = graph.nodes.find(item => item.id === op.id);
      const edge = graph.edges.find(item => item.id === op.id);
      if (op.kind === 'rename') return labels.rename + ' · ' + graph.title;
      if (op.kind === 'layout') return labels.layout + ' · ' + graph.mode + ' · ความกว้าง ' + graph.widths.join(', ');
      if (op.kind === 'position') return labels.position + ' · ' + (node ? `${node.title} · ${node.freeX ?? 'Snap'}, ${node.freeY ?? node.snapY}` : 'ยังไม่มี');
      if (op.kind === 'content' || op.kind === 'node-add') {
        if (!node) return labels[op.kind] + ' · ยังไม่มี';
        const action = node.cat === 3 ? `\nPIC ${node.pic || '—'} · ${node.due || '—'} · ${node.status}` : '';
        const references = `\nรูป ${node.images.length} · ลิงก์ ${node.documents.join(', ') || '—'}`;
        return `${categoryNames[node.cat]} · ${node.title}\n${node.sideNote}${action}${references}`;
      }
      return labels[op.kind] + ' · ' + (edge ? `${titleOf(edge.from)} → ${titleOf(edge.to)} · ${edge.label || edge.color}` : 'ไม่มีเส้น');
    }).join('\n\n');
  }
  async function inspectDraft() {
    const draft = draftForCurrent();
    if (!draft || !online || busy || startingEdit || handoff || reconciling ||
        (tab?.occupied && !tab.token) || (saver?.dirty() && !blocked)) return;
    const workspace = current;
    let alreadySaved = false;
    busy = true;
    checking++;
    refreshControls();
    try {
      // Fence every old write, including edge and layout changes, before
      // querying the receipt and presenting the authoritative revision.
      await takeTab(true);
      uncertainNodes.delete(current.id);
      editing = undefined;
      const receipt = draft.pending ? (await request(url('/receipt/' + draft.pending.body.saveId)).then(result => result.receipt)) : null;
      const base = receipt ? draft.pending.local : draft.base;
      const ops = diffGraph(base, draft.graph);
      for (const { id } of ops.filter(op => op.kind === 'content')) {
        await request(url('/lock/' + id), 'POST', credentials());
        editing = id;
      }
      const info = await readState(true);
      tab = info.editTab;
      locks = info.locks;
      committed = info.workspace;
      if (!ops.length) {
        blocked = undefined;
        clearDraft(current.id);
        const changed = replaceGraph(committed);
        startSaver(committed);
        show('saved');
        alreadySaved = true;
        refreshControls(changed);
        return;
      }
      blocked = draft;
      let merged, error;
      try { merged = applyGraphOps(graphSnapshot(committed), ops); }
      catch (failure) { error = failure.message; }
      review = { draft, saved: committed, merged, tabToken: tab?.token,
        tokens: Object.fromEntries(locks.filter(lock => lock.mine).map(lock => [lock.nodeId, lock.token])) };
      $('reviewLatest').textContent = summary(committed, ops);
      $('reviewLocal').textContent = summary(merged || draft.graph, ops);
      $('reviewError').textContent = error || '';
      $('confirmDraft').disabled = !!error;
      reviewDialog.showModal();
    } catch (error) { showError(error); }
    finally {
      if (current === workspace) {
        busy = false;
        if (alreadySaved && tab?.token) await finishTab();
        else refreshControls();
      }
    }
  }
  function closeReview() {
    review = undefined;
    if (reviewDialog.open) reviewDialog.close();
    refreshControls();
  }
  async function confirmReview() {
    if (!review?.merged || !online || busy) return;
    busy = true;
    checking++;
    const accepted = review, workspace = current;
    let saved = false;
    try {
      const info = await readState(true);
      if (review !== accepted) return;
      const owned = Object.fromEntries(info.locks.filter(lock => lock.mine).map(lock => [lock.nodeId, lock.token]));
      if (info.revision !== accepted.saved.revision || info.editTab?.token !== accepted.tabToken ||
          Object.entries(accepted.tokens).some(([id, token]) => owned[id] !== token)) {
        throw new Error('ฉบับหรือสิทธิ์เปลี่ยนระหว่างตรวจ กรุณาเปิดฉบับร่างอีกครั้ง');
      }
      committed = info.workspace;
      tab = info.editTab;
      locks = info.locks;
      blocked = undefined;
      uploads.clear();
      for (const image of accepted.draft.uploads) uploads.set(image.id, image);
      const meta = new Map([...committed.nodes.flatMap(node => node.images), ...uploads.values()]
        .map(({ id, name }) => [id, { id, name }]));
      const merged = accepted.merged;
      for (const node of merged.nodes) node.images = node.images.map(id => meta.get(id) || { id, name: 'รูปหลักฐาน' });
      Object.assign(current, merged);
      startSaver(committed);
      forceGuard = committed.revision;
      closeReview();
      queue();
      refreshControls(true);
      saved = await saver?.flush();
    } catch (error) {
      closeReview();
      showError(error);
    } finally {
      if (current === workspace) {
        busy = false;
        if (saved && tab?.token) await finishTab();
        else { refreshControls(); poll(); }
      }
    }
  }
  function discardDraft() {
    if (!current || busy) return;
    blocked = undefined;
    clearDraft(current.id);
    closeReview();
    uploads.clear();
    const redraw = replaceGraph(committed);
    startSaver(committed);
    show('saved');
    refreshControls(redraw);
    if (tab?.token) finishTab();
    else poll();
  }

  function onLogin(reason = '') {
    if (!$('app').hidden) $('app').hidden = true;
    $('identityError').textContent = reason;
    $('displayName').value = '';
    if (!identity.open) identity.showModal();
  }
  function onEnter(actor) {
    online = true;
    stopping = false;
    $('editorMenu').open = false;
    $('editorName').textContent = actor.displayName + ' · ' + actor.id.slice(0, 8);
    $('app').hidden = false;
    if (identity.open) identity.close();
    showHome();
  }
  function onExit(reason) {
    checking++;
    searching++;
    cancelEditIntent();
    startingEdit = undefined;
    graphAction = undefined;
    finishing = draining = reconciling = attachmentPending = undefined;
    uncertainNodes.clear();
    saver?.stop();
    current = lastId = committed = saver = baseline = blocked = review = tab = editing = undefined;
    online = false;
    busy = false;
    locks = [];
    drafts.clear();
    uploads.clear();
    for (const objectUrl of imageUrls.values()) URL.revokeObjectURL(objectUrl);
    imageUrls.clear();
    imageLoads.clear();
    $('workspaceCards').replaceChildren();
    $('cards').replaceChildren();
    $('links').replaceChildren();
    $('drawerContent').replaceChildren();
    $('canvasTitle').textContent = '';
    $('footerPdcaName').textContent = '';
    $('footerLeft').textContent = '';
    $('routeStatus').textContent = '';
    $('tooltip').textContent = '';
    $('figureImage').removeAttribute('src');
    for (const id of ['figureCaption', 'reviewLatest', 'reviewLocal', 'edgeFrom', 'edgeTo', 'editorName']) {
      $(id).textContent = '';
    }
    for (const id of ['pdcaName', 'createTitle', 'edgeLabel', 'search']) $(id).value = '';
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    $('navigationError').textContent = '';
    $('editorMenu').open = false;
    $('app').hidden = true;
    onHome();
    if (reason) onLogin(reason);
  }

  function queue(kind) {
    if (!saver) return;
    if (kind === 'layout') layoutGuard = true;
    saver.mark();
    broadcastDraft(makeDraft());
  }
  function mark(kind) {
    if (canEditGraph()) queue(kind);
  }
  function markNode(id) {
    if (canEditNode(id)) queue();
  }
  async function saveImage(node, file) {
    if (!canEditNode(node.id)) return;
    const workspace = current;
    if (file.size > 16 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      throw new Error('รองรับ PNG, JPEG, GIF และ WebP ขนาดไม่เกิน 16 MiB ต่อรูป');
    }
    if (uploads.size && !await saver.flush()) throw new Error('กรุณาบันทึกรูปก่อนหน้าให้สำเร็จก่อน');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    if (workspace !== current || !online || blocked || review || !saver ||
        !tab?.token || !lockFor(node.id)?.mine) throw new Error('สิทธิ์แก้ไขเปลี่ยนไปก่อนเพิ่มรูป');
    const id = crypto.randomUUID();
    uploads.set(id, { id, name: file.name, data });
    current.nodes.find(item => item.id === node.id).images.push({ id, name: file.name });
    queue();
    return saver.flush();
  }
  function fetchImage(id) {
    if (imageUrl(id) || uploads.has(id) || imageLoads.has(id) || !control.active()) return;
    imageLoads.add(id);
    request('/api/images/' + encodeURIComponent(id), 'GET', undefined, { binary: true })
      .then(blob => {
        if (!control.active()) return;
        imageUrls.set(id, URL.createObjectURL(blob));
        onImagesSaved();
      }).catch(() => {}).finally(() => imageLoads.delete(id));
  }

  $('home').addEventListener('click', () => navigate(showHome));
  $('canvasNav').addEventListener('click', () => {
    if (!current && lastId) navigate(async () => open(await request('/api/pdca/' + lastId)));
  });
  $('workspaceCards').addEventListener('click', event => {
    const entry = event.target.closest('[data-pdca]');
    if (entry) navigate(async () => open(await request('/api/pdca/' + entry.dataset.pdca), entry.dataset.node));
  });
  $('search').addEventListener('input', () => {
    $('clearSearch').disabled = !$('search').value;
    ++searching;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshSearch, 150);
  });
  $('clearSearch').addEventListener('click', () => {
    $('search').value = '';
    $('clearSearch').disabled = true;
    clearTimeout(searchTimer);
    refreshSearch();
    $('search').focus();
  });
  $('retrySave').addEventListener('click', inspectDraft);
  $('confirmDraft').addEventListener('click', confirmReview);
  $('cancelDraft').addEventListener('click', closeReview);
  $('discardDraft').addEventListener('click', discardDraft);
  reviewDialog.addEventListener('cancel', event => { event.preventDefault(); closeReview(); });
  $('sessionEnd').addEventListener('click', () => {
    if ((drafts.size || blocked || saver?.dirty() || attachmentPending) &&
        !confirm('มีงานค้าง กดตกลงเพื่อทิ้งฉบับร่างและจบทุกแท็บ หรือกดยกเลิกเพื่อกลับไปตรวจ งานที่ส่งไปแล้วอาจบันทึกสำเร็จ')) return;
    stopping = true;
    control.finish();
  });
  window.addEventListener('offline', () => disconnect(new Error('offline')));
  window.addEventListener('online', poll);
  window.addEventListener('beforeunload', event => {
    if (saver?.dirty() || blocked || attachmentPending) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', () => {
    broadcastDraft(blocked || makeDraft());
    if (current && tab?.token && !blocked && !saver?.dirty() && !attachmentPending) {
      request(url('/tab'), 'DELETE', credentials(), { keepalive: true, timeout: 2000 }).catch(() => {});
    }
    control.hide();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) control.discover(); });
  let ticking = false;
  setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try { await poll(); } finally { ticking = false; }
  }, 900);

  let renameFrom;
  function openNameDialog(rename) {
    if (rename && !canStart()) return;
    renameFrom = rename ? current.title : undefined;
    $('pdcaDialogTitle').textContent = rename ? 'เปลี่ยนชื่อ PDCA' : 'สร้าง PDCA';
    $('pdcaName').value = rename ? current.title : '';
    $('pdcaError').textContent = '';
    nameDialog.showModal();
    $('pdcaName').select();
  }
  $('createPdca').addEventListener('click', () => openNameDialog(false));
  $('renamePdca').addEventListener('click', () => openNameDialog(true));
  $('cancelPdca').addEventListener('click', () => nameDialog.close());
  $('pdcaForm').addEventListener('submit', async event => {
    event.preventDefault();
    const title = $('pdcaName').value.trim();
    if (!title) { $('pdcaError').textContent = 'กรุณากรอกชื่อ PDCA'; $('pdcaName').focus(); return; }
    if (renameFrom !== undefined) {
      const workspace = current, previous = renameFrom;
      if (title === previous) { nameDialog.close(); return; }
      await runGraph(() => {
        if (current.title !== previous) {
          renameFrom = current.title;
          throw new Error('ชื่อ PDCA เปลี่ยนแล้ว กรุณาตรวจชื่อปัจจุบัน');
        }
        current.title = title;
        mark();
        nameDialog.close();
        refreshControls(true);
      }, () => current === workspace && nameDialog.open);
      return;
    }
    const submit = $('confirmPdca');
    if (submit.disabled || !online) return;
    submit.disabled = true;
    $('cancelPdca').disabled = true;
    try {
      const workspace = await request('/api/pdca', 'POST', { title });
      nameDialog.close();
      open(workspace);
      refreshControls();
    } catch (error) { $('pdcaError').textContent = error.message; showError(error); }
    finally { submit.disabled = false; $('cancelPdca').disabled = false; }
  });
  nameDialog.addEventListener('cancel', event => { if ($('confirmPdca').disabled) event.preventDefault(); });
  identity.addEventListener('cancel', event => event.preventDefault());
  $('identityForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = identity.querySelector('button[type=submit]');
    submit.disabled = true;
    try { await control.start($('displayName').value.trim()); }
    catch (error) { $('identityError').textContent = error.message; }
    finally { submit.disabled = false; }
  });

  // Let Canvas finish installing its callbacks before a joined tab renders.
  $('app').hidden = true;
  setTimeout(control.discover, 0);
  return {
    mark, markNode, editNode, leaveInspector, requestingNode, canEditNode, canEditGraph, canStart, lockFor,
    startGraph, runGraph, finishGraph,
    lastWorkspace: () => lastId,
    addImage(node, file) {
      const pending = saveImage(node, file).finally(() => {
        if (attachmentPending === pending) attachmentPending = undefined;
      });
      attachmentPending = pending;
      return pending;
    },
    removeImage(node, id) {
      if (!canEditNode(node.id)) return;
      node.images = node.images.filter(image => image.id !== id);
      uploads.delete(id);
      markNode(node.id);
    },
    imageAvailable(id) { fetchImage(id); return !!imageUrl(id); },
  };
}
