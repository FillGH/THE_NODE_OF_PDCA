import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('../../', import.meta.url)));
async function sha256(path) {
  const hash = createHash('sha256');
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}
async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Package contains symbolic link: ' + full);
    if (entry.isDirectory()) found.push(...await walk(full));
    else if (entry.isFile()) found.push(relative(root, full).replaceAll('\\', '/'));
    else throw new Error('Package contains unsupported entry: ' + full);
  }
  return found;
}
const manifest = JSON.parse(await readFile(join(root, 'DEPLOYMENT_MANIFEST.json'), 'utf8'));
for (const required of ['README.md', 'README4IT.md', 'tools/recovery/recovery-menu.cmd',
  'tools/recovery/recovery-menu.ps1', 'deployment/PREBUILT_WINDOWS.md']) {
  await stat(join(root, required));
}
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.kind, 'THE_NODE_OF_PDCA_WINDOWS_PREBUILT');
assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
assert.equal(manifest.runtime.platform, 'win32');
assert.equal(manifest.runtime.nodeMajor, 24);
assert.equal(process.platform, manifest.runtime.platform, 'Package requires a Windows host');
assert.equal(process.arch, manifest.runtime.arch, 'Package architecture mismatch');
assert.equal(Number(process.versions.node.split('.')[0]), manifest.runtime.nodeMajor, 'Node major mismatch');
assert.equal(process.version, manifest.build.nodeVersion, 'Node patch mismatch: rerun target environment validation and approve deviation before deployment');
assert.equal(await sha256(join(root, 'package-lock.json')), manifest.packageLockSha256);
const expected = manifest.files.map(file => file.path);
const actual = (await walk(root)).filter(path => path !== 'DEPLOYMENT_MANIFEST.json').sort();
assert.deepEqual(actual, [...expected].sort(), 'Package files differ from manifest');
for (const entry of manifest.files) {
  assert.equal(typeof entry.path, 'string');
  assert.ok(entry.path && !entry.path.startsWith('/') &&
    !entry.path.split('/').some(part => part === '..' || part === ''), 'Unsafe manifest path');
  const location = join(root, entry.path);
  assert.equal((await stat(location)).size, entry.bytes, 'Size mismatch: ' + entry.path);
  assert.equal(await sha256(location), entry.sha256, 'SHA-256 mismatch: ' + entry.path);
}
for (const [name, version] of Object.entries(manifest.directDependencies)) {
  const installed = JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8'));
  assert.equal(installed.version, version, 'Package version mismatch: ' + name);
}
console.log('PREBUILT VERIFY PASS: ' + manifest.sourceCommit + ' / ' + manifest.files.length + ' hashed files');
