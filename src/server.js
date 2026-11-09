import { exportData, exportFormats } from './exports.js';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openStore, RequestError } from './store.js';
import { collaboration } from './collaboration.js';
import { operationsConfig, secretMatches } from './ops.js';
import { runRecovery, startBackups } from './recovery.js';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/canvas.css', ['canvas.css', 'text/css; charset=utf-8']],
  ['/canvas.js', ['canvas.js', 'text/javascript; charset=utf-8']],
  ['/model.js', ['model.js', 'text/javascript; charset=utf-8']],
  ['/changes.js', ['changes.js', 'text/javascript; charset=utf-8']],
  ['/session.js', ['session.js', 'text/javascript; charset=utf-8']],
  ['/autosave.js', ['autosave.js', 'text/javascript; charset=utf-8']],
  ['/workspaces.js', ['workspaces.js', 'text/javascript; charset=utf-8']],
  ['/build3.js', ['build3.js', 'text/javascript; charset=utf-8']],
  ['/inspector.js', ['inspector.js', 'text/javascript; charset=utf-8']],
  ['/favicon.ico', ['favicon.svg', 'image/svg+xml']],
]);
const maxBody = 32 * 1024 * 1024;

async function readJson(req) {
  if (req.headers['content-type'] !== 'application/json') {
    throw new RequestError(415, 'ต้องส่งข้อมูลเป็น JSON');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBody) {
      req.resume();
      throw new RequestError(413, 'ข้อมูลบันทึกชุดนี้ใหญ่เกินไป');
    }
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid JSON object');
    return data;
  } catch {
    throw new RequestError(400, 'ข้อมูล JSON ไม่ถูกต้อง');
  }
}

