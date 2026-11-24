import { documentLink, statuses } from './model.js';
import { escapeHTML as html, imageUrl } from './workspaces.js';

export function inspectorFields(node, cats, imageAvailable, overdue) {
  return `
    <span class="drawer-kind" style="--c:${cats[node.cat].c}"><i></i>${html(cats[node.cat].kind)}</span>
    <div class="card-size-control">
      <button id="toggleCardSize" class="btn" type="button" aria-pressed="${!!node.sizeLocked}">
        <span aria-hidden="true">${node.sizeLocked ? '🔒' : '🔓'}</span> ล็อกขนาด Card
      </button>
      <span class="fieldhelp">ล็อกเฉพาะขนาด · ยังลากย้ายได้</span>
    </div>
    <div class="field"><label for="nodeCategory">ประเภท Node</label>
      <select id="nodeCategory" data-edit="cat">${cats.map((cat, index) =>
        `<option value="${index}" ${node.cat === index ? 'selected' : ''}>${html(cat.kind)}</option>`).join('')}</select></div>
    <div class="field"><label for="nodeTitle">Title</label>
      <input id="nodeTitle" data-edit="title" value="${html(node.title)}"></div>
    <div class="field"><label for="sideNote">Content · Side note</label>
      <textarea id="sideNote" data-edit="sideNote">${html(node.sideNote)}</textarea>
      <div class="fieldhelp">แสดงใน Inspector และเมื่อวางเมาส์บนการ์ด ค้นได้จากหน้า Workspaces</div></div>
    ${node.cat === 3 ? `<hr class="drawer-sep">
      <div class="field"><label for="pic">Primary PIC (optional)</label>
        <input id="pic" data-edit="pic" value="${html(node.pic)}"></div>
      <div class="field"><label for="actionStatus">Action Status</label>
        <select id="actionStatus" data-edit="status">${statuses.map(status =>
          `<option ${status === node.status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
      <div class="field"><label for="due">Due Date (optional)</label>
        <input id="due" type="date" data-edit="due" value="${html(node.due)}">
        <span class="overdue" id="inspectorOverdue" ${overdue ? '' : 'hidden'}>Overdue</span></div>` : ''}
    <hr class="drawer-sep">
    <div class="field"><label for="nodeImage">รูปหลักฐาน</label>
      <input type="file" id="nodeImage" accept="image/png,image/jpeg,image/gif,image/webp">
      <div class="attachment-list">${node.images.map(image => `<div class="attachment-row">
        <button type="button" class="btn attachment-name" data-preview-image="${image.id}" ${imageAvailable(image.id) ? '' : 'disabled'}>
          ${html(image.name)}</button>
        <button type="button" class="btn" data-remove-image="${image.id}" aria-label="เอารูป ${html(image.name)} ออก">×</button>
      </div>`).join('')}</div></div>
    <div class="field"><label for="documentUrl">ลิงก์เอกสาร</label>
      <div class="attachment-row"><input id="documentUrl" placeholder="https://… หรือพาธ LAN">
        <button type="button" class="btn" data-add-document>เพิ่ม</button></div>
      <div class="attachment-list">${node.documents.map((value, index) => {
        const { text, href } = documentLink(value);
        return `<div class="attachment-row">${href
          ? `<a class="attachment-name" href="${html(href)}" target="_blank" rel="noopener noreferrer">${html(text)}</a>`
          : `<span class="attachment-name" title="คัดลอกไปเปิดใน File Explorer">${html(text)}</span>`}
          <button type="button" class="btn" data-remove-document="${index}" aria-label="เอาลิงก์เอกสารออก">×</button></div>`;
      }).join('')}</div></div>
    <p class="field-error" id="attachmentError" role="status"></p>
    <hr class="drawer-sep">
    <div class="inline-kv"><label>Record ID</label><span class="record-id">${node.id}</span></div>`;
}

// The viewer is display-only: no workspace, camera, edit lease or storage mutations.
const figureModes = ['normal', 'fit', 'zoom'];
const figureHints = {
  normal: ['Preview · คลิกภาพเพื่อขยายเต็มหน้าจอ', 'ขยายเต็มหน้าจอ'],
  fit: ['Fit to screen · คลิกภาพเพื่อซูม 2×', 'ซูม 2 เท่าจากขนาดเต็มหน้าจอ'],
  zoom: ['Zoom 2× · เลื่อนดูภาพ · คลิกภาพเพื่อกลับขนาดเดิม', 'กลับขนาด Preview เดิม'],
};

function sizeFigure(dialog, resetScroll = false) {
  const view = dialog.querySelector('#figureViewport');
  const button = dialog.querySelector('#figureZoom');
  const image = dialog.querySelector('#figureImage');
  const mode = dialog.dataset.zoom;
  button.style.removeProperty('width');
  button.style.removeProperty('height');
  if (mode !== 'normal' && image.naturalWidth && image.naturalHeight) {
    // Use the same full viewport box for Fit and 2x, excluding only the scrollbar
    // from the visible area, not from the Fit reference size.
    const scale = Math.min(view.offsetWidth / image.naturalWidth, view.offsetHeight / image.naturalHeight);
    const factor = mode === 'zoom' ? 2 : 1;
    button.style.width = Math.max(1, Math.floor(image.naturalWidth * scale * factor)) + 'px';
    button.style.height = Math.max(1, Math.floor(image.naturalHeight * scale * factor)) + 'px';
  }
  if (resetScroll) {
    view.scrollLeft = mode === 'zoom' ? (view.scrollWidth - view.clientWidth) / 2 : 0;
    view.scrollTop = mode === 'zoom' ? (view.scrollHeight - view.clientHeight) / 2 : 0;
  }
}

function setFigureMode(dialog, mode) {
  dialog.dataset.zoom = mode;
  const [hint, action] = figureHints[mode];
  dialog.querySelector('#figureHint').textContent = hint;
  dialog.querySelector('#figureZoom').setAttribute('aria-label', action);
  sizeFigure(dialog, true);
}

export function installFigureViewer(dialog) {
  const image = dialog.querySelector('#figureImage');
  const button = dialog.querySelector('#figureZoom');
  button.addEventListener('click', () => {
    if (!dialog.open || dialog.dataset.closing || !image.naturalWidth) return;
    setFigureMode(dialog, figureModes[(figureModes.indexOf(dialog.dataset.zoom) + 1) % figureModes.length]);
  });
  image.addEventListener('load', () => {
    if (!dialog.open) return;
    button.disabled = false;
    setFigureMode(dialog, dialog.dataset.zoom);
  });
  image.addEventListener('error', () => {
    if (!dialog.open) return;
    button.disabled = true;
    dialog.querySelector('#figureHint').textContent = 'ไม่สามารถแสดงภาพได้ · ปิดภาพแล้วลองเปิดใหม่';
  });
  window.addEventListener('resize', () => {
    if (dialog.open && dialog.dataset.zoom !== 'normal') sizeFigure(dialog);
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    setFigureMode(dialog, 'normal');
    button.disabled = true;
    image.removeAttribute('src');
    image.alt = '';
  });
}

export function previewFigure(image, dialog) {
  if (dialog.open) return;
  const element = dialog.querySelector('#figureImage');
  const button = dialog.querySelector('#figureZoom');
  dialog.querySelector('#figureCaption').textContent = image.name;
  element.alt = image.name;
  button.disabled = true;
  setFigureMode(dialog, 'normal');
  dialog.showModal();
  element.src = imageUrl(image.id);
  if (element.complete && element.naturalWidth) button.disabled = false;
}
