// WP-07 diagnostic: fixed synthetic workload, actual Direct HTTP Host, no production data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { openStore } from '../../src/store.js';
import { normalizeEnv } from '../../src/network-config.js';
import { adoptActive, activeStatus } from '../../src/active-db.js';
import { startHost } from '../../src/server.js';
import { graphSnapshot, diffGraph } from '../../web/changes.js';

const preflight=fileURLToPath(new URL('./direct-endpoint-preflight.mjs',import.meta.url));
const N=200, editors=10, perEditor=N/editors;
const key='synthetic-it-key-not-for-factory-000000';
const phil='synthetic-phil-key-not-for-factory-00000';
async function scenario(withStatus){
 const root=mkdtempSync(join(tmpdir(),'pdca-wp07-f07-'));
 const endpoint=JSON.parse(execFileSync(process.execPath,[preflight],{encoding:'utf8'}));
 const env=normalizeEnv({PDCA_BIND_HOST:endpoint.ip,PDCA_PORT:String(endpoint.port),PDCA_DATA_ROOT:root,PDCA_IT_KEY:key,PDCA_PHIL_KEY:phil});
 let host,child,childExit,childResult;
 try {
  const store=openStore(env.PDCA_DB,{auditFile:env.PDCA_AUDIT});
  const initial=store.create('WP07 F07 fixed synthetic graph');
  const nodes=Array.from({length:N},(_,i)=>({id:randomUUID(),cat:1,title:'Node '+i,sideNote:'initial',pic:'',due:'',status:'Not Started',snapY:100+i*120,freeX:null,freeY:null,freeW:200,freeH:100,images:[],documents:[]}));
  try{store.save(initial.id,{graph:{...initial,nodes},revision:0,saveId:randomUUID(),displayName:'Seed',uploads:[]});}finally{store.close();}
  await adoptActive(env,'IT','ADOPT');
  host=await startHost(env);
  await host.backups.first;
  const origin='http://'+endpoint.ip+':'+endpoint.port,path='/api/pdca/'+initial.id;
  async function req(path,method='GET',body,token){
   const response=await fetch(origin+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
   if(!response.ok)throw Error(method+' '+path+' '+response.status+' '+(await response.text()).slice(0,300));
   return response.json();
  }
  const sessions=await Promise.all(Array.from({length:editors},(_,i)=>req('/api/session','POST',{displayName:'Synthetic editor '+i})));
  if(withStatus){
   const childCode="import {activeStatus} from "+JSON.stringify(new URL('../../src/active-db.js',import.meta.url).href)+";import {setTimeout as delay} from 'node:timers/promises';let stop=false;process.on('message',()=>stop=true);const out={ok:0,busy:0,other:0,errors:{},latencyMs:[]};process.send({ready:true});while(!stop){const t=Date.now();try{await activeStatus(process.env,'IT');out.ok++;}catch(e){const msg=e.message;const busy=/temporarily BUSY|database is locked/i.test(msg);out[busy?'busy':'other']++;out.errors[msg]=(out.errors[msg]||0)+1;}out.latencyMs.push(Date.now()-t);await delay(25);}process.send({result:out},()=>process.disconnect());";
   child=spawn(process.execPath,['--input-type=module','-e',childCode],{env:{...process.env,...env},stdio:['ignore','ignore','inherit','ipc']});
   childExit=once(child,'exit');
   childResult=new Promise((resolve,reject)=>{child.on('message',m=>{if(m.result)resolve(m.result)});child.on('error',reject);child.on('exit',code=>{if(code!==0)reject(Error('Status probe exit '+code))})});
   const [ready]=await Promise.race([once(child,'message'),childExit.then(()=>{throw Error('Status probe exited early')})]);assert.equal(ready.ready,true);
  }
  const began=Date.now();
  const timings=[];
  await Promise.all(sessions.map(async(actor,i)=>{
   const tabId=randomUUID();
   for(let j=0;j<perEditor;j++){
    const node=nodes[i*perEditor+j];
    const t=Date.now();
    const grant=await req(path+'/edit/'+node.id,'POST',{tabId},actor.token);
    const before=graphSnapshot(grant.workspace),after=structuredClone(before);
    after.nodes.find(n=>n.id===node.id).sideNote='editor '+i+' edit '+j;
    const ops=diffGraph(before,after).map(op=>({...op,base:grant.workspace.revision}));
    assert.equal(ops.length,1);
    await req(path,'PUT',{tabId,tabToken:grant.editTab.token,nodeTokens:{[node.id]:grant.nodeToken},saveId:randomUUID(),uploads:[],ops},actor.token);
    await req(path+'/lock/'+node.id,'DELETE',{tabId,tabToken:grant.editTab.token,nodeToken:grant.nodeToken},actor.token);
    timings.push(Date.now()-t);
   }
  }));
  const durationMs=Date.now()-began;
  let status=null;
  if(child){child.send('stop');status=await childResult;const [code]=await childExit;assert.equal(code,0);assert.ok(status.ok+status.busy+status.other>0);assert.equal(status.other,0,'Unexpected integrity/status failure');}
  const final=await req(path,'GET',undefined,sessions[0].token);
  assert.equal(final.nodes.length,N);
  assert.equal(final.revision,initial.revision+1+N);
  for(let i=0;i<N;i++)assert.equal(final.nodes.find(n=>n.id===nodes[i].id).sideNote,'editor '+Math.floor(i/perEditor)+' edit '+i%perEditor);
  await host.stop();host=null;
  const verified=await activeStatus(env,'IT');assert.equal(verified.projects,1);
  timings.sort((a,b)=>a-b);
  return {withStatus,nodes:N,editors,commits:timings.length,durationMs,p95EditCycleMs:timings[Math.ceil(timings.length*.95)-1],status,finalRevision:final.revision,integrity:'PASS'};
 }finally{if(child&&child.exitCode===null){child.kill();await childExit.catch(()=>{});}if(host)await host.stop();rmSync(root,{recursive:true,force:true,maxRetries:5});}
}
const baseline=await scenario(false),contended=await scenario(true);
console.log('WP07_F07_REPRESENTATIVE '+JSON.stringify({baseline,contended,writerDurationRatio:contended.durationMs/baseline.durationMs,limitations:'Single Windows CI host, fixed workload, one paired observation; not Factory benchmark or RPO/RTO acceptance'}));
