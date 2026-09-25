import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = readFileSync(resolve(root, 'assets/data/ZF1.ptcg'), 'utf8');
const blocks = source.trim().split(/\r?\n(?=\[.*\]\r?\nCARDNO=)/);
const cards = blocks.map(block => {
  const fields = Object.fromEntries(block.split(/\r?\n/).slice(1).map(line => {
    const equal = line.indexOf('=');
    return [line.slice(0, equal), line.slice(equal + 1)];
  }));
  const kinds = fields.GROUP.split('/');
  const isFusion = fields.FUSION === '1';
  const isTrick = kinds.includes('Spell Card') || kinds.includes('Trap Card');
  const cardType = isFusion ? 'Fusion' : kinds.includes('Trap Card') ? 'Concealed Trick' : kinds.includes('Spell Card') ? (fields.ICON === 'Field' ? 'Field Trick' : 'Palm Trick') : 'Catalyst';
  const sub = fields.ICON || (isFusion ? 'Fusion' : kinds.includes('Normal') ? 'Normal' : kinds.includes('Effect') ? 'Effect' : null);
  return {
    id: `zf1-${String(fields.CARDNO).padStart(3, '0')}`,
    set: 'ZF1',
    sourceCardNo: Number(fields.CARDNO),
    name: fields.NAME,
    cardType,
    alignment: isTrick ? '' : fields.TYPE,
    level: Number(fields.LEVEL || 0),
    pr: Number(fields.ATK || 0),
    cp: Number(fields.DEF || 0),
    kinds: isTrick ? [] : kinds,
    kindsStr: isTrick ? '' : kinds.join(' / '),
    sub,
    desc: fields.DESC,
    great: !isTrick && /\bThe Great\b/i.test(fields.NAME)
  };
});
if (cards.length !== 26 || new Set(cards.map(card => card.id)).size !== 26) throw Error('Expected 26 distinct ZF1 cards');
const output = `// Generated from the attached ZF1/ZF1.ptcg. Run node tools/build-zf1-tutorial-data.mjs.\n` +
  `window.CTF_ZF1_TUTORIAL_CARDS = ${JSON.stringify(cards, null, 2)};\n` +
  `if (typeof CTF_CARDS !== 'undefined') {\n` +
  `  const known = new Set(CTF_CARDS.map(card => card.id));\n` +
  `  for (const card of window.CTF_ZF1_TUTORIAL_CARDS) if (!known.has(card.id)) CTF_CARDS.push(card);\n` +
  `  if (typeof CTF_SETS !== 'undefined' && !CTF_SETS.includes('ZF1')) CTF_SETS.push('ZF1');\n` +
  `}\n`;
writeFileSync(resolve(root, 'assets/js/zf1-tutorial-data.js'), output, 'utf8');
console.log(`Wrote ${cards.length} exact-name ZF1 tutorial cards.`);
