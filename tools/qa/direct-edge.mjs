import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {parseEnv} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';

const [stage,file]=process.argv.slice(2).map(p=>resolve(p));
const env=parseEnv(readFileSync(file,'utf8'));
const moduleAt=p=>import(pathToFileURL(join(stage,p)).href);
const {operationsConfig}=await moduleAt('src/ops.js');
const config=operationsConfig(env,{skipPointer:true});
// Exercise the exact documented seed command on the IT-prepared directory.
const seedEnv={...process.env,PDCA_DEMO_DIR:env.PDCA_DATA_ROOT};
const seedArgs=[join(stage,'demo/demo.mjs'),'seed','--existing-empty'];
const seed=spawnSync(process.execPath,seedArgs,{env:seedEnv,encoding:'utf8',timeout:120000});
assert.equal(seed.status,0,'Documented seed failed: '+seed.stderr);
assert.ok(existsSync(config.file)&&existsSync(config.auditFile));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const original=[hash(config.file),hash(config.auditFile),hash(file)];
const retry=spawnSync(process.execPath,seedArgs,{env:seedEnv,encoding:'utf8',timeout:20000});
assert.equal(retry.status,1,'Repeat seed must refuse existing data');
assert.match(retry.stderr,/requires an empty directory/);
assert.deepEqual([hash(config.file),hash(config.auditFile),hash(file)],original);
console.log('DIRECT SEED PASS: documented seed succeeded; repeat rejected; Workspace/Audit/config hashes unchanged');
const adopt=spawnSync(process.execPath,['--env-file='+file,join(stage,'src/ops.js'),'adopt','ADOPT'],
  {env:{...process.env,PDCA_OPERATOR_KEY:env.PDCA_IT_KEY},encoding:'utf8',timeout:20000});
assert.equal(adopt.status,0,'Local ADOPT did not complete');
const cmdargs=name=>['/d','/s','/c','""'+join(stage,'tools/direct',name+'.cmd')+'" "'+file+'""'];
const diagnose=spawnSync(process.env.ComSpec,cmdargs('diagnose'),{windowsVerbatimArguments:true,encoding:'utf8',timeout:20000});
assert.equal(diagnose.status,0,'Diagnose after ADOPT: '+diagnose.stderr);
const paths=[join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Microsoft','Edge','Application','msedge.exe'),
  join(process.env.ProgramFiles||'C:\\Program Files','Microsoft','Edge','Application','msedge.exe')];
const edge=paths.find(existsSync);
assert.ok(edge,'Microsoft Edge not found on Windows runner');
const browserDir=mkdtempSync(join(tmpdir(),'pdca-edge-'));
let host,browser,ws,seq=0;
const pending=new Map(),errors=[];
function kill(p) {if(p?.pid) spawnSync('taskkill.exe',['/PID',String(p.pid),'/T','/F'],{stdio:'ignore',timeout:15000});}
async function until(label,check,ms=25000) {
  const deadline=Date.now()+ms;
  let last;
  while(Date.now()<deadline) {
    try {const x=await check();if(x)return x;}catch(e){last=e;}
    await delay(250);
  }
  throw new Error(label+' timed out'+(last?': '+last.message:''));
}
function cdp(method,params={}) {
  const id=++seq;
  return new Promise((ok,fail)=>{
    const timer=setTimeout(()=>{pending.delete(id);fail(new Error('CDP timeout: '+method));},12000);
    pending.set(id,{ok,fail,timer});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails) throw new Error('Browser evaluation error: '+(r.exceptionDetails.exception?.description||r.exceptionDetails.text));
  return r.result.value;
}
try {
  host=spawn(process.env.ComSpec,cmdargs('start'),{windowsVerbatimArguments:true,stdio:'ignore'});
  await until('BAT starts HTTP host',async()=>{
    if(host.exitCode!==null) throw new Error('Start BAT exited '+host.exitCode);
    return (await fetch(config.origin+'/',{signal:AbortSignal.timeout(1500)})).status===200;
  });
  browser=spawn(edge,['--headless=new','--remote-debugging-port=0','--user-data-dir='+browserDir,
    '--no-first-run','--no-default-browser-check','--no-proxy-server','--disable-background-networking','about:blank'],
    {stdio:'ignore'});
  const debug=await until('Edge debugging endpoint',()=>{
    const path=join(browserDir,'DevToolsActivePort');
    return existsSync(path)&&readFileSync(path,'utf8').split(/\r?\n/)[0];
  });
  const target=await until('Edge page',async()=>{
    const r=await fetch('http://127.0.0.1:'+debug+'/json/list',{signal:AbortSignal.timeout(1500)});
    return (await r.json()).find(t=>t.type==='page');
  });
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{
    const timer=setTimeout(()=>fail(new Error('CDP WebSocket open timed out')),12000);
    ws.addEventListener('open',()=>{clearTimeout(timer);ok();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timer);fail(new Error('CDP WebSocket error'));},{once:true});
  });
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.fail(new Error(m.error.message)):p.ok(m.result);}
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  });
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Page.navigate',{url:config.origin+'/'});
  await until('Identity dialog',()=>evaluate("document.querySelector('#identityDialog')?.open === true"));
  const context=await evaluate("({secure:window.isSecureContext,randomUUID:typeof crypto.randomUUID,randomValues:typeof crypto.getRandomValues,origin:location.origin})");
  assert.equal(context.origin,config.origin);
  assert.equal(context.secure,false,'Must exercise actual insecure HTTP private-IP context');
  assert.equal(context.randomUUID,'undefined');
  assert.equal(context.randomValues,'function');
  await evaluate("document.querySelector('#displayName').value='Synthetic Edge tester';document.querySelector('#identityForm').requestSubmit();true");
  await until('Workspace login',()=>evaluate("!document.querySelector('#app').hidden && !document.querySelector('#createPdca').disabled"));
  await evaluate("document.querySelector('#createPdca').click();true");
  await until('Create PDCA dialog',()=>evaluate("document.querySelector('#pdcaDialog').open"));
  await evaluate("document.querySelector('#pdcaName').value='Direct Edge regression';document.querySelector('#pdcaForm').requestSubmit();true");
  await until('Canvas',()=>evaluate("!document.querySelector('#canvasPanel').hidden && !document.querySelector('#addGeneral').disabled"));
  await evaluate("document.querySelector('#addGeneral').click();true");
  await until('New Node dialog',()=>evaluate("document.querySelector('#newModal').open"));
  await evaluate("document.querySelector('#createTitle').value='HTTP UUID fallback node';document.querySelector('#nodeForm').requestSubmit();true");
  const login=await fetch(config.origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:'Synthetic second session'})});
  assert.equal(login.status,201);
  const actor=await login.json(), headers={Authorization:'Bearer '+actor.token};
  const saved=await until('Node committed and readable by separate Session',async()=>{
    const list=await (await fetch(config.origin+'/api/pdca',{headers})).json();
    const p=list.find(x=>x.title==='Direct Edge regression'&&x.nodeCount===1);
    if(!p)return;
    const graph=await(await fetch(config.origin+'/api/pdca/'+p.id,{headers})).json();
    return graph.nodes.find(n=>n.title==='HTTP UUID fallback node');
  });
  assert.match(saved.id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.deepEqual(errors,[],'Browser runtime exception(s)');
  console.log('DIRECT EDGE PASS: actual private-IP HTTP insecure context; real Edge login, create PDCA, create Node, autosave persisted UUID v4 and independent Session read; staged Diagnose/Start BAT PASS');
} finally {
  if(ws) ws.close();
  kill(browser);kill(host);
  await delay(500);
  try{rmSync(browserDir,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
}
