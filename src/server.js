import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openStore, RequestError } from './store.js';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/canvas.css', ['canvas.css', 'text/css; charset=utf-8']],
  ['/canvas.js', ['canvas.js', 'text/javascript; charset=utf-8']],
  ['/model.js', ['model.js', 'text/javascript; charset=utf-8']],
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

export function makeServer(store) {
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
      } else if (path === '/api/pdca' && req.method === 'GET') {
        reply(200, store.search(url.searchParams.get('q') || ''));
      } else if (path === '/api/pdca' && req.method === 'POST') {
        const body = await readJson(req);
        reply(201, store.create(body.title));
      } else if (path.startsWith('/api/pdca/') && req.method === 'GET') {
        reply(200, store.load(path.slice('/api/pdca/'.length)));
      } else if (path.startsWith('/api/pdca/') && req.method === 'PUT') {
        const body = await readJson(req);
        reply(200, store.save(path.slice('/api/pdca/'.length), body));
      } else if (path.startsWith('/api/images/') && req.method === 'GET') {
        const { mime, bytes } = store.image(path.slice('/api/images/'.length));
        res.writeHead(200, { 'Content-Type': mime });
        res.end(bytes);
      } else {
        reply(404, { error: 'ไม่พบรายการ' });
      }
    } catch (error) {
      if (!(error instanceof RequestError)) console.error(error);
      reply(error.status || 500, { error: error.status ? error.message : 'ที่เก็บข้อมูลในเครื่องขัดข้อง' });
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
    console.log('PDCA BUILD 1 · fictional data only · http://127.0.0.1:' + server.address().port);
    console.log('Development database: ' + file);
  });
}
