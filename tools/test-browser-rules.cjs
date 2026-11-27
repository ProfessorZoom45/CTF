const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const context = vm.createContext({console, setTimeout, clearTimeout, URL, URLSearchParams});
vm.runInContext('var window = globalThis; var document = {querySelectorAll:()=>[],querySelector:()=>null,addEventListener:()=>{}};',context);
for (const file of ['ctf-config.js','data.js','sets-2026-08-24-patch.js','sets-2026-08-25-patch.js','zf1-tutorial-data.js','deck-utils.js','starter-decks-2026-08-25.js','engine.js','cpu-browser.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,'assets/js',file),'utf8'),context,{filename:file});
}
vm.runInContext(`
globalThis.testCards = [
 {id:'qa-low',name:'QA Low',cardType:'Catalyst',sub:'Normal',level:2,pr:1000,cp:800,desc:'',great:false},
 {id:'qa-high',name:'QA High',cardType:'Catalyst',sub:'Normal',level:8,pr:2200,cp:2000,desc:'',great:false},
 {id:'qa-mid',name:'QA Mid',cardType:'Catalyst',sub:'Normal',level:4,pr:1600,cp:1200,desc:'',great:false},
 {id:'qa-great',name:'QA Great',cardType:'Catalyst',sub:'Normal',level:4,pr:1000,cp:900,desc:'',great:false},
 {id:'qa-greatness',name:'QA Greatness',cardType:'Catalyst',sub:'Normal',level:4,pr:1000,cp:900,desc:'',great:true},
 {id:'qa-recoil',name:'QA Guard',cardType:'Catalyst',sub:'Normal',level:4,pr:1000,cp:1600,desc:''},
 {id:'qa-flip-guard',name:'QA Flip Guard',cardType:'Catalyst',sub:'Effect',level:4,pr:1000,cp:800,desc:'Flip: gain 800 Counter Pressure.'},
 {id:'qa-flip-counter',name:'QA Flip Counter',cardType:'Counter Trick',sub:'Counter',desc:'Negate a Catalyst effect.'},
 {id:'qa-trick',name:'QA Trick',cardType:'Palm Trick',sub:'Normal',level:0,pr:0,cp:0,desc:'',great:false}
]; CTF_CARDS.push(...testCards);
regEffect('qa-flip-guard',{type:'onFlip',action:'boostSelfCP',amount:800});
globalThis.fresh = () => createGameState({main:Array(40).fill('qa-mid'),noShuffle:true},{main:Array(40).fill('qa-mid'),noShuffle:true});
globalThis.phase = (s,name) => {s.phaseName=name;s.phase=PHASES.indexOf(name);s.turn=2;s.isP1FirstTurn=false;return s;};
globalThis.slot = (id,position='atk') => ({cardId:id,position,faceDown:false,attackedThisTurn:false});
`,context);
let passed=0, failed=0;
function test(name,code) {
 try { vm.runInContext(`(()=>{${code}})()`,context); passed++; console.log('PASS '+name); }
 catch(error) {failed++;console.log('FAIL '+name+': '+error.message);}
}
context.assert=assert;
test('opening Chi, hand, zones and deck conservation',`const s=fresh();assert.equal(s.players[0].chi,10000);assert.equal(s.players[0].hand.length,5);assert.equal(s.players[0].deck.length,35);assert.equal(s.players[0].catalysts.length,5);assert.equal(s.players[0].tricks.length,5);`);
test('empty deck continues without loss',`const s=fresh();s.players[0].deck=[];assert.equal(drawCard(s,0),null);assert.equal(s.gameOver,false);`);
test('seven canonical phases',`assert.equal(PHASES.join(','),'turnStart,draw,ignition,action,battle,resolution,end');`);
test('manual draw once per phase',`const s=phase(fresh(),'draw');assert.equal(handleDrawPhaseClick(s).ok,true);assert.equal(handleDrawPhaseClick(s).ok,false);assert.equal(s.players[0].hand.length,6);`);
test('normal spawn only on own Action Phase',`const s=fresh();assert.equal(normalSummon(s,0,0,0,'atk',[]).ok,false);phase(s,'action');assert.equal(normalSummon(s,1,0,0,'atk',[]).ok,false);assert.equal(normalSummon(s,0,0,0,'atk',[]).ok,true);assert.equal(normalSummon(s,0,0,1,'atk',[]).ok,false);`);
test('Tricks cannot occupy outer Libra Zones',`const s=phase(fresh(),'action');s.players[0].hand=['qa-trick'];assert.equal(setTrick(s,0,0,0).ok,false);assert.equal(s.players[0].hand.length,1);assert.equal(setTrick(s,0,0,1).ok,true);`);
test('face-down Catalyst Set uses the Normal Spawn and enters CP',`const s=phase(fresh(),'action');assert.equal(setCatalyst(s,0,0,0).ok,true);assert.equal(s.players[0].catalysts[0].faceDown,true);assert.equal(s.players[0].catalysts[0].position,'def');assert.equal(normalSummon(s,0,0,1,'atk',[]).ok,false);`);
test('high-Rank Catalyst cannot use the no-Tribute Set procedure',`const s=phase(fresh(),'action');s.players[0].hand=['qa-high'];assert.equal(setCatalyst(s,0,0,0).ok,false);assert.equal(s.players[0].hand.length,1);`);
test('Libra scales require outer Normal Catalysts',`const s=phase(fresh(),'action');s.players[0].hand=['qa-low','qa-high'];assert.equal(placeLibraScale(s,0,0,1).ok,false);assert.equal(placeLibraScale(s,0,0,0).ok,true);assert.equal(placeLibraScale(s,0,0,4).ok,true);`);
test('Libra group costs one spawn and one Shotgun draw',`const s=phase(fresh(),'action');s.players[0].tricks[0]={cardId:'qa-low',isLibra:true};s.players[0].tricks[4]={cardId:'qa-high',isLibra:true};s.players[0].hand=['qa-mid','qa-mid'];const n=s.players[1].hand.length;assert.equal(libraSummon(s,0,[0,1],[0,1]).ok,true);assert.equal(s.players[0].specialSummonCount,1);assert.equal(s.players[1].hand.length,n+1);`);
test('Shotgun waits for the whole Libra group to resolve',`const s=phase(fresh(),'action');s.players[0].tricks[0]={cardId:'qa-low',isLibra:true};s.players[0].tricks[4]={cardId:'qa-high',isLibra:true};s.players[0].hand=['qa-mid','qa-mid'];const original=drawCard;let calls=0;drawCard=(state,player)=>{calls++;assert.equal(state.players[0].hand.length,0);assert(state.players[0].catalysts[0]);assert(state.players[0].catalysts[1]);return original(state,player);};try{assert(libraSummon(s,0,[0,1],[0,1]).ok);assert.equal(calls,1);const messages=s.log.map(x=>x.msg);assert(messages.findIndex(m=>m.includes('entered C2'))<messages.findIndex(m=>m.includes('Shotgun Rule')));}finally{drawCard=original;}`);
test('Shotgun resolves after placement and before on-Spawn effects',`const s=phase(fresh(),'action'),n=s.players[1].hand.length,original=runOnSummonScripts;let ran=false;runOnSummonScripts=(state,player,zone)=>{ran=true;assert.equal(state.players[player].catalysts[zone].cardId,'qa-mid');assert.equal(state.players[1].hand.length,n+1);};try{assert(specialSummonToZone(s,0,'qa-mid',0,'QA').ok);assert(ran);const messages=s.log.map(x=>x.msg);assert(messages.findIndex(m=>m.includes('Special Spawn resolved:'))<messages.findIndex(m=>m.includes('Shotgun Rule')));}finally{runOnSummonScripts=original;}`);
test('strict Libra bounds and duplicate selections',`const s=phase(fresh(),'action');s.players[0].tricks[0]={cardId:'qa-low',isLibra:true};s.players[0].tricks[4]={cardId:'qa-high',isLibra:true};s.players[0].hand=['qa-low','qa-mid'];assert.equal(libraSummon(s,0,[0],[0]).ok,false);assert.equal(libraSummon(s,0,[1,1],[0,1]).ok,false);`);
test('five Special Spawns cap; failed spawn draws nothing',`const s=phase(fresh(),'action');for(let i=0;i<5;i++)assert.equal(specialSummonToZone(s,0,'qa-mid',i,'test').ok,true);s.players[0].catalysts[0]=null;const n=s.players[1].hand.length;assert.equal(specialSummonToZone(s,0,'qa-mid',0,'test').ok,false);assert.equal(s.players[1].hand.length,n);`);
test('no first-turn attack or out-of-phase attack',`const s=fresh();s.players[0].catalysts[0]=slot('qa-mid');assert.equal(declareAttack(s,0,0,1,-1).ok,false);s.phaseName='battle';assert.equal(declareAttack(s,0,0,1,-1).ok,false);`);
test('player two may attack on their first turn',`const s=fresh();s.activePlayer=1;s.phaseName='battle';s.phase=4;s.players[1].catalysts[0]=slot('qa-mid');assert.equal(declareAttack(s,1,0,0,-1).ok,true);`);
test('Pressure versus Pressure: Kill and difference damage',`const s=phase(fresh(),'battle');s.players[0].catalysts[0]=slot('qa-mid');s.players[1].catalysts[0]=slot('qa-low');assert.equal(executeAttackCore(s,0,0,1,0).ok,true);assert.equal(s.players[0].kills,1);assert.equal(s.players[1].chi,9400);assert.equal(s.players[1].void[0],'qa-low');`);
test('Pressure versus CP captures without Chi damage',`const s=phase(fresh(),'battle');s.players[0].catalysts[0]=slot('qa-mid');s.players[1].catalysts[0]=slot('qa-low','def');assert.equal(executeAttackCore(s,0,0,1,0).ok,true);assert.equal(s.players[0].box[0],'qa-low');assert.equal(s.players[1].chi,10000);`);
test('Great CP defender goes directly to its owner’s Void',`
 const s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-mid');
 s.players[1].catalysts[0]={...slot('qa-great','def'),owner:0};
 assert.equal(executeAttackCore(s,0,0,1,0).type,'great_kill');
 assert.equal(s.players[0].box.length,0);
 assert.equal(s.players[0].void[0],'qa-great');
 assert.equal(s.players[1].void.length,0);
 assert.equal(s.players[0].kills,1);
`);
test('Great is derived from a standalone word for deck validation and capture',`
 assert(CTFDeckUtils.isGreatCard(getCard('qa-great')));
 assert(!CTFDeckUtils.isGreatCard(getCard('qa-greatness')));
 const validation=CTFDeckUtils.validateDeck({main:['qa-great','qa-great','qa-greatness','qa-greatness']},CTF_CARDS);
 assert.equal(validation.stats.greatCount,2);
 assert(validation.errors.some(message=>message.startsWith('QA Great is a Great Card')));
 assert(!validation.errors.some(message=>message.startsWith('QA Greatness is a Great Card')));
 const s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-mid');
 s.players[1].catalysts[0]=slot('qa-greatness','def');
 assert.equal(executeAttackCore(s,0,0,1,0).type,'capture');
 assert.equal(s.players[0].box[0],'qa-greatness');
`);
test('higher Counter Pressure deals 600 Chi recoil and keeps both Catalysts, from either seat',`
 for(const seat of [0,1]){
  const s=phase(fresh(),'battle'), opponent=1-seat;
  s.activePlayer=seat;
  s.players[seat].catalysts[0]=slot('qa-low');
  s.players[opponent].catalysts[0]=slot('qa-recoil','def');
  assert.equal(previewCounterPressureDamage(s,seat,0,0),600);
  assert(declareAttack(s,seat,0,opponent,0).ok);
  passChain(s,s.currentResponder);
  assert.equal(passChain(s,s.currentResponder).dmg,600);
  assert.equal(s.players[seat].chi,9400);
  assert.equal(s.players[opponent].chi,10000);
  assert.equal(s.players[seat].catalysts[0].cardId,'qa-low');
  assert.equal(s.players[opponent].catalysts[0].cardId,'qa-recoil');
  assert(s.players.every(player=>player.kills===0 && player.captures===0 && player.box.length===0));
 }
`);
test('Counter Pressure preview hides set values and respects damage prevention',`
 const s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-low');
 s.players[1].catalysts[0]={...slot('qa-recoil','def'),faceDown:true};
 assert.equal(previewCounterPressureDamage(s,0,0,0),null);
 s.players[1].catalysts[0].faceDown=false;
 s.players[0].preventBattleDamage=true;
 assert.equal(previewCounterPressureDamage(s,0,0,0),0);
 assert.equal(executeAttackCore(s,0,0,1,0).dmg,0);
 assert.equal(s.players[0].chi,10000);
`);
test('an empty Catalyst Zone is rejected before opening a Chain',`
 const s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-low');
 assert(!declareAttack(s,0,0,1,0).ok);
 assert(!s.waitingForResponse);
 assert(!s.players[0].catalysts[0].attackedThisTurn);
`);
test('direct attacks require clear opposing Catalyst Zones',`const s=phase(fresh(),'battle');s.players[0].catalysts[0]=slot('qa-mid');s.players[1].catalysts[0]=slot('qa-low');assert.equal(executeAttackCore(s,0,0,1,-1).ok,false);`);
test('response chain resolves after two passes',`const s=phase(fresh(),'battle');s.players[0].catalysts[0]=slot('qa-mid');assert.equal(declareAttack(s,0,0,1,-1).ok,true);assert.equal(s.waitingForResponse,true);passChain(s,s.currentResponder);passChain(s,s.currentResponder);assert.equal(s.waitingForResponse,false);assert.equal(s.players[1].chi,8400);`);
test('revealed Flip effect opens its own chain before applying 600 Chi recoil from either seat',`
 for (const attacker of [0,1]) {
  let s=phase(fresh(),'battle');
  const defender=1-attacker;
  s.activePlayer=attacker;
  s.players[attacker].catalysts[0]=slot('qa-low');
  s.players[defender].catalysts[0]={...slot('qa-flip-guard','def'),faceDown:true};
  assert(declareAttack(s,attacker,0,defender,0).ok);
  assert(s.players[defender].catalysts[0].faceDown);
  assert(passChain(s,defender).waiting);
  assert(passChain(s,attacker).waiting);
  assert.equal(s.pendingAction.type,'battleFlip');
  assert.equal(s.currentResponder,attacker);
  assert.equal(s.chain[0].cardId,'qa-flip-guard');
  assert.equal(s.players[defender].catalysts[0].faceDown,false);
  assert.equal(s.players[attacker].chi,10000);
  assert.equal(getEffectiveCounterPressure(s,defender,0),800);
  s=deserializeState(serializeState(s));
  assert(passChain(s,attacker).waiting);
  assert.equal(passChain(s,defender).dmg,600);
  assert.equal(s.players[attacker].chi,9400);
  assert.equal(s.players[attacker].catalysts[0].cardId,'qa-low');
  assert.equal(s.players[defender].catalysts[0].cardId,'qa-flip-guard');
  assert(!s.waitingForResponse);
 }
`);
test('a Counter Trick may negate the Flip ability without canceling battle',`
 const s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-low');
 s.players[0].tricks[1]={cardId:'qa-flip-counter',faceDown:true};
 s.players[1].catalysts[0]={...slot('qa-flip-guard','def'),faceDown:true};
 assert(declareAttack(s,0,0,1,0).ok);
 passChain(s,1);
 passChain(s,0);
 assert(queueConcealedResponse(s,0,1).ok);
 passChain(s,1);
 assert.equal(passChain(s,0).type,'capture');
 assert.equal(s.players[0].box[0],'qa-flip-guard');
 assert.equal(s.players[0].chi,10000);
`);
test('Flip removal closes the Chain successfully without fighting a replacement',`
 let s=phase(fresh(),'battle');
 s.players[0].catalysts[2]=slot('qa-low');
 s.players[1].catalysts[0]={...slot('s-m-001-agentx','def'),faceDown:true};
 assert(declareAttack(s,0,2,1,0).ok);
 passChain(s,1);
 assert(passChain(s,0).waiting);
 passChain(s,0);
 assert(passChain(s,1).canceled);
 assert(!s.waitingForResponse);
 assert.equal(s.players[0].catalysts[2],null);
 assert.equal(s.players[0].void[0],'qa-low');
 assert.equal(s.players[1].catalysts[0].cardId,'s-m-001-agentx');
 assert.equal(s.players[0].chi,10000);
 s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-low');
 s.players[1].catalysts[0]={...slot('qa-flip-guard','def'),faceDown:true};
 assert(declareAttack(s,0,0,1,0).ok);passChain(s,1);passChain(s,0);
 s.players[1].catalysts[0]=slot('qa-flip-guard','def');
 passChain(s,0);
 assert(passChain(s,1).canceled);
 assert.equal(s.players[1].catalysts[0].cpMod,undefined);
 assert.equal(s.players[0].chi,10000);
`);
test('printed Baba search resolves before Capture and Invisible Man gains protection before battle',`
 const baba='db1-038-fortunetellerbaba';
 const invisible='db1-040-babasfighter2invisibleman';
 for (const defender of [baba,invisible]) {
  const s=phase(fresh(),'battle');
  s.players[0].catalysts[0]=slot('qa-high');
  s.players[1].deck=[invisible];
  s.players[1].catalysts[0]={...slot(defender,'def'),faceDown:true};
  assert(declareAttack(s,0,0,1,0).ok);
  passChain(s,1);
  assert(passChain(s,0).waiting);
  passChain(s,0);
  const outcome=passChain(s,1);
  if (defender===baba) {
   assert.equal(outcome.type,'capture');
   assert(s.players[1].hand.includes(invisible));
   assert.equal(s.players[1].deck.length,0);
  } else {
   assert(outcome.canceled);
   assert.equal(s.players[1].catalysts[0]._invisibleManCounters,3);
   assert(s.players[0].catalysts[0].attackedThisTurn);
   assert.equal(s.players[0].box.length,0);
  }
 }
`);
test('exhaustion is a draw only when neither player can progress',`
 for (const active of [0,1]) {
  const s=phase(fresh(),'end');
  s.activePlayer=active;
  for (const player of s.players) { player.hand=[]; player.deck=[]; }
  s.players[0].tricks[0]={cardId:'qa-low',isLibra:true};
  s.players[1].tricks[1]={cardId:'qa-flip-counter',faceDown:true};
  assert(endPhaseAction(s,active,'endTurn').ok);
  assert(s.gameOver);
  assert.equal(s.winner,-1);
  assert.equal(s.winReason,'Neither player can advance the duel');
 }
 for (const option of ['hand','deck','field','palm','revive']) {
  const s=phase(fresh(),'end');
  for (const player of s.players) { player.hand=[]; player.deck=[]; }
  const remaining=s.players[1];
  if(option==='hand') remaining.hand.push('qa-low');
  if(option==='deck') remaining.deck.push('qa-low');
  if(option==='field') remaining.catalysts[0]=slot('qa-low');
  if(option==='palm') remaining.tricks[1]={cardId:'qa-trick',faceDown:true};
  if(option==='revive') {remaining.void.push('qa-low');queueDelayedRevive(s,1,'qa-low',{});}
  assert(endPhaseAction(s,0,'endTurn').ok);
  assert.equal(s.gameOver,false,option+' still provides progress');
 }
`);
test('free End Turn remains legal',`const s=phase(fresh(),'end');s.players[0].catalysts[0]=slot('qa-mid');assert.equal(endPhaseAction(s,0,'endTurn').ok,true);assert.equal(s.activePlayer,1);assert.equal(s.players[0].catalysts[0].cardId,'qa-mid');`);
test('Capture followed by Extraction places the target in its owner’s RFG',`
 const s=phase(fresh(),'battle');
 s.players[0].catalysts[0]=slot('qa-mid');
 s.players[1].catalysts[0]=slot('qa-low','def');
 assert.equal(executeAttackCore(s,0,0,1,0).type,'capture');
 assert.equal(s.players[0].boxOwners[0],1);
 phase(s,'end');
 assert(endPhaseAction(s,0,'extraction',0,0).ok);
 assert.equal(s.players[0].extractions,1);
 assert.equal(s.players[0].rfg.length,0);
 assert.equal(s.players[1].rfg[0],'qa-low');
 assert.equal(s.players[0].void[0],'qa-mid');
 assert.equal(s.players[0].box.length,0);
 assert.equal(s.players[0].boxOwners.length,0);
`);
test('Rescue returns the captured Catalyst to its owner’s shuffled deck',`
 const s=phase(fresh(),'end');
 s.players[0].catalysts[0]=slot('qa-mid');
 s.players[1].box=['qa-low'];
 delete s.players[1].boxOwners;
 assert(endPhaseAction(s,0,'rescue',0,0).ok);
 assert(s.players[0].deck.includes('qa-low'));
 assert(!s.players[0].hand.includes('qa-low'));
 assert.equal(s.players[1].box.length,0);
`);
test('an opponent-owned Catalyst under your control cannot pay for Extraction',`
 const s=phase(fresh(),'action');
 s.players[1].catalysts[0]=slot('qa-mid');
 const control=runGenericTakeControl(s,0,'qa-low',{duration:'permanent'},{targetZone:0},'QA');
 assert(control.ok);
 phase(s,'end');
 s.players[0].box=['qa-low'];
 const before=computeStateHash(s);
 assert(!endPhaseAction(s,0,'extraction',control.zone,0).ok);
 assert.equal(computeStateHash(s),before);
`);
test('Great or wrong-owner Box targets cannot spend an End Phase payment',`
 const s=phase(fresh(),'end');
 s.players[0].catalysts[0]=slot('qa-mid');
 s.players[0].box=['qa-great','qa-low','qa-greatness'];
 s.players[0].boxOwners=[1,0,1];
 s.players[1].box=['qa-great','qa-low'];
 s.players[1].boxOwners=[0,1];
 assert.deepEqual(getEligibleBoxTargets(s,0,'extraction'),[2]);
 assert.deepEqual(getEligibleBoxTargets(s,0,'rescue'),[]);
 const before=computeStateHash(s);
 for(const action of ['extraction','rescue']) for(const target of [0,1,1.5])
  assert(!endPhaseAction(s,0,action,0,target).ok);
 assert.equal(computeStateHash(s),before);
`);
test('Extraction is exclusive to the active player',`
 const s=phase(fresh(),'end');
 s.players[1].catalysts[0]=slot('qa-mid');
 s.players[1].box=['qa-low'];
 s.players[1].extractions=6;
 assert(!endPhaseAction(s,1,'extraction',0,0).ok);
 assert.equal(s.players[1].extractions,6);
`);
test('invalid End Phase action does not consume a Catalyst',`const s=phase(fresh(),'end');s.players[0].catalysts[0]=slot('qa-mid');assert.equal(endPhaseAction(s,0,'unknown',0,0).ok,false);assert(s.players[0].catalysts[0]);`);
test('Chi KO wins',`const s=fresh();s.players[1].chi=0;checkWinConditions(s);assert.equal(s.winner,0);assert(s.gameOver);`);
test('seven Kills win',`const s=fresh();s.players[1].kills=7;checkWinConditions(s);assert.equal(s.winner,1);`);
test('seven Extractions win',`const s=fresh();s.players[0].extractions=7;checkWinConditions(s);assert.equal(s.winner,0);`);
test('a simultaneous seventh Kill is a draw regardless of which seat attacked',`
 for(const seat of [0,1]){
  const s=phase(fresh(),'battle');
  s.activePlayer=seat;
  for(const player of s.players){player.kills=6;player.catalysts[0]=slot('qa-mid');}
  assert.equal(executeAttackCore(s,seat,0,1-seat,0).type,'mutual');
  assert(s.gameOver);
  assert.equal(s.winner,-1);
  assert(s.players.every(player=>player.kills===7));
  assert.match(s.winReason,/seven Kills/);
  assert.match(generatePostMatchSummary(s).winMethod,/seven Kills/);
 }
`);
test('double zero Chi draws before considering lower-priority scores',`
 const s=fresh();
 s.players[0].chi=0;s.players[1].chi=0;s.players[0].kills=7;
 checkWinConditions(s);
 assert(s.gameOver);
 assert.equal(s.winner,-1);
 assert.match(s.winReason,/zero Chi/);
 const logCount=s.log.length;
 checkWinConditions(s);
 assert.equal(s.log.length,logCount);
`);
test('state serialization preserves Sets and hash',`const s=fresh();s.players[0].summonedThisTurn.add(2);const copy=deserializeState(serializeState(s));assert(copy.players[0].summonedThisTurn.has(2));assert.equal(computeStateHash(s),computeStateHash(copy));`);
test('invalid deck size and unknown IDs rejected',`assert.equal(CTFDeckUtils.validateDeck({main:['bad'],fusion:[],side:[]}).ok,false);`);
test('all five official starter decks validate against the shared card data',`assert.equal(CTF_STARTER_DECKS.length,5);for(const deck of CTF_STARTER_DECKS){const result=CTFDeckUtils.validateDeck(deck,CTF_CARDS);assert(result.ok,deck.name+': '+result.errors.join(';'));}`);
test('unresolved draw cannot be skipped through phase advance',`const s=phase(fresh(),'draw');assert.equal(advancePhase(s).ok,false);assert.equal(s.phaseName,'draw');`);
const client = fs.readFileSync(path.join(root,'play_inline.js'),'utf8');
const sendBody = client.slice(client.indexOf('function sendAction(action)'),client.indexOf('function applyAction(action)'));
try {
 const local = vm.createContext({calls:0});
 vm.runInContext(`let net=null;function updateStateHashNotice(){};function requestAction(){calls++;};${sendBody};sendAction({type:'advancePhase'});`,local);
 assert.equal(local.calls,0);passed++;console.log('PASS local sendAction never executes an already applied command twice');
} catch(error) {failed++;console.log('FAIL local command regression: '+error.message);}
async function finish() {
 try {
  const result=await vm.runInContext(`(async()=>{const s=phase(fresh(),'draw');s.activePlayer=1;CTF_AI.configure({thinkMs:0});for(let n=0;n<10 && s.activePlayer===1;n++){await CTF_AI.takeTurn(s,1);if(s.waitingForResponse && s.currentResponder===0)passChain(s,0);}return {active:s.activePlayer,spawned:s.players[1].catalysts.filter(Boolean).length,turn:s.turn};})()`,context);
  assert.equal(result.active,0);assert.equal(result.spawned,1);assert.equal(result.turn,3);passed++;console.log('PASS CPU draws, spawns, attacks and finishes a complete turn');
 }catch(error){failed++;console.log('FAIL CPU complete turn: '+error.stack);}
 if (process.argv.includes('--simulate')) {
  const simulation = await vm.runInContext(`(async()=>{
    CTF_AI.configure({thinkMs:0});
    const results={matches:100,completed:0,stalled:0,errors:[],maxTurn:0};
    for(let match=0;match<100;match++){
      const s=createGameState(CTF_STARTER_DECKS[match%5],CTF_STARTER_DECKS[Math.floor(match/5)%5]);
      try{
        for(let command=0;command<500 && !s.gameOver;command++){
          if(s.waitingForResponse)passChain(s,s.currentResponder);
          else await CTF_AI.takeTurn(s,s.activePlayer);
          for(const p of s.players){
            if(p.catalysts.length!==5||p.tricks.length!==5)throw Error('zone count changed');
            if(p.specialSummonCount>5)throw Error('Special Spawn cap exceeded');
            if(p.box.some(id=>CTFDeckUtils.isGreatCard(getCard(id))))throw Error('Great Card remained in Box');
          }
        }
        if(s.gameOver)results.completed++;else results.stalled++;
        results.maxTurn=Math.max(results.maxTurn,s.turn);
      }catch(error){results.errors.push({match,error:error.message});}
    }
    return results;
  })()`,context);
  console.log('SIMULATION '+JSON.stringify(simulation));
  if(simulation.errors.length || simulation.completed!==100) failed++;
 }
 console.log(`${passed} passed; ${failed} failed`);process.exitCode=failed?1:0;
}
finish();
