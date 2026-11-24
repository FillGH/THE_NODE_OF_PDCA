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
