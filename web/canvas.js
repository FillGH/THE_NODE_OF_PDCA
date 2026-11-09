// Canvas interactions adapted from the accepted DESIGN v0.10 (684bc50).
import { edgeColors, documentLink, widthsDefault } from './model.js';
import { installWorkspaces, defaultCamera, escapeHTML, imageUrl } from './workspaces.js';
import { inspectorFields, previewFigure } from './inspector.js';

const $=id=>document.getElementById(id);
const cats=[
{kind:'Problem',label:'Problem',c:'#dd3351',light:'#faedf1',dark:'#402535'},
{kind:'Fact',label:'Fact',c:'#237fcb',light:'#eaf2ff',dark:'#1f344e'},
{kind:'Assumption / Hypothesis',label:'Hypothesis',c:'#9344c9',light:'#f4edfe',dark:'#352543'},
{kind:'Action',label:'Action',c:'#de960e',light:'#fff5e8',dark:'#493624'},
{kind:'Status & Result',label:'Status & Result',c:'#1da268',light:'#eaf9f1',dark:'#1c3e34'},
{kind:'Measures to be implemented',label:'Measures',c:'#149aa8',light:'#e8f8fb',dark:'#1e424a'},
{kind:'Link to document',label:'Document',c:'#7e91aa',light:'#eef3fb',dark:'#28364b'}];
const statusStyles={
'Not Started':{color:'#547399',bg:'#edf4fc',dark:'#27405c',title:'Not Started'},
'In Progress':{color:'#bd811b',bg:'#fff1d4',dark:'#573e20',title:'In Progress'},
'Completed':{color:'#23925b',bg:'#e4f7ec',dark:'#214a37',title:'Completed'},
'Blocked':{color:'#707988',bg:'#eef1f4',dark:'#343f4f',title:'Blocked'},
'Canceled':{color:'#c43e53',bg:'#fff0f0',dark:'#522932',title:'Canceled'}};
const gap = 18, collapsedWidth = 40;
let current = null, selected = null, drawerOpen = false;
let font = 1, drag = null, edgeDrag = null, tooltipTimer = 0;
let page = 'workspace', toastTimer, resizeLane = null, layoutUndo = null, uploading = false;
const cur = () => current;
let viewRevealCat = null;
const isCollapsed = cat => cur().collapsed[cat] && cat !== viewRevealCat;
const find = id => current?.nodes.find(node => node.id === id);
const isDark = () => document.documentElement.dataset.theme === 'dark';
const factoryCalendar = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'});
let lastFactoryDay = factoryDay();

function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800)}
function fillMenus() {
  $('createCategory').innerHTML = cats.map((category, index) =>
    `<option value="${index}">${escapeHTML(category.kind)}</option>`).join('');
}
function metrics(){let x=14;let arr=cur().widths.map((w,k)=>{let ww=cur().mode==='snap'&&isCollapsed(k)?collapsedWidth:w;let out={x,w:ww};x+=ww+gap;return out});return {lanes:arr,width:x+14};}
const titleMeasure = document.createElement('div');
titleMeasure.setAttribute('aria-hidden', 'true');
document.body.append(titleMeasure);


function snapHeight(node, width) {
  const isAction = node.cat === 3;
  const hasImage = node.images.some(image => session.imageAvailable(image.id));
  const key = JSON.stringify([node.title, width, font, node.cat, hasImage]);
  if (node.titleMeasure?.key === key) return node.titleMeasure.height;
  titleMeasure.className = 'title-measure' + (isAction ? ' action' : '');
  titleMeasure.style.width = (width - (isAction ? 20 : 24)) + 'px';
  titleMeasure.textContent = node.title;
  const text = Math.ceil(Math.max(12.8 * 1.33 * font, titleMeasure.getBoundingClientRect().height));
  const height = (isAction ? 18 + Math.ceil(Math.max(text + 19, (text + 3) / .8))
    : 20 + text) + (hasImage ? 62 : 0);
  node.titleMeasure = {key, height};
  return height;
}

function preferredWidth(node, limit) {
  titleMeasure.className = 'title-measure' + (node.cat === 3 ? ' action' : '');
  titleMeasure.style.width = 'max-content';
  titleMeasure.textContent = node.title;
  const natural = Math.ceil(titleMeasure.getBoundingClientRect().width) + 25;
  return Math.min(limit, Math.max(node.cat === 3 || node.images.length ? 160 : 110, natural));
}
function position(node) {
  const lane = metrics().lanes[node.cat];
  const layout = drag?.id === node.id && drag.permit ? drag.layout : node;
  if (cur().mode === 'snap') {
    const width = Math.max(119, lane.w - 26);
    return {x: lane.x + (lane.w - width) / 2, y: layout.snapY, w: width, h: snapHeight(node, width)};
  }
  return {x: layout.freeX ?? lane.x + 13, y: layout.freeY ?? layout.snapY, w: layout.freeW, h: layout.freeH};
}
function boxDim(){let m=metrics(),maxX=m.width+5,maxY=790;for(const n of cur().nodes){if(cur().mode==='snap'&&isCollapsed(n.cat))continue;let p=position(n);maxY=Math.max(maxY,p.y+p.h+85);maxX=Math.max(maxX,p.x+p.w+26)}return {width:Math.max(maxX,970),height:Math.max(790,maxY)};}
const clearance = 7;
const svgNS = 'http://www.w3.org/2000/svg';
let edgeBeingEdited = null;

function visibleBoxes() {
  return new Map(cur().nodes
    .filter(node => cur().mode === 'free' || !isCollapsed(node.cat))
    .map(node => [node.id, position(node)]));
}

function paddedBox(box, padding) {
  return {left: box.x - padding, top: box.y - padding,
    right: box.x + box.w + padding, bottom: box.y + box.h + padding};
}

function segmentClear(a, b, obstacles) {
  if (a.x === b.x) {
    const [top, bottom] = a.y <= b.y ? [a.y, b.y] : [b.y, a.y];
    return !obstacles.some(r => a.x > r.left && a.x < r.right && top < r.bottom && bottom > r.top);
  }
  const [left, right] = a.x <= b.x ? [a.x, b.x] : [b.x, a.x];
  return !obstacles.some(r => a.y > r.top && a.y < r.bottom && left < r.right && right > r.left);
}

function findRoute(start, end, obstacles) {
  const axis = values => [...new Set(values)].sort((a, b) => a - b);
  const xs = axis([start.x, end.x, ...obstacles.flatMap(r => [r.left, r.right])]);
  const ys = axis([start.y, end.y, ...obstacles.flatMap(r => [r.top, r.bottom])]);
  const sx = xs.indexOf(start.x), sy = ys.indexOf(start.y);
  const tx = xs.indexOf(end.x), ty = ys.indexOf(end.y);
  const key = (x, y, direction) => 2 * (y * xs.length + x) + direction;
  const first = {x: sx, y: sy, direction: 0, cost: 0, score: 0, prev: null};
  const best = new Map([[key(sx, sy, 0), 0]]);
  const queue = [first];
  while (queue.length) {
    let next = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].score < queue[next].score) next = i;
    const step = queue.splice(next, 1)[0];
    if (step.cost !== best.get(key(step.x, step.y, step.direction))) continue;
    if (step.x === tx && step.y === ty) {
      const result = [];
      for (let at = step; at; at = at.prev) result.push({x: xs[at.x], y: ys[at.y]});
      return result.reverse();
    }
    // A short leftward detour is available when a manually moved card blocks the forward corridor.
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
      const x = step.x + dx, y = step.y + dy, direction = dx ? 0 : 1;
      if (x < 0 || x >= xs.length || y < 0 || y >= ys.length) continue;
      const a = {x: xs[step.x], y: ys[step.y]}, b = {x: xs[x], y: ys[y]};
      if (!segmentClear(a, b, obstacles)) continue;
      const cost = step.cost + Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
        + (direction === step.direction ? 0 : 18) + (dx < 0 ? 30 : 0);
      const id = key(x, y, direction);
      if (cost >= (best.get(id) ?? Infinity)) continue;
      best.set(id, cost);
      queue.push({x, y, direction, cost, score: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y), prev: step});
    }
  }
  return null;
}

function edgePorts(edges, boxes) {
  const ports = new Map(edges.map(edge => [edge, {}]));
  for (const [id, box] of boxes) {
    for (const [own, peer] of [['from', 'to'], ['to', 'from']]) {
      const peers = edges.filter(edge => edge[own] === id);
      peers.sort((a, b) => {
        const p = boxes.get(a[peer]), q = boxes.get(b[peer]);
        return p.y + p.h / 2 - q.y - q.h / 2 || p.x - q.x;
      });
      const step = Math.min(9, (box.h - 20) / Math.max(1, peers.length - 1));
      peers.forEach((edge, i) => {
        ports.get(edge)[own] = box.y + box.h / 2 + (i - (peers.length - 1) / 2) * step;
      });
    }
  }
  return ports;
}

function segment(a, b) {
  const horizontal = a.y === b.y;
  const first = horizontal ? a.x : a.y, last = horizontal ? b.x : b.y;
  return {horizontal, track: horizontal ? a.y : a.x, min: Math.min(first, last), max: Math.max(first, last)};
}

function pathSegments(points) {
  return points.slice(1).map((point, i) => segment(points[i], point));
}

function laneCost(points, occupied) {
  let cost = 0;
  for (const current of pathSegments(points)) {
    for (const prior of occupied) {
      if (current.horizontal === prior.horizontal) {
        const separation = Math.abs(current.track - prior.track);
        const shared = Math.min(current.max, prior.max) - Math.max(current.min, prior.min);
        if (separation < 8 && shared > 0) cost += shared * (8 - separation) / 8;
      } else if (current.min < prior.track && prior.track < current.max &&
                 prior.min < current.track && current.track < prior.max) {
        cost += 18;
      }
    }
  }
  return cost;
}

