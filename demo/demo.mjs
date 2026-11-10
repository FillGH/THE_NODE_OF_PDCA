import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { operationsConfig } from '../src/ops.js';
import { createSnapshot, restoreSnapshot } from '../src/recovery.js';
import { startHost } from '../src/server.js';
import { openStore } from '../src/store.js';
import { edgeColors, statuses } from '../web/model.js';

const base = dirname(fileURLToPath(import.meta.url));
const data = resolve(process.env.PDCA_DEMO_DIR || '.pdca-dev/pilot-demo');
const port = Number(process.env.PDCA_PORT || 4175);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PDCA_PORT must be between 1 and 65535');
const env = {
  ...process.env,
  PDCA_PORT: String(port),
  PDCA_DB: join(data, 'workspace.sqlite'),
  PDCA_AUDIT: '',
  PDCA_BACKUP_DIR: '',
  PDCA_RESTORE_DIR: '',
  PDCA_OPS_LOG: '',
};
const { file, root, recoveryRoot, auditFile, origin } = operationsConfig(env);
const appUrl = origin || 'http://127.0.0.1:' + port;
const docUrl = appUrl + '/demo/evidence';
const day = 86_400_000;
const today = Date.now();
const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
const due = days => formatter.format(today + days * day);
const author = { id: randomUUID(), displayName: 'เมย์ · QA สมมติ' };
const secondAuthor = { id: randomUUID(), displayName: 'นนท์ · ทีมผลิตสมมติ' };
const url = name => docUrl + '#' + name;

function add(graph, cat, title, sideNote, extra = {}) {
  const row = graph.nodes.filter(node => node.cat === cat).length;
  const node = { id: randomUUID(), cat, title, sideNote, pic: '', due: '', status: 'Not Started',
    snapY: 18 + 145 * row, freeX: 24 + cat * 250 + (row % 2) * 10,
    freeY: 24 + 145 * row + (cat % 2) * 35, freeW: 212, freeH: 104, images: [], documents: [], ...extra };
  graph.nodes.push(node);
  return node;
}

function link(graph, from, to, label, color = 'slate') {
  if (graph.edges.some(edge => edge.from === from.id && edge.to === to.id)) return;
  graph.edges.push({ id: randomUUID(), from: from.id, to: to.id, label, color });
}

async function image(node, fileName, label, uploads) {
  const id = randomUUID();
  node.images.push(id);
  uploads.push({ id, name: label, data: (await readFile(join(base, 'assets', fileName))).toString('base64') });
}

function save(store, graph, actor, uploads = []) {
  const result = store.save(graph.id, { graph, revision: graph.revision, saveId: randomUUID(),
    displayName: actor.displayName, uploads });
  graph.revision = result.revision;
}

function trash(store, graph, subject, restore = false, actor = author) {
  graph.revision = store.setVisibility(graph.id, subject.id, graph.revision, restore, actor).revision;
}

