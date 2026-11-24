// Windows synthetic onboarding. Reuse existing managed Host and authenticated ops.
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,realpathSync,copyFileSync,constants} from 'node:fs';
import {join,resolve,dirname,basename,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createInterface} from 'node:readline';
import {createServer,isIPv4} from 'node:net';
const DELIVERY = null;
const base=dirname(fileURLToPath(import.meta.url)),deliveryRoot=dirname(base);
let root,app,cfg,data,config,maintenance;
function paths(target){
  root=target;app=join(root,'Application');cfg=join(root,'Configuration');data=join(root,'Data');
  config=join(cfg,'host.env');maintenance=join(root,'Maintenance');
}
const mode=process.argv[2],noBrowser=process.argv.includes('--no-browser');
function fail(s){throw Error(s);}
function directory(path,empty=false){
  const s=lstatSync(path);
  if(!s.isDirectory()||s.isSymbolicLink()||realpathSync(path).toLowerCase()!==resolve(path).toLowerCase())fail('Not a safe local directory: '+path);
  if(empty&&readdirSync(path).length)fail('Existing config/data; never overwrite or seed again: '+path);
}
function present(path){
  try{lstatSync(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}
}
function localPath(path){
  if(!/^[A-Za-z]:\\/.test(path)||/[%!&|<>^"\r\n]/u.test(path))fail('Use an absolute local Windows folder without CMD metacharacters.');
  const parts=path.slice(3).split('\\');
  if(parts.some(s=>!s||s==='.'||s==='..'||/[:*?\/\x00-\x1f]/u.test(s)||/[. ]$/.test(s)||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(s)))fail('Use a normal local folder path.');
  return resolve(path);
}
function within(parent,child){
  const rel=relative(parent.toLowerCase(),child.toLowerCase());
  return !rel||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\'));
}
function freshRoot(){
  directory(root);
  if(readdirSync(root).some(n=>!['configuration','data'].includes(n.toLowerCase())))fail('Existing installation or unrelated files; select a separate fresh folder.');
  for(const path of [cfg,data])if(present(path))directory(path,true);
}
function copyNew(from,to){copyFileSync(from,to,constants.COPYFILE_EXCL);}
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
  const rl=createInterface({input:process.stdin,output:process.stdout,terminal:!!process.stdin.isTTY});
  const iterator=rl[Symbol.asyncIterator]();
  async function ask(prompt){process.stdout.write(prompt);const a=await iterator.next();if(a.done)fail('Input cancelled.');return a.value.trim();}
  let ip,port;
  try{
    const suggested=join(dirname(deliveryRoot),'THE NODE OF PDCA');
    const destination=localPath((await ask('Install folder ['+suggested+']: '))||suggested);
    if(within(deliveryRoot,destination)||within(destination,deliveryRoot))fail('Install outside the delivery folder.');
    directory(dirname(destination));
    paths(destination);
    if(present(root))freshRoot();
    ip=await ask('IT-approved private IPv4: ');
    const raw=await ask('IT-approved port [4175]: ');port=Number(raw||'4175');
    if(!privateIp(ip)||!/^\d+$/.test(raw||'4175')||!Number.isInteger(port)||port<1024||port>65535)fail('Invalid endpoint.');
    await bindCheck(ip,port);
    if(!present(root))mkdirSync(root);
    freshRoot();
    for(const path of [cfg,data]){if(!present(path))mkdirSync(path);directory(path,true);}
    console.log('IT must verify restricted NTFS permissions on:\n'+root+'\n'+cfg+'\n'+data);
    console.log('Synthetic data only. Confirm approved endpoint/network, restricted ACL, stopped writers and fresh ADOPT authorization.');
    if(await ask('Type GO to install: ')!=='GO')fail('Cancelled before config/data creation.');
  }finally{rl.close();}
  freshRoot();
  let zip=join(deliveryRoot,DELIVERY.zip);
  if(!present(zip)){
    const alternatives=readdirSync(deliveryRoot,{withFileTypes:true}).filter(e=>e.isFile()&&/\.zip$/i.test(e.name));
    if(alternatives.length!==1)fail('Program ZIP missing or ambiguous. Keep one approved program ZIP in the delivery folder.');
    zip=join(deliveryRoot,alternatives[0].name);
  }
  if(!lstatSync(zip).isFile()||lstatSync(zip).isSymbolicLink())fail('Program ZIP must be a local regular file.');
  mkdirSync(app);
  const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:PDCA_INSTALL_ZIP -DestinationPath $env:PDCA_INSTALL_APP"],{stdio:'inherit',env:{...process.env,PDCA_INSTALL_ZIP:zip,PDCA_INSTALL_APP:app}});
  if(r.error||r.status!==0)fail('Extraction failed. Preserve partial installation; contact IT.');
  manifest();
  for(const path of [cfg,data])directory(path,true);
  run([join(app,'tools/direct/host.mjs'),'setup',config,ip,String(port),data]);
  const fresh=readConfig();
  if(!/^[A-Za-z0-9_-]{32,}$/.test(fresh.PDCA_IT_KEY||''))fail('Fresh operator credential missing.');
  directory(data,true);
  run([join(app,'demo/demo.mjs'),'seed','--existing-empty'],{PDCA_DEMO_DIR:data});
  if(present(join(data,'active-db.json')))fail('Active pointer already exists; no automatic ADOPT.');
  run(['--env-file='+config,join(app,'src/ops.js'),'adopt','ADOPT'],{PDCA_OPERATOR_KEY:fresh.PDCA_IT_KEY});
  run(['--env-file='+config,join(app,'src/ops.js'),'status'],{PDCA_OPERATOR_KEY:fresh.PDCA_IT_KEY});
  mkdirSync(maintenance);
  copyNew(fileURLToPath(import.meta.url),join(maintenance,'launcher.mjs'));
  copyNew(join(app,'README4IT.html'),join(maintenance,'README4IT.html'));
  copyNew(join(base,'RECOVERY.cmd'),join(maintenance,'RECOVERY.cmd'));
  copyNew(join(base,'START.cmd'),join(root,'START.cmd'));
  console.log('SETUP READY: '+root);await start();
}
try{
  if(process.platform!=='win32'||process.arch!=='x64'||!/^24\.\d+\.\d+$/.test(process.versions.node)||Number(process.versions.node.split('.')[1])<11)fail('Use IT-approved Windows x64 Node 24.x (24.11.0 or newer).');
  if(!DELIVERY||!/^[a-f0-9]{40}$/.test(DELIVERY.source)||basename(DELIVERY.zip)!==DELIVERY.zip)fail('Use the delivered launcher.');
  if(Object.keys(process.env).some(k=>/^PDCA_/i.test(k)))fail('Open a clean console without PDCA_* variables.');
  localPath(deliveryRoot);directory(deliveryRoot);directory(base);
  if(mode==='setup'&&basename(base)==='_support')await setup();
  else if(mode==='start'&&basename(base)==='Maintenance'){paths(deliveryRoot);await start();}
  else fail('Use delivery SETUP.cmd or installed START.cmd.');
}catch(e){console.error('STOP: '+e.message);process.exitCode=1;}
