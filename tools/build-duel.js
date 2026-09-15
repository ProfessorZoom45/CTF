#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   CARRY THE FLAME — DUEL OF THE CATALYSTS :: CARD POOL GENERATOR
   -----------------------------------------------------------------------------
   Reads the official CTF card database (assets/js/data.js) and emits a compact,
   self-contained card pool with *executable* effect scripts inferred from the
   real printed card text. Everything it emits is a strict subset of
   Carry The Flame! Canon v2.2 (see rules.html and assets/js/ctf-config.js).

   Usage:  node tools/build-duel.js [--inject]
             --inject   also inline the pool into duel.html between the
                        POOL_START / POOL_END markers.

   Output keys are intentionally short so the embedded pool stays small:
     id  name  set  t (type)  lvl  pr  cp  al (alignment)  k (kinds)
     gr (great)  txt (printed text)  fx (executable scripts)
       fx entry: { t:trigger, c:cost|0, once:1, ops:[ [op, ...args] ] }
   ────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* ── Load the official database ───────────────────────────────────────────── */
function loadDatabase() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/data.js'), 'utf8');
  const extra = [
    'starter-decks-2026-08-25.js',
    'sets-2026-08-24-patch.js',
    'sets-2026-08-25-patch.js'
  ].map(f => {
    const p = path.join(ROOT, 'assets/js', f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');
  const fn = new Function('window', src + '\n' + extra + '\nreturn {CTF_CARDS, CTF_STARTER_DECKS, CTF_SETS, CTF_META};');
  const win = {};
  const out = fn(win);
  return out;
}

const DB = loadDatabase();
const CARDS = DB.CTF_CARDS.slice();

/* ── Type codes ───────────────────────────────────────────────────────────── */
const TYPE_CODE = {
  'Catalyst': 0,
  'Fusion': 1,
  'Palm Trick': 2,
  'Concealed Trick': 3,
  'Counter Trick': 4,
  'Field Trick': 5
};
const CODE_TYPE = Object.keys(TYPE_CODE).reduce((a, k) => { a[TYPE_CODE[k]] = k; return a; }, {});

/* ── Small helpers ────────────────────────────────────────────────────────── */
const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
const num = v => Number(String(v == null ? 0 : v).replace(/[, ]/g, '')) || 0;
const ALIGNMENTS = ['Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark', 'Thunder', 'Divine', 'Devine'];

function quoted(str) {
  return [...String(str || '').matchAll(/"([^"]+)"/g)].map(m => clean(m[1])).filter(Boolean);
}

/* Build a target filter from a noun phrase ("all Fire Warrior-Type Catalysts"). */
function filterFromPhrase(phraseRaw) {
  const phrase = clean(phraseRaw);
  if (!phrase) return null;
  const low = phrase.toLowerCase();
  const f = {};
  const names = quoted(phrase);
  if (names.length === 1) f.name = names[0];
  else if (names.length > 1) f.nameAny = names;

  const align = ALIGNMENTS.find(a => new RegExp('\\b' + a + '\\b', 'i').test(phrase));
  if (align) f.align = align === 'Devine' ? 'Divine' : align;

  const lvlMax = phrase.match(/(?:level|lvl)\s*(\d+)\s*or\s*less|(\d+)\s*stars?\s*or\s*less|level\s*(\d+)\s*or\s*lower/i);
  if (lvlMax) f.maxLvl = Number(lvlMax[1] || lvlMax[2] || lvlMax[3]);
  const lvlMin = phrase.match(/(?:level|lvl)\s*(\d+)\s*or\s*(?:higher|more|greater)/i);
  if (lvlMin) f.minLvl = Number(lvlMin[1]);
  const lvlExact = phrase.match(/(?:level|lvl)\s*(\d+)\b/i);
  if (lvlExact && f.maxLvl == null && f.minLvl == null) f.lvl = Number(lvlExact[1]);

  const prMax = phrase.match(/(?:pressure|attack|atk)\s*(?:of\s*)?(\d+)\s*or\s*(?:less|lower)/i);
  if (prMax) f.maxPr = Number(prMax[1]);
  const prMin = phrase.match(/(?:pressure|attack|atk)\s*(?:of\s*)?(\d+)\s*or\s*(?:more|higher|greater)/i);
  if (prMin) f.minPr = Number(prMin[1]);

  // Kinds: "Warrior-Type", "Machine", "beast-warriors", "Shadow-Type"
  const kinds = [];
  for (const m of phrase.matchAll(/([A-Za-z][A-Za-z\-]{2,})(?:\s+sub)?-?\s?type/gi)) kinds.push(clean(m[1]).replace(/-$/, ''));
  if (!kinds.length) {
    const strip = phrase
      .replace(/"[^"]*"/g, ' ')
      .replace(/\b(all|every|each|of|the|catalyst|catalysts|card|cards|monster|monsters|on|your|you|opponent'?s?|side|field|control|controls|face[- ]up|face[- ]down|position|gain|gains|gain?s?|their|it|its|and|with|type|types)\b/gi, ' ')
      .replace(/\b(attack|pressure|defense|defence|counter)\b/gi, ' ');
    const chunks = clean(strip).split(/[\/,&;]|\s+and\s+/).map(s => clean(s).replace(/\s*-?\s*type$/i, '')).filter(s => s.length > 2 && s.length < 26);
    chunks.forEach(c => { if (!ALIGNMENTS.some(a => a.toLowerCase() === c.toLowerCase())) kinds.push(c); });
  }
  const cleanedKinds = [...new Set(kinds.map(k => clean(k).replace(/\bsub\b/i, '').trim()).filter(Boolean))];
  if (cleanedKinds.length === 1) f.kind = cleanedKinds[0];
  else if (cleanedKinds.length > 1) f.kindAny = cleanedKinds;

  if (/opponent/i.test(low)) f.side = 'opp';
  else if (/\byou control\b|\byour side\b|\byour field\b|\byour catalysts\b|\bequipped\b/i.test(low)) f.side = 'self';

  return Object.keys(f).length ? f : null;
}

/* ── Effect inference ─────────────────────────────────────────────────────── */
function infer(card) {
  const fx = [];
  const immediate = [];
  const desc = clean(card.desc || '');
  const low = desc.toLowerCase();
  const type = card.cardType;

  const push = (trigger, ops, extra) => {
    const cleanOps = ops.filter(Boolean);
    if (!cleanOps.length) return null;
    const e = { t: trigger, ops: cleanOps };
    if (extra) Object.assign(e, extra);
    fx.push(e);
    return e;
  };

  /* ---- static combat / summoning flags ------------------------------------ */
  const flags = [];
  if (/cannot be normal spawned or set|can ?only be special spawned|cannot be normal summoned|cannot be normal summon/i.test(desc)) flags.push(['specialOnly']);
  if (/may be spawned without a tribute|without a tribute|requires no tribute|no tribute(?:s)? (?:to|required)/i.test(desc)) flags.push(['noTribute']);
  if (/(?:may|can) attack (?:your opponent'?s? chi )?directly|attack directly/i.test(desc)) flags.push(['directAttack']);
  if (/attack twice|may attack twice|attacks? twice/i.test(desc)) flags.push(['doubleAttack']);
  if (/cannot be destroyed by battle/i.test(desc)) flags.push(['cannotBeDestroyedBattle']);
  if (/cannot be destroyed by (?:card|trick) effects|unaffected by (?:card|trick) effects|uneffected by/i.test(desc)) flags.push(['cannotBeDestroyedEffect']);
  if (/cannot be negated|cannot be responded/i.test(desc)) flags.push(['cannotBeNegated']);
  if (/cannot be used as a tribute|tokens? cannot be used as a tribute/i.test(desc)) flags.push(['noTributeFodder']);
  if (/pierce|inflict the difference|excess (?:battle )?damage/i.test(desc)) flags.push(['pierce']);
  if (/cannot attack for the rest of (?:this|the) turn/i.test(desc)) flags.push(['noAttackAfterEffect']);
  /* ---- costs --------------------------------------------------------------- */
  let cost = null;
  const payChi = desc.match(/pay\s+([\d,]+)\s*chi/i);
  if (payChi) cost = { chi: num(payChi[1]) };
  const discCost = desc.match(/discard\s+(\d+)\s+card/i);
  if (discCost && /to (?:activate|special|destroy|negate)/i.test(desc)) cost = Object.assign(cost || {}, { discard: num(discCost[1]) });
  const tribCost = desc.match(/tribute\s+(\d+)\s+(?:\w+-?type\s+)?catalyst/i);
  if (tribCost) cost = Object.assign(cost || {}, { tribute: num(tribCost[1]) });
  const once = /once per turn|you may only use this effect once per turn|only once per turn/i.test(desc) ? 1 : 0;

  /* ---- continuous auras ---------------------------------------------------- */
  const auraOf = (statKind, amount, phrase) => {
    const f = filterFromPhrase(phrase) || {};
    if (statKind === 'both') return ['boostBoth', amount, f];
    return statKind === 'cp' ? ['boostCp', amount, f] : ['boostPr', amount, f];
  };

  const auraPatterns = [
    // increase/boost/decrease the Pressure (and Counter Pressure) of all X by N
    /(increase|boost|raise|decrease|lower|reduce)\s+(?:the\s+)?(?:attack|pressure|atk)(?:\s+and\s+(?:counter\s+)?(?:defense|defence|counter pressure|cp))?\s+of\s+(all|every|each)\s+(.{2,90}?)\s+by\s+([\d,]+)/ig,
    // increase/boost/decrease the Counter Pressure (and Pressure) of all X by N
    /(increase|boost|raise|decrease|lower|reduce)\s+(?:the\s+)?(?:counter pressure|defense|defence)(?:\s+and\s+(?:attack|pressure))?\s+of\s+(all|every|each)\s+(.{2,90}?)\s+by\s+([\d,]+)/ig,
    // all X gain(s) N Pressure(/Counter Pressure)
    /\b(all|every|each)\s+(.{2,90}?)\s+(?:you control\s+)?(?:gain|gains|gets?)\s+([\d,]+)\s+(?:pressure|attack)(?:\s*\/?\s*(?:and\s+)?(?:counter pressure|defense|defence|cp))?/ig,
    // increase the attack of every X by N  (legacy wording)
    /(increase|boost|decrease|lower|reduce)\s+the\s+(?:attack|pressure)(?:\s+and\s+(?:defense|defence|counter pressure))?\s+of\s+every\s+(.{2,90}?)\s+by\s+([\d,]+)/ig
  ];
  for (const rx of auraPatterns) {
    let m;
    rx.lastIndex = 0;
    while ((m = rx.exec(desc))) {
      const verb = (m[1] || '').toLowerCase();
      const both = /counter pressure|defen[cs]e|cp\b/i.test(m[0]) && /and\s+(\d|counter|defen|cp)|pressure\s*\/\s*counter|counter pressure\s*\/\s*pressure|\/\s*(?:counter|defen)/i.test(m[0] + ' ' + desc.slice(Math.max(0, m.index - 10), m.index + 120));
      const negative = /decrease|lower|reduce/.test(verb);
      let amount = num(m[m.length - 1]);
      if (!amount) continue;
      if (negative) amount = -amount;
      let phrase = m[m.length - 2];
      if (m[0].match(/^(all|every|each)\s/i) && m.length >= 4 && /^(all|every|each)$/i.test(m[1] || '')) phrase = m[2];
      // "increase the attack of every X by N": groups are verb, X, N
      if (/of\s+every\s/i.test(m[0])) phrase = m[2];
      if (/^(all|every|each)$/i.test(clean(phrase))) continue;
      const op = auraOf(both ? 'both' : (/counter pressure|defen[cs]e/i.test(m[0].split(/\s+of\s+/)[0]) ? 'cp' : 'pr'), amount, phrase);
      push('cont', [op], { c: null, once: 0 });
    }
  }
  // "All "Bleach" Catalysts gain 200 Pressure/Counter Pressure." (leading form)
  for (const m of desc.matchAll(/\ball\s+([^.,;]{2,80}?)\s+gain\s+([\d,]+)\s+pressure\s*\/?\s*(?:(?:counter pressure|defense|defence))?/gi)) {
    const amount = num(m[2]);
    const op = /\/|counter|defen/i.test(m[0]) ? ['boostBoth', amount, filterFromPhrase(m[1]) || {}] : ['boostPr', amount, filterFromPhrase(m[1]) || {}];
    push('cont', [op], { c: null, once: 0 });
  }
  // equipped-catalyst auras (Equip Palm Tricks)
  for (const m of desc.matchAll(/(?:increase|boost)s?\s+(?:the\s+)?(?:attack|pressure)\s+(?:and\s+(?:counter pressure|defense|defence)\s+)?of\s+the\s+equipped\s+catalyst\s+by\s+([\d,]+)/gi)) {
    push('equip', [['boostPr', num(m[1]), {}]], { c: null, once: 0 });
  }
  for (const m of desc.matchAll(/the\s+equipped\s+catalyst\s+(?:gain|gains)s?\s+([\d,]+)\s+(?:pressure|attack)(?:\s+and\s+([\d,]+)\s+(?:counter pressure|defense|defence))?/gi)) {
    const ops = [['boostPr', num(m[1]), {}]];
    if (m[2]) ops.push(['boostCp', num(m[2]), {}]);
    push('equip', ops, { c: null, once: 0 });
  }
  // "Gains 300 Pressure for each Warrior-Type Catalyst in both Void."
  for (const m of desc.matchAll(/gains?\s+([\d,]+)\s+(?:pressure|attack)\s+for\s+each\s+(.{2,60}?)\s+in\s+(?:both\s+|your\s+|the\s+)?(?:void|graveyard)/gi)) {
    push('cont', [['boostPrPerVoid', num(m[1]), filterFromPhrase(m[2]) || {}]], { c: null, once: 0 });
  }
  // Self auras: "increase this Catalyst's Pressure points by 500" / "this card gains 300 Pressure"
  for (const m of desc.matchAll(/increase\s+(?:this|its)\s+(?:catalyst'?s?|card'?s?)\s+(?:counter\s+)?(pressure|attack|defense|defence|counter pressure)(?:\s+points)?\s+by\s+([\d,]+)/gi)) {
    const cp = /counter|defen/i.test(m[1]);
    push('cont', [[cp ? 'boostCp' : 'boostPr', num(m[2]), { self: 1 }]], { c: null, once: 0 });
  }
  for (const m of desc.matchAll(/this\s+(?:card|catalyst)\s+(?:gain|gains)s?\s+([\d,]+)\s+(pressure|counter pressure|attack|defense|defence)/gi)) {
    const cp = /counter|defen/i.test(m[2]);
    const perTurn = /until (?:the )?end of (?:the )?turn|this turn/i.test(desc);
    if (perTurn) immediate.push(['tempBoost' + (cp ? 'Cp' : 'Pr'), num(m[1]), { self: 1 }]);
    else push('cont', [[cp ? 'boostCp' : 'boostPr', num(m[1]), { self: 1 }]], { c: null, once: 0 });
  }
  // "your opponent's Catalysts lose 200 Pressure"
  for (const m of desc.matchAll(/(?:your\s+)?opponent'?s?\s+catalysts?\s+(?:lose|lose?s?)\s+([\d,]+)\s+(pressure|counter pressure|attack|defense|defence)/gi)) {
    const cp = /counter|defen/i.test(m[2]);
    push('cont', [[cp ? 'boostCp' : 'boostPr', -num(m[1]), { side: 'opp' }]], { c: null, once: 0 });
  }
  // "lower there Pressure down 600" / "reduce ... Pressure by N"
  for (const m of desc.matchAll(/(?:lower|reduce|decrease)\s+(?:there|their|its|the)\s+(pressure|counter pressure|attack)\s*(?:down)?\s*by\s+([\d,]+)/gi)) {
    const cp = /counter/i.test(m[1]);
    push('cont', [[cp ? 'boostCp' : 'boostPr', -num(m[2]), {}]], { c: null, once: 0 });
  }

  /* ---- split the text into trigger-scoped clauses -------------------------- */
  const TRIGGER_RX = [
    [/^when (?:this card|this catalyst|it) is (?:normal |special )?spawned\b/i, 'onSpawn'],
    [/\bwhen (?:this card|this catalyst|it) is (?:normal |special )?spawned\b/i, 'onSpawn'],
    [/^when spawned\b/i, 'onSpawn'],
    [/^when this card is (?:normal|special) spawned\b/i, 'onSpawn'],
    [/\bwhen (?:this card|this catalyst|it) is (?:normal |special )?spawned[,:]/i, 'onSpawn'],
    [/\bwhen (?:this card|this catalyst|it) is (?:destroyed|sent from the field to the (?:void|graveyard))\b/i, 'onDestroy'],
    [/\bwhen (?:this card|this catalyst|it) is sent to the (?:void|graveyard)\b/i, 'onDestroy'],
    [/\bif (?:this card|this catalyst) is destroyed (?:in battle|by battle)\b/i, 'onDestroyBattle'],
    [/\bwhen (?:this card|this catalyst|it) destroys (?:a|an|an opponent'?s?) (?:catalyst|monster) in battle\b/i, 'onBattleDestroy'],
    [/\bwhen (?:this card|it) (?:declares an attack|attacks?)\b/i, 'onAttack'],
    [/\bwhen (?:this card|this catalyst|it) inflicts battle damage\b/i, 'onBattleDamage'],
    [/\bwhen your opponent (?:declares an |normal )?(?:attacks?|spawns?)\b/i, 'onOppAct'],
    [/\bwhen(?:ever)? your opponent (?:activates|uses) (?:a|an|the)\b/i, 'onOppAct'],
    [/\bwhen a (?:palm|concealed|trick|counter)/i, 'counter'],
    [/\bactivate (?:this card )?when\b/i, 'onOppAct'],
    [/\bwhen (?:a|an) (?:palm|concealed)/i, 'counter'],
    [/\bduring (?:your|the) battle phase\b/i, 'ignition'],
    [/\bonce per turn\b/i, 'ignition'],
    [/\bflip:/i, 'flip'],
    [/\bif you control no catalysts\b/i, 'ignition']
  ];

  /* Immediate (non-triggered) operations. */

  // Chi gain / burn
  for (const m of desc.matchAll(/\b(?:gain|restore|heal|recover)\s+([\d,]+)\s*chi\b/gi)) immediate.push(['chi', num(m[1])]);
  for (const m of desc.matchAll(/\b(?:inflict|deal|cause|do)\s+([\d,]+)\s*(?:points? of\s*)?(?:direct\s*)?(?:damage|logic damage)?\s*(?:of damage\s*)?to\s+(?:your opponent|your opponent'?s chi|the opponent|them)\b/gi)) immediate.push(['burn', num(m[1])]);
  for (const m of desc.matchAll(/\b(?:inflict|deal)\s+([\d,]+)\s*damage\b/gi)) { if (!immediate.some(o => o[0] === 'burn' && o[1] === num(m[1]))) immediate.push(['burn', num(m[1])]); }
  for (const m of desc.matchAll(/\b(?:decrease|reduce|lower)\s+(?:your opponent'?s?\s+)?chi\s+by\s+([\d,]+)\b/gi)) immediate.push(['burn', num(m[1])]);
  for (const m of desc.matchAll(/\blose\s+([\d,]+)\s*chi\b/gi)) immediate.push(['burnSelf', num(m[1])]);

  // Draw / discard
  for (const m of desc.matchAll(/\bdraw\s+([\d,]+)\s+card(?:s)?,?\s*(?:then)?\s*discard\s+([\d,]+)\s+card(?:s)?/gi)) immediate.push(['drawDiscard', num(m[1]), num(m[2])]);
  for (const m of desc.matchAll(/\bdraw\s+([\d,]+)\s+card(?:s)?/gi)) {
    if (!immediate.some(o => o[0] === 'drawDiscard')) immediate.push(['draw', num(m[1])]);
  }
  if (/discard\s+(?:your entire hand|all (?:the )?cards in your hand)/i.test(desc)) immediate.push(['discardHand']);

  // Destroy / remove
  const destroyTargets = [
    [/destroy\s+all\s+of\s+your\s+opponent'?s?\s+catalysts/gi, () => ['destroyCatalyst', 99, { side: 'opp' }]],
    [/destroy\s+all\s+catalysts/gi, () => ['destroyCatalyst', 99, {}]],
    [/destroy\s+all\s+(?:face[- ]?up\s+)?(?:palm\s+)?tricks?/gi, () => ['destroyTrick', 99, {}]],
    [/destroy\s+all\s+field\s+tricks?/gi, () => ['destroyTrick', 99, { kind: 'Field' }]],
    [/destroy\s+all\s+(?:face[- ]?down\s+)?cards?\s+on\s+the\s+field/gi, () => ['destroyAny', 99, {}]]
  ];
  for (const [rx, make] of destroyTargets) { let m; rx.lastIndex = 0; while ((m = rx.exec(desc))) immediate.push(make()); }
  for (const m of desc.matchAll(/destroy\s+(?:up to\s+)?(\d+|one|two|three|a|an)\s+(?:face[- ]?up\s+|face[- ]?down\s+)?(catalyst|catalysts|trick|tricks|palm trick|concealed trick|field trick|card|cards|set card|set cards)(?:\s+on\s+the\s+field)?(?:\s+your opponent controls)?/gi)) {
    const nMap = { one: 1, two: 2, three: 3, a: 1, an: 1 };
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
    const what = m[2].toLowerCase();
    let op;
    if (/catalyst/.test(what)) op = ['destroyCatalyst', n, /opponent/i.test(m[0]) ? { side: 'opp' } : {}];
    else if (/field trick/.test(what)) op = ['destroyTrick', n, { kind: 'Field' }];
    else if (/trick/.test(what)) op = ['destroyTrick', n, /opponent/i.test(m[0]) ? { side: 'opp' } : {}];
    else op = ['destroyAny', n, /opponent/i.test(m[0]) ? { side: 'opp' } : {}];
    immediate.push(op);
  }
  for (const m of desc.matchAll(/(?:remove|banish)\s+(?:up to\s+)?(\d+|one|two|a|an)\s+card(?:s)?\s+on\s+the\s+field\s+from\s+play/gi)) {
    const nMap = { one: 1, two: 2, a: 1, an: 1 };
    immediate.push(['rfgAny', /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1), {}]);
  }
  for (const m of desc.matchAll(/(?:remove|banish)\s+from\s+(?:the\s+)?game\s+(\d+)\s+opponent'?s?\s+card/gi)) immediate.push(['rfgAny', Number(m[1]), { side: 'opp' }]);

  // Special Spawn tokens:  Special Spawn 3 "BuCk The Great" Tokens ... (Type/Fire/3 Star/Pressure 1000/Counter Pressure 1000)
  for (const m of desc.matchAll(/special spawn\s+(?:up to\s+)?(\d+|one|two|three|a|an)\s+"([^"]+)"\s+tokens?\b([^.]*)/gi)) {
    const nMap = { one: 1, two: 2, three: 3, a: 1, an: 1 };
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
    const tail = m[3] || '';
    const prm = tail.match(/pressure\s*([\d,]+)/i) || tail.match(/([\d,]+)\s*attack/i);
    const cpm = tail.match(/counter pressure\s*([\d,]+)/i) || tail.match(/([\d,]+)\s*defen/i) || tail.match(/\/\s*([\d,]+)/);
    const lvlM = tail.match(/(\d+)\s*star|level\s*(\d+)/i);
    const kindM = tail.match(/([A-Za-z\- ]+?)-?type/i);
    const alignM = ALIGNMENTS.find(a => new RegExp('\\b' + a + '\\b', 'i').test(tail));
    immediate.push(['spawnToken', n, {
      name: m[2],
      pr: prm ? num(prm[1]) : 1000,
      cp: cpm ? num(cpm[1]) : 1000,
      lvl: lvlM ? Number(lvlM[1] || lvlM[2]) : 3,
      kind: kindM ? clean(kindM[1]) : 'Token',
      align: alignM || ''
    }]);
  }
  // Generic token creation for Field Tricks: "create 1 Robot Token and spawn it ... with 500/500"
  for (const m of desc.matchAll(/create\s+(\d+)\s+([A-Za-z\- ]+?)\s+token(?:s)?\s+and\s+spawn(?:\s+it|\s+them)?[^.]*?with\s+([\d,]+)\s*\/\s*([\d,]+)/gi)) {
    immediate.push(['spawnToken', Number(m[1]), { name: clean(m[2]) + ' Token', pr: num(m[3]), cp: num(m[4]), lvl: 1, kind: clean(m[2]), align: '' }]);
  }
  // Special Spawn from a zone
  const ZONE_MAP = { hand: 'hand', void: 'void', graveyard: 'void', deck: 'deck', 'grave yard': 'void' };
  for (const m of desc.matchAll(/special spawn\s+(?:up to\s+)?(\d+|one|two|three|a|an)\s+(?:(?:level|lvl)\s*(\d+)\s*or\s*lower\s+)?"([^"]+)"\s*(?:catalyst|monster)?s?\s+from\s+(?:your\s+|the\s+)?(hand|void|grave\s*yard|graveyard|deck)\b/gi)) {
    const nMap = { one: 1, two: 2, three: 3, a: 1, an: 1 };
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
    const zone = ZONE_MAP[(m[4] || '').toLowerCase()] || 'hand';
    const f = { name: clean(m[3]) };
    if (m[2]) f.maxLvl = Number(m[2]);
    immediate.push(['ss' + zone[0].toUpperCase() + zone.slice(1), n, f]);
  }
  for (const m of desc.matchAll(/special spawn\s+(?:up to\s+)?(\d+|one|two|three|a|an)\s+(?:(?:level|lvl)\s*(\d+)\s*or\s*lower\s+)?([^".,]{2,60}?)\s*(?:catalyst|monster)?s?\s+from\s+(?:your\s+|the\s+)?(hand|void|grave\s*yard|graveyard|deck)\b/gi)) {
    const nMap = { one: 1, two: 2, three: 3, a: 1, an: 1 };
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
    const zone = ZONE_MAP[(m[4] || '').toLowerCase()] || 'hand';
    const f = filterFromPhrase(m[3] || '') || {};
    if (m[2]) f.maxLvl = Number(m[2]);
    immediate.push(['ss' + zone[0].toUpperCase() + zone.slice(1), n, f]);
  }
  for (const m of desc.matchAll(/special spawn\s+(?:up to\s+)?(\d+|one|a|an)\s+catalyst(?:s)?/gi)) {
    const nMap = { one: 1, a: 1, an: 1 };
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
    if (!/from\s+(your|the)\s+(hand|void|deck|grave)/i.test(m[0])) immediate.push(['ssHand', n, {}]);
  }

  // Search / tutor
  for (const m of desc.matchAll(/search your deck for\s+(?:up to\s+)?(\d+|one|two|a|an)\s+([^.,]{2,60}?)\s+and add (?:it|them) to your hand/gi)) {
    const nMap = { one: 1, two: 2, a: 1, an: 1 };
    immediate.push(['search', /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1), filterFromPhrase(m[2]) || {}]);
  }
  for (const m of desc.matchAll(/add\s+(?:up to\s+)?(\d+)?\s*(?:1\s+)?"([^"]+)"\s+from your (deck|void) to your hand/gi)) {
    immediate.push(['search', Number(m[1] || 1), { name: m[2], from: /void|grave/i.test(m[3]) ? 'void' : 'deck' }]);
  }
  for (const m of desc.matchAll(/add\s+(?:1\s+)?([A-Za-z\- ]+?)-?type\s+catalyst\s+from your (deck|void) to your hand/gi)) {
    immediate.push(['search', 1, { kind: clean(m[1]), from: /void|grave/i.test(m[2]) ? 'void' : 'deck' }]);
  }

  // Position changes
  for (const m of desc.matchAll(/(?:change|switch|put)\s+(?:all\s+|1\s+|one\s+|a\s+|target\s+)?(?:opponent'?s?\s+)?(?:select(?:ed)?\s+)?catalyst(?:s)?\s+to\s+(defense|defence|attack)\s+position/gi)) {
    immediate.push(['changePos', /all/i.test(m[0]) ? 99 : 1, /defen/i.test(m[1]) ? 'def' : 'atk', /opponent/i.test(m[0]) ? { side: 'opp' } : {}]);
  }
  for (const m of desc.matchAll(/target\s+(\d+|one|a)\s+catalyst;\s*change it to\s+(defense|defence|attack)\s+position/gi)) {
    immediate.push(['changePos', 1, /defen/i.test(m[2]) ? 'def' : 'atk', {}]);
  }

  // Negation
  if (/negate\s+(?:the\s+|an\s+|1\s+)?attack/i.test(desc)) immediate.push(['negateAttack']);
  for (const m of desc.matchAll(/negate\s+(?:that|the)\s+(?:activation|effect)(?:\s+of\s+[^.,]{0,60})?(?:\s*,?\s*and\s+destroy\s+(?:it|that card))?/gi)) {
    immediate.push(/destroy/i.test(m[0]) ? ['negateDestroy'] : ['negateEffect']);
  }
  if (/negate\s+(?:the\s+)?activation\s+of\s+(?:a\s+)?palm/i.test(desc) && !immediate.some(o => o[0] === 'negateDestroy' || o[0] === 'negateEffect')) immediate.push(['negateDestroy']);
  if (/negate\s+1\s+catalyst\s+effect/i.test(desc)) immediate.push(['negateEffect']);

  // Battle-position / global stat shifts
  for (const m of desc.matchAll(/all catalysts (?:your opponent controls\s+)?(gain|lose)\s+([\d,]+)\s+pressure\s*\/?\s*(?:counter pressure)?/gi)) {
    const amt = num(m[2]) * (/lose/i.test(m[1]) ? -1 : 1);
    immediate.push(['tempBoostBoth', amt, /opponent/i.test(m[0]) ? { side: 'opp' } : {}]);
  }
  for (const m of desc.matchAll(/(?:reduce|lower)\s+all\s+(?:of\s+)?(?:your\s+)?opponent'?s?\s+catalysts?\s+to\s+1\s+pressure\s+and\s+1\s+counter pressure/gi)) immediate.push(['reduceAll', { side: 'opp' }]);
  for (const m of desc.matchAll(/target\s+(\d+|one|a|an)\s+([^.;]{0,60}?);?\s*it gains\s+([\d,]+)\s+(?:pressure|attack)(?:[^.;]{0,40})/gi)) {
    immediate.push(['tempBoostPr', num(m[3]), filterFromPhrase(m[2]) || {}]);
  }
  for (const m of desc.matchAll(/(?:select|choose|target)\s+(\d+|one|a|an)\s+([^.;]{0,60}?)\.?(?:\s+it)?\s+gains?\s+([\d,]+)\s+(?:pressure|attack)/gi)) {
    immediate.push(['tempBoostPr', num(m[3]), filterFromPhrase(m[2]) || {}]);
  }
  for (const m of desc.matchAll(/(?:inflict|deal)\s+(?:an\s+)?extra\s+([\d,]+)\s*(?:chi\s+)?damage/gi)) immediate.push(['burn', num(m[1])]);

  // Control stealing
  if (/\btake control of\b/i.test(desc)) {
    const n = /take control of all/i.test(desc) ? 99 : 1;
    const f = filterFromPhrase((desc.match(/take control of\s+(?:a|one|1|an|all)?\s*(?:face[- ]?up\s*)?([^.,]{0,60})/i) || [])[1] || '') || {};
    immediate.push(['takeControl', n, f]);
  }
  // Bounce
  for (const m of desc.matchAll(/return\s+(?:up to\s+)?(\d+|one|a|an)\s+(?:catalyst|card|monster)s?\s+on\s+the\s+field\s+to\s+(?:its|their)\s+owner'?s?\s+hand/gi)) {
    immediate.push(['bounce', 1, {}]);
  }
  // Equip boosts (alternate wording)
  for (const m of desc.matchAll(/increase\s+the\s+(?:equip(?:p)?ed)\s+catalyst'?s?\s+(pressure|counter pressure|attack|defense|defence)\s+by\s+([\d,]+)/gi)) {
    push('equip', [[/counter|defen/i.test(m[1]) ? 'boostCp' : 'boostPr', num(m[2]), {}]], { c: null, once: 0 });
  }
  // Flip a face-down Catalyst face-up
  if (/flip\s+(?:\d+\s+|one\s+|a\s+|the\s+)?face[- ]?down\s+catalyst/i.test(desc)) immediate.push(['flipUp', 1, {}]);
  // Scaled chi burn: "Inflict 300 Chi x the number of cards in your opponents hand"
  for (const m of desc.matchAll(/inflict\s+([\d,]+)\s*(?:chi\s*)?x\s*(?:the\s+number\s+of\s+)?cards?\s+in\s+your\s+opponent'?s?\s+hand/gi)) {
    immediate.push(['burnPerOppHand', num(m[1])]);
  }
  for (const m of desc.matchAll(/inflict\s+([\d,]+)\s*(?:chi\s*)?(?:damage\s*)?(?:x|per|for each)\s*(?:the\s+)?(?:each\s+)?card(?:s)?\s+in\s+(?:the\s+)?void/gi)) {
    immediate.push(['burnPerVoid', num(m[1])]);
  }
  // Destroy that/the target catalyst
  if (/destroy\s+(?:the|that|it|this)\s+(?:face[- ]?down\s+)?catalyst/i.test(desc) && !immediate.some(o => o[0] === 'destroyCatalyst')) {
    immediate.push(['destroyCatalyst', 1, {}]);
  }
  // "Negate 1 Concealed Tricks" / "Negate 1 Catalyst effect"
  if (/negate\s+1\s+(?:concealed|palm|catalyst|trick)/i.test(desc) && !immediate.some(o => o[0] === 'negateEffect' || o[0] === 'negateDestroy')) {
    immediate.push(['negateEffect']);
  }
  // Token placement: place 2 "Minibot Tokens" on the field [Dark/Machine/Pressure 500/Counter Pressure 500]
  for (const m of desc.matchAll(/place\s+(?:up to\s+)?(\d+|one|two|three|a|an)\s+"([^"]+)"\s*tokens?\s*on the field\s*\[?([^\].]*)/gi)) {
    const nMap = { one: 1, two: 2, three: 3, a: 1, an: 1 };
    const tail = m[3] || '';
    const prm = tail.match(/pressure\s*([\d,]+)/i);
    const cpm = tail.match(/counter pressure\s*([\d,]+)/i) || tail.match(/\/\s*([\d,]+)/);
    const lvlM = tail.match(/(\d+)\s*star|level\s*(\d+)/i);
    const alignM = ALIGNMENTS.find(a => new RegExp('\\b' + a + '\\b', 'i').test(tail));
    const kindM = tail.match(/\[?\s*[A-Za-z]+\/([A-Za-z\- ]+?)\//);
    immediate.push(['spawnToken', /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1), {
      name: m[2],
      pr: prm ? num(prm[1]) : 500,
      cp: cpm ? num(cpm[1]) : 500,
      lvl: lvlM ? Number(lvlM[1] || lvlM[2]) : 1,
      kind: kindM ? clean(kindM[1]) : 'Token',
      align: alignM || ''
    }]);
  }
  // "cannot be attacked" / "may not be attacked"
  if (/cannot be attacked|may not be attacked|can ?not attack this card/i.test(desc)) flags.push(['cannotBeAttacked']);
  // Fusion-material notes are handled by the engine, no op needed.

  // "Raise the equipped Catalyst's Pressure by 600."
  for (const m of desc.matchAll(/raise\s+(?:the\s+)?equip(?:p)?ed\s+catalyst'?s?\s+(pressure|counter pressure|attack|defense|defence)\s+by\s+([\d,]+)/gi)) {
    push('equip', [[/counter|defen/i.test(m[1]) ? 'boostCp' : 'boostPr', num(m[2]), {}]], { c: null, once: 0 });
  }
  // "Double the Attack of all Machine-type Catalysts"
  for (const m of desc.matchAll(/double\s+(?:the\s+)?(attack|pressure|defense|defence)\s+of\s+(?:all\s+|every\s+)?(.{2,60}?)(?:\s+on\s+your\s+side|\s+you\s+control)?(?=\.|,|;|\s+during|\s+until)/gi)) {
    const cp = /defen/i.test(m[1]);
    push('cont', [[cp ? 'doubleCp' : 'doublePr', filterFromPhrase(m[2]) || {}]], { c: null, once: 0 });
  }
  // "Gains 200 Pressure for each Catalyst your opponent controls."
  for (const m of desc.matchAll(/gains?\s+([\d,]+)\s+(?:pressure|attack)\s+for\s+each\s+(?:catalyst|card)\s+your\s+opponent\s+controls/gi)) {
    push('cont', [['boostPrPerOppField', num(m[1]), {}]], { c: null, once: 0 });
  }
  // Damage-calculation combat boost: "it gains 400 Pressure during damage calculation"
  for (const m of desc.matchAll(/gains?\s+([\d,]+)\s+(?:pressure|attack)\s+(?:during|in)\s+(?:damage calculation|battle)/gi)) {
    push('battleCalc', [['tempBoostPr', num(m[1]), { self: 1 }]], { c: null, once: 0 });
  }
  // Search with alternate wording: "add it into your hand" / "add them to your hand"
  for (const m of desc.matchAll(/search your deck for\s+(?:up to\s+)?(\d+|one|two|a|an)\s+([^.,]{2,60}?)\s+and add (?:it|them) (?:in)?to your hand/gi)) {
    const nMap = { one: 1, two: 2, a: 1, an: 1 };
    if (!immediate.some(o => o[0] === 'search')) immediate.push(['search', /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1), filterFromPhrase(m[2]) || {}]);
  }
  // "Add one Robin, Cyborg, Beast Boy ... from your deck to your hand."  (name list)
  for (const m of desc.matchAll(/add\s+(?:one|1)\s+([A-Z][^.]{2,160}?)\s+from your (deck|void) to your hand/gi)) {
    const names = m[1].split(/,|\s+or\s+/).map(clean).filter(s => s && s.length < 30);
    if (names.length) immediate.push(['search', 1, { nameAny: names.slice(0, 8), from: /void/i.test(m[2]) ? 'void' : 'deck' }]);
  }
  // Void recovery: "Return one Equip Palm Tricks from the Void to your hand."
  for (const m of desc.matchAll(/return\s+(?:one|1|a)\s+([^.]{2,60}?)\s+from (?:the|your) void to (?:the|your) hand/gi)) {
    immediate.push(['voidToHand', 1, filterFromPhrase(m[1]) || {}]);
  }
  // Mill: "send 1 to the Void" from the top of the opponent deck
  for (const m of desc.matchAll(/send\s+([\d,]+)\s+(?:card(?:s)?\s+)?to the void/gi)) immediate.push(['millVoid', num(m[1])]);
  // Ritual-style: Special Spawn "X" from your hand. To do this, discard Catalysts whose total Levels exactly equal N.
  for (const m of desc.matchAll(/special spawn\s+"([^"]+)"\s+from your hand/gi)) {
    if (!immediate.some(o => o[0] === 'ssHand')) immediate.push(['ssHand', 1, { name: m[1] }]);
  }
  // Battle-position lock / attack lock
  if (/can ?not change (?:its |battle )?position or attack|cannot change (?:its )?battle position|cannot attack or change/i.test(desc)) {
    immediate.push(['lockdown', 1, {}]);
  }
  // Self-revive after battle destruction
  if (/if this card is destroyed in battle[, ]+special spawn this card|when this card is destroyed in battle[, ]+special spawn/i.test(desc)) {
    push('onDestroyBattle', [['reviveSelf', 1]], { c: null, once: 0 });
  }
  // Opponent skips their next draw
  if (/cannot draw a card this turn|opponent (?:does not|doesn'?t) draw/i.test(desc)) immediate.push(['skipOppDraw', 1]);
  // Redirect an attack to this card
  if (/change the target to this card|redirect (?:the )?attack to this card/i.test(desc)) immediate.push(['redirectAttack', 1]);

  // Box / extraction helpers
  if (/\bextract\b/i.test(desc)) immediate.push(['extract', 1]);
  if (/\b(?:gain|score)\s+(?:1\s+)?kill/i.test(desc)) immediate.push(['gainKill', 1]);
  // Coin flip chi
  for (const m of desc.matchAll(/flip a coin[^.]*?heads[^.]*?gain\s+([\d,]+)[^.]*?tails[^.]*?lose\s+([\d,]+)/gi)) {
    immediate.push(['coinChi', num(m[1]), num(m[2])]);
  }
  // Shuffle a card back
  if (/\bshuffle (?:your|this|1) card (?:from|in) your (?:box|hand)/i.test(desc)) immediate.push(['shuffleFromBox', 1]);

  /* Choose the trigger for the immediate ops. */
  let trigger = null;
  for (const [rx, name] of TRIGGER_RX) {
    if (rx.test(desc)) { trigger = name; break; }
  }
  if (!trigger) {
    if (type === 'Palm Trick') trigger = 'onActivate';
    else if (type === 'Concealed Trick' || type === 'Counter Trick') trigger = 'onActivate';
    else if (type === 'Field Trick') trigger = 'onActivate';
    else trigger = 'onSpawn';
  }
  // Counter Tricks that negate are response-only.
  if (type === 'Counter Trick' && /negate/i.test(desc)) trigger = 'counter';

  if (immediate.length) push(trigger, immediate, { c: cost, once });

  /* Triggered sub-clauses: re-scan sentences that start with a trigger keyword. */
  const sentences = desc.split(/(?<=[.;])\s+/).map(clean).filter(Boolean);
  sentences.forEach(sentence => {
    let trig = null;
    for (const [rx, name] of TRIGGER_RX) {
      if (rx.test(sentence)) { trig = name; break; }
    }
    if (!trig) return;
    const ops = [];
    for (const m of sentence.matchAll(/\b(?:gain|restore|heal)\s+([\d,]+)\s*chi\b/gi)) ops.push(['chi', num(m[1])]);
    for (const m of sentence.matchAll(/\b(?:inflict|deal)\s+([\d,]+)\s*(?:points? of\s*)?damage/gi)) ops.push(['burn', num(m[1])]);
    for (const m of sentence.matchAll(/\bdraw\s+([\d,]+)\s+card(?:s)?/gi)) ops.push(['draw', num(m[1])]);
    for (const m of sentence.matchAll(/destroy\s+(?:up to\s+)?(\d+|one|two|all|a|an)\s+(catalyst|catalysts|trick|tricks|card|cards)/gi)) {
      const nMap = { one: 1, two: 2, all: 99, a: 1, an: 1 };
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
      ops.push(/catalyst/i.test(m[2]) ? ['destroyCatalyst', n, {}] : (/trick/i.test(m[2]) ? ['destroyTrick', n, {}] : ['destroyAny', n, {}]));
    }
    for (const m of sentence.matchAll(/special spawn\s+(?:up to\s+)?(\d+|one|a|an)\s+(?:level\s*(\d+)\s*or\s*lower\s+)?"([^"]+)"\s*(?:catalyst|monster)?s?\s+from\s+(?:your\s+|the\s+)?(hand|void|grave\s*yard|graveyard|deck)\b/gi)) {
      const nMap = { one: 1, a: 1, an: 1 };
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
      const zone = ZONE_MAP[(m[4] || '').toLowerCase()] || 'void';
      const f = { name: clean(m[3]) };
      if (m[2]) f.maxLvl = Number(m[2]);
      ops.push(['ss' + zone[0].toUpperCase() + zone.slice(1), n, f]);
    }
    for (const m of sentence.matchAll(/special spawn\s+(?:up to\s+)?(\d+|one|a|an)\s+(?:level\s*(\d+)\s*or\s*lower\s+)?([^".,]{2,60}?)\s*(?:catalyst|monster)?s?\s+from\s+(?:your\s+|the\s+)?(hand|void|grave\s*yard|graveyard|deck)\b/gi)) {
      const nMap = { one: 1, a: 1, an: 1 };
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : (nMap[m[1].toLowerCase()] || 1);
      const zone = ZONE_MAP[(m[4] || '').toLowerCase()] || 'void';
      const f = filterFromPhrase(m[3] || '') || {};
      if (m[2]) f.maxLvl = Number(m[2]);
      ops.push(['ss' + zone[0].toUpperCase() + zone.slice(1), n, f]);
    }
    for (const m of sentence.matchAll(/(?:add|search)[^.]{0,60}?to your hand/gi)) {
      const nm = sentence.match(/"([^"]+)"/);
      ops.push(['search', 1, nm ? { name: nm[1] } : {}]);
    }
    if (/negate\s+(?:the\s+|an\s+|1\s+|that\s+)?attack/i.test(sentence)) ops.push(['negateAttack']);
    if (/negate\s+(?:that|the)\s+(?:activation|effect)/i.test(sentence)) ops.push(/destroy/i.test(sentence) ? ['negateDestroy'] : ['negateEffect']);
    if (/switch the attacker to defense position|change (?:it|the attacker) to defense/i.test(sentence)) ops.push(['changePos', 1, 'def', { side: 'opp' }]);
    if (/gain\s+([\d,]+)\s+chi/i.test(sentence) && !ops.some(o => o[0] === 'chi')) ops.push(['chi', num(sentence.match(/gain\s+([\d,]+)\s+chi/i)[1])]);
    if (ops.length) push(trig, ops, { c: null, once: 0 });
  });

  if (flags.length) push('flag', flags);

  /* de-duplicate identical scripts produced by the clause scanner */
  const seen = new Set();
  const dedup = fx.filter(e => {
    const k = e.t + '|' + JSON.stringify(e.ops || []) + '|' + JSON.stringify(e.c || null) + '|' + (e.once || 0);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  return dedup;
}

/* ── Build the pool ───────────────────────────────────────────────────────── */
const pool = [];
let withFx = 0;
const opCounts = {};

for (const c of CARDS) {
  const fx = infer(c);
  const rec = {
    id: c.id,
    n: c.name,
    s: c.set,
    t: TYPE_CODE[c.cardType] != null ? TYPE_CODE[c.cardType] : 0,
    lvl: Number(c.level) || 0,
    pr: Number(c.pr) || 0,
    cp: Number(c.cp) || 0,
    al: c.alignment || '',
    k: c.kindsStr || (Array.isArray(c.kinds) ? c.kinds.join(' / ') : ''),
    gr: c.great ? 1 : 0,
    txt: clean(c.desc || '')
  };
  if (fx.length) { rec.fx = fx; withFx += 1; fx.forEach(e => e.ops.forEach(o => { opCounts[o[0]] = (opCounts[o[0]] || 0) + 1; })); }
  pool.push(rec);
}

/* ── Starter decks ────────────────────────────────────────────────────────── */
const decks = (DB.CTF_STARTER_DECKS || []).map(d => ({
  name: d.name,
  main: (d.main || []).slice(),
  fusion: (d.fusion || []).slice(),
  side: (d.side || []).slice()
}));

const out = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'ProfessorZoom45/CTF :: assets/js/data.js',
    canon: 'Carry The Flame! Canon v2.2',
    total: pool.length,
    withEffects: withFx
  },
  cards: pool,
  decks
};

const json = JSON.stringify(out);

const outPath = path.join(ROOT, 'tools', 'duel-card-pool.json');
fs.writeFileSync(outPath, json);

const kb = (Buffer.byteLength(json) / 1024).toFixed(0);
console.log(`[build-duel] cards=${pool.length} withFx=${withFx} (${(withFx / pool.length * 100).toFixed(1)}%)  pool=${kb}KB`);
console.log('[build-duel] top ops:', Object.entries(opCounts).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, v]) => `${k}:${v}`).join(' '));
console.log('[build-duel] decks:', decks.map(d => `${d.name}(${d.main.length}+${d.fusion.length})`).join(', '));

/* ── Optional injection into duel.html ────────────────────────────────────── */
if (process.argv.includes('--inject')) {
  const htmlPath = path.join(ROOT, 'duel.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('[build-duel] duel.html not found — run without --inject first.');
    process.exit(1);
  }
  let html = fs.readFileSync(htmlPath, 'utf8');
  const startIdx = html.indexOf('<!--POOL_START-->');
  const endIdx = html.indexOf('<!--POOL_END-->');
  if (startIdx < 0 || endIdx < 0) {
    console.error('[build-duel] POOL markers not found in duel.html.');
    process.exit(1);
  }
  const head = html.slice(0, startIdx);
  const tail = html.slice(endIdx);
  // Keep the JSON out of JS string escaping hell: embed as a JSON script tag payload.
  const payload = `<script id="ctf-card-pool" type="application/json">${json.replace(/<\//g, '<\\/')}</script>`;
  // remove any previous payload script
  const cleanedHead = head.replace(/<script id="ctf-card-pool"[\s\S]*?<\/script>/g, '');
  fs.writeFileSync(htmlPath, cleanedHead + '<!--POOL_START-->' + payload + '<!--POOL_END-->' + tail.slice('<!--POOL_END-->'.length));
  console.log(`[build-duel] injected pool into duel.html (${(Buffer.byteLength(json) / 1024).toFixed(0)}KB).`);
}