async function seed() {
  await mkdir(dirname(data), { recursive: true });
  try {
    await mkdir(data);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Demo directory already exists. Serve it or choose a new PDCA_DEMO_DIR.');
    throw error;
  }
  await mkdir(root);
  let time = today - 9 * day;
  const store = openStore(file, { now: () => time });
  let oldBackup;
  const overview = [];
  try {
    const cutting = store.create('DEMO 01 · ลดรอยบิ่นหลังตัดกระจก');
    const cutUploads = [];
    const issue = add(cutting, 0, 'รอยบิ่นที่ขอบกระจกหลังตัด', 'พบรอยบิ่น 18 จาก 200 ชิ้นในรอบเก็บข้อมูลสมมติ เป้าหมายคือลดเหลือไม่เกิน 6 ชิ้น โดยคงเวลาเดินเครื่องเท่าเดิม');
    const fact = add(cutting, 1, 'กราฟหลักฐานก่อนและหลังทดลอง', 'ชิ้นที่มีรอยบิ่นลดจาก 18 เป็น 6 หลังปรับแรงกดและเปลี่ยนใบมีด เทียบแต่ละรอบจากกลุ่มตัวอย่างขนาดเท่ากัน');
    const tempFact = add(cutting, 1, 'อุณหภูมิและแรงกดใบตัด', 'แรงกดสถานี C-02 แกว่งมากที่สุดในชั่วโมงแรก ใช้คำค้น UX-PDCA-CUT เพื่อทดสอบค้นหาจาก Content');
    const hyp = add(cutting, 2, 'ใบมีดสึกและแรงกดไม่คงที่', 'เปรียบเทียบใบมีดใหม่กับใบเดิมแยกตามสถานีและช่วงกะ');
    const action = add(cutting, 3, 'ปรับแรงกดสถานี C-02', 'ทดลอง 3 ระดับ บันทึกรอยบิ่นหลังตรวจ 50 ชิ้นต่อระดับ', { pic: 'กานต์ · ผลิตสมมติ', due: due(-4), status: 'Not Started' });
    const check = add(cutting, 3, 'ยืนยันผลหลังเปลี่ยนใบมีด', 'เทียบกราฟกับเกณฑ์ที่ตกลง', { pic: 'เมย์ · QA สมมติ', due: due(-1), status: 'Completed' });
    const result = add(cutting, 4, 'รอยบิ่นลดลงเหลือ 6 จาก 200 ชิ้น', 'รอบทดลองสุดท้ายผ่านเกณฑ์สมมติ ทดสอบย้อนเส้นจาก Result กลับไปที่ Problem');
    const measure = add(cutting, 5, 'ตั้งเกณฑ์ตรวจใบมีดรายกะ', 'สุ่มวัดก่อนเริ่มกะและเมื่อเปลี่ยนรุ่น หากค่าหลุดเกณฑ์ให้แจ้งหัวหน้ากะ');
    const evidence = add(cutting, 6, 'แบบบันทึกการตรวจ C-01', 'เปิดเอกสารทดสอบจาก Inspector แล้วกลับมาที่ผังเดิม', { documents: [url('cutting')] });
    for (const [from, to, label, color] of [[issue, fact, 'ตรวจหลักฐาน', 'blue'], [issue, tempFact, 'ตรวจแรงกด', 'cyan'],
      [fact, hyp, 'ตั้งข้อสันนิษฐาน', 'violet'], [tempFact, hyp, 'เทียบสถานี', 'slate'], [hyp, action, 'ทดลอง', 'amber'],
      [action, check, 'ยืนยัน', 'teal'], [check, result, 'ผลที่วัด', 'green'], [result, measure, 'ใช้เป็นมาตรการ', 'green'],
      [measure, evidence, 'อ้างอิง', 'blue']]) link(cutting, from, to, label, color);
    await image(fact, 'cutting.png', 'กราฟเปรียบเทียบจำนวนชิ้นที่มีรอยบิ่นก่อนและหลังปรับแรงกด.png', cutUploads);
    save(store, cutting, author, cutUploads);
    time += 60_000;
    action.title = 'ปรับแรงกดและบันทึกค่าที่สถานี C-02';
    action.status = 'In Progress';
    action.due = due(0);
    tempFact.cat = 2;
    tempFact.sideNote = 'จัดประเภทใหม่เป็นสมมติฐานเพื่อแยกจากหลักฐานที่วัดยืนยันแล้ว ใช้คำค้น UX-PDCA-CUT';
    cutting.edges = cutting.edges.filter(edge => edge.from !== measure.id);
    save(store, cutting, secondAuthor);

    const packing = store.create('DEMO 02 · ลดการส่งกล่องติดฉลากผิดรุ่น');
    packing.mode = 'free';
    const packUploads = [];
    const packIssue = add(packing, 0, 'ฉลากบนกล่องไม่ตรงกับรุ่นที่สั่ง', 'ทดสอบผัง Free Float ที่มีทั้งงานค้าง งานจบ และประวัติการแก้ไข');
    const packFact = add(packing, 1, 'ผลสุ่มตรวจกล่องรายกะ', 'กะเช้าพบผิด 16 กล่อง กะบ่าย 11 และกะดึก 7 จากกลุ่มตัวอย่าง 100 กล่องต่อกะ');
    const packHyp = add(packing, 2, 'ฉลากรุ่นเก่าค้างหลังเปลี่ยนงาน', 'พบม้วนฉลากสองรุ่นอยู่ที่โต๊ะเดียวกันก่อนเปิดงานรอบใหม่');
    const actions = [
      ['จัดทำจุดพักฉลากรุ่นเก่า', 'Not Started', '', ''],
      ['เพิ่มการสแกนก่อนปิดกล่อง', 'In Progress', 'ขิม · คลังสมมติ', due(-2)],
      ['ทดลองตัวตรวจรหัสรุ่น', 'Completed', 'เมย์ · QA สมมติ', due(-5)],
      ['ทวนแบบไฟล์จากจุดพิมพ์', 'Blocked', 'นนท์ · ผลิตสมมติ', due(-1)],
      ['ยกเลิกการติดป้ายซ้ำด้านข้าง', 'Canceled', 'ออม · จัดส่งสมมติ', due(-3)],
      ['ทบทวนผลในประชุมวันนี้', 'In Progress', 'เมย์ · QA สมมติ', due(0)],
      ['สังเกตการเปลี่ยนรุ่นของกะบ่าย', 'Not Started', '', due(7)],
    ].map(([title, status, pic, deadline], index) => add(packing, 3, title,
      index === 3 ? 'รอแบบฉลากอนุมัติจากจุดพิมพ์ สมมติให้ข้อมูลยาวพอสำหรับตรวจการตัดบรรทัด การแสดงชื่อผู้รับผิดชอบ และการอ่านวันครบกำหนดบนหน้าจอขนาดเล็ก' : 'ตรวจผลและลงบันทึกในใบตรวจสมมติ',
      { status, pic, due: deadline }));
    const packResult = add(packing, 4, 'หลังเพิ่มจุดตรวจเหลือ 4 กล่อง', 'ตรวจซ้ำจาก 100 กล่องหลังปรับจุดตรวจ');
    const packMeasure = add(packing, 5, 'ตรวจกล่องแรกทุกครั้งที่เปลี่ยนรุ่น', 'ให้หัวหน้ากะบันทึกเวลาที่เริ่มและตรวจหลักฐานทุกวัน');
    const packDoc = add(packing, 6, 'WI-PK-03 และพาธอ้างอิง LAN', 'ลิงก์ HTTP เปิดเอกสารจริงในเครื่อง พาธ LAN และ file ทดสอบการแสดงและคัดลอก',
      { documents: [url('packing'), '\\\\demo-factory\\qa-share\\WI-PK-03.pdf', 'file:///C:/DemoFactory/QA/Checklist.pdf'] });
    const hidden = add(packing, 1, 'กู้จาก Trash · บันทึกกล่องตัวอย่าง', 'เก็บไว้สำหรับทดสอบ Restore Node และตรวจว่าเส้นกลับมา');
    const recovered = add(packing, 1, 'เคยกู้แล้ว · รูปตัวอย่างล็อต A', 'ใช้เทียบเหตุการณ์ Restore หลังจุดตัด Audit');
    const purged = add(packing, 1, 'ตัวอย่างที่ถูก purge หลัง snapshot', 'ใช้ตรวจว่า snapshot เก่าไม่นำรายการที่ลบถาวรกลับมา');
    await image(packFact, 'packing.png', 'กราฟสุ่มตรวจกล่องและฉลากแยกตามกะ.png', packUploads);
    await image(hidden, 'packing.png', 'รูปที่ต้องกลับมาพร้อม Node จาก Trash.png', packUploads);
    await image(purged, 'packing.png', 'หลักฐานที่ถูก purge ออกจากชุดกู้.png', packUploads);
    link(packing, packIssue, packFact, 'ข้อมูลรายกะ', 'blue');
    for (const factNode of [packFact, hidden, recovered, purged]) link(packing, factNode, packHyp, 'หลักฐาน', 'blue');
    for (const [index, item] of actions.entries()) {
      link(packing, packHyp, item, 'งาน ' + (index + 1), edgeColors[index][0]);
      link(packing, item, packResult, 'ติดตามผล', 'green');
    }
    link(packing, packResult, packMeasure, 'กำหนดมาตรการ', 'green');
    link(packing, packMeasure, packDoc, 'เปิด WI', 'violet');
    save(store, packing, secondAuthor, packUploads);
    time += 60_000;
    actions[1].sideNote = 'เพิ่มขั้นตอนสแกนยืนยันกล่องแรกของแต่ละรุ่นและแนบผลให้หัวหน้ากะ';
    actions[1].status = 'Blocked';
    actions[1].due = due(-1);
    save(store, packing, author);
    time += 60_000;
    actions[1].status = 'In Progress';
    actions[1].due = due(-2);
    save(store, packing, secondAuthor);

    const assembly = store.create('DEMO 03 · ลดเวลาหยุดเครื่องสายประกอบ (200 Nodes)');
    const floorUploads = [];
    const categories = [
      ['เวลาหยุดเครื่องสะสม', 'รอวัสดุหน้าสถานี', 'เซนเซอร์อ่านพลาด', 'เสียเวลาตอนเปลี่ยนรุ่น'],
      ['บันทึกการหยุดเครื่อง', 'เวลาป้อนชิ้นงาน', 'ผลอ่านจากเซนเซอร์', 'จำนวนงานรอหน้าสถานี'],
      ['วัสดุมาถึงไม่พร้อมกัน', 'หัวจับเยื้องหลังเปลี่ยนรุ่น', 'สัญญาณรบกวนที่เซนเซอร์', 'ลำดับการส่งงานไม่ตรงกะ'],
      ['ตั้งระยะเซนเซอร์', 'ตรวจแผนส่งวัสดุ', 'ทวนเวลาการเปลี่ยนรุ่น', 'แยกกลุ่มเหตุขัดข้อง'],
      ['เวลาหยุดหลังทดลอง', 'ผลตรวจซ้ำรายกะ', 'สัดส่วนเหตุซ้ำ', 'ผลเทียบก่อนและหลัง'],
      ['ทบทวนจุดตรวจรายสัปดาห์', 'กำหนดมาตรฐานเปลี่ยนรุ่น', 'ตั้งเกณฑ์แจ้งเตือน', 'เพิ่มจุดยืนยันการส่งวัสดุ'],
      ['บันทึกเหตุการณ์เครื่อง', 'คู่มือเซนเซอร์', 'เอกสารเปลี่ยนรุ่น', 'แผนซ้อมการหยุดเครื่อง'],
    ];
    const counts = [12, 40, 30, 54, 30, 22, 12];
    const lanes = counts.map((count, cat) => Array.from({ length: count }, (_, i) => {
      const station = 'A-' + String(i % 9 + 1).padStart(2, '0');
      const prefix = String(i + 1).padStart(2, '0');
      const shift = ['เช้า', 'บ่าย', 'ดึก'][i % 3];
      const description = i % 7 === 0 ? ' บันทึกลำดับเหตุการณ์ตั้งแต่เริ่มกะ ตรวจเทียบกับสถานีใกล้เคียงและแยกตัวอย่างที่เกิดจากการหยุดตามแผนก่อนสรุปผล' : '';
      return add(assembly, cat, prefix + ' · ' + categories[cat][i % 4] + ' · ' + station,
        'ข้อมูลสมมติ กะ' + shift + ' ของสถานี ' + station + '.' + description + (i === 6 ? ' DEMO-200' : ''),
        cat === 3 ? { status: statuses[i % statuses.length], pic: i % 4 ? ['ออม','นนท์','ขิม','เมย์'][i % 4] + ' · สมมติ' : '',
          due: i % 6 ? due(i % 15 - 5) : '' } : cat === 6 && i % 3 === 0 ? { documents: [url('assembly')] } : {});
    }));
    for (let cat = 1; cat < lanes.length; cat++) {
      for (const [i, item] of lanes[cat].entries()) {
        link(assembly, lanes[cat - 1][i % lanes[cat - 1].length], item, 'เส้นตามเหตุผล', edgeColors[cat][0]);
        if (i % 2 === 0) {
          const upstream = lanes[Math.max(0, cat - 2)];
          link(assembly, upstream[(i + 3) % upstream.length], item, 'หลักฐานร่วม', 'slate');
        }
      }
    }
    link(assembly, lanes[4][0], lanes[1][0], 'ย้อนตรวจซ้ำ', 'pink');
    await image(lanes[1][0], 'downtime.png', 'เวลาหยุดเครื่องรายสัปดาห์ 4 ช่วง.png', floorUploads);
    save(store, assembly, author, floorUploads);

    const trashOnly = store.create('FIXTURE ถังขยะ · ผังฉลากฉบับทดลอง');
    const oldNode = add(trashOnly, 0, 'ผังเก่าสำหรับกู้จาก Trash', 'ผังทดสอบนี้เริ่มต้นใน Trash และใช้ซ้อมกู้ผังทั้งชุด');
    const oldAction = add(trashOnly, 3, 'ทวนเส้นและวันส่งงานหลังคืนผัง', 'เทียบการกลับมาของทั้งสอง Node', { due: due(2) });
    link(trashOnly, oldNode, oldAction, 'งานตรวจรับ');
    save(store, trashOnly, author);
    for (const [graph, name] of [[cutting, 'คุณภาพการตัด'], [packing, 'งานบรรจุ'], [assembly, 'ความพร้อมเครื่องจักร']]) {
      store.assignCategory(graph.id, store.changeCategory(null, name).id, null);
    }
    trash(store, packing, recovered);
    oldBackup = await createSnapshot({ file, root, auditFile, now: () => time });
    time = today - 8 * day;
    trash(store, packing, recovered, true, secondAuthor);
    trash(store, packing, purged);
    time = today - 12 * 60 * 60_000;
    store.purge();
    packing.revision = store.revision(packing.id);
    time = today;
    trash(store, packing, hidden);
    trash(store, trashOnly, trashOnly);
    for (const graph of [cutting, packing, assembly]) {
      const visible = store.load(graph.id);
      const events = store.history(graph.id);
      overview.push({ id: graph.id, title: graph.title, nodes: visible.nodes.length, edges: visible.edges.length,
        actions: visible.nodes.filter(node => node.cat === 3).length, mode: visible.mode,
        images: visible.nodes.flatMap(node => node.images).map(image => image.id),
        historyKinds: [...new Set(events.map(event => event.kind))] });
    }
  } finally {
    store.close();
  }
  const replay = await restoreSnapshot({ id: oldBackup.id, role: 'IT', root, recoveryRoot, file, auditFile });
  if (replay.status !== 'awaiting-it-review') throw new Error('Demo restore failed: ' + replay.reason);
  const manifest = { appUrl, docUrl, oldSnapshot: oldBackup.id, stageId: replay.stageId,
    from: replay.from.seq, through: replay.through.seq, applied: replay.applied, workspaces: overview };
  await writeFile(join(data, 'demo.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

async function serve() {
  const manifest = JSON.parse(await readFile(join(data, 'demo.json'), 'utf8'));
  if (manifest.appUrl !== appUrl) throw new Error('Demo origin changed. Seed a fresh PDCA_DEMO_DIR for the new origin.');
  await stat(file);
  await stat(auditFile);
  const host = await startHost(env, { demoEvidence: true });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => host.stop());
  console.log('PDCA LAN Test Demo · ' + appUrl);
}

if (process.argv[2] === 'seed') await seed();
else if (process.argv[2] === 'serve') await serve();
else throw new Error('Use seed or serve.');
