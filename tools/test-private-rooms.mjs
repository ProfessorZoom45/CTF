import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { viewForSeat } from '../match-referee.mjs';

const origin = process.argv[2] || 'http://127.0.0.1:8028';
const endpoint = origin + '/api/private-multiplayer';

async function request(route, { body, seat } = {}) {
  const response = await fetch(endpoint + route, {
    method:body === undefined ? 'GET' : 'POST',
    headers:{
      Origin:origin, 'Content-Type':'application/json',
      ...(seat ? {Authorization:'Bearer ' + seat.token} : {})
    },
    body:body === undefined ? undefined : JSON.stringify(body),
    signal:AbortSignal.timeout(10000)
  });
  return { status:response.status, ...await response.json() };
}

function fixturePlayer(secret) {
  return {
    chi:10000, kills:0, captures:0, extractions:0,
    hand:[secret + '-hand'], deck:[secret + '-deck'], fusionDeck:[secret + '-fusion'],
    catalysts:[{cardId:secret + '-catalyst', faceDown:true, position:'def'}],
    tricks:[{cardId:secret + '-trick', faceDown:true}],
    fieldTrick:{cardId:secret + '-field', faceDown:true},
    void:[], box:[], rfg:[]
  };
}

const fixture = {
  phaseName:'battle', activePlayer:0, turn:2, waitingForResponse:true, currentResponder:1,
  players:[fixturePlayer('alpha-secret'),fixturePlayer('beta-secret')],
  log:[{msg:'beta-secret-hand'}],
  chain:[{cardId:'beta-secret-card'}],
  pendingAction:{manual:{cardId:'beta-secret-card'}},
  deckMeta:{p2:{main:['beta-secret-deck']}}
};
for (const [seat, own, other] of [[0,'alpha-secret','beta-secret'],[1,'beta-secret','alpha-secret']]) {
  const view = viewForSeat(fixture, seat, 7, [{revision:7, seat, action:'attack', phase:'battle', private:other}]);
  const serialized = JSON.stringify(view);
  assert(serialized.includes(own + '-hand'));
  assert(!serialized.includes(own + '-deck'));
  assert(!serialized.includes(other));
  assert.equal(view.players[1-seat].handCount,1);
  assert.equal(view.players[1-seat].catalysts[0].faceDown,true);
}
fixture.players[1].catalysts[0].faceDown = false;
const revealed = viewForSeat(fixture, 0, 8, []);
assert.equal(revealed.players[1].catalysts[0].cardId,'beta-secret-catalyst');
assert(!JSON.stringify(revealed).includes('beta-secret-hand'));
console.log('PASS per-seat allowlists hide draw order, other hand and Fusion IDs, set cards, and raw engine events');

const catalogue = vm.createContext({});
vm.runInContext('var window=globalThis;',catalogue);
for (const file of ['ctf-config.js','data.js','sets-2026-08-24-patch.js','sets-2026-08-25-patch.js','zf1-tutorial-data.js','deck-utils.js']) {
  vm.runInContext(await readFile(new URL('../assets/js/' + file,import.meta.url),'utf8'), catalogue);
}
const normalIds = vm.runInContext(`Array.from(new Map(CTF_CARDS.filter(c=>c.id && c.cardType==='Catalyst' &&
  c.sub!=='Token' && c.level>=1 && c.level<=4 && !CTFDeckUtils.isGreatCard(c) &&
  !/when|activate|face.down|spawn|enter.*field|only|cannot/i.test(c.desc||''))
  .map(c=>[c.name.toLowerCase(),c.id])).values())`,catalogue);
assert(normalIds.length>=80);

assert.equal((await request('/config')).transport,'private-referee');
const host = await request('/rooms',{body:{}});
assert.equal(host.status,201);
const root = '/rooms/' + host.code;
const guest = await request(root + '/join',{body:{}});
assert.equal(guest.status,200);
assert.equal((await request(root + '/events')).status,403);
for (const seat of [host,guest]) {
  assert.equal((await request(root + '/messages',{seat,body:{type:'authoritativeState',state:'client state'}})).status,400);
}
console.log('PASS seat authorization and rejection of client-authored state');

