import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const stage = resolve(process.argv[2] || '');
const sourceSha = process.argv[3];
const included = [
  'package.json', 'package-lock.json', 'src', 'web', 'demo', 'assets',
  'node_modules', 'tools/prebuilt/verify.mjs', 'tools/prebuilt/smoke.mjs',
  'tools/recovery/recovery-menu.ps1', 'test/recovery-operator.test.js',
  'PROJECT.md', 'AGENTS.md', 'design/BUILD4_HOST_RUNBOOK.md', 'design/PILOT_VERIFY.md',
  'design/IT_HANDOFF.md', 'deployment/PREBUILT_WINDOWS.md',
];

assert.equal(process.platform, 'win32', 'Build a Windows package on a Windows runner');
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Node.js 24 required');
assert.match(sourceSha || '', /^[0-9a-f]{40}$/, 'Supply the checked-out source commit SHA');
assert.ok(stage && stage !== resolve(root), 'Use a separate staging directory');

async function sha256(path) {
  const hash = createHash('sha256');
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}

async function walk(dir, base = dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlink prohibited in deployment ZIP: ' + path);
    if (entry.isDirectory()) result.push(...await walk(path, base));
    else if (entry.isFile()) result.push(relative(base, path).replaceAll('\\', '/'));
    else throw new Error('Unsupported file type in deployment ZIP: ' + path);
  }
  return result;
}

const packages = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const direct = packages.dependencies;
for (const [name, version] of Object.entries(direct)) {
  const installed = JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8'));
  assert.equal(installed.version, version, 'Missing or mismatched dependency: ' + name);
}
await mkdir(stage); // Intentionally fail if staging already exists; never overwrite a package.
for (const name of included) {
  const from = join(root, name);
  const to = join(stage, name);
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true, force: false, errorOnExist: true });
}
const paths = (await walk(stage)).sort();
const files = [];
for (const path of paths) {
  const location = join(stage, path);
  files.push({ path, bytes: (await stat(location)).size, sha256: await sha256(location) });
}
const manifest = {
  schemaVersion: 1,
  kind: 'THE_NODE_OF_PDCA_WINDOWS_PREBUILT',
  sourceCommit: sourceSha,
  packagedAtUtc: new Date().toISOString(),
  build: { platform: process.platform, arch: process.arch, nodeVersion: process.version },
  runtime: { nodeMajor: 24, platform: 'win32', arch: process.arch },
  packageLockSha256: await sha256(join(stage, 'package-lock.json')),
  directDependencies: direct,
  excludes: ['runtime databases', 'audit logs', 'backups', 'credentials', 'host.env'],
  files,
};
await writeFile(join(stage, 'DEPLOYMENT_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({
  event: 'prebuilt-staged', sourceCommit: sourceSha, fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  runtime: manifest.runtime,
}, null, 2));
