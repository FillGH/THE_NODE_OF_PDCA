import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../../src/store.js';
import { auditPath } from '../../src/audit.js';
import { adoptActive, activeStatus } from '../../src/active-db.js';

const root = mkdtempSync(join(tmpdir(), 'pdca-f07-windows-probe-'));
const file = join(root,'workspace.sqlite'), auditFile = auditPath(file);
const backup = join(root,'backups'), restore = join(root,'restore');
mkdirSync(backup);mkdirSync(restore);
const env = {...process.env,PDCA_DB:file,PDCA_AUDIT:auditFile,PDCA_DATA_ROOT:root,
 PDCA_ACTIVE_DB_POINTER:join(root,'active-db.json'),PDCA_BACKUP_DIR:backup,
 PDCA_RESTORE_DIR:restore,PDCA_OPS_LOG:join(root,'ops.jsonl'),PDCA_PORT:'47727'};
const results = {platform:process.platform,node:process.version,scenarios:[]};
try {
 const store=openStore(file,{auditFile});
 for(let i=0;i<5;i++)store.create('F07 initial '+i);
 store.close();
 await adoptActive(env,'IT','ADOPT');
 for(let round=0;round<2;round++) {
  const writes=1200;
  const writer = "import {openStore} from " + JSON.stringify(new URL('../../src/store.js',import.meta.url).href) +
    ";const d=openStore(process.argv[1],{auditFile:process.argv[2]});for(let i=0;i<" + writes +
    ";i++)d.create('F07 writer '+process.argv[3]+' #'+i);d.close()";
  const cp=spawn(process.execPath,['--input-type=module','--eval',writer,file,auditFile,String(round)],{stdio:['ignore','pipe','pipe']});
  let err='';cp.stderr.on('data',c=>{err+=c});cp.stdout.resume();
  let done=false;const completed=new Promise((resolve,reject)=>{cp.on('error',reject);cp.on('close',code=>resolve(code))});
  completed.finally(()=>{done=true}).catch(()=>{});
  const counts={round,writerTarget:writes,statusOk:0,statusFailed:0,errors:{},durationMs:0};
  const began=Date.now();
  while(!done&&Date.now()-began<120000) {
   try { await activeStatus(env,'IT'); counts.statusOk++ }
   catch(e) { counts.statusFailed++;counts.errors[e.message]=(counts.errors[e.message]||0)+1 }
   await new Promise(r=>setTimeout(r,1));
  }
  counts.writerExit=await completed;
  counts.durationMs=Date.now()-began;
  if(counts.writerExit!==0)throw new Error('Writer failed: '+err.slice(0,600));
  results.scenarios.push(counts);
 }
 results.finalProjects=(await activeStatus(env,'IT')).projects;
 results.expectedProjects=5+2*1200;
 results.dataPreserved=results.finalProjects===results.expectedProjects;
 if(!results.dataPreserved)throw new Error('Persisted PDCA count mismatch');
 console.log('F07_WINDOWS_TARGET_PROBE '+JSON.stringify(results));
} finally { rmSync(root,{recursive:true,force:true,maxRetries:5}); }
