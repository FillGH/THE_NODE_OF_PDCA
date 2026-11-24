// CI-only fixture selection. Never imported by production or packaged for IT.
import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';
import { privateIPv4, networkConfig } from '../../src/network-config.js';

async function probe(ip, port) {
  const server = createServer(socket => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({host: ip, port, exclusive: true}, resolve);
  });
  const endpoint = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return endpoint.port;
}

const addresses = [...new Set(Object.values(networkInterfaces()).flat()
  .filter(n => n && !n.internal && privateIPv4(n.address)).map(n => n.address))];
let selected;
for (const ip of addresses) {
  try {
    const port = await probe(ip, 0);
    networkConfig({PDCA_BIND_HOST:ip, PDCA_PORT:String(port)});
    await probe(ip, port); // test the exact fixed endpoint that Setup will receive
    selected = {ip, port};
    break;
  } catch (error) {
    console.error('DIRECT PREFLIGHT candidate rejected: ' + ip + ' ' + (error.code || 'VALIDATION') + ' ' + error.message);
  }
}
if (!selected) {
  console.error('DIRECT PREFLIGHT FAIL: no bindable assigned RFC1918 endpoint; no installation attempted');
  process.exitCode = 1;
} else {
  // Only JSON on stdout; diagnostic lines go to stderr.
  console.log(JSON.stringify(selected));
}
