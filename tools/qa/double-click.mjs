import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseEnv} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
const [root,ip,port,source]=process.argv.slice(2);
const id=source.slice(0,12),cfg=join(root,'config-'+id,'host.env'),data=join(root,'data-'+id),app=join(root,'app-'+id);
const url='http://'+ip+':'+port;
function args(name){return ['/d','/s','/c','""'+join(root,name+'.cmd')+'" --no-browser"'];}
function sync(name,input){return spawnSync(process.env.ComSpec,args(name),{windowsVerbatimArguments:true,input,encoding:'utf8',timeout:240000});}
let host;
async function launch(name,input){
  let output='';
  host=spawn(process.env.ComSpec,args(name),{windowsVerbatimArguments:true,stdio:['pipe','pipe','pipe']});
  host.stdout.on('data',b=>output+=b);host.stderr.on('data',b=>output+=b);
  host.stdin.end(input||'');
  const until=Date.now()+240000;
  while(Date.now()<until){
    if(host.exitCode!==null)throw Error('Launcher exited: '+output);
    if(output.includes('Ready: '+url)){
      try{const r=await fetch(url+'/',{signal:AbortSignal.timeout(2000)});if(r.status===200)return output;}catch{}
    }
    await delay(300);
  }
  throw Error('Launcher timed out');
}
async function stop(){
  if(host?.pid){spawnSync('taskkill.exe',['/PID',String(host.pid),'/T','/F'],{stdio:'ignore'});await delay(800);host=null;}
}
async function projects(){
  const login=await fetch(url+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:'Double-click QA'})});
  assert.equal(login.status,201);const actor=await login.json();
  const res=await fetch(url+'/api/pdcas',{headers:{Authorization:'Bearer '+actor.token}});
  assert.equal(res.status,200);return JSON.parse(await res.text());
}
try{
  const cancelled=sync('SETUP',ip+'\r\n'+port+'\r\nNO\r\n');
  assert.equal(cancelled.status,1);assert.match(cancelled.stdout+cancelled.stderr,/Cancelled before config/);
  assert.ok(!existsSync(cfg)&&!readdirSync(data).length);
  const first=await launch('SETUP',ip+'\r\n'+port+'\r\nGO\r\n');
  assert.match(first,/SETUP READY/);assert.ok(existsSync(join(data,'active-db.json')));
  const env=parseEnv(readFileSync(cfg,'utf8'));
  assert.ok(!first.includes(env.PDCA_IT_KEY)&&!first.includes(env.PDCA_PHIL_KEY));
  const before=await projects();
  await stop();
  const configBefore=readFileSync(cfg),pointerBefore=readFileSync(join(data,'active-db.json'));
  const repeat=sync('SETUP','');
  assert.equal(repeat.status,1);assert.match(repeat.stdout+repeat.stderr,/Existing config\/data/);
  assert.deepEqual(readFileSync(cfg),configBefore);assert.deepEqual(readFileSync(join(data,'active-db.json')),pointerBefore);
  const again=await launch('START','');assert.ok(!again.includes('SETUP READY'));
  assert.deepEqual(await projects(),before);
  assert.ok(!again.includes(env.PDCA_IT_KEY)&&!again.includes(env.PDCA_PHIL_KEY));
  console.log('DOUBLE CLICK PASS: actual CMD, cancellation, one GO, seed/adopt/status, restart, repeat refusal, no key in output.');
}finally{await stop();}
const verified=spawnSync(process.execPath,[join(app,'tools/prebuilt/verify.mjs'),app],{stdio:'inherit'});
assert.equal(verified.status,0);