export function makeServer(store, sessions = collaboration(), allowRequest = () => true, allowAudit = () => false,
  operations = {}) {
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; object-src 'none'; frame-ancestors 'none'");
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };
    try {
      const origin = operations.origin || 'http://127.0.0.1:' + req.socket.localPort;
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
        throw new RequestError(403, 'ที่อยู่หรือ Origin ไม่ตรงกับที่กำหนด');
      }
      const url = new URL(req.url, origin);
      const path = url.pathname;
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      const checkAccess = () => {
        if (allowRequest(req)) return;
        if (token) {
          try { sessions.end(sessions.authenticate(token)); } catch {}
        }
        throw new RequestError(403, 'ไม่มีสิทธิ์เข้าถึง');
      };
      checkAccess();
      if (req.method === 'GET' && files.has(path)) {
        const [file, mime] = files.get(path);
        const body = await readFile(new URL('../web/' + file, import.meta.url));
        res.writeHead(200, { 'Content-Type': mime });
        res.end(body);
        return;
      }
      if (path === '/api/operations/restore' && req.method === 'POST' && operations.restore) {
        const role = operations.role(req);
        if (!role) throw new RequestError(403, 'เฉพาะ IT และ Phil เริ่มกู้ Backup ได้');
        const { snapshot } = await readJson(req);
        checkAccess();
        if (typeof snapshot !== 'string' || !/^\d{13}-[a-f0-9-]{36}$/.test(snapshot)) {
          throw new RequestError(400, 'รหัส Backup ไม่ถูกต้อง');
        }
        const report = await operations.restore(snapshot, role);
        reply(report.status === 'held' ? 409 : 200, report);
        return;
      }
      if (path === '/api/session' && req.method === 'POST') {
        const body = await readJson(req);
        checkAccess();
        const created = sessions.create(body.displayName);
        reply(201, { ...created, canReadAudit: allowAudit(req, created) });
        return;
      }
      const actor = sessions.authenticate(token);
      store.purge();
      if (path === '/api/session' && req.method === 'GET') {
        reply(200, { id: actor.id, displayName: actor.displayName, canReadAudit: allowAudit(req, actor) });
      } else if (path === '/api/session' && req.method === 'DELETE') {
        sessions.end(actor);
        reply(200, {});
      } else if (path === '/api/trash' && req.method === 'GET') {
        reply(200, store.trash());
      } else if (path === '/api/deletion-audit' && req.method === 'GET') {
        if (!allowAudit(req, actor)) throw new RequestError(403, 'สำหรับ IT เท่านั้น');
        reply(200, store.auditLog());
      } else if (path === '/api/pdca' && req.method === 'GET') {
        reply(200, store.search(url.searchParams.get('q') || ''));
      } else if (path === '/api/pdca' && req.method === 'POST') {
        const body = await readJson(req);
        checkAccess();
        sessions.authenticate(actor.token);
        reply(201, store.create(body.title));
      } else if (path.startsWith('/api/pdca/')) {
        const [, , , id, resource, subject, extra] = path.split('/');
        const method = req.method;
        if (extra !== undefined) throw new RequestError(404, 'ไม่พบรายการ');
        if (!resource && method === 'GET') {
          reply(200, store.load(id));
        } else if (!resource && method === 'PUT') {
          const body = await readJson(req);
          checkAccess();
          sessions.authenticate(actor.token);
          reply(200, store.apply(id, body, actor, input => sessions.authorize(actor, id, input)));
        } else if (resource === 'export' && method === 'GET' && Object.hasOwn(exportFormats, subject)) {
          const [mime, render] = exportFormats[subject];
          const data = exportData(store, id);
          const bytes = await render(data);
          checkAccess();
          sessions.authenticate(actor.token);
          if (store.revision(id) !== data.pdca.revision) {
            throw new RequestError(409, 'ผังเปลี่ยนระหว่างส่งออก กรุณาลองอีกครั้ง');
          }
          res.writeHead(200, { 'Content-Type': mime,
            'Content-Disposition': 'attachment; filename="PDCA-' + id + '.' + subject + '"' });
          res.end(bytes);
        } else if (resource === 'history' && method === 'GET') {
          reply(200, { revision: store.revision(id), entries: store.history(id) });
        } else if (resource === 'history' && subject && method === 'POST') {
          const { revision, tabId, tabToken, nodeTokens } = await readJson(req);
          checkAccess();
          sessions.authenticate(actor.token);
          const op = store.restoreOperation(id, Number(subject), revision);
          const input = { saveId: randomUUID(), guard: revision, ops: [op], uploads: [], tabId, tabToken, nodeTokens };
          reply(200, store.apply(id, input, actor, input => sessions.authorize(actor, id, input),
            op.kind === 'edge-add' ? op.id : undefined));
        } else if (resource === 'trash' && ['POST', 'DELETE'].includes(method)) {
          const { revision } = await readJson(req);
          checkAccess();
          sessions.authenticate(actor.token);
          const target = subject || id;
          const result = store.setVisibility(id, target, revision, method === 'DELETE', actor);
          if (result.revision === revision + 1) sessions.invalidate(id, subject);
          reply(200, result);
        } else if (resource === 'state' && method === 'GET') {
          const revision = store.revision(id);
          const info = sessions.state(actor, id, url.searchParams.get('tab'), url.searchParams.get('renew') !== '0');
          reply(200, { ...info, revision, ...(Number(url.searchParams.get('revision') ?? -1) !== revision &&
            { workspace: store.load(id) }) });
        } else if (resource === 'receipt' && subject && method === 'GET') {
          reply(200, { receipt: store.receipt(id, actor, subject) });
        } else if (resource === 'edit' && subject && method === 'POST') {
          const { tabId } = await readJson(req);
          checkAccess();
          if (!store.hasNode(id, subject)) throw new RequestError(404, 'ไม่พบ Node ใน PDCA นี้');
          const workspace = store.load(id);
          reply(200, { ...sessions.startEdit(actor, id, tabId, subject), workspace });
        } else if (['tab', 'lock'].includes(resource) && ['POST', 'DELETE'].includes(method)) {
          const body = await readJson(req);
          checkAccess();
          store.revision(id);
          const { tabId, tabToken, nodeToken, rotate } = body;
          if (resource === 'tab') {
            if (method === 'POST') reply(200, sessions.takeTab(actor, id, tabId, rotate === true));
            else { sessions.releaseTab(actor, id, tabId, tabToken); reply(200, {}); }
          } else {
            if (!store.hasNode(id, subject)) throw new RequestError(404, 'ไม่พบ Node ใน PDCA นี้');
            if (method === 'POST') reply(200, sessions.takeNode(actor, id, tabId, tabToken, subject));
            else { sessions.releaseNode(actor, id, tabId, tabToken, subject, nodeToken); reply(200, {}); }
          }
        } else throw new RequestError(404, 'ไม่พบรายการ');
      } else if (path.startsWith('/api/images/') && req.method === 'GET') {
        const { mime, bytes } = store.image(path.slice('/api/images/'.length));
        res.writeHead(200, { 'Content-Type': mime });
        res.end(bytes);
      } else {
        reply(404, { error: 'ไม่พบรายการ' });
      }
    } catch (error) {
      if (!(error instanceof RequestError)) console.error(error);
      reply(error.status || 500, { error: error.status ? error.message : 'ที่เก็บข้อมูลในเครื่องขัดข้อง',
        ...(error.code && error.status === 409 && { code: error.code }) });
    }
  });
  const timer = setInterval(() => {
    try { store.purge(); } catch (error) { console.error(error); }
  }, 60_000);
  timer.unref();
  server.once('close', () => clearInterval(timer));
  return server;
}

