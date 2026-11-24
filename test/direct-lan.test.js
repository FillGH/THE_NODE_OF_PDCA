import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, symlinkSync, linkSync } from 'node:fs';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { networkConfig, normalizeEnv, privateIPv4, pathUnderRoot } from '../src/network-config.js';
import { acquireManagedLease, rejectUnmanagedManagedRoot } from '../src/host-exclusion.js';
import { adoptActive, rollbackActive, readDeletionAudit } from '../src/active-db.js';
import { operationsConfig } from '../src/ops.js';
import { openStore } from '../src/store.js';
import { startHost } from '../src/server.js';
import { uuidV4 } from '../web/uuid.js';

const cwd=fileURLToPath(new URL('../',import.meta.url));
const it='A'.repeat(32), phil='B'.repeat(32);
const assigned=Object.values(networkInterfaces()).flat().find(x=>x && !x.internal && privateIPv4(x.address))?.address;
function root(t) {const dir=mkdtempSync(join(tmpdir(),'pdca-direct-')); t.after(()=>rmSync(dir,{recursive:true,force:true,maxRetries:5}));return dir;}
async function freePort(ip) {
  const s=createServer();await new Promise((ok,fail)=>s.once('error',fail).listen(0,ip,ok));
  const p=s.address().port;await new Promise(ok=>s.close(ok));return p;
}
async function fixture(t, direct=false) {
  const dir=root(t), bind=direct?assigned:'127.0.0.1', port=await freePort(bind);
  const minimal={PDCA_BIND_HOST:bind,PDCA_PORT:String(port),PDCA_DATA_ROOT:dir,PDCA_IT_KEY:it,PDCA_PHIL_KEY:phil};
  const env=direct?normalizeEnv(minimal):{...minimal,PDCA_DB:join(dir,'workspace.sqlite'),PDCA_AUDIT:join(dir,'workspace.sqlite.audit.sqlite'),PDCA_ACTIVE_DB_POINTER:join(dir,'active-db.json'),PDCA_BACKUP_DIR:join(dir,'backups'),PDCA_RESTORE_DIR:join(dir,'restore'),PDCA_OPS_LOG:join(dir,'operations.jsonl')};
  const s=openStore(env.PDCA_DB,{auditFile:env.PDCA_AUDIT});s.create('Synthetic Direct IP');s.close();
  await adoptActive(env,'IT','ADOPT');
  return {dir,env,minimal,bind,port};
}

test('DIRECT-01 exact assigned RFC1918, strict origin, explicit port and safe local default',()=>{
  const nic={lan:[{address:'192.168.1.50',internal:false}]};
  assert.equal(networkConfig({},nic).bind,'127.0.0.1');
  assert.equal(networkConfig({PDCA_PORT:'0'},nic).port,0);
  const valid={PDCA_BIND_HOST:'192.168.1.50',PDCA_PORT:'4175'};
  assert.equal(networkConfig(valid,nic).origin,'http://192.168.1.50:4175');
  for(const bad of ['','0.0.0.0','192.168.1.51','8.8.8.8','localhost','::','127.0.0.2','169.254.1.2','172.32.0.1'])
    assert.throws(()=>networkConfig({...valid,PDCA_BIND_HOST:bad},nic),/assigned RFC1918/);
  for(const bad of ['0','80','abc','65536','3.5','1e4'])
    assert.throws(()=>networkConfig({...valid,PDCA_PORT:bad},nic),/Invalid PDCA_PORT/);
  assert.throws(()=>networkConfig({...valid,PDCA_ORIGIN:'https://192.168.1.50:4175'},nic),/derived HTTP/);
  assert.throws(()=>networkConfig({...valid,PDCA_INGRESS_KEY:it},nic),/no proxy ingress/);
});

test('DIRECT-02 cryptographic UUID fallback keeps v4/variant and 1000 unique IDs',()=>{
  const fallback={getRandomValues:bytes=>webcrypto.getRandomValues(bytes)};
  const ids=new Set(Array.from({length:1000},()=>uuidV4(fallback)));
  assert.equal(ids.size,1000);
  for(const id of ids) assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.throws(()=>uuidV4({}),/randomness unavailable/);
});

test('DIRECT-03 managed root and reserved lease path guard',t=>{
  const dir=root(t);
  assert.throws(()=>pathUnderRoot(dir,join(dir,'..','other.sqlite')),/outside/);
  assert.throws(()=>pathUnderRoot(dir,join(dir,'.pdca-host-exclusion.sqlite')),/Reserved/);
  assert.equal(pathUnderRoot(dir,join(dir,'not-yet','file')),join(dir,'not-yet','file'));
});

