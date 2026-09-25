const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const window = { CTF_CONFIG: {} };
const context = vm.createContext({ window, console });
for (const file of ['assets/js/data.js', 'assets/js/zf1-tutorial-data.js', 'assets/js/deck-utils.js']) {
  vm.runInContext(read(file), context, { filename: file });
}
context.CTFDeckUtils = window.CTFDeckUtils;
const battle = read('play_inline.js');
const start = battle.indexOf('const TUTORIAL_STARTER_DECK = ');
const end = battle.indexOf('function getTutorialStepData()', start);
assert(start > 0 && end > start);
vm.runInContext(`let tutorialStep = 0;\n${battle.slice(start, end)}\nglobalThis.tutorialDeck = TUTORIAL_STARTER_DECK;\nglobalThis.openingHands = TUTORIAL_OPENING_HANDS;\nglobalThis.getTutorialDeckForTest = getTutorialDeck;`, context);

const source = read('assets/data/ZF1.ptcg');
const names = [...source.matchAll(/^NAME=(.*)$/gm)].map(match => match[1].trim());
const cards = window.CTF_ZF1_TUTORIAL_CARDS;
assert.equal(names.length, 26);
assert.equal(cards.length, 26);
assert.deepEqual(Array.from(cards, card => card.name), names);
assert(cards.every(card => card.set === 'ZF1' && card.id.startsWith('zf1-')));
assert.equal(context.tutorialDeck.main.length, 24);
assert.equal(context.tutorialDeck.fusion.length, 1);
for (const hand of context.openingHands) {
  assert.equal(hand.length, 5);
  const available = [...context.tutorialDeck.main];
  for (const id of hand) {
    assert(id.startsWith('zf1-'));
    const index = available.indexOf(id);
    assert(index >= 0, `${id} must be in the ZF1 Main Deck`);
    available.splice(index, 1);
  }
}
assert(context.tutorialDeck.main.every(id => id.startsWith('zf1-')));
assert(context.tutorialDeck.fusion.every(id => id.startsWith('zf1-')));
assert.equal(context.getTutorialDeckForTest().fixedOpeningHand.join(','), context.openingHands[0].join(','));
console.log('ZF1 tutorial: 26 exact source names, focused 24-card teaching deck, one Fusion, and five ZF1-only opening hands.');
