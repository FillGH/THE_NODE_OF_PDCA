// QA-only: exercise the exact guide-generated PowerShell on a clean Windows runner.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { URL } from 'node:url';
const [guide,base,zip,hash,ip='',port='']=process.argv.slice(2);
const html=readFileSync(guide,'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({URL});
vm.runInContext(script,ctx);
const result=ctx.makePlan({base,zip,hash,ip,port});
console.log(JSON.stringify(result));
