const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const origin = process.argv[2] || 'http://127.0.0.1:8018';
const context = vm.createContext({self:{addEventListener(){}}});
vm.runInContext(fs.readFileSync(path.join(root,'offline-assets.js'),'utf8'),context);
context.importScripts=()=>{};
vm.runInContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8')+'\nglobalThis.core=CORE;',context);
const refs=[...new Set([...context.core,...context.self.CTF_OFFLINE_ASSETS])];
(async()=>{
 let passed=0;const failed=[];
 for(const ref of refs){
  try{const response=await fetch(new URL(ref,origin+'/'));assert.equal(response.status,200);const body=await response.arrayBuffer();assert(body.byteLength>0);passed++;}
  catch(error){failed.push(ref+': '+error.message);}
 }
 for(const [route,status] of [['/missing-file.js',404],['/%2e%2e%2fSTART_BROWSER_GAME.cmd',403]]){
  try{assert.equal((await fetch(origin+route)).status,status);passed++;}catch(error){failed.push(route+': '+error.message);}
 }
 console.log(JSON.stringify({passed,failed},null,2));process.exitCode=failed.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
