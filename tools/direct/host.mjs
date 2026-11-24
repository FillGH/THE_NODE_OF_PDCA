import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve, dirname, join, relative, basename } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { normalizeEnv, networkConfig } from '../../src/network-config.js';
import { operationsConfig } from '../../src/ops.js';
import { startHost } from '../../src/server.js';

const app = fileURLToPath(new URL('../../', import.meta.url));
const [action, rawFile, bind, port, rawRoot] = process.argv.slice(2);
function outsideApp(path) {
  const rel = relative(realpathSync(app), path);
  if (!rel || (!rel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && rel !== '..' && !isAbsolute(rel)))
    throw new Error('Config and data must be outside the extracted application directory');
}
function externalFile(raw) {
  if (!raw || !isAbsolute(raw)) throw new Error('Supply an absolute path to external host.env');
  const p = resolve(raw);
  const canonical = join(realpathSync(dirname(p)), basename(p));
  outsideApp(canonical);
  if (existsSync(p)) outsideApp(realpathSync(p));
  return canonical;
}
function cleanEnvironment() {
  if (Object.keys(process.env).some(k => k.toUpperCase().startsWith('PDCA_')))
    throw new Error('STOP: use a clean shell with no ambient PDCA_* environment variables');
}
function readConfig(file) {
  const source = readFileSync(file, 'utf8');
  const seen = new Set();
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line);
    if (!m || !m[1].startsWith('PDCA_') || seen.has(m[1])) throw new Error('Unsupported or duplicate host.env entry');
    seen.add(m[1]);
  }
  const env = parseEnv(source);
  if (!networkConfig(env).direct) throw new Error('Direct LAN config required');
  const normalized = normalizeEnv(env);
  outsideApp(normalized.PDCA_DATA_ROOT);
  return normalized;
}
function verifyPackage() {
  if (!existsSync(join(app,'DEPLOYMENT_MANIFEST.json'))) throw new Error('Use a verified extracted Windows package');
  const r = spawnSync(process.execPath,[join(app,'tools/prebuilt/verify.mjs'), app],{stdio:'inherit'});
  if (r.status !== 0) throw new Error('Package verification failed');
}
function summary(env, config) {
  return { mode:'DIRECT_HTTP_IT_ACL', url:config.origin, dataRoot:env.PDCA_DATA_ROOT,
    workspace:config.file, audit:config.auditFile, activePointer:env.PDCA_ACTIVE_DB_POINTER,
    backups:config.root, restore:config.recoveryRoot,
    networkAuthorization:'IT verification required; HTTP is not encrypted' };
}
try {
  cleanEnvironment();
  const file = externalFile(rawFile);
  if (action === 'setup') {
    verifyPackage();
    if (existsSync(file)) {
      if (bind || port || rawRoot) throw new Error('Existing host.env: use diagnose; never overwrite config');
      const env = readConfig(file);
      console.log(JSON.stringify(summary(env, operationsConfig(env,{skipPointer:!existsSync(env.PDCA_ACTIVE_DB_POINTER)})),null,2));
    } else {
      if (!bind || !port || !rawRoot || !isAbsolute(rawRoot)) throw new Error('Supply assigned private IPv4, port and existing empty absolute data directory');
      const root = realpathSync(rawRoot);
      outsideApp(root);
      if (!statSync(root).isDirectory() || readdirSync(root).length) throw new Error('Fresh setup requires an empty local data directory; existing data requires explicit reviewed migration');
      if (/["\r\n]/.test(root)) throw new Error('Unsupported data directory name');
      const env = {PDCA_BIND_HOST:bind, PDCA_PORT:port, PDCA_DATA_ROOT:root,
        PDCA_IT_KEY:randomBytes(32).toString('base64url'), PDCA_PHIL_KEY:randomBytes(32).toString('base64url')};
      const normalized = normalizeEnv(env);
      const config = operationsConfig(normalized,{skipPointer:true});
      writeFileSync(file,Object.entries(env).map(([k,v])=>k+'="'+v+'"').join('\n')+'\n',{flag:'wx',mode:0o600});
      console.log(JSON.stringify(summary(normalized,config),null,2));
      console.log('Config created only. IT must restrict NTFS ACL before seed/ADOPT. No database was created.');
    }
  } else if (action === 'diagnose' || action === 'start') {
    const env = readConfig(file);
    const config = operationsConfig(env);
    if (action === 'diagnose') {
      // No native journal rollback or data mutation here: report path/authority, not integrity PASS.
      if (!existsSync(config.file) || !existsSync(config.auditFile)) throw new Error('Active Workspace/Audit missing');
      console.log(JSON.stringify(summary(env,config),null,2));
      console.log('Config/active pair paths present; not full integrity or Firewall verification. Run local IT Status for strict integrity.');
    } else {
      const host = await startHost(env);
      console.log('PDCA LAN · '+config.origin);
      for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>host.stop().catch(e=>{console.error(e.message);process.exitCode=1;}));
    }
  } else throw new Error('Use setup <absolute host.env> [IPv4 port absolute-empty-data-root], diagnose <host.env>, start <host.env>');
} catch (error) {
  console.error('STOP: '+error.message);
  process.exitCode=1;
}