function routeLink(edge, boxes, ports, occupied = []) {
  const a = boxes.get(edge.from), b = boxes.get(edge.to);
  const from = {x: a.x + a.w, y: ports?.from ?? a.y + a.h / 2};
  const to = {x: b.x, y: ports?.to ?? b.y + b.h / 2};
  const start = {x: from.x + clearance, y: from.y};
  const end = {x: to.x - clearance, y: to.y};
  const otherCards = [...boxes].filter(([id]) => id !== edge.from && id !== edge.to)
    .map(([, box]) => paddedBox(box, clearance));
  if (!segmentClear(from, start, otherCards) || !segmentClear(end, to, otherCards)) return null;
  const obstacles = [...otherCards, paddedBox(a, clearance), paddedBox(b, clearance)];
  const room = end.x - start.x;
  const fractions = room > 0 ? [.5, .25, .75, .1, .9, .375, .625, 0, 1] : [];
  let route = null, best = Infinity;
  for (const fraction of fractions) {
    const x = start.x + room * fraction;
    const path = [start, {x, y: start.y}, {x, y: end.y}, end];
    if (!path.slice(1).every((point, i) => segmentClear(path[i], point, obstacles))) continue;
    const cost = laneCost(path, occupied) + Math.abs(fraction - .5) * 4;
    if (cost >= best) continue;
    best = cost;
    route = path;
    if (cost === 0) break;
  }
  route ??= findRoute(start, end, obstacles);
  if (!route) return null;
  const points = [];
  for (const point of [from, ...route, to]) {
    const last = points.at(-1), previous = points.at(-2);
    if (last && last.x === point.x && last.y === point.y) continue;
    if (previous && ((previous.x === last.x && last.x === point.x)
      || (previous.y === last.y && last.y === point.y))) points.pop();
    points.push(point);
  }
  return points;
}

let routeCache = {key: null, routes: []};
function planRoutes(boxes) {
  const edges = cur().edges.filter(edge => boxes.has(edge.from) && boxes.has(edge.to));
  const key = JSON.stringify([cur()?.id, [...boxes], edges.map(edge => [edge.from, edge.to])]);
  if (key === routeCache.key && edges.every((edge, i) => edge === routeCache.routes[i].edge)) {
    return routeCache.routes;
  }
  const ports = edgePorts(edges, boxes), occupied = [];
  const routes = edges.map(edge => {
    const points = routeLink(edge, boxes, ports.get(edge), occupied);
    const segments = points ? pathSegments(points) : [];
    occupied.push(...segments);
    return {edge, points, segments};
  });
  const horizontal = routes.flatMap(route => route.segments.filter(s => s.horizontal));
  for (const route of routes) {
    route.gaps = route.segments.map(s => s.horizontal ? [] : horizontal
      .filter(h => s.min + 12 < h.track && h.track < s.max - 12 && h.min + 12 < s.track && s.track < h.max - 12)
      .map(h => h.track).sort((a, b) => a - b));
  }
  routeCache = {key, routes};
  return routes;
}

function svgElement(tag, attributes) {
  const node = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function roundedRoute(points, gaps = []) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const direction = Math.sign(b.y - a.y);
    const ordered = direction < 0 ? [...(gaps[i - 1] || [])].reverse() : (gaps[i - 1] || []);
    let previousGap = null;
    for (const y of ordered) {
      if (previousGap !== null && Math.abs(y - previousGap) < 11) continue;
      d += ` L${b.x} ${y - direction * 4.5} M${b.x} ${y + direction * 4.5}`;
      previousGap = y;
    }
    if (!c) { d += ` L${b.x} ${b.y}`; continue; }
    const radius = Math.min(5, Math.hypot(b.x - a.x, b.y - a.y) / 2,
      Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const before = [b.x - Math.sign(b.x - a.x) * radius, b.y - direction * radius];
    const after = [b.x + Math.sign(c.x - b.x) * radius, b.y + Math.sign(c.y - b.y) * radius];
    d += ` L${before.join(' ')} Q${b.x} ${b.y} ${after.join(' ')}`;
  }
  return d;
}

function drawLinks() {
  const svg = $('links'), dim = boxDim(), boxes = visibleBoxes();
  svg.style.width = dim.width + 'px';
  svg.style.height = dim.height + 'px';
  svg.setAttribute('viewBox', `0 0 ${dim.width} ${dim.height}`);
  svg.classList.remove('edge-moving');
  svg.replaceChildren();
  const markers = svgElement('defs', {});
  for (const [color] of edgeColors) {
    const marker = svgElement('marker', {id: 'arrow-' + color, viewBox: '0 0 10 10',
      refX: 10, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto'});
    marker.append(svgElement('polygon', {points: '0,0 10,5 0,10', fill: getEdgeColor(color)}));
    markers.append(marker);
  }
  svg.append(markers);
  let blocked = 0;
  const selectedId = selected;
  const trace = traceSelection();
  const related = edge => trace.edges.has(edge);
  const ordered = planRoutes(boxes).map(route => ({...route, index: cur().edges.indexOf(route.edge)}))
    .sort((a, b) => Number(related(a.edge)) - Number(related(b.edge)));
  ordered.forEach(({edge, points, gaps, index}) => {
    if (!points) { blocked++; return; }
    const d = roundedRoute(points, gaps);
    const connected = related(edge);
    const color = getEdgeColor(edge.color);
    const ink = svgElement('path', {class: 'edge-ink', d, 'vector-effect': 'non-scaling-stroke',
      'marker-end': 'url(#arrow-' + edge.color + ')'});
    const group = svgElement('g', {
      class: 'edge-control' + (selectedId && !connected ? ' edge-muted' : ''),
      style: '--route-color:' + color, 'data-edge': index, tabindex: '0', role: 'button',
      'aria-label': `${find(edge.from).title} → ${find(edge.to).title} · ${edge.label || 'เส้นเชื่อม'}`
    });
    group.append(
      svgElement('path', {class: 'edge-hit', d, 'vector-effect': 'non-scaling-stroke'}),
      ink
    );
    group.append(svgElement('circle', {class: 'edge-port', cx: points[0].x, cy: points[0].y, r: 2.7}));
    svg.append(group);
    if (edge.label) {
      const length = ink.getTotalLength();
      const label = svgElement('text', {class: 'edge-label'});
      label.textContent = edge.label;
      group.append(label);
      const title = svgElement('title', {});
      title.textContent = edge.label;
      group.append(title);
      // Try several points on the route so an inline label can remain clear of cards.
      const width = label.getComputedTextLength() + 10;
      const candidates = [.5, .33, .67, .2, .8].map(t => ink.getPointAtLength(t * length));
      const anchor = candidates.find(p => ![...boxes.values()].some(card =>
        p.x + width / 2 > card.x && p.x - width / 2 < card.x + card.w &&
        p.y > card.y && p.y - 16 < card.y + card.h));
      if (anchor) {
        label.setAttribute('x', anchor.x);
        label.setAttribute('y', anchor.y - 3);
      } else {
        label.remove();
      }
    }
  });
  $('routeStatus').textContent = blocked ? `ซ่อน ${blocked} เส้นชั่วคราว · ขยับการ์ดที่ทับกันหรือใช้ Auto Arrange` : '';
}

function magnetTarget(pointer) {
  const boxes = visibleBoxes();
  let closest = null, best = 33 / camera().zoom;
  for (const node of cur().nodes) {
    const p = boxes.get(node.id);
    if (!p) continue;
    const distance = Math.hypot(pointer.x - p.x, pointer.y - p.y - p.h / 2);
    if (distance >= best) continue;
    best = distance;
    closest = {node, x: p.x, y: p.y + p.h / 2};
  }
  return closest;
}

function previewEdge(pointer) {
  const svg = $('links'), source = find(edgeDrag.from), p = position(source);
  const target = magnetTarget(pointer);
  clearEdgePreview();
  const end = target || pointer, x = p.x + p.w, y = p.y + p.h / 2;
  const bend = Math.max(15, Math.abs(end.x - x) * .45);
  const d = `M${x} ${y} C${x + bend} ${y},${end.x - bend} ${end.y},${end.x} ${end.y}`;
  svg.append(svgElement('path', {id: 'edgePreview', class: target && !edgeProblem(source, target.node) ? 'magnetic' : 'preview', d,
    'vector-effect': 'non-scaling-stroke'}));
  if (target && !edgeProblem(source, target.node)) cardElement(target.node.id)?.classList.add('magnet-target');
}

function clearEdgePreview() {
  $('edgePreview')?.remove();
  $('cards').querySelector('.magnet-target')?.classList.remove('magnet-target');
}

function editEdge(index) {
  if (!session.canStart()) return;
  const edge = cur().edges[index];
  if (!edge) return;
  edgeBeingEdited = edge;
  $('edgeFrom').textContent = find(edge.from).title;
  $('edgeTo').textContent = find(edge.to).title;
  $('edgeLabel').value = edge.label;
  draftEdgeColor = edge.color || edgeColors[0][0];
  renderEdgeColors();
  revealDialog($('edgeDialog'));
}

function inspectorLinks(node) {
  const connections = cur().edges.map((edge, index) => ({edge, index}))
    .filter(({edge}) => edge.from === node.id || edge.to === node.id);
  const targets = cur().nodes.filter(target => !edgeProblem(node, target));
  return `<h3 class="inspector-heading">เส้นเชื่อม · ${connections.length}</h3>
    <div class="edge-list">${connections.map(({edge, index}) => {
      const outgoing = edge.from === node.id;
      const peer = find(outgoing ? edge.to : edge.from);
      return `<div class="attachment-row">
        <button type="button" class="btn attachment-name" data-trace-node="${peer.id}">
          ${outgoing ? '→ ส่งไปยัง' : '← รับจาก'} ${escapeHTML(peer.title)}
        </button>
        <button type="button" class="btn" data-edit-edge="${index}" aria-label="แก้เส้นเชื่อม">⋯</button>
      </div>`;
    }).join('')}</div>` + (targets.length ? `<div class="field">
      <label for="inspectorTarget">เชื่อมจาก Node นี้ไปยัง</label>
      <select id="inspectorTarget">${targets.map(target =>
        `<option value="${target.id}">${escapeHTML(target.title || 'Node ไม่มีชื่อ')} · ${target.id.slice(0, 8)}</option>`).join('')}</select>
      <button type="button" class="btn" data-add-edge>เพิ่มเส้นเชื่อม</button>
    </div>` : '');
}

function edgeProblem(source, target) {
  if (!source || !target || !find(source.id) || !find(target.id)) return 'ปลายทั้งสองต้องอยู่ใน PDCA เดียวกัน';
  if (source.id === target.id) return 'เชื่อม Node เข้าหาตัวเองไม่ได้';
  if (cur().edges.some(edge => edge.from === source.id && edge.to === target.id)) return 'มีเส้นทิศทางนี้แล้ว';
  return '';
}

function addEdge(source, target) {
  if (!session.canEditGraph()) return;
  const error = edgeProblem(source, target);
  if (error) {
    toast(error);
    return;
  }
  cur().edges.push({id: crypto.randomUUID(), from: source.id, to: target.id, label: '', color: 'slate'});
  session.mark();
  renderAll();
}

function installEdgeControls() {
  const dialog = $('edgeDialog');
  let downOnBackdrop = false;
  const onBackdrop = event => {
    const r = dialog.getBoundingClientRect();
    return event.target === dialog &&
      (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
  };
  dialog.addEventListener('pointerdown', event => { downOnBackdrop = onBackdrop(event); });
  dialog.addEventListener('click', event => {
    if (downOnBackdrop && onBackdrop(event)) dismissDialog(dialog);
    downOnBackdrop = false;
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismissDialog(dialog); });
  $('edgePalette').addEventListener('change', event => {
    if (edgeColors.some(([id]) => id === event.target.value)) draftEdgeColor = event.target.value;
  });
  $('drawerContent').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-edge]');
    if (edit) editEdge(Number(edit.dataset.editEdge));
    if (event.target.closest('[data-add-edge]')) {
      const from = selected, to = $('inspectorTarget').value;
      session.runGraph(() => addEdge(find(from), find(to)), () => drawerOpen && selected === from);
    }
  });
  $('links').addEventListener('click', event => {
    const edge = event.target.closest('[data-edge]');
    if (edge) editEdge(Number(edge.dataset.edge));
  });
  $('links').addEventListener('keydown', event => {
    const edge = event.target.closest('[data-edge]');
    if (!edge || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    editEdge(Number(edge.dataset.edge));
  });
  function changeEdge(remove) {
    if (!edgeBeingEdited) return;
    const original = edgeBeingEdited;
    const label = $('edgeLabel').value.trim(), color = draftEdgeColor;
    session.runGraph(() => {
      const index = cur().edges.findIndex(edge => edge.id === original.id);
      const edge = cur().edges[index];
      if (!edge || edge.label !== original.label || edge.color !== original.color) {
        dismissDialog(dialog);
        throw new Error('เส้นเชื่อมเปลี่ยนแล้ว กรุณาเปิดตรวจอีกครั้ง');
      }
      if (remove) cur().edges.splice(index, 1);
      else Object.assign(edge, { label, color });
      dismissDialog(dialog);
      renderAll();
      session.mark();
    }, () => dialog.open && edgeBeingEdited === original);
  }
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    changeEdge(false);
  });
  $('cancelEdge').addEventListener('click', () => dismissDialog(dialog));
  $('deleteEdge').addEventListener('click', () => changeEdge(true));
  $('edgeDialog').addEventListener('close', () => { edgeBeingEdited = null; });
}

