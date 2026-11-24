import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { URL } from 'node:url';
const html=readFileSync(new URL('../README4IT.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({URL});
vm.runInContext(script,ctx);
const plan=f=>ctx.makePlan(f);
const base={base:'D:\\Folder With Spaces (Offline)\\PDCA',zip:'PDCA-Direct-Windows-CANDIDATE-03c804cb71cd.zip',hash:'a'.repeat(64),ip:'192.168.1.50',port:'4175'};
test('Guide is offline and contains no external script, storage, or secret form',()=>{
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|localStorage|sessionStorage|fetch\(/i);
  assert.doesNotMatch(html,/<input[^>]*(?:password|key)/i);
});
test('File URL defaults to wrapper location; inside app automatically selects daily start',()=>{
  assert.equal(ctx.localDefaults('file:///D:/Folder%20With%20Spaces%20(Offline)/PDCA/README4IT.html').base,base.base);
  const d=ctx.localDefaults('file:///D:/PDCA/app-03c804cb71cd/README4IT.html');
  assert.equal(d.base,'D:\\PDCA');assert.equal(d.zip,base.zip);assert.equal(d.daily,true);
});
test('Correct quoted paths, external folders and pinned archive hash',()=>{
  const p=plan(base);
  assert.equal(p.app,base.base+'\\app-03c804cb71cd');
  assert.equal(p.config,base.base+'\\config-03c804cb71cd\\host.env');
  assert.equal(p.data,base.base+'\\data-03c804cb71cd');
  assert.ok(p.prepare.includes("'"+p.app+"'"));
  assert.ok(p.prepare.includes("'"+base.hash+"'"));
  assert.match(p.prepare,/Get-FileHash[\s\S]+checksum mismatch[\s\S]+Expand-Archive[\s\S]+verify\.mjs/);
  assert.match(p.prepare,/app already exists; do not overwrite/);
  assert.match(p.prepare,/-split '\\s\+'/);
});
test('Setup permits only empty folders, then requires bind, IT confirmation, ACL and Seed; no secret automation',()=>{
  const p=plan(base);
  assert.match(p.setup,/config\/data exists and is not an empty directory; no fresh seed[\s\S]+Read-Host[\s\S]+TcpListener[\s\S]+New-Item[\s\S]+actual ACL[\s\S]+config\/data no longer empty or safe[\s\S]+setup\.cmd[\s\S]+seed --existing-empty[\s\S]+finally/);
  assert.match(p.setup,/ReparsePoint/);
  assert.doesNotMatch(p.setup,/Remove-Item -LiteralPath/);
  assert.doesNotMatch(p.setup,/PDCA_IT_KEY|PDCA_OPERATOR_KEY|Set-ExecutionPolicy|New-NetFirewallRule|npm\.cmd/);
  assert.match(p.recovery,/recovery-menu\.cmd/);
});
test('Daily Start uses existing config, no seed/adopt, Diagnose fails closed',()=>{
  const p=plan({...base,hash:'',ip:'',port:''});
  assert.equal(p.prepare,null);assert.equal(p.setup,null);
  assert.match(p.start,/diagnose\.cmd[\s\S]+Diagnose failed[\s\S]+start\.cmd/);
  assert.doesNotMatch(p.start,/seed|ADOPT|New-Item|setup\.cmd/);
});
test('Reject unsafe paths, ZIP names and invalid endpoint/hash before generating relevant commands',()=>{
  for(const path of ['D:\\x&whoami','D:\\x%PATH%','D:\\x!','D:\\x;','D:\\x"','D:\\x\\..\\y','\\\\server\\share','D:\\x\\CON','D:\\','D:\\x.'])assert.throws(()=>plan({...base,base:path}));
  assert.throws(()=>plan({...base,zip:'..\\bad.zip'}));
  for(const ip of ['127.0.0.1','0.0.0.0','8.8.8.8','192.168.1.999','172.32.0.1','192.168.1.01'])assert.equal(plan({...base,ip}).setup,null);
  for(const port of ['0','80','65536','4175;whoami','-1'])assert.equal(plan({...base,port}).setup,null);
  assert.equal(plan({...base,hash:'invalid'}).prepare,null);
  assert.ok(plan({...base,base:'D:\\ทดสอบ PDCA'}).setup);
});