export async function startHost(env = process.env) {
  const port = Number(env.PDCA_PORT || 4173);
  const { file, auditFile, root, recoveryRoot, origin, ingress, authorize } = operationsConfig(env);
  const log = resolve(env.PDCA_OPS_LOG || resolve(dirname(file), 'operations.jsonl'));
  const lowSpaceBytes = Number(env.PDCA_LOW_SPACE_BYTES ?? 1024 ** 3);
  if (!Number.isSafeInteger(lowSpaceBytes) || lowSpaceBytes < 0) throw new Error('Invalid low-space threshold');
  const role = req => authorize(req.headers['x-pdca-operator-key']);
  const notify = event => {
    const line = JSON.stringify(event);
    try { appendFileSync(log, line + '\n'); } catch (error) { console.error('Operations log unavailable', error.message); }
    if (event.event !== 'backup-verified') console.error(line);
  };
  for (const path of [file, auditFile, log]) await mkdir(dirname(path), { recursive: true });
  const store = openStore(file, { auditFile });
  const allowRequest = req => !origin || secretMatches(req.headers['x-pdca-ingress-key'], ingress);
  let restoring = false;
  const server = makeServer(store, undefined, allowRequest, req => role(req) === 'IT', {
    origin, role,
    async restore(id, role) {
      if (restoring) throw new RequestError(409, 'กำลังกู้ Backup อีกชุด');
      restoring = true;
      try {
        const report = await runRecovery('restore', { id, role, root, recoveryRoot, file, auditFile });
        notify({ event: 'restore-' + report.status, stageId: report.stageId, role, at: report.completedAt });
        return report;
      } finally {
        restoring = false;
      }
    },
  });
  try {
    store.purge();
    await new Promise((ready, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        ready();
      });
    });
  } catch (error) {
    store.close();
    throw error;
  }
  const backups = startBackups({ file, auditFile, root, notify, lowSpaceBytes,
    snapshot: () => runRecovery('backup', { file, auditFile, root }),
  });
  return { server, backups, async stop() {
    await Promise.all([backups.stop(), new Promise(done => server.close(done))]);
    store.close();
  } };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const host = await startHost();
  console.log('PDCA BUILD 4 · http://127.0.0.1:' + host.server.address().port);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => host.stop());
}
