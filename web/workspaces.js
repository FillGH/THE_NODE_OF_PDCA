import { api, autosave } from './autosave.js';
import { categoryNames } from './model.js';

const $ = id => document.getElementById(id);

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export const imageUrl = id => '/api/images/' + encodeURIComponent(id);
export const defaultCamera = () => ({ x: 0, y: 0, zoom: 1 });

export function installWorkspaces({ onOpen, onHome, onImagesSaved }) {
  let current;
  let saver;
  let busy = false;
  let searching = 0;
  let searchTimer;
  let attachmentPending;
  let displayName = sessionStorage.getItem('pdca-display-name') || '';
  const uploads = new Map();

  function show(state, message = '') {
    const status = $('saveStatus');
    status.dataset.state = state;
    status.textContent = {
      saving: 'กำลังบันทึก…',
      saved: 'บันทึกแล้ว',
      error: 'บันทึกไม่สำเร็จ · ' + message,
      idle: '',
    }[state];
    $('retrySave').hidden = state !== 'error';
    if (state === 'saving' || state === 'error') document.querySelector('.topbar').classList.remove('hidden');
  }

  async function refresh() {
    const request = ++searching;
    const results = $('workspaceCards');
    results.textContent = 'กำลังค้นหา…';
    try {
      const query = $('search').value.trim();
      const records = await api('/api/pdca?q=' + encodeURIComponent(query));
      if (request !== searching) return;
      results.innerHTML = records.map(record => `
        <button type="button" class="workspace-card" data-pdca="${record.id}"
          data-node="${record.nodeId || ''}">
          <span class="workspace-type">${record.nodeId ? escapeHTML(categoryNames[record.cat]) + ' · NODE' : 'PDCA'}</span>
          <strong>${escapeHTML(record.nodeId ? record.nodeTitle || 'Node ไม่มีชื่อ' : record.title)}</strong>
          <span class="workspace-count">${record.nodeId
            ? escapeHTML(record.title) + ' · ' + record.nodeId
            : record.nodeCount + ' Nodes · ' + record.edgeCount + ' เส้น'}</span>
          <span class="workspace-id">${record.id}</span>
          <span class="workspace-open">เปิด Canvas ↗</span>
        </button>`).join('');
      if (!records.length) results.textContent = query
        ? 'ไม่พบรายการที่ตรงกับคำค้น'
        : 'ยังไม่มี PDCA · เริ่มต้นด้วยการสร้างผังเปล่า';
    } catch (error) {
      if (request === searching) results.textContent = 'อ่านรายการไม่สำเร็จ · ' + error.message;
    }
  }

  function open(workspace, nodeId) {
    current = { ...workspace, camera: defaultCamera() };
    uploads.clear();
    saver = autosave({
      snapshot: () => {
        const { title, nodes, edges, mode, widths, collapsed, revision } = current;
        const graph = {
          title, mode, widths, collapsed, edges,
          nodes: nodes.map(({ titleMeasure, ...node }) => ({
            ...node, images: node.images.map(image => image.id),
          })),
        };
        const attached = new Set(graph.nodes.flatMap(node => node.images));
        return {
          saveId: crypto.randomUUID(), displayName, revision, graph: structuredClone(graph),
          uploads: [...uploads.values()].filter(image => attached.has(image.id)),
        };
      },
      send: body => api('/api/pdca/' + current.id, 'PUT', body),
      acknowledge(body, result) {
        current.revision = result.revision;
        for (const image of body.uploads) uploads.delete(image.id);
        if (body.uploads.length) requestAnimationFrame(onImagesSaved);
      },
      show,
    });
    show('saved');
    onOpen(current, nodeId);
  }

  async function navigate(action) {
    if (busy) return;
    busy = true;
    $('app').inert = true;
    $('navigationError').textContent = '';
    try {
      // Give an upload already selected on this page a chance to finish before leaving.
      if (attachmentPending) await attachmentPending.catch(() => {});
      if (saver?.dirty() && !await saver.flush()) {
        if (!confirm('บันทึกไม่สำเร็จ ต้องการออกและทิ้งเฉพาะการแก้ไขที่ยังไม่บันทึกหรือไม่?')) return;
        saver = null;
        show('idle');
      }
      await action();
    } catch (error) {
      $('navigationError').textContent = 'เปิดรายการไม่สำเร็จ · ' + error.message;
    } finally {
      $('app').inert = false;
      busy = false;
    }
  }

  function showHome() {
    saver = null;
    uploads.clear();
    show('idle');
    onHome();
    refresh();
  }

  $('home').addEventListener('click', () => navigate(showHome));
  $('canvasNav').addEventListener('click', () => navigate(async () => {
    if (current) open(await api('/api/pdca/' + current.id));
  }));
  $('workspaceCards').addEventListener('click', event => {
    const entry = event.target.closest('[data-pdca]');
    if (entry) navigate(async () => open(await api('/api/pdca/' + entry.dataset.pdca), entry.dataset.node));
  });
  $('search').addEventListener('input', () => {
    $('clearSearch').disabled = !$('search').value;
    ++searching;
    clearTimeout(searchTimer);
    $('workspaceCards').textContent = 'กำลังค้นหา…';
    searchTimer = setTimeout(refresh, 150);
  });
  $('clearSearch').addEventListener('click', () => {
    $('search').value = '';
    $('clearSearch').disabled = true;
    clearTimeout(searchTimer);
    refresh();
    $('search').focus();
  });
  $('retrySave').addEventListener('click', () => saver?.flush());

  const nameDialog = $('pdcaDialog');
  let renaming = false;
  function openNameDialog(rename) {
    renaming = rename;
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
    const error = $('pdcaError');
    if (!title) {
      error.textContent = 'กรุณากรอกชื่อ PDCA';
      $('pdcaName').focus();
      return;
    }
    if (renaming) {
      if (title !== current.title) {
        current.title = title;
        $('canvasTitle').textContent = title;
        $('footerPdcaName').textContent = title;
        saver.mark();
      }
      nameDialog.close();
      return;
    }
    const submit = $('confirmPdca');
    if (submit.disabled) return;
    submit.disabled = true;
    $('cancelPdca').disabled = true;
    try {
      const workspace = await api('/api/pdca', 'POST', { title });
      nameDialog.close();
      open(workspace);
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      submit.disabled = false;
      $('cancelPdca').disabled = false;
    }
  });
  nameDialog.addEventListener('cancel', event => {
    if ($('confirmPdca').disabled) event.preventDefault();
  });

  // Keep drafts only in page memory. Only the editor label survives a reload.
  const beforeUnload = event => {
    if (saver?.dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnload);

  const identity = $('identityDialog');
  identity.addEventListener('cancel', event => event.preventDefault());
  $('identityForm').addEventListener('submit', event => {
    event.preventDefault();
    displayName = $('displayName').value.trim();
    if (!displayName) {
      $('identityError').textContent = 'กรุณากรอก Display Name';
      return;
    }
    sessionStorage.setItem('pdca-display-name', displayName);
    $('editorName').textContent = displayName;
    identity.close();
    showHome();
  });
  if (displayName) {
    $('editorName').textContent = displayName;
    showHome();
  } else {
    identity.showModal();
  }

  async function saveImage(node, file) {
    if (file.size > 16 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      throw new Error('รองรับ PNG, JPEG, GIF และ WebP ขนาดไม่เกิน 16 MiB ต่อรูป');
    }
    // Limit each save to one new image. A failed upload remains in the draft.
    if (uploads.size && !await saver.flush()) throw new Error('กรุณาบันทึกรูปก่อนหน้าให้สำเร็จก่อน');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const id = crypto.randomUUID();
    uploads.set(id, { id, name: file.name, data });
    node.images.push({ id, name: file.name });
    saver.mark();
    return saver.flush();
  }

  return {
    mark: () => saver.mark(),
    addImage(node, file) {
      attachmentPending = saveImage(node, file).finally(() => { attachmentPending = null; });
      return attachmentPending;
    },
    removeImage(node, id) {
      node.images = node.images.filter(image => image.id !== id);
      uploads.delete(id);
      saver.mark();
    },
    imageAvailable: id => !uploads.has(id),
  };
}
