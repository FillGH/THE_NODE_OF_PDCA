import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { categoryNames } from '../web/model.js';

export function exportData(store, id, now = Date.now()) {
  const graph = store.load(id);
  const history = {
    textRevisions: [], categoryChanges: [], relationshipChanges: [],
    actionStatusChanges: [], actionDueDateChanges: [],
  };
  const groups = { 'node-category': 'categoryChanges', 'action-status': 'actionStatusChanges',
    'action-due-date': 'actionDueDateChanges' };
  for (const row of store.history(id).reverse()) {
    const meta = { revision: row.revision, displayName: row.displayName, at: row.at };
    if (row.kind === 'node-text') history.textRevisions.push({ nodeId: row.subject, ...row.after, ...meta });
    else if (row.kind.startsWith('edge-')) {
      const edge = row.after || row.before;
      history.relationshipChanges.push({ id: row.subject, type: row.kind === 'edge-restored' ? 'Restored' : row.after ? 'Created' : 'Removed',
        source: edge.from, target: edge.to, ...meta });
    } else if (groups[row.kind]) {
      history[groups[row.kind]].push({ nodeId: row.subject, from: row.before || null,
        to: row.after || null, ...meta });
    }
  }
  return {
    schemaVersion: 1,
    pdca: { id, title: graph.title, revision: graph.revision },
    exportedAt: new Date(now).toISOString(),
    factoryTimeZone: 'Asia/Bangkok',
    nodes: graph.nodes.map(node => ({
      id: node.id, category: categoryNames[node.cat], title: node.title, content: node.sideNote,
      documents: node.documents,
      images: node.images.map(image => ({ ref: image.id, caption: image.name,
        mediaType: store.imageMetadata(image.id).mime })),
      ...(node.cat === 3 && { action: { pic: node.pic || null, dueDate: node.due || null, status: node.status } }),
    })),
    relationships: graph.edges.map(edge => ({ id: edge.id, source: edge.from, target: edge.to,
      label: edge.label, color: edge.color })),
    history,
  };
}

async function spreadsheet(data) {
  const book = new ExcelJS.Workbook();
  const nodes = book.addWorksheet('Nodes');
  const relationships = book.addWorksheet('Relationships');
  nodes.columns = [
    ['ID', 40], ['Category', 28], ['Title', 38], ['Content', 60],
    ['PIC', 25], ['Due Date', 16], ['Status', 18],
  ].map(([header, width]) => ({ header, width }));
  relationships.columns = ['ID', 'Source', 'Target'].map(header => ({ header, width: 40 }));
  for (const node of data.nodes) {
    const action = node.action;
    nodes.addRow([node.id, node.category, node.title, node.content, action?.pic ?? null,
      action?.dueDate ? new Date(action.dueDate + 'T00:00:00Z') : null, action?.status ?? null]);
  }
  for (const edge of data.relationships) relationships.addRow([edge.id, edge.source, edge.target]);
  nodes.getColumn(6).numFmt = 'yyyy-mm-dd';
  for (const sheet of [nodes, relationships]) {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columnCount } };
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

const font = fileURLToPath(new URL('../assets/fonts/Sarabun-Regular.ttf', import.meta.url));
const perPage = 12;
const cardsAcross = 3;

function arrow(doc, a, b) {
  const x1 = a.x + 110, y1 = a.y + 21;
  const x2 = b.x + 110, y2 = b.y + 21;
  const dx = x2 - x1, dy = y2 - y1;
  const offset = Math.min(110 / Math.abs(dx), 21 / Math.abs(dy));
  const skewX = -dy / Math.hypot(dx, dy) * 4, skewY = dx / Math.hypot(dx, dy) * 4;
  const x = x2 - dx * offset + skewX, y = y2 - dy * offset + skewY;
  const angle = Math.atan2(dy, dx);
  doc.strokeColor('#48627c').moveTo(x1 + dx * offset + skewX, y1 + dy * offset + skewY).lineTo(x, y).stroke();
  doc.fillColor('#48627c').polygon([x, y],
    [x - 8 * Math.cos(angle - 0.45), y - 8 * Math.sin(angle - 0.45)],
    [x - 8 * Math.cos(angle + 0.45), y - 8 * Math.sin(angle + 0.45)]).fill();
}

function pdf(data) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 38, autoFirstPage: false });
  const output = new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const index = new Map(data.nodes.map((node, i) => [node.id, {
    number: i + 1, page: Math.floor(i / perPage) + 1,
    x: 38 + i % cardsAcross * 250, y: 112 + Math.floor(i % perPage / cardsAcross) * 84,
  }]));
  const heading = title => {
    doc.addPage().font(font).fontSize(17).fillColor('#17283b').text(title);
    doc.fontSize(9).text(data.pdca.id + ' · r' + data.pdca.revision);
  };
  const pages = Math.max(1, Math.ceil(data.nodes.length / perPage));
  for (let page = 1; page <= pages; page++) {
    heading('ผัง PDCA · ' + data.pdca.title + ' · ' + page + '/' + pages);
    for (const edge of data.relationships) {
      const a = index.get(edge.source), b = index.get(edge.target);
      if (a.page === page && b.page === page) arrow(doc, a, b);
    }
    for (const node of data.nodes.slice((page - 1) * perPage, page * perPage)) {
      const { x, y, number } = index.get(node.id);
      doc.roundedRect(x, y, 220, 42, 5).fillAndStroke('#edf3f9', '#7390ad');
      doc.fillColor('#17283b').fontSize(9).text('N' + number + ' · ' + node.category, x + 6, y + 4, { width: 207, height: 13 });
      doc.fontSize(10).text(node.title || 'Node ไม่มีชื่อ', x + 6, y + 20, { width: 207, height: 17, ellipsis: true });
    }
    doc.fillColor('#17283b').fontSize(10).text('เส้นข้ามหน้าและรหัสอ้างอิงอยู่ในส่วนรายการเส้นและรายละเอียด Node', 38, 470);
  }
  heading('รายการเส้นเชื่อม');
  doc.moveDown();
  for (const edge of data.relationships) {
    const a = index.get(edge.source), b = index.get(edge.target);
    doc.fontSize(10).text('N' + a.number + ' (ผังหน้า ' + a.page + ') → N' + b.number +
      ' (ผังหน้า ' + b.page + ') ' + edge.label + ' · ' + edge.id);
  }
  heading('รายละเอียด Node');
  for (const node of data.nodes) {
    const ref = index.get(node.id);
    if (doc.y > doc.page.height - 100) doc.addPage();
    doc.moveDown().fontSize(13).text('N' + ref.number + ' · ' + node.title);
    doc.fontSize(9).text(node.id + ' · ' + node.category + ' · ผังหน้า ' + ref.page);
    doc.fontSize(11).text(node.content || '—');
    if (node.action) doc.fontSize(10).text('PIC ' + (node.action.pic ?? '—') +
      ' · Due Date ' + (node.action.dueDate ?? '—') + ' · Status ' + node.action.status);
    for (const link of node.documents) doc.fontSize(9).text(link);
  }
  doc.end();
  return output;
}

export const exportFormats = {
  json: ['application/json; charset=utf-8', data => Buffer.from(JSON.stringify(data, null, 2) + '\n')],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', spreadsheet],
  pdf: ['application/pdf', pdf],
};
