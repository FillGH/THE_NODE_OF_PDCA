import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,renameSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {parseEnv} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
const [delivery,ip,port,source]=process.argv.slice(2);
const root=join(dirname(delivery),'THE NODE OF PDCA'),cfg=join(root,'Configuration','host.env'),data=join(root,'Data'),app=join(root,'Application'),maintenance=join(root,'Maintenance');
let bundle=delivery;
const url='http://'+ip+':'+port;
function args(name){return ['/d','/s','/c','""'+join(name==='SETUP'?bundle:root,name+'.cmd')+'" --no-browser"'];}
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
  const res=await fetch(url+'/api/pdca',{headers:{Authorization:'Bearer '+actor.token}});
  assert.equal(res.status,200);return JSON.parse(await res.text());
}
try{
  const old=join(dirname(delivery),'Existing Legacy');
  mkdirSync(old);mkdirSync(join(old,'data-abcdef012345'));writeFileSync(join(old,'data-abcdef012345','sentinel.txt'),'preserve');
  const blocked=sync('SETUP',old+'\r\n');
  assert.equal(blocked.status,1);assert.match(blocked.stdout+blocked.stderr,/Existing installation or unrelated files/);
  assert.equal(readFileSync(join(old,'data-abcdef012345','sentinel.txt'),'utf8'),'preserve');
  const same=sync('SETUP',delivery+'\r\n');assert.equal(same.status,1);assert.match(same.stdout+same.stderr,/Install outside/);
  const bad=sync('SETUP','\r\n8.8.8.8\r\n'+port+'\r\n');
  assert.equal(bad.status,1);assert.match(bad.stdout+bad.stderr,/Invalid endpoint/);assert.ok(!existsSync(root));
  const badPort=sync('SETUP','\r\n'+ip+'\r\n80\r\n');
  assert.equal(badPort.status,1);assert.match(badPort.stdout+badPort.stderr,/Invalid endpoint/);assert.ok(!existsSync(root));
  const custom=join(dirname(delivery),'Custom Install (IT)');
  const customCancel=sync('SETUP',custom+'\r\n'+ip+'\r\n'+port+'\r\nNO\r\n');
  assert.equal(customCancel.status,1);assert.match(customCancel.stdout+customCancel.stderr,/Cancelled before config/);
  assert.deepEqual(readdirSync(custom).sort(),['Configuration','Data']);
  assert.ok(!readdirSync(join(custom,'Configuration')).length&&!readdirSync(join(custom,'Data')).length);
  const cancelled=sync('SETUP','\r\n'+ip+'\r\n'+port+'\r\nNO\r\n');
  assert.equal(cancelled.status,1);assert.match(cancelled.stdout+cancelled.stderr,/Cancelled before config/);
  assert.ok(!existsSync(cfg)&&!readdirSync(data).length);
  renameSync(join(delivery,'PDCA.zip'),join(delivery,'PDCA Test.zip'));
  const first=await launch('SETUP','\r\n'+ip+'\r\n'+port+'\r\nGO\r\n');
  assert.match(first,/SETUP READY/);assert.ok(existsSync(join(data,'active-db.json')));
  const prompts=['First-time Setup','You will choose an install folder','[1/4] Choose where','Press Enter to use the recommended folder.','OR type or paste a full Windows folder path','must already exist','Install folder (Enter = recommended):','Selected folder:','[2/4] Enter the IP address','There is no default IP.','IP address:','[3/4] Enter the network port','ONLY if IT has approved','Port (Enter = 4175):','[4/4] Review and confirm installation','Application URL: '+url,'Type GO and press Enter','Press Enter without GO to cancel','Confirm installation (GO = install):','Installing the application.','SETUP READY:'];
  let previous=-1;
  for(const message of prompts){
    const pos=first.indexOf(message,previous+1);
    assert.ok(pos>previous,'Missing or out-of-order guidance: '+message);
    previous=pos;
  }
  console.log('GUIDED SETUP PASS: overview and all four instructions precede their inputs; selected path/URL and cancellation guidance displayed.');
  const env=parseEnv(readFileSync(cfg,'utf8'));
  assert.ok(!first.includes(env.PDCA_IT_KEY)&&!first.includes(env.PDCA_PHIL_KEY));
  assert.deepEqual(readdirSync(root).sort(),['Application','Configuration','Data','Maintenance','START.cmd'].sort());
  assert.deepEqual(readdirSync(maintenance).sort(),['README4IT.html','RECOVERY.cmd','launcher.mjs'].sort());
  assert.equal(JSON.parse(readFileSync(join(app,'DEPLOYMENT_MANIFEST.json'),'utf8')).sourceCommit,source);
  assert.match(readFileSync(join(maintenance,'RECOVERY.cmd'),'utf8'),/Application\\tools\\recovery\\recovery-menu\.cmd/);
  assert.match(readFileSync(join(maintenance,'RECOVERY.cmd'),'utf8'),/Configuration\\host\.env/);
  const before=await projects();
  await stop();
  const configBefore=readFileSync(cfg),pointerBefore=readFileSync(join(data,'active-db.json'));
  bundle=join(dirname(delivery),'Archived Delivery');renameSync(delivery,bundle);
  const repeat=sync('SETUP',root+'\r\n');
  assert.equal(repeat.status,1);assert.match(repeat.stdout+repeat.stderr,/Existing installation or unrelated files/);
  assert.deepEqual(readFileSync(cfg),configBefore);assert.deepEqual(readFileSync(join(data,'active-db.json')),pointerBefore);
  const again=await launch('START','');assert.ok(!again.includes('SETUP READY'));
  assert.deepEqual(await projects(),before);
  assert.ok(!again.includes(env.PDCA_IT_KEY)&&!again.includes(env.PDCA_PHIL_KEY));
  console.log('DOUBLE CLICK PASS: actual CMD, cancellation, one GO, seed/adopt/status, exact five-item installed tree, renamed ZIP, invalid endpoint refused, legacy target refused, delivery moved away, restart, repeat refusal, no key in output.');
}finally{await stop();}
const env=parseEnv(readFileSync(cfg,'utf8'));
const status=spawnSync(process.execPath,['--env-file='+cfg,join(app,'src/ops.js'),'status'],{env:{...process.env,PDCA_OPERATOR_KEY:env.PDCA_IT_KEY},encoding:'utf8'});
assert.equal(status.status,0,'Installed recovery Status failed');
assert.ok(JSON.parse(status.stdout).current);
console.log('INSTALLED RECOVERY STATUS PASS: actual ops with installed configuration/data after delivery moved.');
const verified=spawnSync(process.execPath,[join(app,'tools/prebuilt/verify.mjs'),app],{stdio:'inherit'});
assert.equal(verified.status,0);
