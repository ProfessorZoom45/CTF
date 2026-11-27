const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({console, assert, setTimeout, clearTimeout, URL, URLSearchParams});
vm.runInContext('var window = globalThis; var document = {querySelectorAll:()=>[],querySelector:()=>null,addEventListener:()=>{}};', context);
for (const file of ['ctf-config.js', 'data.js', 'zf1-tutorial-data.js', 'deck-utils.js', 'engine.js', 'forge-practice.js']) {
  vm.runInContext(read('assets/js/' + file), context, {filename:file});
}
const client = read('play_inline.js');
const start = client.indexOf('const TUTORIAL_STARTER_DECK = ');
const end = client.indexOf('function getTutorialStepData()', start);
assert(start >= 0 && end > start);
vm.runInContext('let tutorialStep = 0;\n' + client.slice(start, end), context);

vm.runInContext(`
const runtime = CTF_FORGE_PRACTICE;
const { normalDraw, specialDraw, pressure, counterPressure } = runtime.presets;
const card = (name, rank, pr, cp, extras) => ({
  name, rank, pressure:pr, counterPressure:cp, alignment:'Hero', race:'Android', skill:'Normal',
  effectClass:'Normal', lore:'Forge practice fixture.', effectText:'', timingWindow:'',
  fusionRules:'', resolution:'Follow the printed rules.', ...extras
});
const draft = { cards:[
  card('Ash <Scout>', 1, 800, 700, {effectClass:'Effect', effectText:normalDraw.text, timingWindow:normalDraw.timing}),
  card('Terrace Defender', 3, 1000, 1200),
  card('Great Ember', 6, 1500, 1500, {effectClass:'Effect', effectText:'Destroy every Catalyst on the field.'}),
  card('Great Ash Alloy', 8, 1800, 1900, {effectClass:'Fusion', effectText:specialDraw.text, timingWindow:specialDraw.timing, materialOne:'0', materialTwo:'1', fusionRules:'Use Ash <Scout> and Terrace Defender.'}),
  card('Ember Shield', 0, 0, 0, {trickType:'Palm Trick', effectText:pressure.text})
] };
const base = getTutorialDeck();
function practice() { return runtime.create(draft, base); }
function fresh() {
  const setup = practice();
  runtime.use(setup);
  const state = createGameState(setup.deck, base);
  state.phase = PHASES.indexOf('action');
  state.phaseName = 'action';
  return state;
}

{
  assert.equal(getCard('forge-practice-1'), null);
  const state = fresh();
  const player = state.players[0];
  assert.equal(player.hand.join(','), 'forge-practice-1,forge-practice-2,forge-practice-3,forge-practice-5,zf1-026');
  assert.equal(player.fusionDeck.join(','), 'forge-practice-4');
  assert(state.players[1].hand.every(id => id.startsWith('zf1-')));
  assert(CTF_CARDS.every(card => !card.id.startsWith('forge-practice-')));
  assert.equal(getCard(player.hand[0]).displayName, 'Ash <Scout>');
  assert(CTFDeckUtils.isGreatCard(getCard(player.hand[2])));
  assert.equal(getCard(player.hand[2]).practiceEffect, null);
  assert.equal(getAllCardEffects(player.hand[2]).length, 0);
  assert.match(getCard(player.hand[2]).practiceNote, /reference/);
}
{
  const state = fresh();
  const player = state.players[0];
  const opponent = state.players[1];
  assert(normalSummon(state, 0, 0, 0, 'atk', []).ok);
  assert.equal(player.hand.length, 5);
  assert.equal(getEffectivePressure(state, 0, 0), 800);
  const trickIdx = player.hand.indexOf('forge-practice-5');
  assert(!activatePalmTrick(state, 0, trickIdx).ok);
  assert(player.hand.includes('forge-practice-5'));
  assert(activatePalmTrick(state, 0, trickIdx, {targetZone:0,targetCardId:'forge-practice-1'}).ok);
  assert(state.waitingForResponse);
  assert.equal(getEffectivePressure(state, 0, 0), 800);
  passChain(state, 1);
  passChain(state, 0);
  assert.equal(getEffectivePressure(state, 0, 0), 1100);
  assert(player.void.includes('forge-practice-5'));
  assert.equal(getAvailableFusionSummons(state, 0).length, 0);
  assert(setTrick(state, 0, player.hand.indexOf('zf1-026'), -1).ok);
  assert(activateSetFieldTrick(state, 0).ok);
  const option = getAvailableFusionSummons(state, 0)[0];
  assert(option);
  assert.equal(option.fieldIdxs.length, 1);
  assert.equal(option.handIdxs.length, 1);
  const before = [player.hand.length, opponent.hand.length];
  const forbidden = fusionSummonDetailed(state, 0, 0, 1, option.fieldIdxs, option.handIdxs, 'void');
  assert(!forbidden.ok);
  const drawOrder = [];
  const originalDraw = drawCard;
  drawCard = (state, player) => { drawOrder.push(player); return originalDraw(state, player); };
  try { assert(fusionSummonDetailed(state, 0, 0, 1, option.fieldIdxs, option.handIdxs, 'rfg').ok); }
  finally { drawCard = originalDraw; }
  assert.equal(drawOrder.join(','), '1,0');
  assert.equal(player.catalysts[1].cardId, 'forge-practice-4');
  assert.equal(player.rfg.join(','), 'forge-practice-1,forge-practice-2');
  assert.equal(player.hand.length, before[0]);
  assert.equal(opponent.hand.length, before[1] + 1);
}
{
  draft.cards[4].trickType = 'Concealed Trick';
  draft.cards[4].effectText = counterPressure.text;
  const state = fresh();
  const player = state.players[0];
  normalSummon(state, 0, 0, 0, 'def', []);
  assert(setTrick(state, 0, player.hand.indexOf('forge-practice-5'), 1).ok);
  state.activePlayer = 1;
  state.phase = PHASES.indexOf('battle');
  state.phaseName = 'battle';
  state.players[1].catalysts[0] = {cardId:'zf1-019', position:'atk'};
  assert(declareAttack(state, 1, 0, 0, 0).ok);
  const target = {targetZone:0,targetCardId:'forge-practice-1'};
  assert(queueConcealedResponse(state, 0, 1, target).ok);
  passChain(state, 1);
  passChain(state, 0);
  assert.equal(player.catalysts[0], null);
  assert.equal(state.players[1].box[0], 'forge-practice-1');
  assert(player.void.includes('forge-practice-5'));
  const boostLog = state.log.findIndex(line => line.msg.includes('300 counter pressure'));
  const captureLog = state.log.findIndex(line => /captur/i.test(line.msg));
  assert(boostLog >= 0 && captureLog > boostLog);
}
{
  const state = fresh();
  const player = state.players[0];
  assert(setTrick(state, 0, player.hand.indexOf('zf1-026'), -1).ok);
  assert(activateSetFieldTrick(state, 0).ok);
  assert.equal(getAvailableFusionSummons(state, 0).length, 0);
  runtime.use(null);
  assert.equal(getCard('forge-practice-1'), null);
  assert(getCard('zf1-025'));
}
`, context, {filename:'private Forge fixture'});
console.log('Private Forge practice verified: draft ownership, spawn timing, exact materials, Trick targets, Chain resolution and catalog isolation.');