async function register(seat, main) {
  return request(root + '/messages',{seat,body:{type:'deckChoice',deck:{main}}});
}
assert.equal((await register(host,['unknown-card'])).status,400);
assert.equal((await register(host,normalIds.slice(0,40))).ready,false);
assert.equal((await register(guest,normalIds.slice(40,80))).ready,true);
const opener = await request(root + '/events',{seat:host});
const other = await request(root + '/events',{seat:guest});
assert.equal(opener.view.seat,0);
assert.equal(other.view.seat,1);
assert.equal(opener.view.players[0].hand.length,5);
assert.equal(other.view.players[1].hand.length,5);
for (const index of [0,1]) {
  const own = [opener,other][index].view;
  const opposing = [other,opener][index].view;
  assert(own.players[index].hand.every(id=>!JSON.stringify(opposing).includes(id)));
  assert.equal(own.players[1-index].deckCount,35);
}
console.log('PASS server deck validation and opening hands projected separately');

async function act(seat, action, revision) {
  return request(root + '/messages',{seat,body:{type:'actionRequest',action,revision}});
}
async function accepted(seat, action, view) {
  const result = await act(seat,action,view.revision);
  assert.equal(result.status,200,JSON.stringify({phase:view.phase,action,result}));
  return result.view;
}
async function advanceTo(seat, view, phase) {
  for (let steps = 0; view.phase !== phase && steps < 7; steps++) {
    view = await accepted(seat,{type:'advancePhase'},view);
  }
  assert.equal(view.phase,phase);
  return view;
}
let view = opener.view;
assert.equal((await act(guest,{type:'advancePhase',player:0},view.revision)).status,400);
assert.equal((await act(guest,{type:'advancePhase'},view.revision)).status,400);
view = await accepted(host,{type:'advancePhase'},view);
assert.equal((await act(host,{type:'advancePhase'},opener.view.revision)).status,409);
assert.equal((await act(host,{type:'advancePhase'},view.revision)).status,400);
view = await accepted(host,{type:'drawPhaseClick'},view);
view = await advanceTo(host,view,'action');
const setId = view.players[0].hand[0];
view = await accepted(host,{type:'setCatalyst',handIdx:0,zone:0},view);
assert.equal(view.players[0].catalysts[0].cardId,setId);
const observer = await request(root + '/events',{seat:guest});
assert.equal(observer.view.players[0].catalysts[0].faceDown,true);
assert(!JSON.stringify(observer.view).includes(setId));
const resumed = await request(root + '/join',{seat:guest,body:{}});
assert.equal(resumed.cursor,view.revision);
assert.deepEqual(resumed.snapshot,observer.view);
assert.equal((await request(root + '/events?after=' + resumed.cursor,{seat:guest})).view,null);
console.log('PASS server priority, stale-command rejection, hidden Set and private reconnect view');

view = await advanceTo(host,view,'end');
view = await accepted(host,{type:'endPhaseAction',action:'endTurn'},view);
assert.equal(view.activeSeat,1);
view = (await request(root + '/events',{seat:guest})).view;
view = await accepted(guest,{type:'advancePhase'},view);
view = await accepted(guest,{type:'drawPhaseClick'},view);
view = await advanceTo(guest,view,'action');
view = await accepted(guest,{type:'normalSummon',handIdx:0,zone:0,position:'atk',tributeZones:[]},view);
view = await accepted(guest,{type:'advancePhase'},view);
assert.equal(view.phase,'battle');
view = await accepted(guest,{type:'attack',attackerZone:0,defenderZone:0},view);
assert.equal(view.prioritySeat,0);
assert(!JSON.stringify(view).includes(setId));
assert.equal((await act(guest,{type:'passChain'},view.revision)).status,400);
view = await accepted(guest,{type:'concede'},view);
assert.deepEqual(view.result,{winner:0,reason:'Concession'});
assert.equal((await act(host,{type:'passChain'},view.revision)).status,409);
assert.deepEqual((await request(root + '/events',{seat:host})).view.result,view.result);
console.log('PASS complete private duel flow and terminal concession during a Chain');

async function ready(seat, revision) {
  return request(root + '/messages',{seat,body:{type:'rematchRequest',revision}});
}
const nextHost = await ready(host,view.revision);
assert.equal(nextHost.status,200);
assert.deepEqual(nextHost.view.rematchReady,[true,false]);
assert.equal((await ready(guest,view.revision)).status,409);
const nextGuest = await ready(guest,nextHost.view.revision);
assert.equal(nextGuest.status,200);
assert.equal(nextGuest.view.turn,1);
assert.equal(nextGuest.view.phase,'turnStart');
assert.equal(nextGuest.view.result,null);
assert.equal(nextGuest.view.players[1].hand.length,5);
assert.equal(nextGuest.view.players[0].hand,undefined);
assert.equal((await request(root + '/events',{seat:host})).view.revision,nextGuest.view.revision);
console.log('PASS both seats ready a same-room rematch with a fresh private duel');