function cssForCategory(cat){const c=cats[cat];return {color:c.c,bg:isDark()?c.dark:c.light};}
function renderLanes(dim) {
  const layers = $('lanes'), headings = $('laneHeaderTrack'), workspace = cur();
  layers.replaceChildren();
  headings.replaceChildren();
  const snap = workspace.mode === 'snap';
  layers.hidden = !snap;
  $('laneHeader').hidden = !snap;
  if (!snap) { renderOrbs(dim); return; }
  $('orbs').replaceChildren();
  metrics().lanes.forEach((lane, i) => {
    const category = cats[i], collapsed = isCollapsed(i);
    const tint = isDark() ? category.dark : category.light;
    const common = `left:${lane.x}px;width:${lane.w}px;--lane-bg:${tint};--lane-border:${isDark() ? '#ffffff19' : category.c + '23'};--c:${category.c}`;
    const body = document.createElement('div');
    body.className = 'lane';
    body.style.cssText = common + `;top:0;height:${dim.height}px`;
    layers.append(body);
    const header = document.createElement('div');
    header.className = 'lane-head' + (collapsed ? ' compact-lane' : '');
    header.style.cssText = common;
    header.innerHTML = collapsed ? `<button class="lane-tool" data-collapse="${i}" title="Expand ${escapeHTML(category.label)}" aria-label="Expand ${escapeHTML(category.label)}">»</button>` :
      `<span class="lane-dot"></span><span class="lane-name" title="${escapeHTML(category.kind)}">${escapeHTML(category.label)}</span>
      <button class="lane-tool" data-add-cat="${i}" aria-label="Add ${escapeHTML(category.label)}">+</button>
      <button class="lane-tool" data-collapse="${i}" aria-label="Collapse ${escapeHTML(category.label)}">⌄</button>`;
    headings.append(header);
    if (!collapsed) {
      const resize = document.createElement('button');
      resize.className = 'resize-lane';
      resize.dataset.resizeLane = i;
      resize.style.left = lane.x + lane.w - 3 + 'px';
      resize.title = 'Drag to change column width';
      resize.textContent = 'Ⅱ';
      headings.append(resize);
    }
  });
  syncLaneHeader();
}

function syncLaneHeader(zoom = camera().zoom) {
  if (page !== 'canvas' || cur().mode !== 'snap') return;
  const viewport = $('viewport'), header = $('laneHeader'), track = $('laneHeaderTrack');
  header.style.width = viewport.clientWidth + 'px';
  header.style.height = Math.ceil(46 * zoom) + 'px';
  track.style.transform = `translateX(${camera().x}px) scale(${zoom})`;
}

function renderOrbs(dim) {
  const wrap = $('orbs');
  wrap.replaceChildren();
  const ribbons = svgElement('svg', {class: 'category-ribbons', width: dim.width, height: dim.height, 'aria-hidden': 'true'});
  cats.forEach((category, i) => {
    const points = cur().nodes.filter(node => node.cat === i).map(node => {
      const p = position(node);
      return {id: node.id, x: p.x + p.w / 2, y: p.y + p.h / 2};
    });
    const linked = points.splice(0, 1);
    while (points.length) {
      let best = {distance: Infinity};
      points.forEach((b, index) => linked.forEach(a => {
        const distance = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (distance < best.distance) best = {a, b, index, distance};
      }));
      const {a, b, index} = best;
      ribbons.append(svgElement('path', {stroke: category.c, 'data-ribbon': '', 'data-from': a.id,
        'data-to': b.id, d: `M${a.x} ${a.y} L${b.x} ${b.y}`}));
      linked.push(...points.splice(index, 1));
    }
  });
  wrap.append(ribbons);
  for (const node of cur().nodes) {
    const p = position(node), color = cats[node.cat].c;
    const orb = document.createElement('div');
    orb.className = 'orb';
    orb.dataset.orbId = node.id;
    orb.style.cssText = `left:${p.x+p.w/2}px;top:${p.y+p.h/2}px;width:${p.w+150}px;height:${p.h+150}px;background:radial-gradient(ellipse,${color}cc 0%,${color}88 35%,transparent 72%)`;
    wrap.append(orb);
  }
}

function moveCategoryRibbons(nodeId) {
  for (const ribbon of $('orbs').querySelectorAll('[data-ribbon]')) {
    const {from, to} = ribbon.dataset;
    if (nodeId !== from && nodeId !== to) continue;
    const a = position(find(from)), b = position(find(to));
    ribbon.setAttribute('d', `M${a.x + a.w / 2} ${a.y + a.h / 2} L${b.x + b.w / 2} ${b.y + b.h / 2}`);
  }
}

