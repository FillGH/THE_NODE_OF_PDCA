// Windows synthetic onboarding. Reuse existing managed Host and authenticated ops.
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,realpathSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createInterface} from 'node:readline';
import {createServer,isIPv4} from 'node:net';
const DELIVERY = null;
const base=dirname(fileURLToPath(import.meta.url)),root=dirname(base);
const id=DELIVERY?.source?.slice(0,12);
const app=join(root,'app-'+id),cfg=join(root,'config-'+id),data=join(root,'data-'+id),config=join(cfg,'host.env');
const mode=process.argv[2],noBrowser=process.argv.includes('--no-browser');
function fail(s){throw Error(s);}
function directory(path,empty=false){
  const s=lstatSync(path);
  if(!s.isDirectory()||s.isSymbolicLink()||realpathSync(path).toLowerCase()!==resolve(path).toLowerCase())fail('Not a safe local directory: '+path);
  if(empty&&readdirSync(path).length)fail('Existing config/data; never overwrite or seed again: '+path);
}
function run(args,extra={}){
  const r=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,...extra}});
  if(r.error||r.status!==0)fail('Operation failed; preserve existing files and contact IT.');
}
function manifest(){
  directory(app);
  const m=JSON.parse(readFileSync(join(app,'DEPLOYMENT_MANIFEST.json'),'utf8'));
  if(m.profile!=='direct-ip'||m.sourceCommit!==DELIVERY.source)fail('Wrong candidate.');
}
function readConfig(){
  directory(cfg);directory(data);
  if(!lstatSync(config).isFile()||lstatSync(config).isSymbolicLink())fail('Invalid config file.');
  const env=parseEnv(readFileSync(config,'utf8'));
  if(!env.PDCA_DATA_ROOT||resolve(env.PDCA_DATA_ROOT).toLowerCase()!==data.toLowerCase())fail('Unexpected data directory; use IT migration procedure.');
  return env;
}
function privateIp(ip){if(typeof ip!=='string'||!isIPv4(ip))return false;const [a,b]=ip.split('.').map(Number);return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168);}
async function bindCheck(ip,port){
  const s=createServer();
  await new Promise((ok,bad)=>{s.once('error',bad);s.listen({host:ip,port,exclusive:true},ok);});
  await new Promise((ok,bad)=>s.close(e=>e?bad(e):ok()));
}
function openBrowser(url){
  const c=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{stdio:'ignore',detached:true,windowsHide:true});
  c.on('error',()=>console.log('Open this URL manually: '+url));c.unref();
}
async function start(){
  manifest();
  const env=readConfig(),ip=env.PDCA_BIND_HOST,port=Number(env.PDCA_PORT);
  if(!privateIp(ip)||!Number.isInteger(port)||port<1024||port>65535)fail('Invalid configured private endpoint.');
  run([join(app,'tools/direct/host.mjs'),'diagnose',config]);
  const url='http://'+ip+':'+port;
  const child=spawn(process.execPath,[join(app,'tools/direct/host.mjs'),'start',config],{stdio:['inherit','pipe','inherit']});
  let output='',opened=false;
  child.stdout.on('data',b=>{
    process.stdout.write(b);output=(output+b.toString()).slice(-4096);
    if(!opened&&output.includes('PDCA LAN')&&output.includes(url)){
      opened=true;console.log('Ready: '+url+' | Keep this window open. Ctrl+C to stop.');
      if(!noBrowser)openBrowser(url);
    }
  });
  const signal=()=>{};process.on('SIGINT',signal);
  try{const code=await new Promise((ok,bad)=>{child.once('error',bad);child.once('close',ok);});if(code!==0)fail('Host stopped or failed; inspect output.');}
  finally{process.off('SIGINT',signal);}
}
async function setup(){
  if(readdirSync(root).some(n=>/^(config|data)-[a-f0-9]{12}$/i.test(n)&&![basename(cfg),basename(data)].includes(n)))fail('Another installation exists in this folder. Use its existing installation or a separate fresh folder.');
  for(const path of [cfg,data])if(existsSync(path))directory(path,true);
  const rl=createInterface({input:process.stdin,output:process.stdout,terminal:!!process.stdin.isTTY});
  const iterator=rl[Symbol.asyncIterator]();
  async function ask(prompt){process.stdout.write(prompt);const a=await iterator.next();if(a.done)fail('Input cancelled.');return a.value.trim();}
  let ip,port;
  try{
    ip=await ask('IT-approved private IPv4: ');
    const raw=await ask('IT-approved port [4175]: ');port=Number(raw||'4175');
    if(!privateIp(ip)||!/^\d+$/.test(raw||'4175')||!Number.isInteger(port)||port<1024||port>65535)fail('Invalid endpoint.');
    await bindCheck(ip,port);
    for(const path of [cfg,data]){if(!existsSync(path))mkdirSync(path);directory(path,true);}
    console.log('IT must verify restricted NTFS permissions on:\n'+cfg+'\n'+data);
    console.log('Synthetic data only. Confirm approved endpoint/network, restricted ACL, stopped writers and fresh ADOPT authorization.');
    if(await ask('Type GO to install: ')!=='GO')fail('Cancelled before config/data creation.');
  }finally{rl.close();}
  for(const path of [cfg,data])directory(path,true);
  if(!existsSync(app)){
    const zip=join(root,DELIVERY.zip);
    if(!existsSync(zip))fail('Program ZIP missing. Extract the outer delivery ZIP first.');
    const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:PDCA_INSTALL_ZIP -DestinationPath $env:PDCA_INSTALL_APP"],{stdio:'inherit',env:{...process.env,PDCA_INSTALL_ZIP:zip,PDCA_INSTALL_APP:app}});
    if(r.error||r.status!==0)fail('Extraction failed. Do not overwrite partial installation.');
  }
  manifest();
  run([join(app,'tools/direct/host.mjs'),'setup',config,ip,String(port),data]);
  const fresh=readConfig();
  if(!/^[A-Za-z0-9_-]{32,}$/.test(fresh.PDCA_IT_KEY||''))fail('Fresh operator credential missing.');
  directory(data,true);
  run([join(app,'demo/demo.mjs'),'seed','--existing-empty'],{PDCA_DEMO_DIR:data});
  if(existsSync(join(data,'active-db.json')))fail('Active pointer already exists; no automatic ADOPT.');
  run(['--env-file='+config,join(app,'src/ops.js'),'adopt','ADOPT'],{PDCA_OPERATOR_KEY:fresh.PDCA_IT_KEY});
  run(['--env-file='+config,join(app,'src/ops.js'),'status'],{PDCA_OPERATOR_KEY:fresh.PDCA_IT_KEY});
  console.log('SETUP READY');await start();
}
try{
  if(process.platform!=='win32'||process.arch!=='x64'||!/^24\.\d+\.\d+$/.test(process.versions.node)||Number(process.versions.node.split('.')[1])<11)fail('Use IT-approved Windows x64 Node 24.x (24.11.0 or newer).');
  if(!DELIVERY||!/^[a-f0-9]{40}$/.test(DELIVERY.source)||basename(DELIVERY.zip)!==DELIVERY.zip)fail('Use the delivered launcher.');
  if(Object.keys(process.env).some(k=>/^PDCA_/i.test(k)))fail('Open a clean console without PDCA_* variables.');
  if(!/^[A-Za-z]:\\/.test(root)||/[%!&|<>^"]/u.test(root))fail('Use a local Windows folder without CMD metacharacters.');
  directory(root);directory(base);
  if(mode==='setup')await setup();else if(mode==='start')await start();else fail('Use SETUP.cmd or START.cmd.');
}catch(e){console.error('STOP: '+e.message);process.exitCode=1;}
