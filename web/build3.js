import { categoryNames, statuses } from './model.js';
import { escapeHTML as html } from './workspaces.js';

const $ = id => document.getElementById(id);
const factoryDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok',
  year: 'numeric', month: '2-digit', day: '2-digit' });

export function actionOverview(workspace, time = Date.now()) {
  const today = factoryDate.format(time);
  return workspace.nodes.filter(node => node.cat === 3).map(node => ({
    ...node, overdue: !!node.due && node.due < today && !['Completed', 'Canceled'].includes(node.status),
  }));
}

const names = {
  'node-text': 'ข้อความ Node', 'node-category': 'ประเภท Node', 'action-status': 'Action Status',
  'action-due-date': 'Due Date', 'edge-created': 'สร้างเส้น', 'edge-deleted': 'ลบเส้น', 'edge-restored': 'กู้เส้น',
};
const describe = value => value == null || value === '' ? '—' :
  typeof value === 'object' ? Object.values(value).join(' · ') : String(value);
const displayTime = time => new Date(time).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

export function installRecords(session, workspace, openNode) {
  const dialog = $('recordDialog');
  const filters = $('recordFilters'), list = $('recordList'), error = $('recordError');
  let view;
  let overviewKey;
  const path = ws => '/api/pdca/' + ws.id;

  function show(title, kind) {
    view = { kind, workspace: workspace() };
    dialog.dataset.view = kind;
    $('recordTitle').textContent = title;
    filters.replaceChildren();
    list.replaceChildren();
    error.textContent = '';
    if (!dialog.open) dialog.showModal();
    return view;
  }
  function fail(errorValue) { error.textContent = errorValue.message; }
  $('closeRecords').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!dialog.open) view = undefined; });

  function renderOverview() {
    if (!dialog.open || view?.kind !== 'overview') return;
    if (view.workspace !== workspace()) { dialog.close(); return; }
    const rows = actionOverview(session.savedWorkspace() ?? view.workspace);
    const selected = [...$('actionFilter').querySelectorAll('[data-status]:checked')].map(box => box.value);
    const key = JSON.stringify([rows, selected]);
    if (key === overviewKey) return;
    overviewKey = key;
    const summaries = statuses.map((status, index) => {
      const count = rows.filter(row => row.status === status).length;
      const percent = rows.length ? Math.round(count * 1000 / rows.length) / 10 : 0;
      return '<div class="action-summary action-tone-' + index + '"><span>' + html(status) + '</span><strong>' +
        count + '</strong><span>' + percent + '%</span></div>';
    });
    const visible = rows.filter(row => selected.includes(row.status));
    list.innerHTML = '<div class="action-summaries">' + summaries.join('') + '</div><p class="overview-totals">Action ทั้งหมด ' + rows.length +
      ' · <span class="overdue">เกินกำหนด ' + rows.filter(row => row.overdue).length + '</span></p>' +
      (visible.length ? '<div class="action-table"><table><thead><tr>' +
      '<th scope="col">Title</th><th scope="col">PIC</th><th scope="col">Due Date</th><th scope="col">Status</th></tr></thead><tbody>' +
      visible.map(row =>
        '<tr><td><button class="btn" data-open-action="' + row.id + '">' + html(row.title || 'Node ไม่มีชื่อ') +
        '</button></td><td>' + html(row.pic || '—') + '</td><td class="action-due">' +
        (row.due ? '<time datetime="' + html(row.due) + '">' + html(row.due) + '</time>' : '—') +
        (row.overdue ? ' <span class="overdue">Overdue</span>' : '') + '</td><td><span class="action-status-pill action-tone-' +
        statuses.indexOf(row.status) + '">' + html(row.status) + '</span></td></tr>').join('') +
      '</tbody></table></div>' : '<p class="fieldhelp">' + (rows.length ? 'ไม่มี Action ในสถานะที่เลือก' : 'ผังนี้ยังไม่มี Action') + '</p>');
  }

  $('showOverview').addEventListener('click', () => {
    show('Action Overview · ' + workspace().title, 'overview');
    overviewKey = undefined;
    filters.innerHTML = '<fieldset id="actionFilter"><legend>Status</legend>' +
      '<label><input type="checkbox" data-all-statuses checked> ทั้งหมด</label>' + statuses.map(status =>
        '<label><input type="checkbox" data-status value="' + html(status) + '" checked> ' + html(status) + '</label>').join('') + '</fieldset>';
    const filter = $('actionFilter');
    const all = filter.querySelector('[data-all-statuses]');
    const choices = [...filter.querySelectorAll('[data-status]')];
    filter.addEventListener('change', event => {
      if (event.target === all) for (const box of choices) box.checked = all.checked;
      const count = choices.filter(box => box.checked).length;
      all.checked = count === choices.length;
      all.indeterminate = count > 0 && count < choices.length;
      renderOverview();
    });
    renderOverview();
  });
  list.addEventListener('click', event => {
    const id = event.target.closest('[data-open-action]')?.dataset.openAction;
    if (id) { dialog.close(); openNode(id); }
  });

  async function showHistory(nodeId) {
    const ws = workspace(), panel = show('History · ' + ws.title, 'history');
    panel.nodeId = nodeId;
    try {
      const result = await session.request(path(ws) + '/history');
      if (view !== panel || !dialog.open || workspace() !== ws) return;
      panel.revision = result.revision;
      const entries = result.entries.filter(entry => !nodeId || entry.subject === nodeId ||
        [entry.before?.from, entry.before?.to, entry.after?.from, entry.after?.to].includes(nodeId));
      list.textContent = entries.length ? '' : 'ยังไม่มีประวัติ';
      for (const entry of entries) {
        const row = document.createElement('article');
        row.innerHTML = '<h3>' + html(names[entry.kind]) + ' · ' + html(entry.subject) + '</h3><p>' +
          html(displayTime(entry.at) + ' · ' + entry.displayName + ' · r' + entry.revision) + '</p><p>' +
          html(describe(entry.before)) + ' → ' + html(describe(entry.after)) + '</p>';
        if (['node-text', 'node-category', 'edge-deleted'].includes(entry.kind)) {
          const restore = document.createElement('button');
          restore.className = 'btn';
          restore.textContent = 'กู้รายการนี้';
          restore.onclick = async () => {
            restore.disabled = true;
            if (await session.restoreHistory(entry, result.revision, () => view === panel && dialog.open)) {
              if (view === panel && dialog.open) showHistory(nodeId);
            } else if (view === panel) {
              fail(new Error($('navigationError').textContent || 'ยังไม่สามารถกู้รายการได้'));
              restore.disabled = false;
            }
          };
          row.append(restore);
        }
        list.append(row);
      }
    } catch (failure) { if (view === panel) fail(failure); }
  }

  async function showTrash() {
    const panel = show('Trash · กู้คืนภายใน 7 วัน', 'trash');
    try {
      const records = await session.request('/api/trash');
      if (view !== panel || !dialog.open) return;
      list.textContent = records.length ? '' : 'Trash ว่าง';
      for (const item of records) {
        const row = document.createElement('article');
        row.innerHTML = '<h3>' + html(item.title || 'Node ไม่มีชื่อ') + '</h3><p>' +
          html((item.id === item.subject ? 'PDCA' : 'Node · ' + item.pdcaTitle) + ' · ' + item.subject) +
          '</p><p>หมดอายุ ' + html(displayTime(item.expires)) + '</p>';
        const restore = document.createElement('button');
        restore.className = 'btn';
        restore.textContent = 'กู้คืน';
        restore.onclick = async () => {
          restore.disabled = true;
          try {
            await session.request('/api/pdca/' + item.id + '/trash' +
              (item.id === item.subject ? '' : '/' + item.subject), 'DELETE', { revision: item.revision });
            session.refreshSearch();
            if (view === panel) showTrash();
          } catch (failure) { if (view === panel) { fail(failure); restore.disabled = false; } }
        };
        row.append(restore);
        list.append(row);
      }
    } catch (failure) { if (view === panel) fail(failure); }
  }

  $('showHistory').addEventListener('click', () => showHistory());
  $('showTrash').addEventListener('click', showTrash);
  $('showAudit').addEventListener('click', async () => {
    const panel = show('Deletion Audit · IT', 'audit');
    try {
      const events = await session.request('/api/deletion-audit');
      if (view !== panel || !dialog.open) return;
      list.textContent = events.length ? '' : 'ยังไม่มีเหตุการณ์';
      for (const event of events) {
        const row = document.createElement('article');
        row.textContent = [displayTime(event.at), event.kind, event.event, event.pdca_id, event.subject_id,
          event.operation_id, event.display_name, event.session_id,
          event.expires && displayTime(event.expires)].filter(Boolean).join(' · ');
        list.append(row);
      }
    } catch (failure) { if (view === panel) fail(failure); }
  });
  $('trashPdca').addEventListener('click', () => {
    const ws = workspace();
    $('pdcaMore').open = false;
    if (confirm('ย้าย PDCA “' + ws.title + '” เข้า Trash? กู้คืนได้ภายใน 7 วัน')) session.moveToTrash();
  });
  $('drawerContent').addEventListener('click', event => {
    const button = event.target.closest('[data-record-action]');
    if (!button) return;
    const ws = workspace();
    const node = ws?.nodes.find(node => node.id === button.dataset.node);
    if (!node) return;
    if (button.dataset.recordAction === 'history') showHistory(node.id);
    else {
      const count = ws.edges.filter(edge => edge.from === node.id || edge.to === node.id).length;
      if (confirm('ย้าย Node “' + node.title + '” และซ่อนเส้น ' + count + ' เส้น? กู้คืนได้ภายใน 7 วัน')) {
        session.moveToTrash(node.id);
      }
    }
  });

  $('showExport').addEventListener('click', () => {
    const ws = workspace(), panel = show('Export · ' + ws.title, 'export');
    filters.textContent = ws.id;
    for (const [format, label] of [['pdf', 'PDF'], ['xlsx', 'Excel'], ['json', 'JSON']]) {
      const button = document.createElement('button');
      button.className = 'btn';
      button.textContent = label;
      button.onclick = async () => {
        button.disabled = true;
        try {
          const blob = await session.request(path(ws) + '/export/' + format, 'GET', undefined,
            { binary: true, timeout: 60000 });
          if (view !== panel || !dialog.open) return;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'PDCA-' + ws.id + '.' + format;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 30000);
        } catch (failure) { if (view === panel) fail(failure); }
        finally { button.disabled = false; }
      };
      list.append(button);
    }
  });

  return { refresh() {
    if (dialog.open && view?.workspace !== workspace() && view?.kind !== 'trash') dialog.close();
    if (dialog.open && view?.kind === 'history' && view.revision != null &&
        view.workspace.revision > view.revision) showHistory(view.nodeId);
    renderOverview();
  } };
}
