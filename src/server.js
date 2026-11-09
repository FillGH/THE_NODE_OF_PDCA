import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openStore, RequestError } from './store.js';
import { collaboration } from './collaboration.js';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/canvas.css', ['canvas.css', 'text/css; charset=utf-8']],
  ['/canvas.js', ['canvas.js', 'text/javascript; charset=utf-8']],
  ['/model.js', ['model.js', 'text/javascript; charset=utf-8']],
  ['/changes.js', ['changes.js', 'text/javascript; charset=utf-8']],
  ['/session.js', ['session.js', 'text/javascript; charset=utf-8']],
  ['/autosave.js', ['autosave.js', 'text/javascript; charset=utf-8']],
  ['/workspaces.js', ['workspaces.js', 'text/javascript; charset=utf-8']],
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

export function makeServer(store, sessions = collaboration(), allowRequest = () => true) {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; object-src 'none'; frame-ancestors 'none'");
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };
    try {
      const expectedHost = '127.0.0.1:' + req.socket.localPort;
      if (req.headers.host !== expectedHost || (req.headers.origin && req.headers.origin !== 'http://' + expectedHost)) {
        throw new RequestError(403, 'ใช้ที่อยู่ localhost ที่แสดงเมื่อเริ่มโปรแกรม');
      }
      const url = new URL(req.url, 'http://' + expectedHost);
      const path = url.pathname;
      if (req.method === 'GET' && files.has(path)) {
        const [file, mime] = files.get(path);
        const body = await readFile(new URL('../web/' + file, import.meta.url));
        res.writeHead(200, { 'Content-Type': mime });
        res.end(body);
        return;
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      const checkAccess = () => {
        if (allowRequest(req)) return;
        if (token) {
          try { sessions.end(sessions.authenticate(token)); } catch {}
        }
        throw new RequestError(403, 'ไม่มีสิทธิ์เข้าถึง');
      };
      checkAccess();
      if (path === '/api/session' && req.method === 'POST') {
        const body = await readJson(req);
        checkAccess();
        reply(201, sessions.create(body.displayName));
        return;
      }
      const actor = sessions.authenticate(token);
      if (path === '/api/session' && req.method === 'GET') {
        reply(200, { id: actor.id, displayName: actor.displayName });
      } else if (path === '/api/session' && req.method === 'DELETE') {
        sessions.end(actor);
        reply(200, {});
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
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PDCA_PORT || 4173);
  const file = resolve(process.env.PDCA_DB || '.pdca-dev/pdca.sqlite');
  await mkdir(dirname(file), { recursive: true });
  const store = openStore(file);
  const server = makeServer(store);
  server.listen(port, '127.0.0.1', () => {
    console.log('PDCA BUILD 2 · fictional data only · http://127.0.0.1:' + server.address().port);
    console.log('Development database: ' + file);
  });
}
