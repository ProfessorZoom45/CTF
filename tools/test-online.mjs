import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {setTimeout as delay} from 'node:timers/promises';

const origin=process.argv[2]||'http://127.0.0.1:8787';
let passed=0;
const check=(name,run)=>Promise.resolve().then(run).then(()=>{passed++;console.log('PASS '+name);});
async function api(route,{secret='',body,requestOrigin=origin}={}){
 const response=await fetch(origin+'/api/multiplayer'+route,{method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',...(secret?{Authorization:'Bearer '+secret}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
 return {status:response.status,...await response.json()};
}
await check('website advertises shared server rooms',async()=>assert.equal((await api('/config')).transport,'relay'));
await check('cross-site room creation is rejected',async()=>assert.equal((await api('/rooms',{body:{},requestOrigin:'https://example.invalid'})).status,403));
const host=await api('/rooms',{body:{}}),code=host.code;
await check('host gets a six-character code and private seat',()=>{assert.equal(host.status,201);assert.match(code,/^[A-Z0-9]{6}$/);assert(host.token.length>=32);});
const guest=await api('/rooms/'+code+'/join',{body:{}});
await check('second user joins as guest',()=>{assert.equal(guest.role,'guest');assert.notEqual(guest.token,host.token);});
await check('third user cannot enter occupied room',async()=>assert.equal((await api('/rooms/'+code+'/join',{body:{}})).status,409));
await check('events require the seat token',async()=>assert.equal((await api('/rooms/'+code+'/events')).status,403));
await check('guest cannot publish authoritative state',async()=>assert.equal((await api('/rooms/'+code+'/messages',{secret:guest.token,body:{type:'authoritativeState',state:'fake'}})).status,400));
await check('host cannot forge a guest command',async()=>assert.equal((await api('/rooms/'+code+'/messages',{secret:host.token,body:{type:'actionRequest',action:{type:'advancePhase'}}})).status,400));

// Independent engine context supplies a real serialized match, rather than a
// synthetic transport payload that could hide serialization incompatibilities.
const engine=vm.createContext({console,setTimeout,clearTimeout,URL,URLSearchParams});
vm.runInContext('var window=globalThis;var document={querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};',engine);
for(const file of ['ctf-config.js','data.js','sets-2026-08-24-patch.js','sets-2026-08-25-patch.js','zf1-tutorial-data.js','deck-utils.js','starter-decks-2026-08-25.js','engine.js'])vm.runInContext(await fs.readFile(new URL('../assets/js/'+file,import.meta.url),'utf8'),engine);
vm.runInContext('var deck={main:Array(40).fill(CTF_CARDS.find(c=>c.cardType==="Catalyst"&&!c.great&&c.level<5).id)};var state=createGameState(deck,deck);',engine);
const snapshot=vm.runInContext('({type:"authoritativeState",state:serializeState(state),hash:computeStateHash(state)})',engine);
await check('host state is accepted',async()=>assert.equal((await api('/rooms/'+code+'/messages',{secret:host.token,body:snapshot})).ok,true));
const first=await api('/rooms/'+code+'/events?after=0',{secret:guest.token});
await check('guest receives exactly the host state and hash',()=>{assert.equal(first.connected,true);assert.equal(first.events.at(-1).data.hash,snapshot.hash);assert.deepEqual(first.events.at(-1).data.state,JSON.parse(JSON.stringify(snapshot.state)));});
await check('acknowledged updates are not delivered twice',async()=>assert.equal((await api('/rooms/'+code+'/events?after='+first.cursor,{secret:guest.token})).events.length,0));
await check('guest action reaches only the host',async()=>{
 assert.equal((await api('/rooms/'+code+'/messages',{secret:guest.token,body:{type:'actionRequest',action:{type:'advancePhase'}}})).ok,true);
 const events=await api('/rooms/'+code+'/events?after=0',{secret:host.token});assert.equal(events.events.at(-1).data.type,'actionRequest');
});
for(const [role,secret] of [['host',host.token],['guest',guest.token]])await check(role+' can resume with the latest server snapshot',async()=>{const resumed=await api('/rooms/'+code+'/join',{secret,body:{}});assert.equal(resumed.role,role);assert.equal(resumed.resumed,true);assert.equal(resumed.snapshot.hash,snapshot.hash);});

// Run the actual browser transport in isolated sessions, including sessionStorage
// retention across a refresh. No browser or Node-global state is shared.
const networkSource=await fs.readFile(new URL('../assets/js/friend-network.js',import.meta.url),'utf8');
function client(storage=new Map()){
 const data=[],errors=[],context=vm.createContext({console,setTimeout,clearTimeout,AbortSignal,URL,location:{href:origin+'/play.html'},fetch:(url,options)=>fetch(new URL(url,origin+'/'),{...options,headers:{Origin:origin,...options?.headers}}),sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}});
 vm.runInContext('var window=globalThis',context);vm.runInContext(networkSource,context);
 const net=new context.CTFFriendNet(()=>{},message=>data.push(message),()=>{},message=>errors.push(message));return {net,data,errors,storage};
}
async function until(predicate){for(let i=0;i<50;i++){if(predicate())return;await delay(100);}throw Error('Timed out waiting for transport update');}
const left=client(),right=client();
try{
 const room=await left.net.createRoom();await right.net.joinRoom(room);
 await until(()=>left.net.connected&&right.net.connected);
 await check('actual browser adapters connect across independent sessions',()=>assert(left.net.isHost&&!right.net.isHost));
 left.net.send(snapshot);await until(()=>right.data.some(d=>d.type==='authoritativeState'));
 await check('browser adapter delivers the serialized match',()=>assert.equal(right.data.find(d=>d.type==='authoritativeState').hash,snapshot.hash));
 left.net.disconnect();const refreshed=client(left.storage);
 try{await refreshed.net.joinRoom(room);await check('host refresh recovers role and state',()=>{assert(refreshed.net.isHost);assert.equal(refreshed.data.find(d=>d.type==='resumeState').hash,snapshot.hash);});}finally{refreshed.net.disconnect();}
 await check('transport produced no errors',()=>assert.deepEqual([...left.errors,...right.errors],[]));
}finally{left.net.disconnect();right.net.disconnect();}
console.log(`${passed} online integration checks passed at ${origin}`);
