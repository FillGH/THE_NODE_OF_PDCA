import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('README4IT.html'),launcher=read('tools/onboarding/launcher.mjs');
test('Offline guide describes separate delivery and exactly five stable installed entries',()=>{
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|localStorage|sessionStorage|fetch\(/i);
  assert.match(html,/START\.cmd[\s\S]+Application\/[\s\S]+Configuration\/[\s\S]+Data\/[\s\S]+Maintenance\//);
  assert.match(html,/Maintenance\\RECOVERY\.cmd/);
  assert.match(html,/const DELIVERY = null;/);
});
test('Installed launchers resolve relative to stable directories',()=>{
  assert.match(read('tools/onboarding/START.cmd'),/Maintenance\\launcher\.mjs/);
  assert.match(read('tools/onboarding/RECOVERY.cmd'),/Application\\tools\\recovery\\recovery-menu\.cmd/);
  assert.match(read('tools/onboarding/RECOVERY.cmd'),/Configuration\\host\.env/);
  assert.match(launcher,/copyNew\(join\(base,'START\.cmd'\),join\(root,'START\.cmd'\)\)/);
  assert.match(launcher,/COPYFILE_EXCL/);
});
test('Fresh setup checks unrelated target, local path and empty data before creation',()=>{
  assert.match(launcher,/within\(deliveryRoot,destination\)\|\|within\(destination,deliveryRoot\)/);
  assert.match(launcher,/Existing installation or unrelated files/);
  assert.match(launcher,/freshRoot\(\);[\s\S]+mkdirSync\(app\);[\s\S]+manifest\(\);[\s\S]+directory\(path,true\)/);
  assert.doesNotMatch(launcher,/Remove-Item|rmSync|Set-ExecutionPolicy|New-NetFirewallRule/);
});

test('Recovery still uses authenticated existing menu; daily launch contains no setup action',()=>{
  assert.match(read('tools/onboarding/START.cmd'),/launcher\.mjs" start/);
  assert.doesNotMatch(read('tools/onboarding/START.cmd'),/seed|adopt|setup/);
  assert.match(read('tools/onboarding/RECOVERY.cmd'),/recovery-menu\.cmd/);
});

test('Setup instructions explain defaults and choices before inputs without extra prompts',()=>{
  const messages=['You will choose an install folder','[1/4] Choose where','Press Enter to use the recommended folder.','OR type or paste a full Windows folder path','must already exist','Install folder (Enter = recommended):','[2/4] Enter the IP address','There is no default IP.','IP address:','[3/4] Enter the network port','ONLY if IT has approved','Port (Enter = 4175):','[4/4] Review and confirm installation','Type GO and press Enter','Press Enter without GO to cancel','Confirm installation (GO = install):'];
  let previous=-1;
  for(const message of messages){
    const pos=launcher.indexOf(message,previous+1);assert.ok(pos>previous,message);previous=pos;
  }
  assert.equal((launcher.match(/await ask\(/g)||[]).length,4);
  assert.match(html,/\[1\/4\] Install folder:[\s\S]+\[2\/4\] IP address:[\s\S]+\[3\/4\] Port:[\s\S]+\[4\/4\] Confirm installation:/);
});
