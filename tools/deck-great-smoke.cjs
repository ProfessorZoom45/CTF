const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {window: {}};
vm.createContext(context);
for (const file of ['assets/js/ctf-config.js', 'assets/js/deck-utils.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}

const cards = [];
for (let i = 0; i < 42; i++) cards.push({id: `main-${i}`, name: `Main ${i}`, cardType: 'Catalyst', great: i < 7});
for (let i = 0; i < 7; i++) cards.push({id: `fusion-${i}`, name: `Fusion ${i}`, cardType: 'Fusion', great: true});
const validate = context.window.CTFDeckUtils.validateDeck;
const main = cards.filter(card => card.id.startsWith('main-')).map(card => card.id);
const fusion = cards.filter(card => card.id.startsWith('fusion-')).map(card => card.id);
const valid = validate({main: main.slice(2), fusion: fusion.slice(2)}, cards);
assert(valid.ok, valid.errors.join('; '));
assert.equal(valid.stats.greatCount, 5);
assert.equal(valid.stats.fusionGreatCount, 5);
assert(validate({main: main.slice(1), fusion: fusion.slice(2)}, cards).errors.some(error => error.includes('Main Deck cannot contain more than 5 Great')));
assert(validate({main: main.slice(2), fusion: fusion.slice(1)}, cards).errors.some(error => error.includes('Fusion Deck cannot contain more than 5 Great')));
assert(validate({main: main.slice(2), fusion: [...fusion.slice(2), fusion[2]]}, cards).errors.some(error => error.includes('only have 1 copy')));
console.log('Great caps: 5 Main + 5 Fusion; duplicate Great Fusion rejected');