function renderCards() {
  const cards = $('cards');
  const workspace = cur();
  const trace = traceSelection();
  cards.replaceChildren();
  let shown = 0;
  for (const node of workspace.nodes) {
    if (workspace.mode === 'snap' && isCollapsed(node.cat)) continue;
    shown++;
    const box = position(node);
    const category = cats[node.cat];
    const status = statusStyles[node.status];
    const action = node.cat === 3;
    const tint = action ? status.color : category.c;
    const title = node.title || 'Node ไม่มีชื่อ';
    const card = document.createElement('article');
    card.classList.add('node');
    if (action) card.classList.add('action');
    if (node.id === selected) card.classList.add('selected');
    else if (selected) card.classList.add(trace.nodes.has(node.id) ? 'trace-node' : 'trace-muted');
    card.dataset.nodeId = node.id;
    card.tabIndex = 0;
    card.setAttribute('aria-label', title);
    card.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;
      --nodecolor:${category.c};--nodeborder:${tint}${action ? '77' : '61'};
      --selectedcolor:${tint};--halo:${tint}${action ? '44' : '33'};--glow:${tint}${action ? '77' : '66'};
      --statusink:${status.color};--statuscolor:${status.color};--picbg:${isDark() ? status.dark : status.bg};
      --cardbg:${action ? (isDark() ? status.dark + 'd9' : status.bg + 'ed') : 'var(--card)'};`;
    const actionHeader = action ? `<div class="action-head">
      <span class="status" title="${node.status}"><span class="dot"></span><span>${node.status}</span></span>
      ${overdue(node) ? '<span class="overdue">Overdue</span>' : ''}
      <span class="action-pic" title="PIC: ${escapeHTML(node.pic || 'Not assigned')}">${escapeHTML(node.pic || '—')}</span>
    </div>` : '';
    card.innerHTML = `${actionHeader}<div class="card-title">${escapeHTML(title)}</div>${cardFigure(node)}
      <span class="handle left" data-handle="left" title="Incoming link"></span>
      <span class="handle right" data-handle="right" title="Drag connector to another node"></span>
      <span class="resize-card" data-resize="1" title="Resize card in Free Float mode">◢</span>`;
    const badge = document.createElement('span');
    badge.className = 'node-editor';
    card.append(badge);
    paintEditorBadge(badge, session.lockFor(node.id));
    cards.append(card);
  }
  $('footerLeft').textContent = `${shown} visible / ${workspace.nodes.length} Nodes · ${workspace.edges.length} Links`;
  $('footerPdcaName').textContent = workspace.title;
}

function renderAll() {
  const workspace = cur(), onCanvas = page === 'canvas';
  $('canvasToolbar').hidden = !onCanvas;
  $('canvasPanel').hidden = !onCanvas;
  $('laneHeader').hidden = !onCanvas || workspace.mode !== 'snap';
  $('minimap').hidden = !onCanvas;
  $('canvasFontControls').hidden = !onCanvas;
  $('canvasNav').disabled = !session.lastWorkspace();
  $('canvasNav').classList.toggle('active', onCanvas);
  $('home').classList.toggle('active', !onCanvas);
  $('overlay').classList.toggle('open', !onCanvas);
  if (!onCanvas) { renderDrawer(); return; }
  $('canvasTitle').textContent = workspace.title;
  $('app').classList.toggle('mode-free', workspace.mode === 'free');
  $('snapMode').classList.toggle('active', workspace.mode === 'snap');
  $('freeMode').classList.toggle('active', workspace.mode === 'free');
  $('emptyCanvas').hidden = workspace.nodes.length > 0;
  redrawCanvas();
  renderDrawer();
  updateAccess();
}

function redrawCanvas() {
  const dim = boxDim();
  renderLanes(dim);
  layoutStage(dim);
  renderCards();
  drawLinks();
}

function renderDrawer() {
  const node = find(selected);
  const drawer = $('drawer');
  const open = !!node && drawerOpen && page === 'canvas';
  drawer.classList.toggle('open', open);
  drawer.inert = !open;
  if (open) $('drawerContent').innerHTML =
    '<span id="nodeLockLabel" role="status" hidden></span>' +
    inspectorFields(node, cats, session.imageAvailable, overdue(node)) + inspectorLinks(node);
  updateAccess();
}

function paintEditorBadge(element, lock) {
  element.hidden = !lock;
  const label = lock ? (lock.mine ? 'คุณกำลังแก้' : 'กำลังแก้ · ' + lock.displayName + ' · ' + lock.editor) : '';
  if (element.textContent !== label) element.textContent = label;
}

function updateAccess() {
  if (page !== 'canvas') return;
  const available = session.canStart() && !session.canEditGraph();
  const nodeEditable = session.canEditNode(selected);
  for (const id of ['renamePdca', 'addGeneral', 'snapMode', 'freeMode', 'autoArrange', 'undoLayout', 'defaultView']) {
    $(id).disabled = !available;
  }
  for (const button of $('laneHeaderTrack').querySelectorAll('button')) button.disabled = !available;
  for (const card of $('cards').children) {
    paintEditorBadge(card.querySelector('.node-editor'), session.lockFor(card.dataset.nodeId));
  }
  const status = $('nodeLockLabel');
  if (!drawerOpen || !status) return;
  if (session.requestingNode(selected)) {
    status.hidden = false;
    status.textContent = 'กำลังขอสิทธิ์…';
  } else paintEditorBadge(status, session.lockFor(selected));
  for (const field of $('drawerContent').querySelectorAll('[data-edit], #nodeImage, #documentUrl, [data-add-document], [data-remove-document], [data-remove-image]')) {
    if (field.matches('input, textarea')) field.readOnly = !nodeEditable;
    if (field.matches('select')) field.setAttribute('aria-readonly', String(!nodeEditable));
    if (field.id === 'nodeImage') field.disabled = uploading;
  }
  for (const field of $('drawerContent').querySelectorAll('[data-edit-edge], [data-add-edge], #inspectorTarget')) {
    field.disabled = !available;
  }
}

function syncWorkspace(redraw) {
  if (page !== 'canvas') { $('canvasNav').disabled = !session.lastWorkspace(); return; }
  if (!redraw) { updateAccess(); return; }
  layoutUndo = null;
  const active = document.activeElement;
  const focusId = active?.closest('#drawerContent') ? active.id : '';
  const start = active?.selectionStart, end = active?.selectionEnd;
  const scroll = $('drawerContent').scrollTop;
  renderAll();
  $('drawerContent').scrollTop = scroll;
  const field = focusId && $(focusId);
  if (field && !field.disabled) {
    field.focus({preventScroll: true});
    if (Number.isInteger(start)) field.setSelectionRange(start, end);
  }
}

function refreshOverdue() {
  if (page !== 'canvas') return;
  const today = factoryDay();
  if (today === lastFactoryDay) return;
  lastFactoryDay = today;
  renderCards();
  const badge = $('inspectorOverdue');
  if (badge) badge.hidden = !overdue(find(selected));
}

function factoryDay() {
  const parts = factoryCalendar.formatToParts();
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

function overdue(node) {
  return node?.cat === 3 && node.due && node.due < lastFactoryDay &&
    !['Completed', 'Canceled'].includes(node.status);
}

function updateNodeField(event) {
  const field = event.target.dataset.edit;
  const node = find(selected);
  if (!field || !node || !session.canEditNode(node.id)) return;
  const value = field === 'cat' ? Number(event.target.value) : event.target.value;
  if (node[field] === value) return;
  node[field] = value;
  if (field === 'cat') {
    const peers = cur().nodes.filter(other => other !== node && other.cat === value);
    node.snapY = Math.max(70, ...peers.map(peer => {
      const width = cur().widths[value] - 26;
      return peer.snapY + snapHeight(peer, width) + 25;
    }));
    viewRevealCat = value;
    session.markNode(node.id);
    // A layout undo from before the category change would reintroduce old lane positions.
    layoutUndo = null;
    renderAll();
    $('nodeCategory').focus();
    revealNodeInView(node.id);
  } else if (field === 'sideNote') {
    session.markNode(node.id);
    hideTooltip();
  } else {
    session.markNode(node.id);
    if (field === 'title') { redrawCanvas(); updateAccess(); }
    else renderCards();
    const badge = $('inspectorOverdue');
    if (badge) badge.hidden = !overdue(node);
  }
}

function addNode(cat, title = '') {
  return session.runGraph(() => createNode(cat, title));
}
function createNode(cat, title) {
  if (!session.canEditGraph()) return;
  const workspace = cur();
  const peers = workspace.nodes.filter(node => node.cat === cat);
  const node = {
    id: crypto.randomUUID(), cat, title: title || 'New ' + cats[cat].label + ' Node',
    sideNote: '', pic: '', status: 'Not Started', due: '', images: [], documents: [],
    snapY: Math.max(70, ...peers.map(peer =>
      peer.snapY + snapHeight(peer, workspace.widths[cat] - 26) + 25)),
    freeX: null, freeY: null, freeW: 200, freeH: cat === 3 ? 126 : 98,
  };
  viewRevealCat = cat;
  if (workspace.mode === 'free') {
    node.freeX = peers[0]?.freeX ?? metrics().lanes[cat].x + 13;
    node.freeY = Math.max(90, ...workspace.nodes.map(position)
      .filter(box => box.x < node.freeX + node.freeW + 16 && box.x + box.w + 16 > node.freeX)
      .map(box => box.y + box.h + 28));
  }
  workspace.nodes.push(node);
  session.mark();
  selected = node.id;
  drawerOpen = true;
  renderAll();
  revealNodeInView(node.id);
  $('nodeTitle').focus({preventScroll: true});
}

function openWorkspace(workspace, nodeId) {
  current = workspace;
  page = 'canvas';
  layoutUndo = null;
  selected = null;
  drawerOpen = false;
  const node = find(nodeId);
  viewRevealCat = node?.cat ?? null;
  renderAll();
  enterWorkspace();
  if (node) {
    showNode(node.id);
    $('nodeTitle')?.focus({preventScroll: true});
  }
}

function openWorkspaces() {
  cameraMotion++;
  document.querySelector('.topbar').classList.remove('hidden');
  page = 'workspace';
  current = null;
  drag = edgeDrag = resizeLane = layoutUndo = null;
  routeCache = {key: null, routes: []};
  titleMeasure.textContent = '';
  viewRevealCat = null;
  selected = null;
  drawerOpen = false;
  renderAll();
}

function selectNode(id, focusTitle = false) {
  if (!find(id)) return;
  return session.leaveInspector(id, () => showNode(id, focusTitle));
}
function showNode(id, focusTitle) {
  const node = find(id);
  if (!node) return;
  const reveal = isCollapsed(node.cat) || (viewRevealCat !== node.cat && cur().collapsed[viewRevealCat]);
  viewRevealCat = node.cat;
  const focused = document.activeElement?.dataset.nodeId === id;
  selected = id;
  drawerOpen = true;
  hideTooltip();
  if (reveal) redrawCanvas();
  else { renderCards(); drawLinks(); }
  renderDrawer();
  if (focusTitle) $('nodeTitle')?.focus({preventScroll: true});
  else if (focused) cardElement(id)?.focus({preventScroll: true});
  revealNodeInView(id);
}
function hideTooltip(){clearTimeout(tooltipTimer);$('tooltip').classList.remove('show');}
function showTooltip(n,clientX,clientY){if(!n||!n.sideNote)return;const el=$('tooltip');el.innerHTML=`<b>Side note</b>${escapeHTML(n.sideNote)}`;el.classList.add('show');const w=350;el.style.left=Math.min(Math.max(8,clientX+16),innerWidth-w-12)+'px';el.style.top=Math.min(Math.max(10,clientY+16),innerHeight-230)+'px';}
function switchMode(next) {
  if (!session.canEditGraph()) return;
  const workspace = cur();
  if (workspace.mode === next) return;
  const before = snapshotCardRects();
  saveUndo();
  if (next === 'free') {
    const collapsed = workspace.collapsed;
    workspace.collapsed = Array(7).fill(false);
    for (const node of workspace.nodes) {
      if (node.freeX !== null) continue;
      const {x, y, w, h} = position(node);
      Object.assign(node, {freeX: x, freeY: y, freeW: w, freeH: h});
    }
    workspace.collapsed = collapsed;
  }
  workspace.mode = next;
  session.mark('layout');
  renderAll();
  animateCardLayout(before);
}

function saveUndo() {
  const workspace = cur();
  layoutUndo = {
    camera: {...workspace.camera}, mode: workspace.mode, widths: [...workspace.widths],
    collapsed: [...workspace.collapsed],
    positions: workspace.nodes.map(({id, snapY, freeX, freeY, freeW, freeH}) =>
      ({id, snapY, freeX, freeY, freeW, freeH})),
  };
}

function undo() {
  if (!session.canEditGraph()) return;
  if (!layoutUndo) { toast('ยังไม่มีการจัดผังให้ย้อนกลับ'); return; }
  const before = snapshotCardRects();
  const {positions, ...view} = layoutUndo;
  Object.assign(cur(), view);
  for (const position of positions) {
    const node = find(position.id);
    if (node) Object.assign(node, position);
  }
  layoutUndo = null;
  session.mark('layout');
  renderAll();
  animateCardLayout(before);
}

function defaultView() {
  if (!session.canEditGraph()) return;
  saveUndo();
  const workspace = cur();
  workspace.mode = 'snap';
  workspace.widths = [...widthsDefault];
  workspace.collapsed.fill(false);
  workspace.camera = defaultCamera();
  cameraMotion++;
  for (const node of workspace.nodes) {
    Object.assign(node, {freeX: null, freeY: null, freeW: 200, freeH: node.cat === 3 ? 126 : 98});
  }
  packSnap(workspace);
  selected = null;
  drawerOpen = false;
  viewRevealCat = null;
  session.mark('layout');
  renderAll();
}

function walkRelations(start, adjacent, getNext) {
  const nodes = new Set(start ? [start] : []), edges = new Set(), queue = [...nodes];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of adjacent.get(queue[i]) || []) {
      edges.add(edge);
      const id = getNext(edge);
      if (!nodes.has(id)) { nodes.add(id); queue.push(id); }
    }
  }
  return {nodes, edges};
}

function relationIndex(edges) {
  const incoming = new Map(), outgoing = new Map();
  for (const edge of edges) {
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    incoming.get(edge.to).push(edge);
    outgoing.get(edge.from).push(edge);
  }
  return {incoming, outgoing};
}

function traceSelection() {
  const {incoming, outgoing} = relationIndex(cur().edges);
  const before = walkRelations(selected, incoming, edge => edge.from);
  const after = walkRelations(selected, outgoing, edge => edge.to);
  return {nodes: new Set([...before.nodes, ...after.nodes]), edges: new Set([...before.edges, ...after.edges])};
}

function fitLaneWidths(workspace, width) {
  const weights = [.84, 1.02, 1.06, 1.24, 1.04, .98, .82];
  const visible = weights.filter((_, i) => workspace.mode === 'free' || !workspace.collapsed[i]);
  const available = width - 28 - gap * 7 - (7 - visible.length) * collapsedWidth;
  const scale = available / visible.reduce((a, b) => a + b, 0);
  return weights.map((weight, i) => workspace.mode === 'snap' && workspace.collapsed[i]
    ? workspace.widths[i] : Math.max(145, Math.floor(scale * weight)));
}

function arrangeAroundActions(workspace, free) {
  const {incoming, outgoing} = relationIndex(workspace.edges);
  const primary = new Map(workspace.nodes.map(node => [node.id, incoming.get(node.id)?.[0]?.from]));
  const order = new Map(workspace.nodes.map((node, i) => [node.id, i]));
  const primaryEdges = workspace.edges.filter(edge => primary.get(edge.to) === edge.from);
  const primaryOutgoing = relationIndex(primaryEdges).outgoing;
  const groups = cats.map((_, cat) => workspace.nodes.filter(node => node.cat === cat));
  const lanes = metrics().lanes;
  const sizes = new Map(workspace.nodes.map(node => {
    const width = workspace.widths[node.cat] - 26;
    const compact = free ? preferredWidth(node, width) : width;
    return [node.id, {w: compact, h: snapHeight(node, compact)}];
  }));
  const anchors = new Map();
  const setPosition = (node, y, index) => {
    const {w, h} = sizes.get(node.id);
    if (free) {
      const lane = lanes[node.cat];
      const spare = Math.max(0, workspace.widths[node.cat] - w - 26);
      node.freeW = w;
      node.freeH = h;
      node.freeX = lane.x + 13 + Math.min(spare, index % 2 ? 18 : 0);
      node.freeY = y;
    } else node.snapY = y;
    return y + h / 2;
  };
  const actions = groups[3].sort((a, b) =>
    (order.get(primary.get(a.id)) ?? Infinity) - (order.get(primary.get(b.id)) ?? Infinity) ||
    order.get(a.id) - order.get(b.id));
  const ranks = new Map(actions.map((action, index) => [action.id, index]));
  const slotHeights = new Map(actions.map(action => [action.id, sizes.get(action.id).h]));
  const anchorFor = new Map();
  for (const node of workspace.nodes) {
    if (node.cat === 3) continue;
    const collect = (adjacent, key) => [...walkRelations(node.id, adjacent, edge => edge[key]).nodes]
      .filter(id => ranks.has(id)).sort((a, b) => ranks.get(a) - ranks.get(b));
    let connected = node.cat < 3 ? collect(primaryOutgoing, 'to') : collect(incoming, 'from');
    if (!connected.length && node.cat < 3) connected = collect(outgoing, 'to');
    const action = connected[Math.floor((connected.length - 1) / 2)];
    if (!action) continue;
    anchorFor.set(node.id, action);
    slotHeights.set(action, Math.max(slotHeights.get(action), sizes.get(node.id).h));
  }
  let next = 34;
  actions.forEach((action, i) => {
    if (i && primary.get(action.id) !== primary.get(actions[i - 1].id)) next += 21;
    const height = slotHeights.get(action.id);
    const y = next + (height - sizes.get(action.id).h) / 2;
    anchors.set(action.id, setPosition(action, y, i));
    next += height + 36;
  });
  for (const cat of [0, 1, 2, 4, 5, 6]) {
    const desired = groups[cat].map((node, i) => {
      const middle = anchors.get(anchorFor.get(node.id)) ?? 42 + i * 92;
      return {node, middle};
    }).sort((a, b) => a.middle - b.middle);
    let bottom = 34;
    desired.forEach(({node, middle}, i) => {
      const h = sizes.get(node.id).h, y = Math.max(bottom, middle - h / 2);
      setPosition(node, y, i);
      bottom = y + h + 24;
    });
  }
}

function snapshotCardRects() {
  return new Map([...$('cards').children].map(card => [card.dataset.nodeId, card.getBoundingClientRect()]));
}

function animateCardLayout(before) {
  if (reduceMotion()) return;
  for (const card of $('cards').children) {
    const old = before.get(card.dataset.nodeId);
    const now = card.getBoundingClientRect(), zoom = camera().zoom;
    if (!old || !now.width || !now.height) {
      card.animate([{opacity: 0, transform: 'scale(.97)'}, {opacity: 1, transform: 'none'}], {duration: 210});
      continue;
    }
    const dx = (old.left - now.left) / zoom, dy = (old.top - now.top) / zoom;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(old.width - now.width) + Math.abs(old.height - now.height) < 1) continue;
    card.animate([
      {transform: `translate(${dx}px,${dy}px) scale(${old.width / now.width},${old.height / now.height})`},
      {transform: 'none'}
    ], {duration: 330, easing: 'cubic-bezier(.22,.8,.28,1)'});
  }
  $('links').animate([{opacity: .22}, {opacity: 1}], {duration: 360});
}

function graphArrange() {
  if (!session.canEditGraph()) return;
  const workspace = cur();
  if (!workspace.nodes.length) return;
  const before = snapshotCardRects();
  saveUndo();
  workspace.camera = {x: 0, y: 0, zoom: 1};
  cameraMotion++;
  workspace.widths = fitLaneWidths(workspace, $('viewport').clientWidth);
  arrangeAroundActions(workspace, workspace.mode === 'free');
  renderAll();
  animateCardLayout(before);
  session.mark('layout');
  toast('จัดการ์ดตามระดับของ Action และปรับขนาดตามข้อความแล้ว · 100%');
}


function packSnap(workspace) {
  const nextY = cats.map(() => 102);
  for (const node of workspace.nodes) {
    node.snapY = nextY[node.cat];
    nextY[node.cat] += snapHeight(node, workspace.widths[node.cat] - 26) + 44;
  }
}

function cardElement(id) {
  return $('cards').querySelector(`[data-node-id="${CSS.escape(id)}"]`);
}

function drawMovingLinks(id, box) {
  const svg = $('links');
  svg.querySelectorAll('.drag-trace').forEach(trace => trace.remove());
  cur().edges.forEach((edge, index) => {
    if (edge.from !== id && edge.to !== id) return;
    svg.querySelector(`[data-edge="${index}"]`)?.classList.add('moving-endpoint');
    const other = find(edge.from === id ? edge.to : edge.from);
    if (!other || (cur().mode === 'snap' && isCollapsed(other.cat))) return;
    const neighbor = position(other), movingIsSource = edge.from === id;
    const a = movingIsSource ? box : neighbor, b = movingIsSource ? neighbor : box;
    const x = a.x + a.w, y = a.y + a.h / 2, targetY = b.y + b.h / 2;
    const bend = Math.max(24, Math.min(100, Math.abs(b.x - x) / 2));
    svg.append(svgElement('path', {class: 'drag-trace', 'vector-effect': 'non-scaling-stroke',
      style: '--route-color:' + getEdgeColor(edge.color),
      d: `M${x} ${y} C${x + bend} ${y},${b.x - bend} ${targetY},${b.x} ${targetY}`}));
  });
}

let moveRaf = 0;
function liveDragVisual() {
  moveRaf = 0;
  if (!drag) return;
  const p = position(find(drag.id));
  Object.assign(drag.el.style, {left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px'});
  const orb = $('orbs').querySelector(`[data-orb-id="${CSS.escape(drag.id)}"]`);
  if (orb) Object.assign(orb.style, {left: p.x + p.w / 2 + 'px', top: p.y + p.h / 2 + 'px',
    width: p.w + 150 + 'px', height: p.h + 150 + 'px'});
  $('links').classList.add('edge-moving');
  moveCategoryRibbons(drag.id);
  drawMovingLinks(drag.id, p);
  rebuildMiniMap();
  setCamera(camera());
}

function onCardPointerDown(event) {
  if (event.button !== 0 || drag || edgeDrag || resizeLane) return;
  cameraMotion++;
  const card = event.target.closest('[data-node-id]');
  if (!card || event.target.closest('[data-preview-image]')) return;
  const node = find(card.dataset.nodeId);
  card.getAnimations().forEach(animation => animation.cancel());
  const handle = event.target.closest('[data-handle]');
  const resize = event.target.closest('[data-resize]');
  hideTooltip();
  if (handle) {
    if (handle.dataset.handle === 'right') {
      event.preventDefault();
      edgeDrag = {from: node.id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY};
      $('cards').setPointerCapture(event.pointerId);
    }
    return;
  }
  const type = resize ? 'resize' : 'move';
  drag = {
    type, id: node.id, startX: event.clientX, startY: event.clientY,
    pointer: event.pointerId, el: card
  };
  $('cards').setPointerCapture(event.pointerId);
}

function trackGraphGesture(gesture, event, isCurrent, start, move) {
  gesture.point = event;
  if (gesture.permit && session.canEditGraph(gesture.permit)) { move(event); return; }
  if (gesture.requested || Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 5) return;
  gesture.requested = true;
  session.startGraph(isCurrent).then(permit => {
    if (!permit) return;
    if (!isCurrent() || !session.canEditGraph(permit) || !start()) { session.finishGraph(permit); return; }
    gesture.permit = permit;
    move(gesture.point);
  });
}

function onCardPointerMove(event) {
  if (edgeDrag?.pointer === event.pointerId) {
    const gesture = edgeDrag;
    trackGraphGesture(gesture, event, () => edgeDrag === gesture && !!find(gesture.from),
      () => true, point => previewEdge(screenToWorld(point)));
    return;
  }
  if (drag?.pointer !== event.pointerId) return;
  const gesture = drag;
  trackGraphGesture(gesture, event, () => drag === gesture && !!find(gesture.id), () => {
    const node = find(gesture.id);
    gesture.original = position(node);
    const {snapY, freeX, freeY, freeW, freeH} = node;
    gesture.layout = {snapY, freeX, freeY, freeW, freeH};
    gesture.el = cardElement(gesture.id);
    if (!gesture.el) return false;
    gesture.el.classList.add(gesture.type === 'resize' ? 'resizing' : 'dragging');
    return true;
  }, moveCard);
}

function moveCard(event) {
  const dx = (event.clientX - drag.startX) / camera().zoom;
  const dy = (event.clientY - drag.startY) / camera().zoom;
  const node = find(drag.id), p = drag.original, layout = drag.layout;
  if (drag.type === 'resize') {
    layout.freeW = Math.max(Math.min(p.w, 140), Math.min(500, p.w + dx));
    layout.freeH = Math.max(snapHeight(node, layout.freeW), Math.min(560, p.h + dy));
  } else if (cur().mode === 'snap') {
    layout.snapY = Math.max(8, p.y + dy);
  } else {
    layout.freeX = Math.max(8, p.x + dx);
    layout.freeY = Math.max(8, p.y + dy);
  }
  if (!moveRaf) moveRaf = requestAnimationFrame(liveDragVisual);
}

function onCardPointerUp(event) {
  if (edgeDrag?.pointer === event.pointerId) {
    const finished = edgeDrag;
    edgeDrag = null;
    clearEdgePreview();
    if (!finished.permit) return;
    const target = magnetTarget(screenToWorld(event));
    if (target && session.canEditGraph(finished.permit)) addEdge(find(finished.from), target.node);
    else toast('ลากจากจุดขวาไปที่จุดซ้ายของ Node ปลายทาง');
    session.finishGraph(finished.permit);
    return;
  }
  if (drag?.pointer !== event.pointerId) return;
  const finished = drag;
  drag = null;
  if (!finished.requested && finished.type === 'move') selectNode(finished.id);
  if (!finished.permit) return;
  const node = find(finished.id);
  if (node && session.canEditGraph(finished.permit)) {
    saveUndo();
    Object.assign(node, finished.layout);
    session.mark();
  }
  renderAll();
  session.finishGraph(finished.permit);
}

function cancelCardGesture(event) {
  if (edgeDrag?.pointer === event.pointerId) {
    const {permit} = edgeDrag;
    edgeDrag = null;
    clearEdgePreview();
    if (permit) session.finishGraph(permit);
  }
  if (drag?.pointer !== event.pointerId) return;
  const {permit} = drag;
  drag = null;
  if (permit) {
    renderAll();
    session.finishGraph(permit);
  }
}


function enterWorkspace() {
  cameraMotion++;
  setCamera({...camera(), x: 0, y: 0});
  document.querySelector('.topbar').classList.remove('hidden');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  [...$('cards').children].forEach((card, i) => {
    card.animate([
      {opacity: 0, transform: 'translateY(11px) scale(.94)'},
      {opacity: 1, transform: 'translateY(-2px) scale(1.01)', offset: .78},
      {opacity: 1, transform: 'translateY(0) scale(1)'}
    ], {duration: 370, delay: Math.min(i * 38, 380), easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards'});
  });
}

let draftEdgeColor = 'slate';

function getEdgeColor(id) {
  const preset = edgeColors.find(([key]) => key === id) || edgeColors[0];
  return isDark() ? preset[3] : preset[2];
}

function renderEdgeColors() {
  $('edgePalette').innerHTML = edgeColors.map(([id, name]) => `<label class="edge-swatch"
    style="--swatch:${getEdgeColor(id)}" title="${name}">
    <input type="radio" name="edgeColor" value="${id}" aria-label="${name}" ${id === draftEdgeColor ? 'checked' : ''}>
    <span aria-hidden="true"></span>
  </label>`).join('');
}


function cardFigure(node) {
  const image = node.images.find(item => session.imageAvailable(item.id));
  if (!image) return '';
  return `<button type="button" class="node-figure" data-preview-image="${image.id}"
    aria-label="ขยายรูป ${escapeHTML(image.name)}"><img src="${imageUrl(image.id)}" alt="${escapeHTML(image.name)}"></button>`;
}

function openFigure(node, imageId) {
  const image = node?.images.find(item => item.id === imageId);
  if (image && session.imageAvailable(imageId)) previewFigure(image, $('figureDialog'));
}

async function attachImage(event) {
  if (event.target.id !== 'nodeImage' || !event.target.files.length) return;
  const input = event.target;
  const workspace = cur(), node = find(selected);
  if (uploading || !session.canEditNode(node?.id)) {
    input.value = '';
    return;
  }
  uploading = true;
  input.disabled = true;
  try {
    await session.addImage(node, input.files[0]);
    if (cur() === workspace && find(selected) === node && page === 'canvas') renderDrawer();
  } catch (error) {
    if (cur() === workspace && find(selected) === node && page === 'canvas') {
      $('attachmentError').textContent = error.message;
    }
  } finally {
    input.value = '';
    uploading = false;
    updateAccess();
  }
}

const editableField = '[data-edit], #nodeImage, #documentUrl';
const attachmentAction = '[data-add-document], [data-remove-document], [data-remove-image]';

async function activateField(field, event) {
  const id = selected, fieldId = field.id;
  event.preventDefault();
  field.focus({ preventScroll: true });
  if (!await session.editNode(id, () => drawerOpen && selected === id &&
      document.activeElement?.id === fieldId)) return;
  const active = $(fieldId);
  if (!active || !drawerOpen || selected !== id) {
    session.leaveInspector(undefined, () => {});
    return;
  }
  active.focus({ preventScroll: true });
  if (active.matches('select, input[type=date], input[type=file]')) {
    try { active.showPicker(); }
    catch (error) {
      if (!['NotAllowedError', 'NotSupportedError', 'SecurityError'].includes(error.name)) throw error;
    }
  }
}

async function onInspectorClick(event) {
  const field = event.target.closest(editableField);
  if (field && !session.canEditNode(selected)) {
    await activateField(field, event);
    return;
  }
  const target = event.target.closest('button');
  let node = find(selected);
  if (!target || !node) return;
  if (target.matches(attachmentAction)) {
    const id = node.id, index = Number(target.dataset.removeDocument);
    const documentBefore = node.documents[index];
    if (!await session.editNode(id, () => drawerOpen && selected === id)) return;
    node = find(id);
    if (target.hasAttribute('data-remove-document') && node.documents[index] !== documentBefore) {
      $('attachmentError').textContent = 'ลิงก์เอกสารเปลี่ยนแล้ว กรุณาตรวจอีกครั้ง';
      return;
    }
  }
  if (target.hasAttribute('data-add-document')) {
    const link = documentLink($('documentUrl').value);
    if (!link) {
      $('attachmentError').textContent = 'กรุณาใส่ลิงก์ HTTP/HTTPS หรือพาธ LAN ที่ถูกต้อง';
      return;
    }
    node.documents.push(link.text);
  } else if (target.hasAttribute('data-remove-document')) {
    node.documents.splice(Number(target.dataset.removeDocument), 1);
  } else if (target.dataset.removeImage) {
    session.removeImage(node, target.dataset.removeImage);
    renderAll();
    return;
  } else if (target.dataset.previewImage) {
    openFigure(node, target.dataset.previewImage);
    return;
  } else if (target.dataset.traceNode) {
    const peer = find(target.dataset.traceNode);
    selectNode(peer.id, true);
    return;
  } else {
    return;
  }
  session.markNode(node.id);
  renderDrawer();
  $('documentUrl').focus();
}

function refreshImages() {
  if (page !== 'canvas') return;
  if (!drag && !edgeDrag) { redrawCanvas(); updateAccess(); }
  for (const button of $('drawerContent').querySelectorAll('[data-preview-image]')) {
    button.disabled = !session.imageAvailable(button.dataset.previewImage);
  }
}

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function revealDialog(dialog) {
  dialog.showModal();
  if (!reduceMotion()) dialog.animate([
    {opacity: 0, transform: 'scale(.88) translateY(12px)'},
    {opacity: 1, transform: 'scale(1) translateY(0)'}
  ], {duration: 250, easing: 'cubic-bezier(.18,.75,.3,1)'});
}

function dismissDialog(dialog) {
  if (!dialog.open || dialog.dataset.closing) return;
  if (reduceMotion()) { dialog.close(); return; }
  dialog.dataset.closing = 'true';
  dialog.animate([{opacity: 1, transform: 'scale(1)'}, {opacity: 0, transform: 'scale(.92)'}],
    {duration: 165, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => {}).then(() => {
    delete dialog.dataset.closing;
    dialog.close();
    dialog.getAnimations().forEach(animation => animation.cancel());
  });
}

const camera = () => cur().camera;
const zoomValue = value => Math.max(.35, Math.min(1.65, value));
const mapWidth = 160, mapHeight = 100;
let mapProjection = null, cameraMotion = 0;

function usableView() {
  const viewport = $('viewport'), drawer = $('drawer');
  let width = viewport.clientWidth, height = viewport.clientHeight;
  if (drawerOpen && selected) {
    if (innerWidth < 640) height -= drawer.offsetHeight + 12;
    else width -= drawer.offsetWidth + 18;
  }
  return {width: Math.max(1, width), height: Math.max(1, height)};
}

function cameraRegions(boxes, view, zoom) {
  return boxes.map(box => {
    const minW = Math.min(12, box.w * zoom, view.width);
    const minH = Math.min(12, box.h * zoom, view.height);
    return {
      left: minW - (box.x + box.w) * zoom,
      right: view.width - minW - box.x * zoom,
      top: minH - (box.y + box.h) * zoom,
      bottom: view.height - minH - box.y * zoom
    };
  });
}

function nearestCamera(point, regions) {
  let best = point, distance = Infinity;
  for (const r of regions) {
    const x = Math.max(r.left, Math.min(r.right, point.x));
    const y = Math.max(r.top, Math.min(r.bottom, point.y));
    const d = (x - point.x) ** 2 + (y - point.y) ** 2;
    if (d < distance) { best = {x, y}; distance = d; }
    if (!d) break;
  }
  return best;
}

function segmentInterval(a, b, region) {
  let start = 0, end = 1;
  for (const [key, min, max] of [['x', region.left, region.right], ['y', region.top, region.bottom]]) {
    const delta = b[key] - a[key];
    if (!delta) {
      if (a[key] < min - 1e-7 || a[key] > max + 1e-7) return null;
      continue;
    }
    const first = (min - a[key]) / delta, last = (max - a[key]) / delta;
    start = Math.max(start, Math.min(first, last));
    end = Math.min(end, Math.max(first, last));
    if (start > end + 1e-7) return null;
  }
  return [start, end];
}

function advanceCamera(from, target, regions) {
  if (!regions.length) return target;
  const a = nearestCamera(from, regions);
  const advance = (start, end) => {
    const covered = regions.map(r => segmentInterval(start, end, r)).filter(Boolean)
      .sort((one, two) => one[0] - two[0]);
    let t = 0;
    for (const [first, last] of covered) {
      if (first > t + 1e-7) break;
      t = Math.max(t, last);
    }
    return {x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t};
  };
  const stop = advance(a, target);
  const across = advance(stop, {x: target.x, y: stop.y});
  const down = advance(stop, {x: stop.x, y: target.y});
  const error = p => (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
  return nearestCamera(error(across) <= error(down) ? across : down, regions);
}

function setCamera(next, continuous = false) {
  const zoom = zoomValue(next.zoom);
  syncLaneHeader(zoom);
  const regions = cameraRegions([...visibleBoxes().values()], usableView(), zoom);
  const at = continuous ? advanceCamera(camera(), next, regions) : nearestCamera(next, regions);
  cur().camera = {x: at.x, y: at.y, zoom};
  paintCamera();
}

function paintCamera() {
  const {x, y, zoom} = camera();
  $('stage').style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
  $('viewport').style.backgroundPosition = `${x}px ${y}px`;
  $('zoomLabel').textContent = Math.round(zoom * 100) + '%';
  syncLaneHeader();
  paintMapView();
}

function screenToWorld(event) {
  const rect = $('viewport').getBoundingClientRect(), {x, y, zoom} = camera();
  return {x: (event.clientX - rect.left - x) / zoom, y: (event.clientY - rect.top - y) / zoom};
}

function layoutStage(dim) {
  $('stage').style.width = dim.width + 'px';
  $('stage').style.height = dim.height + 'px';
  rebuildMiniMap();
  setCamera(camera());
}

function updateZoom(value, clientX, clientY) {
  cameraMotion++;
  const viewport = $('viewport'), rect = viewport.getBoundingClientRect(), view = usableView();
  const anchor = {clientX: clientX ?? rect.left + view.width / 2, clientY: clientY ?? rect.top + view.height / 2};
  const world = screenToWorld(anchor), zoom = zoomValue(value);
  syncLaneHeader(zoom);
  const after = viewport.getBoundingClientRect();
  setCamera({x: anchor.clientX - after.left - world.x * zoom, y: anchor.clientY - after.top - world.y * zoom, zoom});
}

function fit() {
  cameraMotion++;
  const boxes = [...visibleBoxes().values()], view = usableView();
  if (!boxes.length) { setCamera({x: 0, y: 0, zoom: 1}); return; }
  const left = Math.min(...boxes.map(b => b.x)), top = Math.min(...boxes.map(b => b.y));
  const width = Math.max(...boxes.map(b => b.x + b.w)) - left;
  const height = Math.max(...boxes.map(b => b.y + b.h)) - top;
  const snapHeader = cur().mode === 'snap' ? 46 : 0;
  const zoom = zoomValue(Math.min((view.width - 32) / width,
    (view.height + Math.ceil(snapHeader * camera().zoom) - 32) / (height + snapHeader)));
  syncLaneHeader(zoom);
  const available = usableView();
  setCamera({x: (available.width - width * zoom) / 2 - left * zoom,
    y: (available.height - height * zoom) / 2 - top * zoom, zoom});
}

function revealNodeInView(id) {
  const box = visibleBoxes().get(id);
  if (!box) return;
  const start = {...camera()}, view = usableView(), {zoom} = start;
  const shift = (at, world, length, space) => {
    const size = length * zoom, pos = world * zoom + at;
    if (size > space) return (space - size) / 2 - world * zoom;
    if (pos >= 0 && pos + size <= space) return at;
    return Math.max(0, Math.min(space - size, pos)) - world * zoom;
  };
  const target = {x: shift(start.x, box.x, box.w, view.width), y: shift(start.y, box.y, box.h, view.height), zoom};
  const token = ++cameraMotion;
  if (reduceMotion() || (target.x === start.x && target.y === start.y)) {
    setCamera(target);
    return;
  }
  let begun;
  const step = now => {
    if (token !== cameraMotion || page !== 'canvas') return;
    begun ??= now;
    const t = Math.min(1, (now - begun) / 220), eased = 1 - (1 - t) ** 3;
    setCamera({x: start.x + (target.x - start.x) * eased, y: start.y + (target.y - start.y) * eased, zoom});
    if (t < 1) requestAnimationFrame(step);
  };
  // Clamp the starting frame too, including a drawer that has just changed the usable area.
  setCamera(start);
  requestAnimationFrame(step);
}

function rebuildMiniMap() {
  const nodes = [...visibleBoxes()];
  const svg = $('minimapSvg');
  if (!nodes.length) { mapProjection = null; svg.replaceChildren(); $('minimap').hidden = true; return; }
  $('minimap').hidden = page !== 'canvas';
  const boxes = nodes.map(([, box]) => box);
  const left = Math.min(...boxes.map(b => b.x)), top = Math.min(...boxes.map(b => b.y));
  const width = Math.max(...boxes.map(b => b.x + b.w)) - left;
  const height = Math.max(...boxes.map(b => b.y + b.h)) - top;
  const scale = Math.min((mapWidth - 14) / width, (mapHeight - 14) / height);
  const ox = (mapWidth - width * scale) / 2 - left * scale;
  const oy = (mapHeight - height * scale) / 2 - top * scale;
  const marker = svgElement('circle', {r: 3, class: 'map-selection'});
  const frame = svgElement('rect', {class: 'map-frame', rx: 2});
  svg.replaceChildren(...nodes.map(([id, b]) => svgElement('rect', {
    x: ox + b.x * scale, y: oy + b.y * scale, width: Math.max(1, b.w * scale),
    height: Math.max(1, b.h * scale), fill: cats[find(id).cat].c, rx: 1.5
  })), frame, marker);
  mapProjection = {ox, oy, scale, frame, marker, nodes: new Map(nodes)};
  paintMapView();
}

function paintMapView() {
  if (!mapProjection) return;
  const {ox, oy, scale, frame, marker, nodes} = mapProjection, {x, y, zoom} = camera();
  const view = usableView(), viewport = $('viewport'), minimap = $('minimap');
  minimap.style.right = viewport.clientWidth - view.width + 12 + 'px';
  minimap.style.bottom = viewport.clientHeight - view.height + 12 + 'px';
  const attributes = {x: ox - x / zoom * scale, y: oy - y / zoom * scale,
    width: view.width / zoom * scale, height: view.height / zoom * scale};
  for (const [name, value] of Object.entries(attributes)) frame.setAttribute(name, value);
  const box = nodes.get(selected);
  marker.style.display = box ? '' : 'none';
  if (box) {
    marker.setAttribute('cx', ox + (box.x + box.w / 2) * scale);
    marker.setAttribute('cy', oy + (box.y + box.h / 2) * scale);
  }
}

function installMiniMap() {
  const map = $('minimap'), svg = $('minimapSvg');
  let gesture = null;
  const point = event => {
    const rect = svg.getBoundingClientRect();
    return {x: (event.clientX - rect.left) * mapWidth / rect.width, y: (event.clientY - rect.top) * mapHeight / rect.height};
  };
  map.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture || !mapProjection) return;
    event.stopPropagation();
    cameraMotion++;
    const p = point(event);
    gesture = {id: event.pointerId, start: p, last: p, moved: false, frame: event.target === mapProjection.frame};
    map.setPointerCapture(event.pointerId);
  });
  map.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId || !mapProjection) return;
    const p = point(event);
    if (!gesture.moved && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) < 3) return;
    gesture.moved = true;
    if (!gesture.frame) return;
    const {x, y, zoom} = camera(), factor = zoom / mapProjection.scale;
    setCamera({x: x - (p.x - gesture.last.x) * factor, y: y - (p.y - gesture.last.y) * factor, zoom}, true);
    gesture.last = p;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    map.addEventListener(type, event => {
      if (gesture?.id !== event.pointerId) return;
      const moved = gesture.moved;
      gesture = null;
      if (moved || type !== 'pointerup' || !mapProjection) return;
      const p = point(event), {ox, oy, scale} = mapProjection, {zoom} = camera(), view = usableView();
      setCamera({x: view.width / 2 - (p.x - ox) / scale * zoom,
        y: view.height / 2 - (p.y - oy) / scale * zoom, zoom});
    });
  }
}

function installCanvasPan() {
  const viewport = $('viewport');
  let pan = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pan || event.target.closest('.node, .edge-control, #minimap')) return;
    cameraMotion++;
    hideTooltip();
    viewport.focus({preventScroll: true});
    pan = {id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false};
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (pan?.id !== event.pointerId) return;
    if (!pan.moved && Math.hypot(event.clientX - pan.x, event.clientY - pan.y) < 5) return;
    pan.moved = true;
    viewport.classList.add('panning');
    const {x, y, zoom} = camera();
    setCamera({x: x + event.clientX - pan.lastX, y: y + event.clientY - pan.lastY, zoom}, true);
    pan.lastX = event.clientX;
    pan.lastY = event.clientY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    viewport.addEventListener(type, event => {
      if (pan?.id !== event.pointerId) return;
      const completed = pan;
      pan = null;
      viewport.classList.remove('panning');
      if (type !== 'pointerup') return;
      if (!completed.moved && Math.hypot(event.clientX - completed.x, event.clientY - completed.y) < 5 && (selected || drawerOpen)) {
        selected = null;
        drawerOpen = false;
        renderCards();
        drawLinks();
        renderDrawer();
        paintMapView();
      } else if (completed.moved) {
        const dy = event.clientY - completed.y;
        if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(event.clientX - completed.x)) {
          const state = $('saveStatus').dataset.state;
          document.querySelector('.topbar').classList.toggle('hidden',
            dy < 0 && camera().y < -80 && !['saving', 'error'].includes(state));
        }
      }
    });
  }
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport && event.target !== $('minimap')) return;
    const directions = {ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40]};
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    cameraMotion++;
    const {x, y, zoom} = camera();
    setCamera({x: x + delta[0], y: y + delta[1], zoom}, true);
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      if (page === 'canvas' && viewport.clientWidth && viewport.clientHeight) setCamera(camera());
    }).observe(viewport);
  }
}

function installWheelZoom() {
  const viewport = $('viewport');
  let frame = 0, pending = null;
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    if (drag || edgeDrag || resizeLane || !event.deltaY) return;
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const delta = Math.max(-180, Math.min(180, event.deltaY * factor));
    const previousZoom = pending?.workspace === cur()?.id ? pending.zoom : camera().zoom;
    const zoom = previousZoom * Math.exp(-delta * .0019);
    pending = {zoom, x: event.clientX, y: event.clientY, workspace: cur()?.id};
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      const change = pending;
      pending = null;
      if (change.workspace === cur()?.id && page === 'canvas' && !drag && !edgeDrag && !resizeLane) {
        updateZoom(change.zoom, change.x, change.y);
      }
    });
  }, {passive: false});
}

fillMenus();
$('snapMode').addEventListener('click', () => session.runGraph(() => switchMode('snap')));
$('freeMode').addEventListener('click', () => session.runGraph(() => switchMode('free')));
$('autoArrange').addEventListener('click', () => session.runGraph(graphArrange));
$('undoLayout').addEventListener('click', () => session.runGraph(undo));
$('defaultView').addEventListener('click', () => session.runGraph(defaultView));
$('themeToggle').addEventListener('click', () => {
  const dark = !isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('themeToggle').textContent = dark ? '☀' : '☾';
  renderAll();
});
document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {
  font = Number(button.dataset.size);
  document.documentElement.style.setProperty('--fontscale', font);
  document.querySelectorAll('[data-size]').forEach(item => item.classList.toggle('active', item === button));
  renderAll();
}));
$('zoomOut').addEventListener('click', () => updateZoom(camera().zoom - .1));
$('zoomIn').addEventListener('click', () => updateZoom(camera().zoom + .1));
$('zoomFit').addEventListener('click', fit);
$('closeDrawer').addEventListener('click', () => {
  session.leaveInspector(undefined, () => {
    cameraMotion++;
    drawerOpen = false;
    renderDrawer();
    paintMapView();
    cardElement(selected)?.focus({preventScroll: true});
  });
});
$('drawerContent').addEventListener('input', event => {
  if (event.target.matches('input[data-edit], textarea[data-edit]')) updateNodeField(event);
});
$('drawerContent').addEventListener('change', event => {
  if (event.target.id === 'nodeImage') attachImage(event);
  else updateNodeField(event);
});
$('drawerContent').addEventListener('click', onInspectorClick);
$('drawerContent').addEventListener('mousedown', event => {
  if (event.target.matches('select[data-edit]') && !session.canEditNode(selected)) event.preventDefault();
});
$('drawerContent').addEventListener('keydown', event => {
  const field = event.target;
  if (!field.matches(editableField) || session.canEditNode(selected)) return;
  if (event.key === 'Enter') activateField(field, event);
  else if (field.matches('select, #nodeImage') && !['Tab', 'Escape'].includes(event.key)) event.preventDefault();
});

$('laneHeaderTrack').addEventListener('click', event => {
  const plus = event.target.closest('[data-add-cat]');
  if (plus) {
    addNode(Number(plus.dataset.addCat));
    return;
  }
  const toggle = event.target.closest('[data-collapse]');
  if (!toggle) return;
  const index = Number(toggle.dataset.collapse);
  session.runGraph(() => {
    const before = snapshotCardRects();
    saveUndo();
    cur().collapsed[index] = !cur().collapsed[index];
    viewRevealCat = null;
    session.mark('layout');
    renderAll();
    animateCardLayout(before);
  });
});
$('laneHeaderTrack').addEventListener('pointerdown', event => {
  const handle = event.target.closest('[data-resize-lane]');
  if (event.button !== 0 || !handle || resizeLane || !session.canStart()) return;
  event.preventDefault();
  event.stopPropagation();
  resizeLane = { index: Number(handle.dataset.resizeLane), startX: event.clientX,
    startY: event.clientY, pointer: event.pointerId };
  $('laneHeaderTrack').setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (resizeLane?.pointer !== event.pointerId) return;
  const gesture = resizeLane;
  trackGraphGesture(gesture, event, () => resizeLane === gesture && cur().mode === 'snap', () => {
    gesture.width = cur().widths[gesture.index];
    return true;
  }, point => {
    const delta = (point.clientX - gesture.startX) / camera().zoom;
    gesture.preview = Math.max(145, Math.min(370, gesture.width + delta));
    cur().widths[gesture.index] = gesture.preview;
    renderAll();
    cur().widths[gesture.index] = gesture.width;
  });
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, event => {
  if (resizeLane?.pointer !== event.pointerId) return;
  const gesture = resizeLane;
  resizeLane = null;
  if (!gesture.permit) return;
  if (type === 'pointerup' && session.canEditGraph(gesture.permit) && gesture.preview !== gesture.width) {
    saveUndo();
    cur().widths[gesture.index] = gesture.preview;
    session.mark('layout');
  }
  renderAll();
  session.finishGraph(gesture.permit);
});

const cards = $('cards');
cards.addEventListener('pointerdown', onCardPointerDown);
cards.addEventListener('pointermove', onCardPointerMove);
cards.addEventListener('pointerup', onCardPointerUp);
cards.addEventListener('pointercancel', cancelCardGesture);
cards.addEventListener('lostpointercapture', cancelCardGesture);
cards.addEventListener('click', event => {
  const button = event.target.closest('[data-preview-image]');
  if (button) openFigure(find(button.closest('[data-node-id]').dataset.nodeId), button.dataset.previewImage);
});
cards.addEventListener('keydown', event => {
  const card = event.target.closest('[data-node-id]');
  if (card && !event.target.closest('button') && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    selectNode(card.dataset.nodeId);
  }
});
cards.addEventListener('pointerover', event => {
  if (drag || edgeDrag) return;
  const card = event.target.closest('[data-node-id]');
  if (!card) return;
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => showTooltip(find(card.dataset.nodeId), event.clientX, event.clientY), 600);
});
cards.addEventListener('pointerout', event => {
  if (event.target.closest('[data-node-id]')) hideTooltip();
});
$('closeFigure').addEventListener('click', () => dismissDialog($('figureDialog')));
installCanvasPan();
installMiniMap();
installWheelZoom();
installEdgeControls();

const newNode = $('newModal');
$('addGeneral').addEventListener('click', () => {
  if (!session.canStart()) return;
  $('createCategory').value = '3';
  $('createTitle').value = '';
  revealDialog(newNode);
  $('createTitle').focus();
});
$('cancelCreate').addEventListener('click', () => dismissDialog(newNode));
$('nodeForm').addEventListener('submit', event => {
  event.preventDefault();
  const cat = Number($('createCategory').value), title = $('createTitle').value.trim();
  session.runGraph(() => {
    newNode.close();
    createNode(cat, title);
  }, () => newNode.open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && page === 'canvas' && !document.querySelector('dialog[open]')) {
    if (drawerOpen) $('closeDrawer').click();
    else hideTooltip();
  }
});

document.documentElement.dataset.theme = 'light';
const session = installWorkspaces({
  onOpen: openWorkspace, onHome: openWorkspaces, onSync: syncWorkspace, onImagesSaved: refreshImages,
  canvasBusy: () => !!(drag || edgeDrag || resizeLane || $('edgeDialog').open),
});
setInterval(refreshOverdue, 1000);