test('DIRECT-04 running managed Host denies other Host and recovery on different port; retains pointer',async t=>{
  const f=await fixture(t);
  const host=await startHost(f.env);
  const pointer=readFileSync(f.env.PDCA_ACTIVE_DB_POINTER,'utf8');
  try {
    const alt={...f.env,PDCA_PORT:String(await freePort(f.bind))};
    await assert.rejects(startHost(alt),/occupied|exclusion/);
    const r=spawnSync(process.execPath,['src/ops.js','rollback','ROLLBACK'],{cwd,env:{...process.env,...alt,PDCA_OPERATOR_KEY:it},encoding:'utf8',timeout:15000});
    assert.equal(r.status,1);assert.match(r.stderr,/occupied|exclusion/);
    assert.equal(readFileSync(f.env.PDCA_ACTIVE_DB_POINTER,'utf8'),pointer);
  } finally {await host.stop();}
  const restarted=await startHost(f.env);await restarted.stop();
});

test('DIRECT-05 independent maintenance lease blocks Host and releases after process termination',async t=>{
  const f=await fixture(t);
  const code="import {acquireManagedLease} from './src/host-exclusion.js'; const release=acquireManagedLease(process.env); console.log('HELD'); setInterval(()=>{},1000);";
  const child=spawn(process.execPath,['--input-type=module','-e',code],{cwd,env:{...process.env,...f.env},stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');
  try {
    const [buf]=await Promise.race([once(child.stdout,'data'),exited.then(()=>{throw new Error('Lease child exited before HELD');})]);
    assert.match(String(buf),/HELD/);
    await assert.rejects(startHost(f.env),/occupied|exclusion/);
  } finally {child.kill();await exited;}
  const host=await startHost(f.env);await host.stop();
  assert.equal(existsSync(join(f.dir,'.pdca-host-exclusion.sqlite')),true);
});

test('DIRECT-06 actual private NIC HTTP / session / strict headers / managed data authority', {skip:!assigned}, async t=>{
  const f=await fixture(t,true);
  const config=operationsConfig(f.minimal);
  assert.equal(config.file,f.env.PDCA_DB);assert.equal(config.auditFile,f.env.PDCA_AUDIT);
  assert.equal(config.direct,true);
  const host=await startHost(f.minimal);
  const base=config.origin;
  const request=(path,method='GET',body,headers={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  try {
    assert.equal(host.server.address().address,assigned);
    assert.equal((await request('/')).status,200);
    assert.equal((await request('/uuid.js')).status,200);
    const login=await request('/api/session','POST',{displayName:'Synthetic tester'},{Origin:base});
    assert.equal(login.status,201);const actor=await login.json();assert.ok(actor.token);assert.equal(actor.canReadAudit,false);
    const headers={Authorization:'Bearer '+actor.token};
    const listing=await request('/api/pdca','GET',undefined,headers);
    assert.equal(listing.status,200);
    for(const h of [{Origin:'http://example.invalid'},{'X-Pdca-Operator-Key':it},{'X-Pdca-Ingress-Key':it},{'X-Forwarded-For':'127.0.0.1'},{Forwarded:'for=127.0.0.1'}])
      assert.equal((await request('/','GET',undefined,h)).status,403);
    assert.equal((await request('/api/deletion-audit','GET',undefined,{...headers,'X-Pdca-Operator-Key':it})).status,403);
    assert.equal((await request('/api/operations/restore','POST',{snapshot:'fake'},{...headers,'X-Pdca-Operator-Key':it})).status,403);
    const alt={...f.env,PDCA_BIND_HOST:'127.0.0.1',PDCA_PORT:String(await freePort('127.0.0.1'))};
    await assert.rejects(rollbackActive(alt,'IT','ROLLBACK'),/occupied|exclusion/);
    assert.equal((await request('/api/session','DELETE',undefined,headers)).status,200);
  } finally {await host.stop();}
});

test('DIRECT-07 minimal configuration fails closed before ADOPT and preserves explicit paths',{skip:!assigned},t=>{
  const dir=root(t);
  const min={PDCA_BIND_HOST:assigned,PDCA_PORT:'4175',PDCA_DATA_ROOT:dir,PDCA_IT_KEY:it,PDCA_PHIL_KEY:phil};
  assert.throws(()=>operationsConfig(min),/pointer missing/);
  assert.equal(existsSync(join(dir,'workspace.sqlite')),false);
  assert.throws(()=>operationsConfig({...min,PDCA_PHIL_KEY:it},{skipPointer:true}),/Invalid Host origin or operation keys/);
  const normalized=normalizeEnv({...min,PDCA_DB:join(dir,'legacy.sqlite')});
  assert.equal(normalized.PDCA_AUDIT,join(dir,'legacy.sqlite.audit.sqlite'));
  assert.equal(normalized.PDCA_ACTIVE_DB_POINTER,join(dir,'active-db.json'));
});

test('DIRECT-08 Windows launcher contracts do not invoke npm, change firewall or overwrite config',()=>{
  for(const n of ['setup','start','diagnose']) {
    const body=readFileSync(join(cwd,'tools/direct',n+'.cmd'),'utf8');
    assert.match(body,/node .*host\.mjs/);
    assert.doesNotMatch(body,/\bnpm\b|netsh|New-NetFirewallRule/i);
  }
  const s=readFileSync(join(cwd,'tools/direct/host.mjs'),'utf8');
  assert.match(s,/flag:'wx'/);assert.match(s,/randomBytes\(32\)/);
});

test('DIRECT-09 local IT audit preserved and unmanaged bypass blocked',async t=>{
  const f=await fixture(t);
  const host=await startHost(f.env);
  try {
    const unmanaged={...f.env};delete unmanaged.PDCA_ACTIVE_DB_POINTER;
    await assert.rejects(startHost(unmanaged),/managed data root/);
    await assert.rejects(readDeletionAudit(f.env,'IT'),/occupied|exclusion/);
  }finally{await host.stop();}
  await assert.rejects(readDeletionAudit(f.env,'Phil'),/IT authorization/);
  assert.deepEqual((await readDeletionAudit(f.env,'IT')).events,[]);
  const wrong=spawnSync(process.execPath,['src/ops.js','deletion-audit'],{cwd,env:{...process.env,...f.env,PDCA_OPERATOR_KEY:phil},encoding:'utf8',timeout:15000});
  assert.equal(wrong.status,1);assert.match(wrong.stderr,/IT authorization/);
});

test('DIRECT-10 unmanaged file symlink and directory junction cannot bypass managed Host',async t=>{
  const f=await fixture(t), aliases=root(t);
  const workspace=join(aliases,'workspace-link.sqlite'), audit=join(aliases,'audit-link.sqlite');
  symlinkSync(f.env.PDCA_DB,workspace,'file');
  symlinkSync(f.env.PDCA_AUDIT,audit,'file');
  const junction=join(aliases,'managed-dir');
  symlinkSync(f.dir,junction,process.platform==='win32'?'junction':'dir');
  const host=await startHost(f.env);
  try {
    const unmanaged={PDCA_PORT:String(await freePort(f.bind)),PDCA_DB:workspace,PDCA_AUDIT:audit};
    await assert.rejects(startHost(unmanaged),/managed data root/);
    await assert.rejects(startHost({...unmanaged,PDCA_DB:join(junction,'workspace.sqlite'),PDCA_AUDIT:join(junction,'workspace.sqlite.audit.sqlite')}),/managed data root/);
    assert.throws(()=>rejectUnmanagedManagedRoot(join(junction,'missing.sqlite'),audit),/managed data root/);
    // One aliased member is sufficient for denial; do not require both aliases.
    assert.throws(()=>rejectUnmanagedManagedRoot(join(aliases,'missing.sqlite'),audit),/managed data root/);
  } finally { await host.stop(); }
});

test('DIRECT-11 hard links and dangling aliases fail closed',async t=>{
  const f=await fixture(t), aliases=root(t);
  const hard=join(aliases,'workspace-hard.sqlite');
  linkSync(f.env.PDCA_DB,hard);
  assert.throws(()=>rejectUnmanagedManagedRoot(hard,f.env.PDCA_AUDIT),/hard link/);
  assert.throws(()=>pathUnderRoot(f.dir,f.env.PDCA_DB),/hard link/);
  await assert.rejects(startHost(f.env),/hard link/);
  rmSync(hard);
  const dangling=join(aliases,'dangling.sqlite');
  symlinkSync(join(aliases,'missing.sqlite'),dangling,'file');
  assert.throws(()=>rejectUnmanagedManagedRoot(dangling,f.env.PDCA_AUDIT),/cannot admit unmanaged database/);
  const host=await startHost(f.env);await host.stop();
});

test('DIRECT-12 occupied private endpoint refuses ADOPT without mutating pair or pointer', {skip:!assigned}, async t=>{
  const dir=root(t);
  const listener=createServer(socket=>socket.destroy());
  await new Promise((ok,fail)=>listener.once('error',fail).listen({host:assigned,port:0,exclusive:true},ok));
  try {
    const env=normalizeEnv({PDCA_BIND_HOST:assigned,PDCA_PORT:String(listener.address().port),PDCA_DATA_ROOT:dir,PDCA_IT_KEY:it,PDCA_PHIL_KEY:phil});
    const store=openStore(env.PDCA_DB,{auditFile:env.PDCA_AUDIT});
    try {store.create('Synthetic blocked ADOPT');} finally {store.close();}
    const before=[readFileSync(env.PDCA_DB),readFileSync(env.PDCA_AUDIT)];
    await assert.rejects(adoptActive(env,'IT','ADOPT'),/port is occupied or cannot be reserved/);
    assert.equal(existsSync(env.PDCA_ACTIVE_DB_POINTER),false);
    assert.deepEqual([readFileSync(env.PDCA_DB),readFileSync(env.PDCA_AUDIT)],before);
    // Lease must be released even after the failed socket reservation.
    const release=acquireManagedLease(env);release();
  } finally {await new Promise((ok,fail)=>listener.close(e=>e?fail(e):ok()));}
});
