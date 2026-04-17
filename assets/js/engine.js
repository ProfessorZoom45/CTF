// ═══════════════════════════════════════════════════
// CARRY THE FLAME — Game Engine v1.0
// State machine, combat, phases, win checks, P2P sync
// ═══════════════════════════════════════════════════

// ── CONSTANTS ──
const STARTING_CHI = 10000;
const HAND_LIMIT = 7;
const MAX_CATALYSTS = 5;
const MAX_TRICKS = 5; // 3 trick + 2 libra
const MAX_SPECIAL_SUMMONS = 5;
const KILLS_TO_WIN = 7;
const EXTRACTIONS_TO_WIN = 7;
const PHASES = ['turnStart','draw','ignition','action','battle','resolution','end'];
const PHASE_NAMES = ['Turn Start','Draw Phase','Ignition Phase','Action Phase','Battle Phase','Resolution Phase','End Phase'];

// Reference list for full starter-deck coverage and audit visibility.
const STARTER_DECK_REFERENCE_IDS = [
  "anm-000-reesethegreatsgundam",
  "anm-002-roadtogreatness",
  "cbb-027-bang",
  "cc1-000-serge",
  "cc1-002-lynx",
  "cc1-008-eternalgreed",
  "cc1-018-catburglar",
  "cc1-024-fargo",
  "cc1-027-firedragon2enraged",
  "cc1-029-garai",
  "cc1-035-lavaboy",
  "cc1-037-megastarky",
  "cc1-041-wazuki",
  "cc1-049-viper",
  "cc1-057-pyrotor",
  "cc1-065-highwayman",
  "cc1-078-acaciasgt",
  "cc1-096-frozenflameblue",
  "db1-001-chibigoku",
  "db1-002-tailofthesaiyan",
  "db1-005-flyingnumbus",
  "db1-012-masterroshitheturtlehermit",
  "db1-013-bulmabriefs",
  "db1-017-lightofthefullmoon",
  "db1-018-mai",
  "db1-026-gokuspromise",
  "db1-028-youngtien",
  "db1-039-babasfighter1draculaman",
  "db1-047-yamchathebandit",
  "db1-050-banshofan",
  "db1-052-saiyanspacepod",
  "db1-053-teengoku",
  "db1-055-teenchichi",
  "dbs-002-futuretrunks",
  "dbs-004-piccolo",
  "dbs-006-whis",
  "dbs-010-brolylegendarysupersaiyan",
  "dbs-013-android17",
  "dbs-015-cabba",
  "dbs-016-cauliflasupersaiyan2",
  "dbz-001-goku",
  "dbz-002-gokusupersaiyan",
  "dbz-005-vegetasupersaiyan",
  "dbz-010-bigbang",
  "dbz-015-futuretrunkssupersaiyan",
  "dbz-018-vegeta",
  "dbz-025-fusiondance",
  "dbz-031-teengohan",
  "dbz-038-yajirobe",
  "ff7-000-cloudstrife",
  "ff7-010-vincentvalentine",
  "ff7-012-barretttrance",
  "ff7-013-caittrance",
  "ff7-016-tifatrance",
  "ff7-017-vincenttrance",
  "ff7-018-yuffietrance",
  "ff7-019-redxiiitrance",
  "gds-005-strikegundam",
  "gds-007-aegisgundam",
  "gds-008-duelgundam",
  "gds-009-assaultshroudduelgundam",
  "gds-011-kirayamato",
  "gds-018-justicegundam",
  "gds-019-freedomgundam",
  "gds-020-gundamastrayredframe",
  "gds-021-gundamastrayblueframe",
  "gds-023-bustergundam",
  "ggx-019-zappa",
  "hls-028-freakchip",
  "inu-004-spellnegator",
  "inu-017-narakuthewicked",
  "inu-019-demonsdevourme",
  "inu-020-onigumo",
  "inu-025-shikonjewel",
  "kh1-009-captainhook",
  "kh1-016-genie",
  "kir-023-dededeshammertoss",
  "loz-017-firetemple",
  "mb1-019-1upmushroom",
  "mgm-011-areasteal",
  "mgm-023-barrier",
  "mgm-031-magnetman",
  "mgm-034-searchman",
  "nar-047-betrayalofthesand",
  "s-m-001-agentx",
  "s-m-011-thejoker",
  "s-m-031-brainiacscontrol",
  "sh2-011-storm",
  "sh2-014-enigma",
  "sh2-020-spelldissolver",
  "slm-009-spiralheartmoonsceptor",
  "ss1-000-legat0thegreat",
  "ss1-000-reesebuck",
  "ss1-002-kamehamehacounterattack",
  "ss1-003-fliptheclip",
  "ss1-022-rightbackatyou",
  "t2f-022-gundamlab",
  "tg1-001-claimyourbounty",
  "tg1-004-frankmarlon",
  "tg1-005-legendarygun",
  "tg1-006-brad",
  "tg1-007-ericks",
  "tg1-007-minesweeper",
  "tg1-010-raideitheblade5thgunghogun",
  "tg1-017-jessicaslove",
  "tg1-018-morgansgreed",
  "tg1-020-badwicksdeed",
  "tg1-022-ambush",
  "tg1-022-bigshield",
  "tg1-023-2ndwind",
  "tg1-023-fighterofpeace",
  "tg1-024-vashfighterofpeace",
  "tg1-101-legatobluesummers",
  "tg1-102-vash",
  "tg1-104-vashthestampede",
  "tg1-107-kuroneko",
  "tg1-108-merylstrife",
  "tg1-109-millythompson",
  "tg1-113-60000000000bountyonyourhead",
  "tg1-202-lightseeker",
  "tt1-016-volcano",
  "yyh-002-blueogre",
  "yyh-006-dragonofthedarknessflame",
  "yyh-010-hiei",
  "yyh-011-hieithegreat",
  "yyh-012-idunbox",
  "yyh-013-jaganeye",
  "yyh-022-rosewhip",
  "yyh-024-spiritequipment",
  "yyh-025-spiritorb",
  "yyh-029-trialsword"
];


// ── STARTER DECKS ──
// Built from real cards in data.js — 40 cards each
function buildStarterDecks() {
  if (typeof CTF_STARTER_DECKS !== 'undefined') {
    return CTF_STARTER_DECKS.map(d => ({
      name: d.name,
      desc: d.source === 'official' ? 'Official preset deck' : 'Auto-generated deck',
      cards: d.main.slice(0, 60)
    }));
  }
  if (typeof CTF_CARDS === 'undefined') return [];
  // Fallback: auto-generate if no starter decks loaded
  return [];
}

// ── GAME STATE ──
function createPlayer(deckInput) {
  const deckObj = Array.isArray(deckInput) ? { main: deckInput, fusion: [] } : (deckInput || { main: [], fusion: [] });
  return {
    chi: STARTING_CHI,
    hand: [],
    catalysts: [null, null, null, null, null],   // 5 zones, each: {cardId, position:'atk'|'def', faceDown:bool}
    tricks: [null, null, null, null, null],       // 5 zones (idx 0,4 = libra, 1-3 = trick)
    fieldTrick: null,
    deck: shuffle([...(deckObj.main || [])]),
    fusionDeck: [...(deckObj.fusion || [])],
    void: [],
    box: [],       // opponent catalysts captured by this player
    rfg: [],       // extracted cards
    kills: 0,
    captures: 0,
    extractions: 0,
    normalSummonUsed: false,
    specialSummonCount: 0,
    summonedThisTurn: new Set(),
    posChanged: new Set(),
    hasAttackedThisTurn: false,
    fusionEnabled: false,
  };
}

function createGameState(p1Deck, p2Deck) {
  // Resolve placeholder IDs in the effect registry on first game creation
  if (!createGameState._registryResolved) {
    resolveRegistryIds();
    createGameState._registryResolved = true;
  }
  const state = {
    players: [createPlayer(p1Deck), createPlayer(p2Deck)],
    turn: 1,
    activePlayer: 0,    // 0 or 1
    phase: 0,           // index into PHASES
    phaseName: 'turnStart',
    isP1FirstTurn: true,
    gameOver: false,
    winner: -1,
    log: [],
    pendingAction: null, // for chain/response system
    waitingForResponse: false,
    chain: [],
    currentResponder: null,
    consecutivePasses: 0,
    pendingDiscard: null,
    _effectsUsed: {},   // per-turn effect usage tracker
    _manualSummonContext: null,
  };
  // Draw initial hands (5 each)
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < 5; i++) {
      drawCard(state, p);
    }
  }
  return state;
}

// ── UTILITY ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCard(id) {
  if (typeof CTF_CARDS === 'undefined') return null;
  if (id === '__shadow_token__') return { id: '__shadow_token__', name: 'Shadow Token', cardType: 'Catalyst', sub: 'Token', level: 1, pr: 800, cp: 800, alignment: 'Dark', kinds: ['Warrior'], kindsStr: 'Warrior', desc: 'Shadow Token (800/800). Cannot be used as Tribute.', great: false, set: 'token' };
  if (id === '__buck_token_1000__') return { id: '__buck_token_1000__', name: 'BuCk The Great Token', cardType: 'Catalyst', sub: 'Token', level: 3, pr: 1000, cp: 1000, alignment: 'Fire', kinds: ['Gunman'], kindsStr: 'Gunman', desc: 'BuCk The Great Token (1000/1000). Cannot be used as Tribute.', great: false, set: 'token' };
  if (id === '__buck_token_1500__') return { id: '__buck_token_1500__', name: 'BuCk The Great Token', cardType: 'Catalyst', sub: 'Token', level: 3, pr: 1500, cp: 1000, alignment: 'Fire', kinds: ['Gunman'], kindsStr: 'Gunman', desc: 'BuCk The Great Token (1500/1000). Cannot be used as Tribute.', great: false, set: 'token' };
  return CTF_CARDS.find(c => c.id === id) || null;
}

function addLog(state, msg) {
  state.log.push({ turn: state.turn, phase: PHASE_NAMES[state.phase], msg, time: Date.now() });
}

function isFieldTrickActive(slot) {
  return !!(slot && !slot.faceDown);
}

function fieldTrickProvidesFusion(slot) {
  const c = slot ? getCard(slot.cardId) : null;
  if (!c || slot.faceDown) return false;
  return /fusion zone|fusion summon/i.test(`${c.name||''} ${c.desc||''}`);
}


function isZeroDegreesLockActive(state) {
  return Number(state && state.zeroDegreesTurns || 0) > 0;
}

function summonNamedToken(state, playerIdx, tokenId, count, sourceLabel, extraProps) {
  const p = state.players[playerIdx];
  let summoned = 0;
  for (let i = 0; i < Number(count || 0); i++) {
    if (p.specialSummonCount >= MAX_SPECIAL_SUMMONS) break;
    const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
    if (zoneIdx < 0) break;
    p.catalysts[zoneIdx] = Object.assign({
      cardId: tokenId,
      position: 'atk',
      faceDown: false,
      attackedThisTurn: false,
      atkMod: 0,
      cpMod: 0,
      extraAttackThisTurn: 0,
      cannotAttackThisTurn: false,
      _cannotBeTributed: true
    }, extraProps || {});
    p.summonedThisTurn.add(zoneIdx);
    registerSpecialSummon(state, playerIdx, sourceLabel || 'Token Effect');
    addLog(state, `P${playerIdx+1} Special Summoned ${getCard(tokenId)?.name || 'a token'} to C${zoneIdx+1}${sourceLabel ? ' via ' + sourceLabel : ''}.`);
    summoned += 1;
  }
  return { ok: summoned > 0, summoned };
}

function normalizeNameToken(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cardHasKind(card, token) {
  const want = normalizeNameToken(token);
  return !!(card && (card.kinds || []).some(k => normalizeNameToken(k) === want || normalizeNameToken(k).includes(want)));
}

function cardHasAlignment(card, token) {
  return normalizeNameToken(card && card.alignment) === normalizeNameToken(token);
}

function cardNameHas(card, token) {
  return normalizeNameToken(card && card.name).includes(normalizeNameToken(token));
}


const SCRIPT_NAME_ALIASES = {
  '1-up the great mushroom':'1-up mushroom',
  "the great brainiac's control":"brainiac's control",
  'the great joker':'the joker',
  'the great krypton':'kryptonite',
  'the great storm':'storm',
  'the great silver crystal':'silver crystal',
  'the great overload':'spell overload',
  'the great finger':'right back at you',
  'the great flip':'flip the clip',
  'the great talent prize':'talent competition prize',
  'the great holy battle':'holy battle',
  'the great full moon':'full moon',
  'naraku - the great':'naraku - the wicked',
  'the great shikon jewel':'shikon jewel',
  'kanna - the great':'kanna',
  'n.m.e the great price increase':'n.m.e price increase',
  'vash - great fighter of peace':'vash - fighter of peace',
  'the great legato bluesummers':'legato bluesummers',
  'vash - the great stampede':'vash - the stampede',
  'knives - great destroyer of mankind':'knives - destroyer of mankind',
  'the great dark seeker':'dark seeker',
  'the great light seeker':'light seeker'
};

function canonicalScriptName(name) {
  const norm = String(name || '').toLowerCase().trim();
  return SCRIPT_NAME_ALIASES[norm] || norm;
}

function cardMatchesCanonicalName(card, target) {
  return canonicalScriptName(card && card.name) === canonicalScriptName(target);
}

function slotHasAlignment(slot, card, token) {
  if (slot && slot._forcedAlignment && normalizeNameToken(slot._forcedAlignment) === normalizeNameToken(token)) return true;
  return cardHasAlignment(card, token);
}

function slotHasKind(slot, card, token) {
  if (slot && Array.isArray(slot._bonusKinds) && slot._bonusKinds.some(k => normalizeNameToken(k) === normalizeNameToken(token))) return true;
  return cardHasKind(card, token);
}

function findFirstCatalystZoneByPredicate(state, playerIdx, predicate) {
  return state.players[playerIdx].catalysts.findIndex(slot => slot && predicate(getCard(slot.cardId), slot));
}

function addCardToHandFromDeckByPredicate(state, playerIdx, predicate) {
  const p = state.players[playerIdx];
  const idx = p.deck.findIndex(id => { const c = getCard(id); return c && predicate(c); });
  if (idx < 0) return null;
  const [cardId] = p.deck.splice(idx, 1);
  p.hand.push(cardId);
  return getCard(cardId);
}

function specialSummonFromDeckByPredicate(state, playerIdx, predicate, sourceLabel) {
  const p = state.players[playerIdx];
  const idx = p.deck.findIndex(id => { const c = getCard(id); return c && predicate(c); });
  if (idx < 0) return { ok:false, msg:'No valid target in the Deck.' };
  const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
  if (zoneIdx < 0) return { ok:false, msg:'No empty Catalyst Zone.' };
  const [cardId] = p.deck.splice(idx, 1);
  return specialSummonToZone(state, playerIdx, cardId, zoneIdx, sourceLabel || 'Effect');
}

function specialSummonFromHandOrVoidByPredicate(state, playerIdx, predicate, sourceLabel) {
  const p = state.players[playerIdx];
  const handIdx = p.hand.findIndex(id => { const c = getCard(id); return c && predicate(c); });
  if (handIdx >= 0) {
    const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
    if (zoneIdx < 0) return { ok:false, msg:'No empty Catalyst Zone.' };
    const [cardId] = p.hand.splice(handIdx, 1);
    return specialSummonToZone(state, playerIdx, cardId, zoneIdx, sourceLabel || 'Effect');
  }
  return specialSummonFromVoidByPredicate(state, playerIdx, predicate, sourceLabel);
}


function specialSummonFromHandByPredicate(state, playerIdx, predicate, sourceLabel) {
  const p = state.players[playerIdx];
  const handIdx = p.hand.findIndex(id => { const c = getCard(id); return c && predicate(c); });
  if (handIdx < 0) return { ok:false, msg:'No valid target in the hand.' };
  const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
  if (zoneIdx < 0) return { ok:false, msg:'No empty Catalyst Zone.' };
  const [cardId] = p.hand.splice(handIdx, 1);
  return specialSummonToZone(state, playerIdx, cardId, zoneIdx, sourceLabel || 'Effect');
}


function addRoadToGreatnessCounter(state, playerIdx, amount) {
  const field = state.players[playerIdx].fieldTrick;
  const fc = field ? getCard(field.cardId) : null;
  if (!field || field.faceDown || !fc || !/road to greatness/i.test(fc.name || '')) return;
  field.counters = Number(field.counters || 0) + Number(amount || 0);
  addLog(state, `Effect Script: Road To Greatness gained ${amount || 0} counter(s). (${field.counters} total)`);
}

function activateRoadToGreatnessSearch(state, playerIdx, payload) {
  const p = state.players[playerIdx];
  const field = p.fieldTrick;
  const fc = field ? getCard(field.cardId) : null;
  if (!field || field.faceDown || !fc || !/road to greatness/i.test(fc.name || '')) return { ok:false, msg:'Road To Greatness is not active.' };
  if (Number(field.counters || 0) < 2) return { ok:false, msg:'Need 2 Road To Greatness counters.' };
  const source = String(payload && payload.source || '');
  const idx = Number(payload && payload.idx);
  let cardId = null;
  if (source === 'deck') {
    const c = getCard(p.deck[idx]);
    if (!(idx >= 0) || !c || c.cardType !== 'Catalyst' || !cardNameHas(c, 'the great')) return { ok:false, msg:'Invalid Road To Greatness Deck target.' };
    cardId = p.deck.splice(idx, 1)[0];
  } else if (source === 'void') {
    const c = getCard(p.void[idx]);
    if (!(idx >= 0) || !c || c.cardType !== 'Catalyst' || !cardNameHas(c, 'the great')) return { ok:false, msg:'Invalid Road To Greatness Void target.' };
    cardId = p.void.splice(idx, 1)[0];
  } else return { ok:false, msg:'Invalid Road To Greatness source.' };
  field.counters = Math.max(0, Number(field.counters || 0) - 2);
  p.hand.push(cardId);
  addLog(state, `Effect Script: Road To Greatness removed 2 counters and added ${getCard(cardId)?.name || 'a card'} to hand.`);
  return { ok:true, cardId };
}

function activateToolboxIgnition(state, playerIdx, handIdx) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'ignition' || state.activePlayer !== playerIdx) return { ok:false, msg:'Toolbox can only be used during your Ignition Phase.' };
  if (!p.toolboxActive) return { ok:false, msg:'Toolbox is not active.' };
  if (isEffectUsed(state, playerIdx, 'anm-001-toolbox', 'toolboxAuto')) return { ok:false, msg:'Toolbox already used this turn.' };
  if (p.chi < 1000) return { ok:false, msg:'Need 1000 Chi for Toolbox.' };
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card || card.cardType !== 'Palm Trick' || !/equip/i.test(String(card.sub || ''))) return { ok:false, msg:'Choose an Equip Palm Trick from your hand.' };
  p.chi -= 1000;
  const [equipId] = p.hand.splice(handIdx, 1);
  p.deck.push(equipId);
  p.deck = shuffle(p.deck);
  markEffectUsed(state, playerIdx, 'anm-001-toolbox', 'toolboxAuto');
  addLog(state, `Effect Script: Toolbox paid 1000 Chi and shuffled ${getCard(equipId)?.name || 'an Equip Palm Trick'} from hand into the Deck.`);
  return { ok:true, cardId:equipId };
}

function specialSummonSerpent(state, playerIdx, handIdx, zoneIdx, voidIdxs) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok:false, msg:'Serpent can only be Special Summoned during your Action Phase.' };
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card || !/serpent/i.test(card.name || '')) return { ok:false, msg:'Selected card is not Serpent.' };
  if (p.catalysts[zoneIdx] !== null) return { ok:false, msg:'Chosen Catalyst Zone is occupied.' };
  if (!Array.isArray(voidIdxs) || voidIdxs.length !== 4) return { ok:false, msg:'Choose 4 Void cards: 2 EARTH and 2 WIND.' };
  const unique = [...new Set(voidIdxs.map(Number))];
  if (unique.length !== 4) return { ok:false, msg:'Serpent materials must be different cards.' };
  let earth = 0, wind = 0;
  for (const idx of unique) {
    const mat = getCard(p.void[idx]);
    if (!(idx >= 0) || !mat || mat.cardType !== 'Catalyst') return { ok:false, msg:'Serpent materials must be Catalyst cards in your Void.' };
    if (cardHasAlignment(mat, 'Earth')) earth += 1;
    if (cardHasAlignment(mat, 'Wind')) wind += 1;
  }
  if (earth < 2 || wind < 2) return { ok:false, msg:'Need at least 2 EARTH and 2 WIND Catalysts from your Void.' };
  unique.sort((a,b)=>b-a).forEach(idx => {
    const banished = p.void.splice(idx, 1)[0];
    p.rfg.push(banished);
  });
  p.hand.splice(handIdx, 1);
  const placed = specialSummonToZone(state, playerIdx, cardId, zoneIdx, 'Serpent Special Summon');
  if (!placed.ok) return placed;
  addLog(state, 'Effect Script: Serpent removed 2 EARTH and 2 WIND Catalysts from the Void from play to Special Summon itself.');
  return { ok:true, cardId };
}

function fusionSummonDetailed(state, playerIdx, fusionDeckIdx, zoneIdx, fieldIdxs, handIdxs, removeMode, manual) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Fusion Summon can only happen in your Action Phase.' };
  const fusionId = p.fusionDeck[fusionDeckIdx];
  const fusionCard = getCard(fusionId);
  if (!fusionCard) return { ok:false, msg:'Invalid Fusion card.' };
  const fusionSpec = getFusionSpec(fusionCard);
  const materials = parseFusionMaterials(fusionCard).map(x => x.toLowerCase()).sort();
  const chosenNames = [];
  for (const idx of (fieldIdxs || [])) {
    const slot = p.catalysts[idx];
    const c = slot ? getCard(slot.cardId) : null;
    if (!slot || !c) return { ok:false, msg:'Invalid chosen field material.' };
    chosenNames.push(c.name.toLowerCase());
  }
  for (const idx of (handIdxs || [])) {
    const c = getCard(p.hand[idx]);
    if (!c) return { ok:false, msg:'Invalid chosen hand material.' };
    chosenNames.push(c.name.toLowerCase());
  }
  if (fusionSpec && fusionSpec.pickN && fusionSpec.pool) {
    const poolNames = fusionSpec.pool.map(m => (m.exact || m.label || '').toLowerCase());
    if (chosenNames.length !== fusionSpec.pickN) return { ok:false, msg:`This Fusion requires exactly ${fusionSpec.pickN} materials from its crew pool.` };
    const uniqueChosen = new Set(chosenNames);
    if (uniqueChosen.size !== fusionSpec.pickN) return { ok:false, msg:'Each Fusion material must be a different Catalyst.' };
    for (const cn of chosenNames) { if (!poolNames.includes(cn)) return { ok:false, msg:`"${cn}" is not a valid Fusion material for this card.` }; }
  } else {
    if (chosenNames.sort().join('|') !== materials.join('|')) return { ok:false, msg:'Chosen Fusion materials do not exactly match requirements.' };
  }
  if (p.catalysts[zoneIdx] !== null) return { ok:false, msg:'Chosen Catalyst Zone is occupied.' };
  if (removeMode === 'rfg') {
    (fieldIdxs || []).slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.catalysts[idx]; p.catalysts[idx] = null; if (sent) p.rfg.push(sent.cardId); });
    (handIdxs || []).slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.hand.splice(idx,1)[0]; if (sent) p.rfg.push(sent); });
  } else {
    (fieldIdxs || []).slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.catalysts[idx]; p.catalysts[idx] = null; if (sent) p.void.push(sent.cardId); });
    (handIdxs || []).slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.hand.splice(idx,1)[0]; if (sent) p.void.push(sent); });
  }
  p._manualSummonContext = manual || null;
  const removedFusionId = p.fusionDeck.splice(fusionDeckIdx, 1)[0];
  const placed = specialSummonToZone(state, playerIdx, removedFusionId, zoneIdx, removeMode === 'rfg' ? 'Fusion Zone' : 'Fusion Summon');
  p._manualSummonContext = null;
  if (!placed.ok) return placed;
  addLog(state, `Fusion materials used: ${(fusionSpec && fusionSpec.pickN) ? chosenNames.join(' + ') : materials.join(' + ')}.${removeMode === 'rfg' ? ' Materials were removed from game.' : ''}`);
  return { ok:true, fusionId:removedFusionId };
}

function activateAceCopyAbility(state, playerIdx, targetPlayerIdx, targetZoneIdx) {
  return runAceCopyAbility(state, playerIdx, targetPlayerIdx, targetZoneIdx);
}

function getAllDestroyableTrickTargets(state) {
  const out = [];
  for (let player = 0; player < 2; player++) {
    const pl = state.players[player];
    for (let zone = 0; zone < 5; zone++) {
      const slot = pl.tricks[zone];
      if (slot && !slot.isLibra) out.push({ player, kind:'trick', zone, cardId:slot.cardId });
    }
    if (pl.fieldTrick) out.push({ player, kind:'field', zone:-1, cardId:pl.fieldTrick.cardId });
  }
  return out;
}

function destroyTrickTarget(state, target, reason) {
  if (!target) return false;
  const pl = state.players[target.player];
  let cardId = null;
  if (target.kind === 'field') {
    if (!pl.fieldTrick) return false;
    cardId = pl.fieldTrick.cardId;
    pl.fieldTrick = null;
    pl.void.push(cardId);
  } else {
    const slot = pl.tricks[target.zone];
    if (!slot) return false;
    cardId = slot.cardId;
    pl.tricks[target.zone] = null;
    pl.void.push(cardId);
  }
  const c = getCard(cardId);
  addLog(state, `Effect Script: ${c?.name || 'A Trick'} was destroyed${reason ? ' by ' + reason : ''}.`);
  if (c && /the chosen one/i.test(c.name || '')) {
    const linkedId = target.kind === 'trick' && slot ? slot.linkedChosenOneCardId : null;
    if (linkedId) {
      for (let z = 0; z < 5; z++) {
        const fieldSlot = pl.catalysts[z];
        if (fieldSlot && fieldSlot.cardId === linkedId) {
          pl.catalysts[z] = null;
          pl.rfg.push(linkedId);
          addLog(state, `Effect Script: The Chosen One was destroyed, so ${getCard(linkedId)?.name || 'the linked Catalyst'} was removed from game.`);
          break;
        }
      }
    }
  }
  if (c && /blazeing inferno/i.test(c.name || '')) pl.blazeingInferno = 0;
  if (c && /saiyan space pod/i.test(c.name || '')) {
    const res = specialSummonFromDeckByPredicate(state, target.player, cc => cc.cardType === 'Catalyst' && cardHasKind(cc, 'Saiyan') && Number(cc.level || 0) <= 4, c.name);
    addLog(state, res.ok ? 'Effect Script: Saiyan Space Pod Special Summoned a Level 4 or lower Saiyan from the Deck.' : `Effect Script: Saiyan Space Pod found no valid Saiyan target. (${res.msg})`);
  }
  return true;
}



function drawUntilHandSize(state, playerIdx, targetSize, reasonLabel) {
  const p = state.players[playerIdx];
  let drew = 0;
  while (p.hand.length < targetSize && p.deck.length > 0) {
    const d = drawCard(state, playerIdx);
    if (!d) break;
    drew++;
  }
  if (drew > 0) addLog(state, `Effect Script: ${reasonLabel || 'An effect'} drew ${drew} card(s).`);
  return drew;
}

function destroyAllPalmAndConcealedOnField(state, reasonLabel) {
  let destroyed = 0;
  for (let p = 0; p < 2; p++) {
    for (let z = 0; z < 5; z++) {
      const slot = state.players[p].tricks[z];
      if (!slot || slot.isLibra) continue;
      state.players[p].tricks[z] = null;
      state.players[p].void.push(slot.cardId);
      destroyed++;
      addLog(state, `Effect Script: ${getCard(slot.cardId)?.name || 'A Trick'} was destroyed${reasonLabel ? ' by ' + reasonLabel : ''}.`);
    }
  }
  return destroyed;
}

function destroyCardsOnOpponentField(state, playerIdx, maxCount, reasonLabel) {
  const oppIdx = 1 - playerIdx;
  const targets = [];
  for (let z = 0; z < 5; z++) {
    if (state.players[oppIdx].catalysts[z]) targets.push({ kind:'catalyst', zone:z, cardId:state.players[oppIdx].catalysts[z].cardId });
  }
  for (let z = 0; z < 5; z++) {
    const slot = state.players[oppIdx].tricks[z];
    if (slot && !slot.isLibra) targets.push({ kind:'trick', zone:z, cardId:slot.cardId });
  }
  if (state.players[oppIdx].fieldTrick) targets.push({ kind:'field', zone:-1, cardId:state.players[oppIdx].fieldTrick.cardId });
  let destroyed = 0;
  for (const t of targets.slice(0, maxCount || 1)) {
    if (t.kind === 'catalyst') {
      const slot = state.players[oppIdx].catalysts[t.zone];
      if (!slot) continue;
      runOnSelfDestroyed(state, oppIdx, slot.cardId, { reason: reasonLabel || 'an effect' });
      state.players[oppIdx].catalysts[t.zone] = null;
      state.players[oppIdx].void.push(slot.cardId);
      destroyed++;
      addLog(state, `Effect Script: ${getCard(slot.cardId)?.name || 'A Catalyst'} was destroyed${reasonLabel ? ' by ' + reasonLabel : ''}.`);
    } else if (t.kind === 'field') {
      if (destroyTrickTarget(state, { player:oppIdx, kind:'field', zone:-1 }, reasonLabel)) destroyed++;
    } else {
      if (destroyTrickTarget(state, { player:oppIdx, kind:'trick', zone:t.zone }, reasonLabel)) destroyed++;
    }
  }
  return destroyed;
}

function stealFirstOpponentCatalystUntilEndTurn(state, playerIdx, reasonLabel, predicate, mods) {
  const oppIdx = 1 - playerIdx;
  const opp = state.players[oppIdx];
  const own = state.players[playerIdx];
  const targetZone = opp.catalysts.findIndex(s => s && !s._cannotChangeControl && (!predicate || predicate(getCard(s.cardId), s)));
  if (targetZone < 0) return { ok:false, msg:'No valid opponent Catalyst.' };
  const openZone = getFirstEmptyCatalystZone(state, playerIdx);
  if (openZone < 0) return { ok:false, msg:'No empty Catalyst Zone.' };
  const stolen = opp.catalysts[targetZone];
  opp.catalysts[targetZone] = null;
  own.catalysts[openZone] = {
    cardId: stolen.cardId,
    position: 'atk',
    faceDown: false,
    attackedThisTurn: false,
    atkMod: Number((mods && mods.atk) || 0),
    cpMod: Number((mods && mods.cp) || 0),
    extraAttackThisTurn: 0,
    cannotAttackThisTurn: false,
    _temporaryControl: true,
    _temporaryReturnToPlayer: oppIdx
  };
  addLog(state, `Effect Script: ${reasonLabel || 'An effect'} took control of ${getCard(stolen.cardId)?.name || 'a Catalyst'} until the End Phase.`);
  return { ok:true, zone:openZone, cardId:stolen.cardId };
}

function getSummonRestriction(state, summoningPlayer, card) {
  const opp = state.players[1 - summoningPlayer];
  for (const slot of opp.catalysts) {
    if (!slot) continue;
    const slotCard = getCard(slot.cardId);
    if (slot._pilafRobotSummonLock && card) {
      const isSaiyanLow = (cardHasKind(card, 'Saiyan') || /saiyan/i.test(String(card.subType || card.sub || card.desc || ''))) && Number(card.level || 0) <= 4;
      if (isSaiyanLow) return `${slotCard?.name || "Emperor Pilaf's Great Robot"} prevents Level 4 or lower Saiyan Catalysts from being summoned.`;
    }
    if (slot._valentineLock && card) {
      if (/the hellsing army|fergusson|furgusson/i.test(String(card.name || ''))) {
        return `${slotCard?.name || 'The Valentine Brothers'} prevents that Catalyst from being summoned.`;
      }
    }
    for (const eff of getAllCardEffects(slot.cardId)) {
      if (eff.type !== 'continuous') continue;
      if (eff.action === 'blockSpecialSummonAbovePR' && Number(card?.pr || 0) >= Number(eff.minPR || 0)) {
        return `${getCard(slot.cardId)?.name || 'An effect'} prevents Special Summoning Catalysts with ${eff.minPR}+ Pressure.`;
      }
    }
  }
  return null;
}


// ── EFFECT REGISTRY (PATCH 19) ──
// Data-driven effect system. Each entry maps a card ID to its effects.
// Generic handlers execute effects based on type, so new cards only need
// a registry entry — not a custom if/else block.
//
// Trigger types:
//   onSummon        — fires when this Catalyst is summoned
//   continuous      — modifies stats while this card is face-up on field
//   onAttackDeclare — fires when this Catalyst declares an attack
//   onBattleCalc    — modifies PR during damage calculation only
//   onBattleResult  — fires after battle resolves (kill, capture, etc.)
//   onBattleDamage  — fires when this Catalyst inflicts battle damage to Chi
//   onAnyPalmUsed   — fires when ANY player activates a Palm Trick
//   onAnyConcealedUsed — fires when ANY player chains a Concealed/Counter
//   onOpponentDraw  — fires when opponent draws a card
//   onAllyCatalystDestroyed — fires when a Catalyst you control is destroyed
//   doubleAttack    — allows 2 attacks per turn
//   negateActivation — like a permanent Counter Trick (negate Palm/Concealed)
//   fieldTrickCondition — effect only active if you control a face-up Field Trick
//   immune          — immune to certain card types

const EFFECT_REGISTRY = {};
const INFERRED_EFFECT_CACHE = {};
const COMMON_ALIGNMENT_TOKENS = ['dark','light','fire','earth','water','wind','thunder','divine'];

function getRegisteredCardEffects(cardId) {
  return EFFECT_REGISTRY[cardId] || [];
}

function _cleanInferText(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function _splitInferList(v) {
  return _cleanInferText(v).split(/\s+and\s+|\s*,\s*/i).map(s => s.replace(/^and\s+/i,'').trim()).filter(Boolean);
}

function inferCommonStringEffects(cardOrId) {
  const card = typeof cardOrId === 'string' ? getCard(cardOrId) : cardOrId;
  if (!card || !card.id) return [];
  if (INFERRED_EFFECT_CACHE[card.id]) return INFERRED_EFFECT_CACHE[card.id];
  const effects = [];
  const desc = _cleanInferText(card.desc || '');
  const lower = desc.toLowerCase();
  const registered = getRegisteredCardEffects(card.id);
  const hasRegisteredPRAura = registered.some(e => e.type === 'fieldAuraPR' || (e.type === 'continuous' && e.prBoostAll));
  const hasRegisteredCPAura = registered.some(e => e.type === 'fieldAuraCP' || (e.type === 'continuous' && e.cpBoostAll));
  if (!desc) {
    INFERRED_EFFECT_CACHE[card.id] = effects;
    return effects;
  }

  const addAura = (statKind, mode, targetChunk, amount, scopeHint) => {
    const eff = { type: statKind === 'cp' ? 'fieldAuraCP' : 'fieldAuraPR', _inferred: true, inferredSource: 'string', inferredMode: mode };
    const value = Number(amount || 0) * (mode === 'decrease' ? -1 : 1);
    if (statKind === 'cp') eff.cpBoostAll = value; else eff.prBoostAll = value;
    const chunk = _cleanInferText(targetChunk || '');
    const chunkLower = chunk.toLowerCase();
    eff.scope = scopeHint || (/opponent/.test(chunkLower) ? 'opponent' : (/you control|your side of the field|of your catalysts|your field/.test(chunkLower) ? 'self' : 'both'));
    const quoted = [...chunk.matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(Boolean);
    if (quoted.length) {
      if (quoted.length === 1) eff.targetNameIncludes = quoted[0];
      else eff.targetNameIncludesAny = quoted;
    }
    const alignments = COMMON_ALIGNMENT_TOKENS.filter(tok => new RegExp('\b' + tok + '\b', 'i').test(chunkLower));
    if (alignments.length === 1) eff.targetAlignment = alignments[0];
    else if (alignments.length > 1) eff.targetAlignmentsAny = alignments;

    const kindParts = [];
    for (const m of chunk.matchAll(/([A-Za-z][A-Za-z\- ]+?)(?:\s+sub)?-?type/ig)) kindParts.push(..._splitInferList(m[1]));
    if (!kindParts.length && !alignments.length && !quoted.length) {
      const simple = chunk.replace(/all|every|catalysts?|cards?|on your opponent'?s side of the field|on your side of the field|you control|your opponent'?s|your|face-up|face up|controller of this card may|may|remain[s]? face-up|remains face-up|as long as this card(?: remains)? face-up on the field/ig, ' ');
      const cleaned = _cleanInferText(simple);
      if (cleaned && !/catalyst/i.test(cleaned) && !/field/i.test(cleaned)) kindParts.push(..._splitInferList(cleaned));
    }
    const filteredKinds = [...new Set(kindParts.map(k => k.replace(/sub/i,'').trim()).filter(k => k && !COMMON_ALIGNMENT_TOKENS.includes(k.toLowerCase())))];
    if (filteredKinds.length === 1) eff.targetKind = filteredKinds[0];
    else if (filteredKinds.length > 1) eff.targetKindsAny = filteredKinds;
    effects.push(eff);
  };

  // Pressure / Counter Pressure aura strings
  for (const m of desc.matchAll(/(increase|boost|decrease|lower)\s+(?:the\s+)?pressure(?:\s+and\s+counter pressure)?\s+of\s+(all|every)\s+([^\.]+?)\s+by\s+(\d+)/ig)) {
    const mode = m[1].toLowerCase();
    const both = /counter pressure/i.test(m[0]);
    if (!hasRegisteredPRAura) addAura('pr', mode, m[3], m[4]);
    if (both && !hasRegisteredCPAura) addAura('cp', mode, m[3], m[4]);
  }
  for (const m of desc.matchAll(/(increase|boost|decrease|lower)\s+(?:the\s+)?counter pressure(?:\s+and\s+pressure)?\s+of\s+(all|every)\s+([^\.]+?)\s+by\s+(\d+)/ig)) {
    const mode = m[1].toLowerCase();
    const both = /pressure/i.test(m[0]) && /and\s+pressure/i.test(m[0]);
    if (!hasRegisteredCPAura) addAura('cp', mode, m[3], m[4]);
    if (both && !hasRegisteredPRAura) addAura('pr', mode, m[3], m[4]);
  }
  for (const m of desc.matchAll(/(all|every)\s+([^\.]+?)\s+(?:you control\s+)?gain\s+(\d+)\s+pressure/ig)) {
    if (!hasRegisteredPRAura) addAura('pr', 'increase', m[2] + ' ' + (m[0].includes('you control') ? 'you control' : ''), m[3], m[0].includes('you control') ? 'self' : undefined);
  }
  for (const m of desc.matchAll(/increase\s+all\s+"([^"]+)"\s+catalysts?'?\s+pressure\s+by\s+(\d+)/ig)) {
    if (!hasRegisteredPRAura) addAura('pr', 'increase', 'Catalysts with "' + m[1] + '" in their name', m[2]);
  }

  // Generic possession / take-control strings
  if (!/equipp?ed|equip this card|if this card is equipped|when equipped/.test(lower) && /take control of/.test(lower)) {
    const controlBase = { action:'generic_takeControl', _inferred:true, duration:'end', faceUpOnly:/face[- ]up/.test(lower) };
    const pay = lower.match(/pay\s+(\d+)\s+chi/);
    if (pay) controlBase.cost = Number(pay[1]);
    if (/once per turn|only be used once per turn/.test(lower)) controlBase.oncePerTurn = true;
    const kind = desc.match(/take control of (?:one|1|a|all)?\s*(?:face[- ]up\s*)?(?:[A-Za-z]+\s+)?([A-Za-z\- ]+?)(?:\s+sub)?-?type\s+catalyst/i);
    const align = desc.match(/take control of (?:one|1|a|all)?\s*(?:face[- ]up\s*)?(Dark|Light|Fire|Earth|Water|Wind|Thunder|Divine)\s+catalysts?/i);
    if (kind) controlBase.targetKind = _cleanInferText(kind[1]);
    if (align) controlBase.targetAlignment = align[1];
    if (/non-vampire/i.test(lower)) controlBase.excludeKinds = ['Vampire'];
    if (/until the selected catalyst is destroyed|permanent/.test(lower)) controlBase.duration = 'permanent';
    if (/all face[- ]up/i.test(lower) || /take control of all/i.test(lower)) controlBase.takeAll = true;
    if (card.cardType === 'Catalyst') {
      if (!/when (?:this (?:card|catalyst) )?(?:is )?(?:normal summoned|special summoned|summoned)/i.test(desc)) {
        effects.push({ type:'activeAbility', tag:'genericTakeControl', ...controlBase });
      }
    } else if (card.cardType === 'Palm Trick' || card.cardType === 'Concealed Trick' || card.cardType === 'Counter Trick') {
      effects.push({ type:'genericControl', tag:'genericTakeControl', ...controlBase });
    }
  }

  // Generic on-summon possession
  if (card.cardType === 'Catalyst' && /when (?:this (?:card|catalyst) )?(?:is )?(?:normal summoned|special summoned|summoned)/i.test(desc) && /take control of/.test(lower)) {
    const onSummon = { type:'onSummon', tag:'genericOnSummonSteal', action:'generic_takeControl', _inferred:true, duration:/destroyed|permanent/.test(lower) ? 'permanent' : 'end', faceUpOnly:/face[- ]up/.test(lower) };
    const kind = desc.match(/take control of (?:one|1|a)?\s*(?:face[- ]up\s*)?([A-Za-z\- ]+?)(?:\s+sub)?-?type\s+catalyst/i);
    const align = desc.match(/take control of (?:one|1|a)?\s*(Dark|Light|Fire|Earth|Water|Wind|Thunder|Divine)\s+catalysts?/i);
    if (kind) onSummon.targetKind = _cleanInferText(kind[1]);
    if (align) onSummon.targetAlignment = align[1];
    effects.push(onSummon);
  }

  INFERRED_EFFECT_CACHE[card.id] = effects;
  return effects;
}

function getAllCardEffects(cardId) {
  return [...getRegisteredCardEffects(cardId), ...inferCommonStringEffects(cardId)];
}

const ANM_SET_COMPLETION_REFERENCE = [
  'anm-000-acethegoat','anm-000-acethegreat','anm-000-destinthegreatwarlord','anm-000-drzoom','anm-000-newzthegreatwatcher','anm-000-newzthewatcher','anm-000-reesethegreatsgundam','anm-000-strodonarithegreat','anm-000-terrasladespartner','anm-001-kenosuke','anm-001-serpent','anm-001-toolbox','anm-002-curseoftheflameghost','anm-002-hyottokosburn','anm-002-roadtogreatness','anm-002-ultimateprice','anm-003-aoshiscommands','anm-003-keepitmoving','anm-003-nolanthegreat','anm-003-phoenixsoul','anm-004-terraspast','anm-005-lightningstrike','anm-010-aearth','anm-011-kauroscry','anm-012-reversebladesword','anm-013-amakakuroryonoherimeki','anm-014-zerodegrees','anm-021-reapermasterswordsman','anm-022-rapier','anm-023-thechosenone','anm-024-blazeinginferno','anm-025-infernodragon','anm-026-infernotakeover','anm-037-fusionzone'
];

function regEffect(cardId, effects) {
  if (!EFFECT_REGISTRY[cardId]) EFFECT_REGISTRY[cardId] = [];
  if (Array.isArray(effects)) EFFECT_REGISTRY[cardId].push(...effects);
  else EFFECT_REGISTRY[cardId].push(effects);
}

function getCardEffects(cardId) {
  return getRegisteredCardEffects(cardId);
}

function hasEffectType(cardId, type) {
  return getAllCardEffects(cardId).some(e => e.type === type);
}

// Per-turn effect usage tracker (reset each turn in finalizeTurnSwitch)
function markEffectUsed(state, playerIdx, cardId, effectTag) {
  if (!state._effectsUsed) state._effectsUsed = {};
  const key = `${playerIdx}:${cardId}:${effectTag}`;
  state._effectsUsed[key] = true;
}

function isEffectUsed(state, playerIdx, cardId, effectTag) {
  if (!state._effectsUsed) return false;
  return !!state._effectsUsed[`${playerIdx}:${cardId}:${effectTag}`];
}

function resetEffectsUsed(state) {
  state._effectsUsed = {};
}

// ─── GREAT CARD REGISTRATIONS ───

// === NORMAL GREAT CATALYSTS (no effect needed) ===
// Newz The Great Watcher, Stro Donari - The Great, Goku - The Great,
// Psychic Burst The Great — no registration needed

// === ON-SUMMON EFFECTS ===
regEffect('anm-000-reesethegreatsgundam', {
  type: 'onSummon', tag: 'search',
  action: 'searchByName', names: ['Road To Greatness'],
  log: 'searched Road To Greatness from the Deck'
});

regEffect('dbs-000-isshikiotsutsuki', {  // Will match by name below
  type: 'onSummon', tag: 'massDebuff',
  action: 'custom_isshiki'
});

// === DOUBLE ATTACK ===
regEffect('bl1-000-isagithegreat', { type: 'doubleAttack', tag: 'dblAtk' });
regEffect('op1-000-monkeydluffythegreat', { type: 'doubleAttack', tag: 'dblAtk' });

// === COMBAT MODS (PR boost during battle) ===
regEffect('blc-000-kenpachithegreat', {
  type: 'onBattleCalc', tag: 'battlePR', prBoost: 400,
  log: 'gained 400 Pressure during damage calculation'
});
regEffect('dnd-000-okarunthegreat', {
  type: 'onBattleCalc', tag: 'battlePR', prBoost: 300,
  log: 'gained 300 Pressure during damage calculation'
});

// === ON BATTLE DAMAGE → OPPONENT DISCARD ===
regEffect('bl1-000-saeitoshithegreat', {
  type: 'onBattleDamage', tag: 'forceDiscard', action: 'oppDiscardRandom',
  log: 'forced opponent to discard 1 card'
});
regEffect('op1-000-marshalldteachthegreat', {
  type: 'onBattleDamage', tag: 'forceDiscard', action: 'oppDiscardRandom',
  log: 'forced opponent to discard 1 card'
});

// === ON BATTLE KILL → DRAW ===
regEffect('hlp-000-gabimaruthegreat', {
  type: 'onBattleResult', tag: 'killDraw', resultType: 'kill',
  action: 'draw', count: 1,
  log: 'drew 1 card after destroying a Catalyst'
});

// === ON OPPONENT DRAW → BURN/DISCARD ===
regEffect('dnd-000-turbogrannythegreat', {
  type: 'onOpponentDraw', tag: 'oppDrawBurn', action: 'burnOpponent', damage: 200,
  log: 'inflicted 200 damage when opponent drew'
});
regEffect('blc-000-aizenthegreat', {
  type: 'onOpponentDraw', tag: 'oppDrawDiscard', action: 'oppDiscardRandom',
  log: 'forced opponent to discard 1 card when they drew'
});

// === CONCEALED TRICK ACTIVATION TRIGGERS ===
regEffect('aot-000-erwinthegreat', {
  type: 'onAnyConcealedUsed', tag: 'concealDraw', side: 'self',
  action: 'draw', count: 1,
  log: 'drew 1 card when a Concealed Trick was activated'
});
regEffect('dnd-000-momothegreat', {
  type: 'onAnyConcealedUsed', tag: 'concealChi', side: 'self',
  action: 'gainChi', amount: 400,
  log: 'gained 400 Chi when a Concealed Trick was activated'
});
regEffect('blc-000-byakuyathegreat', {
  type: 'onAnyConcealedUsed', tag: 'concealCP', side: 'any',
  action: 'boostAllCP', amount: 200,
  log: 'all Catalysts gained 200 Counter Pressure'
});
regEffect('gck-000-enjinthegreat', {
  type: 'onAnyConcealedUsed', tag: 'concealDrawDiscard', side: 'self',
  action: 'drawThenDiscard',
  log: 'drew 1 card then discarded 1 card'
});
regEffect('hlp-000-chobeithegreat', {
  type: 'onAnyConcealedUsed', tag: 'concealPR', side: 'any',
  action: 'boostSelfPR', amount: 300,
  log: 'gained 300 Pressure when a Concealed Trick was activated'
});

// === PALM TRICK ACTIVATION TRIGGERS ===
regEffect('blc-000-ichigothegreat', {
  type: 'onAnyPalmUsed', tag: 'palmPR', side: 'self',
  action: 'boostSelfPR', amount: 300,
  log: 'gained 300 Pressure when a Palm Trick was activated'
});
regEffect('hlp-000-sagirithegreat', {
  type: 'onAnyPalmUsed', tag: 'palmChi', side: 'self',
  action: 'gainChi', amount: 300,
  log: 'gained 300 Chi when a Palm Trick was activated'
});

// === FIELD TRICK CONDITIONAL ===
regEffect('aot-000-erenthegreat', {
  type: 'continuous', tag: 'fieldPR',
  condition: 'hasFieldTrick', prBoost: 400,
  log: 'gained 400 Pressure from controlling a Field Trick'
});
regEffect('gck-000-riyothegreat', {
  type: 'onAnyPalmUsed', tag: 'fieldChi', side: 'self',
  condition: 'hasFieldTrick', action: 'gainChi', amount: 300,
  log: 'gained 300 Chi (Field Trick active)'
});

// === CONDITIONAL PR BOOST (named card on field) ===
regEffect('dbz-000-gohan', {
  type: 'continuous', tag: 'namedBoost',
  condition: 'namedOnField', conditionName: 'videl', prBoost: 500,
  log: 'gained 500 Pressure because Videl is on the field'
});

// === LEVI — ATTACK DEBUFF ===
regEffect('aot-000-levithegreat', {
  type: 'onAttackDeclare', tag: 'atkDebuff',
  action: 'debuffTarget', amount: 300,
  log: 'reduced target by 300 Pressure'
});

// === MIKASA — BOOST WHEN ALLY DESTROYED ===
regEffect('aot-000-mikasathegreat', {
  type: 'onAllyCatalystDestroyed', tag: 'allyDestroyPR',
  action: 'boostSelfPR', amount: 400,
  log: 'gained 400 Pressure when an ally Catalyst was destroyed'
});

// === RUDO — BOOST WHEN CARD SENT TO VOID ===
regEffect('gck-000-rudothegreat', {
  type: 'onAnyVoidSend', tag: 'voidPR',
  action: 'boostSelfPR', amount: 200,
  log: 'gained 200 Pressure when a card was sent to the Void'
});

// === MONARCH ANTARES — ON SUMMON MASS DESTROY + BURN ===
regEffect('sl1-000-monarchantaresthegreat', {
  type: 'onSummon', tag: 'massDestroy',
  action: 'custom_monarchAntares'
});

// === SUNG JINWOO — ON SUMMON TOKEN GEN ===
regEffect('sl1-000-sungjinwoothegreat', {
  type: 'onSummon', tag: 'tokenGen',
  action: 'custom_sungJinwoo'
});

// === CLOUD — IMMUNE TO CONCEALED ===
regEffect('ff7-035-cloudtheuntouchable', {  // actual ID in DB
  type: 'immune', tag: 'immuneConcealed', immuneTo: 'concealed'
});

// === NEWZ — CONTINUOUS WARRIOR PR BOOST ===
regEffect('anm-000-newzthegreatwatcher', {
  type: 'continuous', tag: 'warriorBoost',
  condition: 'kindOnField', conditionKind: 'Warrior', prBoostAll: 200,
  log: 'all Warrior-Type Catalysts gain 200 Pressure'
});

// === DESTIN — ON FUSION SUMMON, SS WARRIOR ≤1000 PR FROM HAND ===
regEffect('anm-000-destinthegreatwarlord', {
  type: 'onSummon', tag: 'fusionSS',
  action: 'custom_destin'
});

// === PSYCHIC BURST — PALM: TARGET LOSES 700 PR ===
// (Handled via runPalmScript below — not registry since it's a Palm Trick)

// === BORUTO — DOUBLE ATTACK (counter removal part not yet implemented) ===
regEffect('bro-000-borutouzumakithegreat', {
  type: 'doubleAttack', tag: 'dblAtk'
});

// === GOKU - THE GREAT — once per turn: remove from game 1 opponent's card; activate only if it has not attacked; cannot attack for the rest of this turn ===
regEffect('dbs-000-gokuthegreat', {
  type: 'activeAbility', tag: 'gokuGreatRFG',
  action: 'custom_gokuGreatRFG',
  log: "removed 1 opponent's card from game; activate only if it has not attacked; cannot attack for the rest of this turn"
});

// === ACE THE GREAT — Pay 1500 Chi, copy a target Catalyst's effect until End Phase ===
regEffect('anm-000-acethegreat', {
  type: 'activeAbility', tag: 'copyEffect',
  action: 'custom_aceCopy', cost: 1500,
  log: 'copied an effect'
});

// === HIEI THE GREAT — Battle phase: roll die. Odd = destroy 1 card. Even = attack twice ===
regEffect('yyh-011-hieithegreat', {
  type: 'onBattlePhaseStart', tag: 'hieiDice',
  action: 'custom_hieiDice'
});
// Hiei also needs double attack when even is rolled — handled in custom_hieiDice
// ─── STARTER DECK REGISTRATIONS ───
// Catalysts
regEffect('gds-008-duelgundam', { type:'onSelfDestroyed', tag:'duelGundam', action:'custom_duelgundam' });
regEffect('tg1-107-kuroneko', { type:'onSelfDestroyed', tag:'kuroneko', action:'custom_kuroneko' });
regEffect('tg1-202-lightseeker', { type:'onSelfDestroyed', tag:'lightSeeker', action:'custom_lightseeker' });
regEffect('dbs-002-futuretrunks', { type:'onSelfDestroyed', tag:'futureTrunks', action:'custom_futuretrunks' });
regEffect('dbs-004-piccolo', { type:'onSelfDestroyed', tag:'piccolo', action:'custom_piccolo' });
regEffect('dbs-013-android17', { type:'onSelfDestroyed', tag:'android17', action:'custom_android17' });
regEffect('tg1-010-raideitheblade5thgunghogun', { type:'onSelfDestroyed', tag:'raidei', action:'custom_raidei' });
regEffect('dbz-005-vegetasupersaiyan', { type:'onBattleDamage', tag:'vegetaDraw', action:'draw', count:1, log:'drew 1 card after inflicting battle damage' });
regEffect('cc1-018-catburglar', { type:'onBattleDamage', tag:'catBurglarDirect', action:'oppDiscardRandom', directOnly:true, log:'forced opponent to discard after a direct attack' });
regEffect('cc1-041-wazuki', { type:'pierce', tag:'wazukiPierce', mode:'difference' });
regEffect('cc1-029-garai', { type:'atkVsDefWinBurn', tag:'garaiBurn', mode:'defenderLevelTimes', amount:500 });
regEffect('yyh-010-hiei', { type:'doubleAttack', tag:'hieiBaseDblAtk' });
regEffect('dbs-016-cauliflasupersaiyan2', { type:'doubleAttack', tag:'cauliflaDblAtk' });
regEffect('db1-039-babasfighter1draculaman', { type:'pierce', tag:'draculaPierce', mode:'difference' });
regEffect('dbz-002-gokusupersaiyan', { type:'onBattleResult', tag:'gokuSSDiscard', resultType:'kill', action:'oppDiscardRandom', log:'forced opponent to discard after destroying a Catalyst' });
regEffect('tg1-108-merylstrife', [
  { type:'doubleAttack', tag:'merylDblAtk' },
  { type:'continuous', tag:'merylVashBoost', prBoost:400, condition:'namedOnField', conditionName:'vash' }
]);
regEffect('dbs-006-whis', { type:'continuous', tag:'whisLock', action:'blockSpecialSummonAbovePR', minPR:3000 });

// Field Tricks
regEffect('t2f-022-gundamlab', { type:'fieldAuraPR', tag:'gundamLab', prBoostAll:500, targetKind:'gundam' });
regEffect('loz-017-firetemple', { type:'fieldAuraCP', tag:'fireTemple', cpBoostAll:500, targetAlignment:'fire' });
regEffect('tt1-016-volcano', [
  { type:'fieldAuraPR', tag:'volcanoFire', prBoostAll:400, targetAlignment:'fire' },
  { type:'fieldAuraPR', tag:'volcanoWater', prBoostAll:-200, targetAlignment:'water' }
]);
regEffect('anm-002-roadtogreatness', { type:'fieldAuraPR', tag:'roadGreat', prBoostAll:400, targetNameIncludes:'the great' });
regEffect('anm-001-serpent', { type:'onBattlePhaseStart', tag:'serpentCoin', action:'custom_serpentCoin' });
regEffect('anm-003-nolanthegreat', { type:'onSummon', tag:'nolanSummon', action:'custom_nolan' });
regEffect('anm-010-aearth', { type:'onBattleDamage', tag:'aearthSearch', action:'searchPalm', directOnly:true, log:'searched a Palm Trick after a direct attack' });

regEffect('cc1-035-lavaboy', { type:'onSelfDestroyed', tag:'lavaBoy', action:'custom_lavaboy' });
regEffect('ff7-017-vincenttrance', { type:'onSelfDestroyed', tag:'vincentTrance', action:'custom_vincenttrance' });
regEffect('gds-019-freedomgundam', { type:'onSelfDestroyed', tag:'freedomGundam', action:'custom_freedomgundam' });
regEffect('gds-021-gundamastrayblueframe', { type:'onSelfDestroyed', tag:'astrayBlue', action:'custom_astrayblue' });
regEffect('inu-020-onigumo', { type:'onSelfDestroyed', tag:'onigumo', action:'custom_onigumo' });
regEffect('db1-047-yamchathebandit', { type:'onBattleResult', tag:'yamchaBandit', resultType:'kill', action:'custom_yamchaBandit' });
regEffect('dbz-031-teengohan', { type:'onBattleResult', tag:'teenGohan', resultType:'kill', action:'custom_teengohan' });
regEffect('gds-018-justicegundam', { type:'onBattleDamage', tag:'justiceCounter', action:'custom_justicegundam', directOnly:true });

// ─── PATCH 26: REMAINING STARTER DECK CATALYST REGISTRATIONS ───
regEffect('gds-009-assaultshroudduelgundam', { type:'onSelfDestroyed', tag:'assaultShroud', action:'custom_assaultshroud' });
regEffect('gds-023-bustergundam', { type:'activated', tag:'busterCoinFlip', action:'custom_bustergundam' });
regEffect('gds-005-strikegundam', { type:'onSummon', tag:'strikeSummon', action:'cannotBeAttackedThisTurn' });
regEffect('cc1-027-firedragon2enraged', { type:'onTargeted', tag:'fireDragonNegate', action:'custom_firedragon2', cost:2000 });
regEffect('cc1-057-pyrotor', { type:'continuous', tag:'pyrotorImmune', action:'fireImmuneToEffects' });
regEffect('cc1-065-highwayman', { type:'activated', tag:'highwaymanFlip', action:'custom_highwayman' });
regEffect('ggx-019-zappa', { type:'onAttackedInDef', tag:'zappaDelay', action:'custom_zappa' });
regEffect('s-m-001-agentx', { type:'onFlip', tag:'agentXFlip', action:'destroy1Catalyst' });
regEffect('dbz-038-yajirobe', { type:'onFlip', tag:'yajirobeFlip', action:'draw1' });
regEffect('ff7-012-barretttrance', { type:'continuous', tag:'barrettImmune', action:'palmImmunity' });
regEffect('ff7-016-tifatrance', { type:'doubleAttack', tag:'tifaDblAtk', cost:1000 });
regEffect('dbs-010-brolylegendarysupersaiyan', { type:'activated', tag:'brolyNuke', action:'custom_broly', oncePerDuel:true });
regEffect('dbs-015-cabba', { type:'onPRReduction', tag:'cabbaGuard', action:'custom_cabba' });
regEffect('mgm-031-magnetman', { type:'activated', tag:'magnetDraw', action:'custom_magnetman', cost:1000 });
regEffect('kh1-009-captainhook', { type:'activated', tag:'hookDiscard', action:'custom_captainhook' });
regEffect('tg1-006-brad', { type:'activated', tag:'bradTribute', action:'custom_brad' });
regEffect('cc1-037-megastarky', { type:'summonCondition', tag:'megaStarky', action:'tributeByName', tributeName:'starky' });
regEffect('inu-017-narakuthewicked', { type:'activated', tag:'narakuNuke', action:'custom_naraku', cost:1000 });
regEffect('tg1-104-vashthestampede', { type:'activated', tag:'vashStampede', action:'custom_vashstampede', summonRestriction:'cannotNormalSummon' });
regEffect('inu-119-kanna', { type:'activated', tag:'kannaWipe', action:'custom_kanna' });
regEffect('tg1-112-knivesdestroyerofmankind', { type:'activated', tag:'knivesGreatWipe', action:'custom_knivesgreat', cost:1000 });
regEffect('tg1-201-darkseeker', { type:'onSelfDestroyed', tag:'darkSeeker', action:'custom_darkseeker' });

// ─── TG1 (TRIGUN) FULL SET REGISTRATIONS — Patch 40 ───
// Catalysts
regEffect('tg1-002-remsaverem',             { type:'summonCondition', tag:'remSaveremRitual',    action:'ritualSummon',         ritualSpell:'saving rem' });
regEffect('tg1-004-wolfwoodgunghogunintraining', { type:'summonCondition', tag:'wolfwoodRitual', action:'ritualSummon',         ritualSpell:'corrupting the priest' });
regEffect('tg1-007-dominiquethecyclops2ndgunghogun', { type:'activated', tag:'dominiqueParalyze', action:'custom_dominique' });
regEffect('tg1-008-monevthegale1stgunghogun', { type:'standbyCountdown', tag:'monevCountdown',   count:2 });
regEffect('tg1-009-egmine3rdgunghogun',     { type:'onAttackDeclared',  tag:'egminePRBoost',     prBoost:500, untilNextTurn:true });
regEffect('tg1-011-leonofthepuppetmaster8thgunghogun', { type:'activated', tag:'leonPuppet',     action:'custom_leon',          cost:500 });
regEffect('tg1-012-graytheninelives7thgunghogun', { type:'onSelfDestroyed', tag:'grayRevive',    action:'custom_gray' });
regEffect('tg1-013-zaziethebeast4thgunghogun', { type:'continuous',     tag:'zazieProtected',    action:'protectedIfFieldActive', fieldName:'civilians in the way' });
regEffect('tg1-014-cainethelongshot9thgunghogun', [
  { type:'continuous', tag:'caineForceCP',  action:'forceCPPosition' },
  { type:'continuous', tag:'caineCanAttackFromCP', action:'canAttackFromCP' }
]);
regEffect('tg1-014-hopperedthegauntlet6thgunghogun', { type:'onAttackDeclared', tag:'hopperedSwitch', action:'switchToCPAfterAttack' });
regEffect('tg1-103-vashthelegendarygunman', { type:'activated', tag:'vashLegendary',             action:'custom_vashlegendary' });
regEffect('tg1-104-puppetofdemise',         { type:'handActivated',    tag:'puppetDiscard',      action:'custom_puppetofdemise' });
regEffect('tg1-105-knivesminipulation',     { type:'equip',            tag:'knivesManipEquip',   prBoost:600, targetNameIncludes:['vash','gung-ho gun'] });
regEffect('tg1-106-knives',                 { type:'continuous',       tag:'knivesControl',      action:'custom_knives' });
regEffect('tg1-110-derringermeryl',         { type:'standbyFlipEffect', tag:'derringerCoin',      action:'custom_derringermeryl' });
regEffect('tg1-111-stungunmilly',           { type:'standbyFlipEffect', tag:'stungunCoin',        action:'custom_stungunmilly' });
regEffect('tg1-112-nicholasdwolfwood',      { type:'summonCondition',  tag:'wolfwoodSpecialRFG', action:'custom_wolfwoodSummon',  summonRestriction:'cannotNormalSummon' });
regEffect('tg1-112-nicholasdwolfwood',      { type:'onBattleResult',   tag:'wolfwoodSearch',     resultType:'kill', action:'custom_wolfwoodKill' });
// Palm / Trick scripts
regEffect('tg1-003-savingrem',              { type:'palmScript',       tag:'savingRemRitual',    action:'custom_savingrem' });
regEffect('tg1-003-elizabeth',              { type:'palmScript',       tag:'elizabethBounce',    action:'custom_elizabeth' });
regEffect('tg1-005-corruptingthepriest',    { type:'palmScript',       tag:'corruptPriestRitual',action:'custom_corruptingthepriest' });
regEffect('tg1-006-millyslove',             { type:'concealedScript',  tag:'millysLoveSearch',   action:'custom_millyslove' });
regEffect('tg1-018-gooddeedsgorewarded',    { type:'palmScript',       tag:'goodDeedsChiGain',   action:'custom_gooddeeds' });
regEffect('tg1-019-thenebraskafamily',      { type:'concealedScript',  tag:'nebraskaChoice',     action:'custom_nebraska' });
regEffect('tg1-021-civiliansintheway',      { type:'fieldAuraPR',      tag:'civiliansPRBoost',   prBoostAll:500, targetNameIncludes:'gung-ho gun' });
regEffect('tg1-021-deadmanwalking',         { type:'palmScript',       tag:'deadManWalkSS',      action:'custom_deadmanwalking' });
regEffect('tg1-021-vashsrevenge',           { type:'palmScript',       tag:'vashRevengeDestroy', action:'custom_vashsrevenge' });
regEffect('tg1-023-evilreturns',            { type:'palmScript',       tag:'evilReturnsEquip',   action:'custom_evilreturns' });

// ─── FUSION CARD REGISTRATIONS ───
regEffect('bl1-019-bluelockteamzunited', { type:'doubleAttack', tag:'blueLockTeamZDbl' });
regEffect('dbs-021-gogetasupersaiyanblue', { type:'doubleAttack', tag:'gogetaBlueDbl' });
regEffect('dbs-023-keflalegendaryfusion', { type:'doubleAttack', tag:'keflaDbl' });
regEffect('dbs-024-vegetathegreat', { type:'doubleAttack', tag:'vegetaGreatDbl' });
regEffect('aot-016-attacktitanfusion', { type:'activated', tag:'attackTitanFaceDown', action:'custom_fusionDestroyFacedown' });
regEffect('blc-016-bankaiichigofusion', { type:'activated', tag:'bankaiDestroyTrick', action:'custom_fusionDestroyTrick' });
regEffect('dnd-017-turbopossessionfusion', { type:'activated', tag:'turboDestroyFacedown', action:'custom_fusionDestroyFacedown' });
regEffect('gck-016-rudoandenjinfusion', { type:'activated', tag:'rudoEnjinDestroyTrickDraw', action:'custom_fusionDestroyTrickDraw' });
regEffect('hlp-017-tensenascendantfusion', { type:'activated', tag:'tensenDestroyTrick', action:'custom_fusionDestroyTrick' });
regEffect('op1-018-gear5luffysungodnika', { type:'activated', tag:'nikaSwitchDef', action:'custom_gear5SwitchAllDef' });
regEffect('sl1-017-belliontheshadowruler', { type:'activated', tag:'bellionWipe', action:'custom_bellion' });
regEffect('rkn-039-weapon', { type:'activated', tag:'weaponCoinFlip', action:'custom_weapon' });
regEffect('sh2-007-cable', { type:'activated', tag:'cableBarrage', action:'custom_cable' });
regEffect('sh2-009-captainamerica', { type:'activated', tag:'captainAmericaSweep', action:'custom_captainAmerica' });
regEffect('tuv-029-ayekamasaki', { type:'onSelfDestroyed', tag:'ayekaFusionReform', action:'custom_ayekamasaki' });
regEffect('dbz-017-gotenks', { type:'pierce', tag:'gotenksPierce', mode:'difference' });
regEffect('dbz-019-vegito', { type:'onBattleResult', tag:'vegitoKillDraw', resultType:'kill', action:'draw', count:1, log:'drew 1 card after destroying a Catalyst' });
regEffect('hls-009-celesthevampire', { type:'pierce', tag:'celesVampirePierce', mode:'difference' });


// ─── RESOLVE REGISTRY BY ACTUAL CARD IDs ───
// The registrations above use placeholder IDs. We need to map them
// to real card IDs from the database. This runs once at load time.

function resolveRegistryIds() {
  if (typeof CTF_CARDS === 'undefined') return;

  // Build name→id map
  const nameMap = {};
  CTF_CARDS.forEach(c => {
    nameMap[String(c.name || '').toLowerCase().trim()] = c.id;
  });

  const starterNameResolver = {
    'duel gundam':'gds-008-duelgundam',
    'kuroneko':'tg1-107-kuroneko',
    'light seeker':'tg1-202-lightseeker',
    'future trunks':'dbs-002-futuretrunks',
    'piccolo':'dbs-004-piccolo',
    'android 17':'dbs-013-android17',
    'rai dei the blade 5th gung ho gun':'tg1-010-raideitheblade5thgunghogun',
    'vegeta super saiyan':'dbz-005-vegetasupersaiyan',
    'cat burglar':'cc1-018-catburglar',
    'wazuki':'cc1-041-wazuki',
    'garai':'cc1-029-garai',
    'hiei':'yyh-010-hiei',
    'caulifla super saiyan 2':'dbs-016-cauliflasupersaiyan2',
    'baba s fighter 1 dracula man':'db1-039-babasfighter1draculaman',
    'goku super saiyan':'dbz-002-gokusupersaiyan',
    'meryl strife':'tg1-108-merylstrife',
    'whis':'dbs-006-whis',
    'gundam lab':'t2f-022-gundamlab',
    'fire temple':'loz-017-firetemple',
    'volcano':'tt1-016-volcano',
    'road to greatness':'anm-002-roadtogreatness',
  };
  Object.entries(starterNameResolver).forEach(([alias, id]) => { if (!nameMap[alias]) nameMap[alias] = id; });

  // Mapping of placeholder patterns to actual card names
  const nameToPlaceholder = {
    'reese the great\'s gundam': 'anm-000-reesethegreatsgundam',
    'isshiki otsutsuki - the great': 'dbs-000-isshikiotsutsuki',
    'isagi - the great': 'bl1-000-isagithegreat',
    'monkey d. luffy - the great': 'op1-000-monkeydluffythegreat',
    'kenpachi the great': 'blc-000-kenpachithegreat',
    'okarun the great': 'dnd-000-okarunthegreat',
    'sae itoshi - the great': 'bl1-000-saeitoshithegreat',
    'marshall d. teach - the great': 'op1-000-marshalldteachthegreat',
    'gabimaru the great': 'hlp-000-gabimaruthegreat',
    'turbo granny the great': 'dnd-000-turbogrannythegreat',
    'aizen the great': 'blc-000-aizenthegreat',
    'erwin the great': 'aot-000-erwinthegreat',
    'momo the great': 'dnd-000-momothegreat',
    'byakuya the great': 'blc-000-byakuyathegreat',
    'enjin the great': 'gck-000-enjinthegreat',
    'chobei the great': 'hlp-000-chobeithegreat',
    'ichigo the great': 'blc-000-ichigothegreat',
    'sagiri the great': 'hlp-000-sagirithegreat',
    'eren the great': 'aot-000-erenthegreat',
    'riyo the great': 'gck-000-riyothegreat',
    'gohan - the great saiyaman': 'dbz-000-gohan',
    'levi the great': 'aot-000-levithegreat',
    'mikasa the great': 'aot-000-mikasathegreat',
    'rudo the great': 'gck-000-rudothegreat',
    'monarch antares - the great': 'sl1-000-monarchantaresthegreat',
    'sung jinwoo - the great': 'sl1-000-sungjinwoothegreat',
    'seiko the great': 'dnd-000-seikothegreat',
    'vegeta - the great': 'dbs-000-vegetathegreat',
    'zanka the great': 'gck-000-zankathegreat',
    'yuzuriha the great': 'hlp-000-yuzurihathegreat',
    'boruto uzumaki - the great': 'bro-000-borutouzumakithegreat',
    'goku - the great': 'dbs-000-gokuthegreat',
    'ace the great': 'anm-000-acethegreat',
  };

  for (const [cardName, placeholder] of Object.entries(nameToPlaceholder)) {
    const realId = nameMap[cardName];
    if (realId && placeholder !== realId && EFFECT_REGISTRY[placeholder]) {
      EFFECT_REGISTRY[realId] = EFFECT_REGISTRY[placeholder];
      delete EFFECT_REGISTRY[placeholder];
    }
  }

  // Also add Seiko, Vegeta, Zanka, Yuzuriha effects that weren't registered above
  // because they need more complex handling
  const seiko = nameMap['seiko the great'];
  if (seiko && !EFFECT_REGISTRY[seiko]) {
    regEffect(seiko, {
      type: 'onAnyConcealedUsed', tag: 'fieldDrawDiscard', side: 'self',
      condition: 'hasFieldTrick', action: 'drawThenDiscard',
      log: 'drew 1 then discarded 1 (Field Trick + Concealed trigger)'
    });
  }

  const vegeta = nameMap['vegeta - the great'];
  if (vegeta && !EFFECT_REGISTRY[vegeta]) {
    regEffect(vegeta, { type: 'doubleAttack', tag: 'dblAtk' });
    // Note: "opponent cannot respond" is not yet enforced
  }

  const zanka = nameMap['zanka the great'];
  if (zanka && !EFFECT_REGISTRY[zanka]) {
    regEffect(zanka, {
      type: 'oncePerTurnActive', tag: 'returnSet',
      action: 'custom_returnSetToHand',
      log: 'returned a set card to hand'
    });
  }

  const yuzuriha = nameMap['yuzuriha the great'];
  if (yuzuriha && !EFFECT_REGISTRY[yuzuriha]) {
    regEffect(yuzuriha, {
      type: 'continuous', tag: 'directAtk',
      condition: 'namedAllyOnField', conditionKind: 'hlp',
      action: 'allowDirectAttack',
      log: 'can attack directly (another HLP Catalyst is on the field)'
    });
  }
}

// ─── GENERIC EFFECT HANDLERS ───

function runRegisteredOnSummon(state, playerIdx, zoneIdx) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  if (!slot) return;
  const effects = getAllCardEffects(slot.cardId);
  const p = state.players[playerIdx];
  for (const eff of effects) {
    if (eff.type !== 'onSummon') continue;
    if (eff.action === 'generic_takeControl') {
      const steal = runGenericTakeControl(state, playerIdx, slot.cardId, eff, null, `Summon effect: ${getCard(slot.cardId)?.name || 'A Catalyst'}`);
      if (!steal.ok) addLog(state, `Effect Script: ${getCard(slot.cardId)?.name || 'A Catalyst'} had no valid Catalyst to take control of on summon.`);
    } else if (eff.action === 'searchByName') {
      const found = addCardToHandFromDeckByNameToken(state, playerIdx, eff.names);
      if (found) addLog(state, `Effect Script: ${getCard(slot.cardId)?.name} ${eff.log || 'searched a card'}.`);
    } else if (eff.action === 'custom_monarchAntares') {
      const opp = state.players[1 - playerIdx];
      let destroyed = 0;
      for (let i = 0; i < 5; i++) {
        if (opp.catalysts[i]) {
          opp.void.push(opp.catalysts[i].cardId);
          opp.catalysts[i] = null;
          destroyed++;
        }
      }
      const burn = destroyed * 200;
      opp.chi = Math.max(0, opp.chi - burn);
      p.kills += destroyed;
      addLog(state, `Effect Script: Monarch Antares destroyed ${destroyed} Catalyst(s) and dealt ${burn} Chi damage. +${destroyed} Kill(s).`);
    } else if (eff.action === 'custom_isshiki') {
      const opp = state.players[1 - playerIdx];
      for (let i = 0; i < 5; i++) {
        if (opp.catalysts[i]) {
          opp.catalysts[i].atkMod = -(Number(getCard(opp.catalysts[i].cardId)?.pr || 0) - 1);
          opp.catalysts[i].cpMod = -(Number(getCard(opp.catalysts[i].cardId)?.cp || 0) - 1);
        }
      }
      opp.chi = Math.max(0, opp.chi - 600);
      addLog(state, `Effect Script: Isshiki reduced all opponent Catalysts to 1/1 and dealt 600 Chi damage.`);
    } else if (eff.action === 'custom_sungJinwoo') {
      let summoned = 0;
      for (let i = 0; i < 3; i++) {
        const emptyZone = getFirstEmptyCatalystZone(state, playerIdx);
        if (emptyZone < 0) break;
        p.catalysts[emptyZone] = {
          cardId: '__shadow_token__', position: 'atk', faceDown: false,
          attackedThisTurn: false, atkMod: 0, cpMod: 0,
          extraAttackThisTurn: 0, cannotAttackThisTurn: false,
          isToken: true, tokenName: 'Shadow Token', tokenPR: 800, tokenCP: 800
        };
        summoned++;
      }
      if (summoned) addLog(state, `Effect Script: Sung Jinwoo created ${summoned} Shadow Token(s) (800/800).`);
    } else if (eff.action === 'custom_destin') {
      const ctx = state._manualSummonContext && state._manualSummonContext.destin;
      const handIdx = ctx && typeof ctx.handIdx === 'number' ? ctx.handIdx : p.hand.findIndex(id => {
        const hc = getCard(id);
        return hc && hc.cardType === 'Catalyst' && Number(hc.pr || 0) <= 1000 && (hc.kinds || []).some(k => /warrior/i.test(k));
      });
      if (handIdx >= 0) {
        const emptyZone = getFirstEmptyCatalystZone(state, playerIdx);
        if (emptyZone >= 0) {
          const ssId = p.hand.splice(handIdx, 1)[0];
          const ssCard = getCard(ssId);
          p.catalysts[emptyZone] = { cardId: ssId, position: 'atk', faceDown: false, attackedThisTurn: false, atkMod: 0, cpMod: 0, extraAttackThisTurn: 0, cannotAttackThisTurn: true };
          p.summonedThisTurn.add(emptyZone);
          registerSpecialSummon(state, playerIdx, 'Destin The Great Warlord');
          addLog(state, `Effect Script: Destin Special Summoned ${ssCard?.name || 'a Warrior'} from hand (cannot attack this turn).`);
        }
      }
    }
  }
}


function auraAppliesToTargetPlayer(sourcePlayerIdx, targetPlayerIdx, eff) {
  const scope = eff && eff.scope || 'both';
  if (scope === 'self') return sourcePlayerIdx === targetPlayerIdx;
  if (scope === 'opponent') return sourcePlayerIdx !== targetPlayerIdx;
  return true;
}

function auraMatchesTarget(slot, slotCard, eff) {
  if (!slotCard) return false;
  if (eff.targetKind && !slotHasKind(slot, slotCard, eff.targetKind)) return false;
  if (Array.isArray(eff.targetKindsAny) && eff.targetKindsAny.length && !eff.targetKindsAny.some(k => slotHasKind(slot, slotCard, k))) return false;
  if (eff.targetAlignment && !slotHasAlignment(slot, slotCard, eff.targetAlignment)) return false;
  if (Array.isArray(eff.targetAlignmentsAny) && eff.targetAlignmentsAny.length && !eff.targetAlignmentsAny.some(a => slotHasAlignment(slot, slotCard, a))) return false;
  if (eff.targetNameIncludes && !cardNameHas(slotCard, eff.targetNameIncludes)) return false;
  if (Array.isArray(eff.targetNameIncludesAny) && eff.targetNameIncludesAny.length && !eff.targetNameIncludesAny.some(n => cardNameHas(slotCard, n))) return false;
  return true;
}

function getInferredAuraBoost(state, targetPlayerIdx, zoneIdx, statKey) {
  const slot = state.players[targetPlayerIdx].catalysts[zoneIdx];
  if (!slot) return 0;
  const slotCard = getCard(slot.cardId);
  let boost = 0;
  for (let sourcePlayerIdx = 0; sourcePlayerIdx < 2; sourcePlayerIdx++) {
    const srcPlayer = state.players[sourcePlayerIdx];
    const sourceIds = [];
    for (let z = 0; z < 5; z++) {
      const s = srcPlayer.catalysts[z];
      if (s && !s.faceDown) sourceIds.push(s.cardId);
      const t = srcPlayer.tricks[z];
      if (t && !t.faceDown && !t.isLibra) sourceIds.push(t.cardId);
    }
    if (srcPlayer.fieldTrick && !srcPlayer.fieldTrick.faceDown) sourceIds.push(srcPlayer.fieldTrick.cardId);
    for (const sourceId of sourceIds) {
      for (const eff of inferCommonStringEffects(sourceId)) {
        if (eff.type !== (statKey === 'cp' ? 'fieldAuraCP' : 'fieldAuraPR')) continue;
        if (!auraAppliesToTargetPlayer(sourcePlayerIdx, targetPlayerIdx, eff)) continue;
        if (!auraMatchesTarget(slot, slotCard, eff)) continue;
        boost += Number(statKey === 'cp' ? eff.cpBoostAll : eff.prBoostAll || 0);
      }
    }
  }
  return boost;
}

function runGenericTakeControl(state, playerIdx, sourceCardId, eff, manual, reasonLabel) {
  const p = state.players[playerIdx];
  const sourceCard = getCard(sourceCardId);
  if (eff.oncePerTurn && isEffectUsed(state, playerIdx, sourceCardId, eff.tag || 'genericTakeControl')) return { ok:false, msg:'This effect was already used this turn.' };
  const cost = Number(eff.cost || 0);
  if (cost && p.chi < cost) return { ok:false, msg:`Need ${cost} Chi.` };
  const predicate = (card, slot) => {
    if (!card) return false;
    if (slot && slot._cannotChangeControl) return false;
    if (eff.faceUpOnly && slot && slot.faceDown) return false;
    if (eff.targetAlignment && !slotHasAlignment(slot, card, eff.targetAlignment)) return false;
    if (eff.targetKind && !slotHasKind(slot, card, eff.targetKind)) return false;
    if (Array.isArray(eff.excludeKinds) && eff.excludeKinds.some(k => slotHasKind(slot, card, k))) return false;
    return true;
  };
  const opp = state.players[1 - playerIdx];
  const manualZone = manual && typeof manual.targetZone === 'number' ? Number(manual.targetZone) : -1;
  if (eff.takeAll) {
    const targetZones = [];
    for (let z = 0; z < 5; z++) {
      const s = opp.catalysts[z];
      if (s && predicate(getCard(s.cardId), s)) targetZones.push(z);
    }
    if (!targetZones.length) return { ok:false, msg:'No valid opponent Catalyst.' };
    let moved = 0;
    for (const tz of targetZones) {
      const openZone = getFirstEmptyCatalystZone(state, playerIdx);
      if (openZone < 0) break;
      const stolen = opp.catalysts[tz];
      if (!stolen) continue;
      opp.catalysts[tz] = null;
      state.players[playerIdx].catalysts[openZone] = {
        cardId: stolen.cardId,
        position: stolen.position || 'atk',
        faceDown: false,
        attackedThisTurn: false,
        atkMod: 0,
        cpMod: 0,
        extraAttackThisTurn: 0,
        cannotAttackThisTurn: false,
        _temporaryControl: eff.duration !== 'permanent',
        _temporaryReturnToPlayer: 1 - playerIdx
      };
      if (eff.duration === 'permanent') {
        delete state.players[playerIdx].catalysts[openZone]._temporaryControl;
        delete state.players[playerIdx].catalysts[openZone]._temporaryReturnToPlayer;
      }
      moved += 1;
    }
    if (!moved) return { ok:false, msg:'No empty Catalyst Zone.' };
    if (cost) p.chi -= cost;
    if (eff.oncePerTurn) markEffectUsed(state, playerIdx, sourceCardId, eff.tag || 'genericTakeControl');
    addLog(state, `Effect Script: ${reasonLabel || sourceCard?.name || 'A card effect'} took control of ${moved} Catalyst(s)${eff.duration === 'permanent' ? ' permanently.' : ' until the End Phase.'}`);
    return { ok:true, count:moved };
  }
  let result = null;
  if (manualZone >= 0) {
    const targetSlot = opp.catalysts[manualZone];
    if (!targetSlot || !predicate(getCard(targetSlot.cardId), targetSlot)) return { ok:false, msg:'Chosen target is not valid for that control effect.' };
    const openZone = getFirstEmptyCatalystZone(state, playerIdx);
    if (openZone < 0) return { ok:false, msg:'No empty Catalyst Zone.' };
    const stolen = opp.catalysts[manualZone];
    opp.catalysts[manualZone] = null;
    state.players[playerIdx].catalysts[openZone] = {
      cardId: stolen.cardId,
      position: stolen.position || 'atk',
      faceDown: false,
      attackedThisTurn: false,
      atkMod: 0,
      cpMod: 0,
      extraAttackThisTurn: 0,
      cannotAttackThisTurn: false,
      _temporaryControl: eff.duration !== 'permanent',
      _temporaryReturnToPlayer: 1 - playerIdx
    };
    if (eff.duration === 'permanent') {
      delete state.players[playerIdx].catalysts[openZone]._temporaryControl;
      delete state.players[playerIdx].catalysts[openZone]._temporaryReturnToPlayer;
    }
    result = { ok:true, zone:openZone, cardId: stolen.cardId };
  } else {
    result = stealFirstOpponentCatalystUntilEndTurn(state, playerIdx, reasonLabel || sourceCard?.name, predicate);
    if (result.ok && eff.duration === 'permanent') {
      const live = state.players[playerIdx].catalysts[result.zone];
      if (live) { delete live._temporaryControl; delete live._temporaryReturnToPlayer; }
    }
  }
  if (result.ok) {
    if (cost) p.chi -= cost;
    if (eff.oncePerTurn) markEffectUsed(state, playerIdx, sourceCardId, eff.tag || 'genericTakeControl');
    const stolenCard = getCard(result.cardId);
    addLog(state, `Effect Script: ${reasonLabel || sourceCard?.name || 'A card effect'} took control of ${stolenCard?.name || 'a Catalyst'}${eff.duration === 'permanent' ? ' permanently.' : ' until the End Phase.'}`);
  }
  return result;
}

function getRegisteredPRBoost(state, playerIdx, zoneIdx) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  if (!slot) return 0;
  const slotCard = getCard(slot.cardId);
  const effects = getCardEffects(slot.cardId);
  const p = state.players[playerIdx];
  let boost = 0;

  for (const eff of effects) {
    if (eff.type !== 'continuous') continue;
    if (!eff.prBoost) continue;
    if (eff.condition === 'hasFieldTrick' && !isFieldTrickActive(p.fieldTrick)) continue;
    if (eff.condition === 'namedOnField') {
      const found = state.players.some(pl => pl.catalysts.some(s => s && cardHasNameToken(getCard(s.cardId), eff.conditionName)));
      if (!found) continue;
    }
    boost += eff.prBoost;
  }

  for (let z = 0; z < 5; z++) {
    const otherSlot = p.catalysts[z];
    if (!otherSlot) continue;
    for (const eff of getCardEffects(otherSlot.cardId)) {
      if (eff.type !== 'continuous' || !eff.prBoostAll) continue;
      if (eff.condition === 'kindOnField' && slotCard && slotHasKind(slot, slotCard, eff.conditionKind)) boost += eff.prBoostAll;
    }
  }

  if (isFieldTrickActive(p.fieldTrick)) {
    for (const eff of getCardEffects(p.fieldTrick.cardId)) {
      if (eff.type !== 'fieldAuraPR' || !eff.prBoostAll) continue;
      if (eff.targetKind && !slotHasKind(slot, slotCard, eff.targetKind)) continue;
      if (eff.targetAlignment && !slotHasAlignment(slot, slotCard, eff.targetAlignment)) continue;
      if (eff.targetNameIncludes && !cardNameHas(slotCard, eff.targetNameIncludes)) continue;
      boost += eff.prBoostAll;
    }
  }

  for (const trickSlot of p.tricks) {
    if (!trickSlot || trickSlot.faceDown || trickSlot.isLibra) continue;
    const trickCard = getCard(trickSlot.cardId);
    if (trickCard && /jessica'?s love/i.test(trickCard.name || '') && cardNameHas(slotCard, 'vash')) boost += 300;
  }

  if (p.blazeingInferno && isFieldTrickActive(p.fieldTrick) && /volcano/i.test(getCard(p.fieldTrick.cardId)?.name || '') && slotCard && slotHasAlignment(slot, slotCard, 'Fire')) {
    boost += 1000 * Number(p.blazeingInferno || 0);
  }
  if (slotCard && /reaper - master swordsman/i.test(slotCard.name || '')) {
    boost += Math.min(2, Number(slot._equipCount || 0)) * 200;
  }
  if (slotCard && /inferno dragon/i.test(slotCard.name || '') && p.blazeingInferno && isFieldTrickActive(p.fieldTrick) && /volcano/i.test(getCard(p.fieldTrick.cardId)?.name || '')) {
    boost += 300;
  }
  if (slotCard && /vash - fighter of peace/i.test(slotCard.name || '')) {
    const vashCount = p.void.filter(id => /vash/i.test(getCard(id)?.name || '')).length;
    boost += vashCount * 300;
  }
  if (slotCard && /isagi - metavision awakened/i.test(slotCard.name || '')) {
    const warriorCount = state.players.reduce((sum, pl) => sum + pl.void.filter(id => (getCard(id)?.kinds || []).some(k => /warrior/i.test(k))).length, 0);
    boost += warriorCount * 300;
  }
  if (slotCard && /ruler of shadows - jinwoo/i.test(slotCard.name || '')) {
    const shadowCount = p.void.filter(id => (getCard(id)?.kinds || []).some(k => /shadow/i.test(k)) || /shadow/i.test(getCard(id)?.name || '')).length;
    boost += shadowCount * 200;
  }
  if (slotCard && /comet-x/i.test(slotCard.name || '')) {
    const fireCount = p.catalysts.filter(Boolean).filter(sl => {
      const c = getCard(sl.cardId);
      return c && String(c.alignment || '').toLowerCase() === 'fire';
    }).length;
    boost += fireCount * 300;
  }
  const opp = state.players[1 - playerIdx];
  if (opp.catalysts.some(sl => sl && sl._valentineLock) && slotCard && /walter|celes victoria|integral hellsing/i.test(slotCard.name || '')) {
    boost -= 500;
  }

  boost += getInferredAuraBoost(state, playerIdx, zoneIdx, 'pr');
  return boost;
}

function getRegisteredCPBoost(state, playerIdx, zoneIdx) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  if (!slot) return 0;
  const slotCard = getCard(slot.cardId);
  const effects = getCardEffects(slot.cardId);
  const p = state.players[playerIdx];
  let boost = 0;
  for (const eff of effects) {
    if (eff.type === 'continuous' && eff.cpBoost) boost += eff.cpBoost;
  }
  if (isFieldTrickActive(p.fieldTrick)) {
    for (const eff of getCardEffects(p.fieldTrick.cardId)) {
      if (eff.type !== 'fieldAuraCP' || !eff.cpBoostAll) continue;
      if (eff.targetKind && !slotHasKind(slot, slotCard, eff.targetKind)) continue;
      if (eff.targetAlignment && !slotHasAlignment(slot, slotCard, eff.targetAlignment)) continue;
      if (eff.targetNameIncludes && !cardNameHas(slotCard, eff.targetNameIncludes)) continue;
      boost += eff.cpBoostAll;
    }
  }
  if (slotCard && /inferno dragon/i.test(slotCard.name || '') && p.blazeingInferno && isFieldTrickActive(p.fieldTrick) && /volcano/i.test(getCard(p.fieldTrick.cardId)?.name || '')) {
    boost += 200;
  }
  if (slotCard && /vash - fighter of peace/i.test(slotCard.name || '')) {
    const vashCount = p.void.filter(id => /vash/i.test(getCard(id)?.name || '')).length;
    boost += vashCount * 300;
  }
  const opp = state.players[1 - playerIdx];
  if (opp.catalysts.some(sl => sl && sl._valentineLock) && slotCard && /walter|celes victoria|integral hellsing/i.test(slotCard.name || '')) {
    boost -= 500;
  }
  boost += getInferredAuraBoost(state, playerIdx, zoneIdx, 'cp');
  return boost;
}

function hasDoubleAttack(cardId) {
  return hasEffectType(cardId, 'doubleAttack');
}

function runRegisteredOnBattleDamage(state, attackerPlayer, attackerZone, defenderPlayer, damage) {
  const slot = state.players[attackerPlayer].catalysts[attackerZone];
  if (!slot || damage <= 0) return;
  const effects = getCardEffects(slot.cardId);
  for (const eff of effects) {
    if (eff.type !== 'onBattleDamage') continue;
    if (eff.directOnly && state.lastBattleResult && state.lastBattleResult.type !== 'direct') continue;
    if (eff.action === 'oppDiscardRandom') {
      const opp = state.players[defenderPlayer];
      if (opp.hand.length > 0) {
        const randIdx = Math.floor(Math.random() * opp.hand.length);
        const discarded = opp.hand.splice(randIdx, 1)[0];
        opp.void.push(discarded);
        const c = getCard(discarded);
        addLog(state, `Effect Script: ${getCard(slot.cardId)?.name} ${eff.log}. (${c?.name || 'a card'})`);
      }
    } else if (eff.action === 'draw') {
      for (let i = 0; i < (eff.count || 1); i++) drawCard(state, attackerPlayer);
      addLog(state, `Effect Script: ${getCard(slot.cardId)?.name} ${eff.log}.`);
    } else if (eff.action === 'searchPalm') {
      const found = addCardToHandFromDeckByPredicate(state, attackerPlayer, c => c.cardType === 'Palm Trick');
      if (found) addLog(state, `Effect Script: ${getCard(slot.cardId)?.name} ${eff.log || 'searched a Palm Trick'}. (${found.name})`);
    } else if (eff.action === 'custom_justicegundam') {
      const live = state.players[attackerPlayer].catalysts[attackerZone];
      if (!live) continue;
      live._justiceCounters = Number(live._justiceCounters || 0) + 1;
      addLog(state, `Effect Script: Justice Gundam gained a counter (${live._justiceCounters}/3) after a direct attack.`);
      if (live._justiceCounters >= 3) {
        live._justiceCounters = 0;
        live.extraAttackThisTurn = Number(live.extraAttackThisTurn || 0) + 1;
        addLog(state, 'Effect Script: Justice Gundam removed 3 counters to gain another attack this Battle Phase.');
      }
    }
  }
}

function runRegisteredOnBattleResult(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone, result) {
  const slot = state.players[attackerPlayer].catalysts[attackerZone];
  if (!slot) return;
  const effects = getCardEffects(slot.cardId);
  for (const eff of effects) {
    if (eff.type !== 'onBattleResult') continue;
    if (eff.resultType && eff.resultType !== result.type) continue;
    if (isEffectUsed(state, attackerPlayer, slot.cardId, eff.tag)) continue;
    if (eff.action === 'draw') {
      for (let i = 0; i < (eff.count || 1); i++) drawCard(state, attackerPlayer);
      markEffectUsed(state, attackerPlayer, slot.cardId, eff.tag);
      addLog(state, `Effect Script: ${getCard(slot.cardId)?.name} ${eff.log}.`);
    } else if (eff.action === 'custom_yamchaBandit') {
      const p = state.players[attackerPlayer];
      if (p.chi >= 500) {
        p.chi -= 500;
        const found = addCardToHandFromVoidByPredicate(state, attackerPlayer, c => c.cardType === 'Palm Trick');
        if (found) addLog(state, `Effect Script: Yamcha - the Bandit recovered ${found.name} from the Void.`);
      }
    } else if (eff.action === 'custom_teengohan') {
      const live = state.players[attackerPlayer].catalysts[attackerZone];
      if (!live) continue;
      live._teenGohanKills = Number(live._teenGohanKills || 0) + 1;
      if (live._teenGohanKills >= 1) live._immunePalm = true, live._immuneConcealed = true;
      if (live._teenGohanKills >= 2) {
        const res = specialSummonFromHandOrDeckOrVoidByPredicate(state, attackerPlayer, c => /mystic saiyan/i.test(c.name || '') && /gohan/i.test(c.name || ''), 'Teen Gohan');
        if (res.ok) {
          runOnSelfDestroyed(state, attackerPlayer, slot.cardId, { reason:'Teen Gohan tribute' });
          state.players[attackerPlayer].catalysts[attackerZone] = null;
          state.players[attackerPlayer].void.push(slot.cardId);
          addLog(state, 'Effect Script: Teen Gohan advanced into Gohan - Mystic Saiyan.');
        }
      }
    }
  }
}

function runRegisteredBattleCalcBoost(state, playerIdx, zoneIdx) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  if (!slot) return 0;
  const effects = getCardEffects(slot.cardId);
  let boost = 0;
  for (const eff of effects) {
    if (eff.type !== 'onBattleCalc') continue;
    if (isEffectUsed(state, playerIdx, slot.cardId, eff.tag)) continue;
    boost += (eff.prBoost || 0);
    markEffectUsed(state, playerIdx, slot.cardId, eff.tag);
    addLog(state, `Effect Script: ${getCard(slot.cardId)?.name} ${eff.log}.`);
  }
  return boost;
}

function runRegisteredPalmTriggers(state, activatingPlayer) {
  // Check all face-up Catalysts on BOTH sides for onAnyPalmUsed effects
  for (let p = 0; p < 2; p++) {
    const pl = state.players[p];
    for (let z = 0; z < 5; z++) {
      const slot = pl.catalysts[z];
      if (!slot) continue;
      const effects = getCardEffects(slot.cardId);
      for (const eff of effects) {
        if (eff.type !== 'onAnyPalmUsed') continue;
        if (eff.side === 'self' && activatingPlayer !== p) continue;
        if (isEffectUsed(state, p, slot.cardId, eff.tag)) continue;
        if (eff.condition === 'hasFieldTrick' && !isFieldTrickActive(pl.fieldTrick)) continue;
        executeTriggeredAction(state, p, z, eff);
        markEffectUsed(state, p, slot.cardId, eff.tag);
      }
    }
  }
}

function runRegisteredConcealedTriggers(state, activatingPlayer) {
  for (let p = 0; p < 2; p++) {
    const pl = state.players[p];
    for (let z = 0; z < 5; z++) {
      const slot = pl.catalysts[z];
      if (!slot) continue;
      const effects = getCardEffects(slot.cardId);
      for (const eff of effects) {
        if (eff.type !== 'onAnyConcealedUsed') continue;
        if (eff.side === 'self' && activatingPlayer !== p) continue;
        if (isEffectUsed(state, p, slot.cardId, eff.tag)) continue;
        if (eff.condition === 'hasFieldTrick' && !isFieldTrickActive(pl.fieldTrick)) continue;
        executeTriggeredAction(state, p, z, eff);
        markEffectUsed(state, p, slot.cardId, eff.tag);
      }
    }
  }
}

function runRegisteredOpponentDrawTriggers(state, drawingPlayer) {
  const oppPlayer = 1 - drawingPlayer;
  const pl = state.players[oppPlayer];
  for (let z = 0; z < 5; z++) {
    const slot = pl.catalysts[z];
    if (!slot) continue;
    const effects = getCardEffects(slot.cardId);
    for (const eff of effects) {
      if (eff.type !== 'onOpponentDraw') continue;
      if (isEffectUsed(state, oppPlayer, slot.cardId, eff.tag)) continue;
      executeTriggeredAction(state, oppPlayer, z, eff);
      markEffectUsed(state, oppPlayer, slot.cardId, eff.tag);
    }
  }
}

function runRegisteredAllyDestroyed(state, ownerPlayer, destroyedZone) {
  const pl = state.players[ownerPlayer];
  for (let z = 0; z < 5; z++) {
    if (z === destroyedZone) continue;
    const slot = pl.catalysts[z];
    if (!slot) continue;
    const effects = getCardEffects(slot.cardId);
    for (const eff of effects) {
      if (eff.type !== 'onAllyCatalystDestroyed') continue;
      if (isEffectUsed(state, ownerPlayer, slot.cardId, eff.tag)) continue;
      executeTriggeredAction(state, ownerPlayer, z, eff);
      markEffectUsed(state, ownerPlayer, slot.cardId, eff.tag);
    }
  }
}

function executeTriggeredAction(state, playerIdx, zoneIdx, eff) {
  const p = state.players[playerIdx];
  const slot = p.catalysts[zoneIdx];
  const cardName = slot ? (getCard(slot.cardId)?.name || 'a Catalyst') : 'Effect';

  if (eff.action === 'draw') {
    for (let i = 0; i < (eff.count || 1); i++) drawCard(state, playerIdx);
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'drew a card'}.`);
  } else if (eff.action === 'gainChi') {
    p.chi += (eff.amount || 0);
    applyDrawDiscardHooks(state, playerIdx, 1, 'chi gain');
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'gained Chi'}.`);
  } else if (eff.action === 'boostSelfPR') {
    if (slot) {
      slot.atkMod = Number(slot.atkMod || 0) + (eff.amount || 0);
      slot.tempAtkMod = Number(slot.tempAtkMod || 0) + (eff.amount || 0);
    }
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'gained Pressure'}.`);
  } else if (eff.action === 'boostAllCP') {
    for (let i = 0; i < 5; i++) {
      if (p.catalysts[i]) {
        p.catalysts[i].cpMod = Number(p.catalysts[i].cpMod || 0) + (eff.amount || 0);
      }
    }
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'boosted Counter Pressure'}.`);
  } else if (eff.action === 'drawThenDiscard') {
    const drawn = drawCard(state, playerIdx);
    // Discard will be handled by hand limit naturally, or we could force it
    // For now, just draw. The discard is a cost the player must handle.
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'drew then must discard'}.`);
  } else if (eff.action === 'burnOpponent') {
    const opp = state.players[1 - playerIdx];
    opp.chi = Math.max(0, opp.chi - (eff.damage || 0));
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'burned opponent'}.`);
  } else if (eff.action === 'oppDiscardRandom') {
    const opp = state.players[1 - playerIdx];
    if (opp.hand.length > 0) {
      const randIdx = Math.floor(Math.random() * opp.hand.length);
      const discarded = opp.hand.splice(randIdx, 1)[0];
      opp.void.push(discarded);
      const c = getCard(discarded);
      addLog(state, `Effect Script: ${cardName} ${eff.log || 'forced opponent discard'}. (${c?.name || 'a card'})`);
    }
  } else if (eff.action === 'debuffTarget') {
    // Applied during attack declaration — handled in combat hooks
    addLog(state, `Effect Script: ${cardName} ${eff.log || 'debuffed target'}.`);
  }
}


// ── ACE THE GREAT: Active Ability — copy target's effect ──
function runAceCopyAbility(state, playerIdx, targetPlayerIdx, targetZoneIdx) {
  const p = state.players[playerIdx];
  const aceZone = p.catalysts.findIndex(s => s && /ace the great/i.test(getCard(s.cardId)?.name || ''));
  if (aceZone < 0) return { ok: false, msg: 'Ace The Great is not on the field.' };
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Can only activate during your Action Phase.' };
  const aceSlot = p.catalysts[aceZone];
  if (isEffectUsed(state, playerIdx, aceSlot.cardId, 'copyEffect')) return { ok: false, msg: 'Ace already used copy this turn.' };
  if (p.chi < 1500) return { ok: false, msg: 'Not enough Chi (need 1500).' };
  const targetSlot = state.players[targetPlayerIdx].catalysts[targetZoneIdx];
  if (!targetSlot) return { ok: false, msg: 'No Catalyst in that zone to copy.' };
  const targetCard = getCard(targetSlot.cardId);
  if (!targetCard) return { ok: false, msg: 'Invalid target card.' };

  p.chi -= 1500;
  // Copy target's stat modifiers and registry effects temporarily
  aceSlot.atkMod = Number(aceSlot.atkMod || 0) + Number(targetSlot.atkMod || 0);
  aceSlot.tempAtkMod = Number(aceSlot.tempAtkMod || 0) + Number(targetSlot.atkMod || 0);
  aceSlot.cpMod = Number(aceSlot.cpMod || 0) + Number(targetSlot.cpMod || 0);
  // Copy target's registry effects for this turn
  const targetEffects = getCardEffects(targetSlot.cardId);
  if (targetEffects.length) {
    if (!EFFECT_REGISTRY[aceSlot.cardId]) EFFECT_REGISTRY[aceSlot.cardId] = [];
    for (const eff of targetEffects) {
      const copy = Object.assign({}, eff, { _copiedByAce: true, tag: 'aceCopy_' + eff.tag });
      EFFECT_REGISTRY[aceSlot.cardId].push(copy);
    }
    aceSlot._aceCopiedEffects = true;
  }
  markEffectUsed(state, playerIdx, aceSlot.cardId, 'copyEffect');
  addLog(state, `Effect Script: Ace The Great paid 1500 Chi and copied ${targetCard.name}'s effects until End Phase.`);
  return { ok: true };
}

// Clean up Ace's copied effects at end of turn
function cleanupAceCopiedEffects() {
  for (const [cardId, effects] of Object.entries(EFFECT_REGISTRY)) {
    EFFECT_REGISTRY[cardId] = effects.filter(e => !e._copiedByAce);
  }
}

// ── HIEI THE GREAT: Battle phase start — dice roll ──
function runRegisteredBattlePhaseStart(state, playerIdx) {
  const p = state.players[playerIdx];
  for (let z = 0; z < 5; z++) {
    const slot = p.catalysts[z];
    if (!slot) continue;
    const effects = getCardEffects(slot.cardId);
    for (const eff of effects) {
      if (eff.type !== 'onBattlePhaseStart') continue;
      if (isEffectUsed(state, playerIdx, slot.cardId, eff.tag)) continue;

      if (eff.action === 'custom_hieiDice') {
        const roll = Math.floor(Math.random() * 6) + 1;
        const card = getCard(slot.cardId);
        addLog(state, `Effect Script: ${card?.name || 'Hiei'} rolled a ${roll}.`);

        if (roll % 2 === 1) {
          // Odd — destroy 1 card on the field (target strongest opponent Catalyst)
          const opp = state.players[1 - playerIdx];
          let bestZ = -1, bestPR = -1;
          for (let oz = 0; oz < 5; oz++) {
            if (opp.catalysts[oz]) {
              const pr = getEffectivePressure(state, 1 - playerIdx, oz);
              if (pr > bestPR) { bestPR = pr; bestZ = oz; }
            }
          }
          if (bestZ >= 0) {
            const destroyed = getCard(opp.catalysts[bestZ].cardId);
            opp.void.push(opp.catalysts[bestZ].cardId);
            opp.catalysts[bestZ] = null;
            p.kills++;
            addLog(state, `Effect Script: ${card?.name || 'Hiei'} rolled ODD (${roll}) — destroyed ${destroyed?.name || 'a Catalyst'}. +1 Kill.`);
          } else {
            // No opponent Catalyst — try their tricks
            let trickDestroyed = false;
            for (let tz = 0; tz < 5; tz++) {
              if (opp.tricks[tz]) {
                const tc = getCard(opp.tricks[tz].cardId);
                opp.void.push(opp.tricks[tz].cardId);
                opp.tricks[tz] = null;
                addLog(state, `Effect Script: ${card?.name || 'Hiei'} rolled ODD (${roll}) — destroyed ${tc?.name || 'a set Trick'}.`);
                trickDestroyed = true;
                break;
              }
            }
            if (!trickDestroyed) addLog(state, `Effect Script: ${card?.name || 'Hiei'} rolled ODD (${roll}) — no card to destroy.`);
          }
        } else {
          // Even — may attack twice this turn
          slot.extraAttackThisTurn = (slot.extraAttackThisTurn || 0) + 1;
          addLog(state, `Effect Script: ${card?.name || 'Hiei'} rolled EVEN (${roll}) — may attack twice this Battle Phase.`);
        }
        markEffectUsed(state, playerIdx, slot.cardId, eff.tag);
      } else if (eff.action === 'custom_serpentCoin') {
        const card = getCard(slot.cardId);
        let heads = 0;
        for (let i = 0; i < 5; i++) if (Math.random() < 0.5) heads += 1;
        addLog(state, `Effect Script: ${card?.name || 'Serpent'} flipped 5 coins and got ${heads} head(s).`);
        if (heads >= 4) {
          const opp = state.players[1 - playerIdx];
          opp.chi = Math.max(0, opp.chi - 3000);
          addLog(state, `Effect Script: ${card?.name || 'Serpent'} inflicted 3000 direct Chi damage.`);
          checkWinConditions(state);
        }
        markEffectUsed(state, playerIdx, slot.cardId, eff.tag);
      }
    }
  }
}

// ── EFFECT SCRIPTING LAYER (PATCH 9) ──
function normalizeNameToken(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cardHasNameToken(card, token) {
  return normalizeNameToken(card && card.name).includes(normalizeNameToken(token));
}

function getFirstEmptyCatalystZone(state, playerIdx) {
  return state.players[playerIdx].catalysts.findIndex(c => c === null);
}

function getFirstFaceUpCatalystZone(state, playerIdx) {
  return state.players[playerIdx].catalysts.findIndex(c => !!c);
}

function getEffectivePressure(state, playerIdx, zoneIdx) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  if (!slot) return 0;
  const card = getCard(slot.cardId);
  if (!card) return 0;
  let total = Number(card.pr || 0) + Number(slot.atkMod || 0);
  if (/^kidd$/i.test(card.name || '')) {
    const hasSerge = state.players.some(pl => pl.catalysts.some(s => s && cardHasNameToken(getCard(s.cardId), 'serge')));
    if (hasSerge) total += 500;
  }
  if (/black dragon/i.test(card.name || '')) {
    const p = state.players[playerIdx];
    const dragonCount = [
      ...p.hand.map(getCard),
      ...p.catalysts.filter(Boolean).map(s => getCard(s.cardId)),
      ...p.void.map(getCard)
    ].filter(c => c && /dragon/i.test(`${c.name||''} ${c.kinds||''} ${c.desc||''}`)).length;
    total = dragonCount * 500 + Number(slot.atkMod || 0);
  }
  // Registry continuous PR boosts
  total += getRegisteredPRBoost(state, playerIdx, zoneIdx);
  return Math.max(0, total);
}

function getEffectiveCounterPressure(state, playerIdx, zoneIdx) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  if (!slot) return 0;
  const card = getCard(slot.cardId);
  if (!card) return 0;
  let total = Number(card.cp || 0) + Number(slot.cpMod || 0);
  if (/black dragon/i.test(card.name || '')) {
    const p = state.players[playerIdx];
    const dragonCount = [
      ...p.hand.map(getCard),
      ...p.catalysts.filter(Boolean).map(s => getCard(s.cardId)),
      ...p.void.map(getCard)
    ].filter(c => c && /dragon/i.test(`${c.name||''} ${c.kinds||''} ${c.desc||''}`)).length;
    total = dragonCount * 500 + Number(slot.cpMod || 0);
  }
  total += getRegisteredCPBoost(state, playerIdx, zoneIdx);
  return Math.max(0, total);
}

function addCardToHandFromDeckByNameToken(state, playerIdx, tokens) {
  const p = state.players[playerIdx];
  const idx = p.deck.findIndex(id => {
    const c = getCard(id);
    return c && tokens.some(t => cardHasNameToken(c, t));
  });
  if (idx < 0) return null;
  const [cardId] = p.deck.splice(idx, 1);
  p.hand.push(cardId);
  return getCard(cardId);
}

function specialSummonFromVoidByPredicate(state, playerIdx, predicate, sourceLabel) {
  const p = state.players[playerIdx];
  const voidIdx = p.void.findIndex(id => {
    const c = getCard(id);
    return c && predicate(c);
  });
  if (voidIdx < 0) return { ok:false, msg:'No valid target in the Void.' };
  const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
  if (zoneIdx < 0) return { ok:false, msg:'No empty Catalyst Zone.' };
  const [cardId] = p.void.splice(voidIdx, 1);
  return specialSummonToZone(state, playerIdx, cardId, zoneIdx, sourceLabel || 'Effect');
}



function runStarterIgnitionUpkeep(state, playerIdx) {
  const p = state.players[playerIdx];
  for (let z = 0; z < 5; z++) {
    const slot = p.catalysts[z];
    const c = slot ? getCard(slot.cardId) : null;
    if (!slot || !c) continue;
    const name = String(c.name || '').toLowerCase();
    if (name === 'viper') {
      if (p.chi >= 200) {
        p.chi -= 200;
        addLog(state, 'Effect Script: Viper paid 200 Chi to stay on the field.');
      } else {
        runOnSelfDestroyed(state, playerIdx, slot.cardId, { reason:'Viper upkeep' });
        p.catalysts[z] = null;
        p.void.push(slot.cardId);
        addLog(state, 'Effect Script: Viper could not pay 200 Chi and was destroyed.');
        continue;
      }
    }
    if (slot && slot._destroyOnTurn && state.turn >= slot._destroyOnTurn) {
      runOnSelfDestroyed(state, playerIdx, slot.cardId, { reason:'delayed destroy' });
      p.catalysts[z] = null;
      p.void.push(slot.cardId);
      addLog(state, `Effect Script: ${c?.name || 'A Catalyst'} was destroyed by a delayed effect.`);
      continue;
    }
    // PATCH 26: Zappa delayed destroy + Chi burn
    if (slot && slot._zappaDelayedDestroy && state.turn >= slot._zappaDestroyTurn) {
      const burnAmt = Number(slot._zappaBurnAmount || 0);
      runOnSelfDestroyed(state, playerIdx, slot.cardId, { reason:'Zappa curse' });
      p.void.push(slot.cardId);
      p.catalysts[z] = null;
      p.chi = Math.max(0, p.chi - burnAmt);
      addLog(state, `Effect Script: Zappa's curse destroyed ${c?.name || 'a Catalyst'} and dealt ${burnAmt} Chi damage.`);
      continue;
    }
  }
  if (p.greatTalentPrizeActive) {
    p.greatTalentPrizeTicks = Number(p.greatTalentPrizeTicks || 0) + 1;
    p.chi += 500;
    addLog(state, `Effect Script: The Great Talent Prize restored 500 Chi. (${p.greatTalentPrizeTicks}/3)`);
    if (p.greatTalentPrizeTicks >= 3) {
      const opp = state.players[1 - playerIdx];
      const loss = Math.floor(Number(opp.chi || 0) / 4);
      opp.chi = Math.max(0, Number(opp.chi || 0) - loss);
      p.greatTalentPrizeTicks = 0;
      addLog(state, `Effect Script: The Great Talent Prize reduced the opponent's Chi by ${loss}.`);
    }
  }
  // Toolbox is now manual-choice driven through the UI during Ignition Phase.
}



function specialSummonFromHandOrDeckOrVoidByPredicate(state, playerIdx, predicate, sourceLabel) {
  let res = specialSummonFromHandOrVoidByPredicate(state, playerIdx, predicate, sourceLabel);
  if (res.ok) return res;
  return specialSummonFromDeckByPredicate(state, playerIdx, predicate, sourceLabel);
}

function queueDelayedRevive(state, playerIdx, cardId, revive) {
  if (!state._delayedRevives) state._delayedRevives = [];
  state._delayedRevives.push({ playerIdx, cardId, reviveTurn: state.turn + 1, prBoost: Number(revive?.prBoost || 0) });
}

function processDelayedRevives(state, playerIdx) {
  if (!state._delayedRevives || !state._delayedRevives.length) return;
  const remain = [];
  for (const entry of state._delayedRevives) {
    if (entry.playerIdx !== playerIdx || state.turn < entry.reviveTurn) { remain.push(entry); continue; }
    const p = state.players[playerIdx];
    const voidIdx = p.void.findIndex(id => id === entry.cardId);
    const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
    if (voidIdx >= 0 && zoneIdx >= 0) {
      p.void.splice(voidIdx, 1);
      p.catalysts[zoneIdx] = { cardId: entry.cardId, position:'atk', faceDown:false, attackedThisTurn:false, atkMod:Number(entry.prBoost || 0), cpMod:0, extraAttackThisTurn:0, cannotAttackThisTurn:false };
      addLog(state, `Effect Script: ${getCard(entry.cardId)?.name || 'A Catalyst'} revived on the next Ignition Phase${entry.prBoost ? ` with +${entry.prBoost} Pressure` : ''}.`);
    } else remain.push(entry);
  }
  state._delayedRevives = remain;
}

function runOnSelfDestroyed(state, ownerPlayer, cardId, ctx) {
  const card = getCard(cardId);
  if (!card) return;
  const owner = state.players[ownerPlayer];

  if (owner.claimYourBounty && cardNameHas(card, 'vash')) {
    for (let i = 0; i < owner.claimYourBounty * 2; i++) drawCard(state, ownerPlayer);
    addLog(state, `Effect Script: Claim Your Bounty drew ${owner.claimYourBounty * 2} card(s) because ${card.name} went to the Void.`);
  }

  for (const eff of getCardEffects(cardId)) {
    if (eff.type !== 'onSelfDestroyed') continue;
    if (eff.action === 'custom_duelgundam') {
      const res = specialSummonFromHandOrVoidByPredicate(state, ownerPlayer, c => cardNameHas(c, 'assault shroud duel gundam'), 'Duel Gundam');
      addLog(state, res.ok ? 'Effect Script: Duel Gundam brought out Assault Shroud Duel Gundam.' : `Effect Script: Duel Gundam had no Assault Shroud Duel Gundam to summon. (${res.msg})`);
    } else if (eff.action === 'custom_kuroneko') {
      const res = specialSummonFromDeckByPredicate(state, ownerPlayer, c => c.id === cardId, 'Kuroneko');
      addLog(state, res.ok ? 'Effect Script: Kuroneko Special Summoned another Kuroneko from the Deck.' : `Effect Script: Kuroneko had no valid copy left in the Deck. (${res.msg})`);
    } else if (eff.action === 'custom_lightseeker') {
      const found = addCardToHandFromDeckByPredicate(state, ownerPlayer, c => c.cardType === 'Catalyst' && cardHasAlignment(c, 'Light') && Number(c.level || 0) <= 5);
      if (found) addLog(state, `Effect Script: Light Seeker added ${found.name} to hand.`);
    } else if (eff.action === 'custom_futuretrunks') {
      queueDelayedRevive(state, ownerPlayer, cardId, { prBoost: 500 });
      addLog(state, 'Effect Script: Future Trunks will revive on your next Ignition Phase with +500 Pressure.');
    } else if (eff.action === 'custom_piccolo') {
      const res = specialSummonFromHandOrVoidByPredicate(state, ownerPlayer, c => c.cardType === 'Catalyst' && cardHasKind(c, 'Warrior') && Number(c.level || 0) <= 6, 'Piccolo');
      addLog(state, res.ok ? 'Effect Script: Piccolo Special Summoned a Level 6 or lower Warrior-Type Catalyst.' : `Effect Script: Piccolo had no valid Warrior target. (${res.msg})`);
    } else if (eff.action === 'custom_android17') {
      const res = specialSummonFromDeckByPredicate(state, ownerPlayer, c => c.cardType === 'Catalyst' && cardHasKind(c, 'Android'), 'Android 17');
      addLog(state, res.ok ? 'Effect Script: Android 17 Special Summoned an Android-Type Catalyst from the Deck.' : `Effect Script: Android 17 had no valid Android target. (${res.msg})`);
    } else if (eff.action === 'custom_raidei') {
      const destroyer = ctx && typeof ctx.destroyerPlayer === 'number' ? state.players[ctx.destroyerPlayer]?.catalysts?.[ctx.destroyerZone] : null;
      if (destroyer) {
        const destroyerId = destroyer.cardId;
        runOnSelfDestroyed(state, ctx.destroyerPlayer, destroyerId, { reason:'Rai-Dei reflection' });
        state.players[ctx.destroyerPlayer].catalysts[ctx.destroyerZone] = null;
        state.players[ctx.destroyerPlayer].void.push(destroyerId);
        addLog(state, `Effect Script: Rai-Dei destroyed ${getCard(destroyerId)?.name || 'the attacking Catalyst'} as well.`);
      }
    } else if (eff.action === 'custom_lavaboy') {
      if (ctx && ctx.reason && ctx.reason !== 'battle') {
        const destroyed = destroyAllPalmAndConcealedOnField(state, 'LavaBoy');
        addLog(state, `Effect Script: LavaBoy destroyed ${destroyed} Palm/Concealed Trick(s) on the field.`);
      }
    } else if (eff.action === 'custom_vincenttrance') {
      queueDelayedRevive(state, ownerPlayer, cardId, {});
      addLog(state, 'Effect Script: Vincent - Trance will revive on your next Ignition Phase.');
    } else if (eff.action === 'custom_freedomgundam') {
      const destroyed = destroyCardsOnOpponentField(state, ownerPlayer, 2, 'Freedom Gundam');
      addLog(state, `Effect Script: Freedom Gundam destroyed ${destroyed} card(s) on the opponent field.`);
    } else if (eff.action === 'custom_astrayblue') {
      const res = specialSummonFromVoidByPredicate(state, ownerPlayer, c => /gundam astray red frame/i.test(c.name || ''), 'Gundam Astray Blue Frame');
      addLog(state, res.ok ? 'Effect Script: Gundam Astray Blue Frame Special Summoned Gundam Astray Red Frame from the Void.' : `Effect Script: Gundam Astray Blue Frame had no Red Frame in the Void. (${res.msg})`);
    } else if (eff.action === 'custom_onigumo') {
      if (ctx && ctx.reason === 'battle') {
        const found = addCardToHandFromDeckByNameToken(state, ownerPlayer, ['demons devour me']);
        if (found) addLog(state, `Effect Script: Onigumo added ${found.name} to hand.`);
      }
    } else if (eff.action === 'custom_gray') {
      // Gray the Ninelives: after destroyed, revive on next standby with 500 less Pressure
      const card = getCard(cardId);
      const curPR = Number(card?.pr || 0);
      if (curPR > 500) {
        queueDelayedRevive(state, ownerPlayer, cardId, { prBoost: -500 });
        addLog(state, `Effect Script: Gray the Ninelives will revive on your next Ignition Phase with ${curPR - 500} Pressure.`);
      } else {
        addLog(state, 'Effect Script: Gray the Ninelives had no Pressure left to revive with.');
      }
    } else if (eff.action === 'custom_darkseeker') {
      // Dark Seeker: when sent from field to Void, search for a Dark Catalyst Level 5 or lower
      const found = addCardToHandFromDeckByPredicate(state, ownerPlayer,
        c => c.cardType === 'Catalyst' && cardHasAlignment(c, 'Dark') && Number(c.level || 0) <= 5);
      if (found) addLog(state, `Effect Script: The Great Dark Seeker searched and added ${found.name} to hand.`);
      else addLog(state, 'Effect Script: The Great Dark Seeker found no valid Dark Catalyst (Level 5 or lower) in the Deck.');
    } else if (eff.action === 'custom_wolfwoodKill') {
      // Nicholas D. Wolfwood: when he destroys a Catalyst in battle, add a Gung-Ho Gun from Deck to hand
      if (ctx && ctx.reason === 'battle') {
        const found = addCardToHandFromDeckByPredicate(state, ownerPlayer,
          c => c.cardType === 'Catalyst' && /gung.ho gun/i.test(c.name || ''));
        if (found) addLog(state, `Effect Script: Nicholas D. Wolfwood added ${found.name} to hand after destroying in battle.`);
      }
    } else if (eff.action === 'custom_assaultshroud') {
      // On destroy: RFG this card instead of going to Void
      const voidIdx = owner.void.indexOf(cardId);
      if (voidIdx >= 0) { owner.void.splice(voidIdx, 1); owner.rfg.push(cardId); }
      else { owner.rfg.push(cardId); }
      addLog(state, `Effect Script: Assault Shroud Duel Gundam was removed from game instead of going to the Void.`);
    } else if (eff.action === 'custom_ayekamasaki') {
      const materialIds = ctx && Array.isArray(ctx.fusionMaterialIds) ? ctx.fusionMaterialIds.slice() : [];
      let summoned = 0;
      for (const mid of materialIds) {
        const voidIdx = owner.void.indexOf(mid);
        const zoneIdx = getFirstEmptyCatalystZone(state, ownerPlayer);
        const mc = getCard(mid);
        if (voidIdx >= 0 && zoneIdx >= 0 && mc && mc.cardType === 'Catalyst') {
          owner.void.splice(voidIdx, 1);
          owner.catalysts[zoneIdx] = { cardId: mid, position:'atk', faceDown:false, attackedThisTurn:false, atkMod:0, cpMod:0, extraAttackThisTurn:0, cannotAttackThisTurn:false };
          summoned += 1;
        }
      }
      if (summoned) addLog(state, `Effect Script: Ayeka Masaki re-formed ${summoned} Fusion material Catalyst(s) from the Void.`);
    }
  }
}

function runOnSummonScripts(state, playerIdx, zoneIdx, summonType) {
  const slot = state.players[playerIdx].catalysts[zoneIdx];
  const card = slot ? getCard(slot.cardId) : null;
  if (!card) return;
  const name = canonicalScriptName(card.name || '');
  if (name === 'starky') {
    const searched = addCardToHandFromDeckByNameToken(state, playerIdx, ['starky']);
    if (searched) addLog(state, `Effect Script: ${card.name} searched ${searched.name} from the Deck.`);
  } else if (name === 'strike gundam') {
    state.players[playerIdx].catalysts[zoneIdx]._cannotBeAttackedUntilEndTurn = true;
    addLog(state, 'Effect Script: Strike Gundam cannot be attacked this turn.');
  } else if (name === 'aegis gundam') {
    const oppIdx = 1 - playerIdx;
    const targetIdx = state.players[oppIdx].catalysts.findIndex(Boolean);
    if (targetIdx >= 0) {
      state.players[oppIdx].catalysts[targetIdx].cannotAttackThisTurn = true;
      state.players[oppIdx].catalysts[targetIdx]._aegisLock = true;
      addLog(state, `Effect Script: Aegis Gundam locked ${getCard(state.players[oppIdx].catalysts[targetIdx].cardId)?.name || 'a Catalyst'} from attacking this turn.`);
    }
  } else if (name === 'cait - trance') {
    const res = stealFirstOpponentCatalystUntilEndTurn(state, playerIdx, 'Cait - Trance');
    if (!res.ok) addLog(state, `Effect Script: Cait - Trance had no valid control target. (${res.msg})`);
  } else if (name === 'yuffie - trance') {
    const p = state.players[playerIdx];
    let sent = 0;
    while (sent < 2) {
      const fromHand = p.hand.findIndex(id => /conformer/i.test(getCard(id)?.name || ''));
      if (fromHand >= 0) { p.void.push(p.hand.splice(fromHand,1)[0]); sent++; continue; }
      const fromDeck = p.deck.findIndex(id => /conformer/i.test(getCard(id)?.name || ''));
      if (fromDeck >= 0) { p.void.push(p.deck.splice(fromDeck,1)[0]); sent++; continue; }
      break;
    }
    if (sent >= 2) {
      state.players[1 - playerIdx].chi = Math.max(0, state.players[1 - playerIdx].chi - 1500);
      addLog(state, 'Effect Script: Yuffie - Trance sent 2 Conformer and dealt 1500 Chi damage.');
    }
  } else if (name === 'red xiii - trance') {
    const found = addCardToHandFromDeckByNameToken(state, playerIdx, ['limited moon']);
    if (found) addLog(state, `Effect Script: Red XIII - Trance added ${found.name} to hand.`);
  }
  // ─── PATCH 26: ADDITIONAL ON-SUMMON / FLIP / CONTINUOUS HANDLERS ───
  else if (name === 'agent x') {
    // FLIP: destroy 1 Catalyst on the field
    if (summonType === 'flip' || summonType === 'normal') {
      const opp = state.players[1 - playerIdx];
      const targetZ = opp.catalysts.findIndex(Boolean);
      if (targetZ >= 0) {
        const tc = getCard(opp.catalysts[targetZ].cardId);
        runOnSelfDestroyed(state, 1 - playerIdx, opp.catalysts[targetZ].cardId, { reason:'Agent X' });
        opp.void.push(opp.catalysts[targetZ].cardId);
        opp.catalysts[targetZ] = null;
        state.players[playerIdx].kills = (state.players[playerIdx].kills || 0) + 1;
        addLog(state, `Effect Script: Agent X destroyed ${tc?.name || 'a Catalyst'}. +1 Kill.`);
      } else addLog(state, 'Effect Script: Agent X had no valid target to destroy.');
    }
  } else if (name === 'yajirobe') {
    // FLIP: draw 1 card
    if (summonType === 'flip') {
      drawCard(state, playerIdx);
      addLog(state, 'Effect Script: Yajirobe drew 1 card on flip summon.');
    }
  } else if (name === 'fire dragon2-enraged' || name === 'fire dragon2 - enraged') {
    // On summon: mark with negate-targeting ability
    slot._fireDragonNegate = true;
    addLog(state, 'Effect Script: Fire Dragon2-Enraged can pay 2000 Chi to negate targeting effects.');
  } else if (name === 'pyrotor') {
    // Continuous: all FIRE Catalysts on this player's field immune to Catalyst effects
    state.players[playerIdx]._pyrotorActive = true;
    addLog(state, 'Effect Script: Pyrotor makes all FIRE Catalysts immune to Catalyst effects while on the field.');
  } else if (name === 'barrett - trance') {
    // Palm Trick immunity
    slot._immunePalm = true;
    addLog(state, 'Effect Script: Barrett - Trance is immune to Palm Tricks that target.');
  } else if (name === 'vash - fighter of peace') {
    // +300 PR/CP per Vash in Void (continuous)
    const vashCount = state.players[playerIdx].void.filter(id => { const c = getCard(id); return c && cardNameHas(c, 'vash'); }).length;
    const boost = vashCount * 300;
    slot.atkMod = Number(slot.atkMod || 0) + boost;
    slot.cpMod = Number(slot.cpMod || 0) + boost;
    slot._vashVoidBoost = vashCount;
    addLog(state, `Effect Script: Vash - Fighter Of Peace gains +${boost} PR/CP (${vashCount} Vash in Void).`);
  } else if (name === 'team 7 - next generation' || name === 'straw hat pirates - all together' || name === 'captain america') {
    slot._attackAllOnceEach = true;
    slot._attackedDefenders = {};
  } else if (name === 'captain s resolve fusion' || name === 'hogyoku ascension fusion' || name === 'momo & okarun fusion' || name === 'gabimaru & sagiri fusion') {
    slot._negateConcealedAvailable = true;
  } else if (name === 'giver overlord fusion') {
    slot._negateCatalystAbilityAvailable = true;
  } else if (name === 'rin & sae - itoshi brothers') {
    slot._surviveBattleOnce = true;
    slot._surviveEffectOnce = true;
  } else if (name === 'jurain sisters') {
    slot._halfDirectDamage = true;
  } else if (name === 'kazuma-final form') {
    slot._immuneConcealed = true;
    slot._cannotChangeControl = true;
  } else if (name === 'ryuhou of zetsuei') {
    slot._immunePalm = true;
    slot._cannotChangeControl = true;
  } else if (name === 'boruto - karma awakened') {
    slot._karmaCounters = Number(slot._karmaCounters || 0) + 1;
  } else if (name === 'emperor pilaf s great robot') {
    const opp = state.players[1 - playerIdx];
    let destroyed = 0;
    for (let z = 0; z < 5; z++) {
      const target = opp.catalysts[z];
      const tc = target ? getCard(target.cardId) : null;
      if (target && Number(tc?.level || 0) <= 4 && /saiyan/i.test((tc?.kinds || []).join(' '))) {
        runOnSelfDestroyed(state, 1 - playerIdx, target.cardId, { reason:"Emperor Pilaf's Great Robot" });
        opp.void.push(target.cardId);
        opp.catalysts[z] = null;
        destroyed += 1;
      }
    }
    slot._pilafRobotSummonLock = true;
    if (destroyed) addLog(state, `Effect Script: Emperor Pilaf's Great Robot destroyed ${destroyed} Level 4 or lower Saiyan Catalyst(s) on summon.`);
  } else if (name === 'the valentine brothers') {
    let destroyed = 0;
    for (let px = 0; px < 2; px++) {
      for (let z = 0; z < 5; z++) {
        const target = state.players[px].catalysts[z];
        const tc = target ? getCard(target.cardId) : null;
        if (target && (cardNameHas(tc, 'the hellsing army') || cardNameHas(tc, 'furgusson') || cardNameHas(tc, 'fergusson'))) {
          runOnSelfDestroyed(state, px, target.cardId, { reason:"The Valentine Brothers" });
          state.players[px].void.push(target.cardId);
          state.players[px].catalysts[z] = null;
          destroyed += 1;
        }
      }
    }
    slot._valentineLock = true;
    if (destroyed) addLog(state, `Effect Script: The Valentine Brothers destroyed ${destroyed} Hellsing Army / Furgusson target(s) on summon.`);
  }
  // Registry-driven on-summon effects
  runRegisteredOnSummon(state, playerIdx, zoneIdx);
}

function runPalmScript(state, playerIdx, card, manual) {
  const p = state.players[playerIdx];
  const name = canonicalScriptName(card && card.name || '');
  if (!card) return { ok:true };

  const equipToFirstMatching = (predicate, mods, flags, label) => {
    const zoneIdx = findFirstCatalystZoneByPredicate(state, playerIdx, predicate);
    if (zoneIdx < 0) { addLog(state, `Effect Script: ${label || card.name} had no valid equip target.`); return false; }
    const slot = p.catalysts[zoneIdx];
    if (mods?.atk) { slot.atkMod = Number(slot.atkMod || 0) + Number(mods.atk || 0); slot.tempAtkMod = Number(slot.tempAtkMod || 0) + Number(mods.atk || 0); }
    if (mods?.cp) slot.cpMod = Number(slot.cpMod || 0) + Number(mods.cp || 0);
    slot._equipCount = Number(slot._equipCount || 0) + 1;
    Object.assign(slot, flags || {});
    addLog(state, `Effect Script: ${card.name} equipped to ${getCard(slot.cardId)?.name || 'a Catalyst'}.`);
    return true;
  };


  const genericPalmControl = inferCommonStringEffects(card).find(e => e.action === 'generic_takeControl');
  if (genericPalmControl && !/legat0 the great|inferno takeover/i.test(name)) {
    const result = runGenericTakeControl(state, playerIdx, card.id, genericPalmControl, manual, card.name);
    if (!result.ok) addLog(state, `Effect Script: ${card.name} had no valid Catalyst to take control of.`);
    return result;
  }

  if (name === 'ready to attack') {
    const zoneIdx = getFirstFaceUpCatalystZone(state, playerIdx);
    if (zoneIdx >= 0) {
      const slot = p.catalysts[zoneIdx];
      slot.atkMod = Number(slot.atkMod || 0) + 500;
      slot.tempAtkMod = Number(slot.tempAtkMod || 0) + 500;
      const solo = p.catalysts.filter(Boolean).length === 1;
      if (solo) slot.extraAttackThisTurn = 1;
      addLog(state, `Effect Script: Ready to Attack gave ${getCard(slot.cardId)?.name || 'a Catalyst'} +500 Pressure${solo ? ' and a bonus attack' : ''}.`);
    }
  } else if (name === 'book of virtue') {
    const searched = addCardToHandFromDeckByNameToken(state, playerIdx, ['serge','kidd','korcha']);
    if (searched) addLog(state, `Effect Script: Book of Virtue added ${searched.name} to hand.`);
  } else if (name === 'born again') {
    const result = specialSummonFromVoidByPredicate(state, playerIdx, c => ['serge','kidd','korcha'].some(t => cardHasNameToken(c, t)), 'Born Again');
    if (result.ok) addLog(state, 'Effect Script: Born Again Special Summoned a named Catalyst from the Void.');
    else addLog(state, `Effect Script: Born Again had no valid target. (${result.msg})`);
  } else if (name === 'marle') {
    const faceUpCount = p.catalysts.filter(Boolean).length;
    if (faceUpCount === 1 && p.chi >= 1000) {
      p.chi = Math.max(0, p.chi - 1000);
      const result = specialSummonFromVoidByPredicate(state, playerIdx, c => c.cardType === 'Catalyst' && Number(c.level || 0) === 4, 'Marle');
      addLog(state, result.ok ? 'Effect Script: Marle paid 1000 Chi to Special Summon a Level 4 Catalyst from the Void.' : `Effect Script: Marle paid 1000 Chi but found no valid Level 4 target. (${result.msg})`);
    }
  } else if (name === 'frozen flame') {
    const zoneIdx = getFirstFaceUpCatalystZone(state, playerIdx);
    if (zoneIdx >= 0) {
      const slot = p.catalysts[zoneIdx];
      slot.atkMod = Number(slot.atkMod || 0) + 1000;
      slot.equipFrozenFlame = true;
      addLog(state, `Effect Script: Frozen Flame equipped to ${getCard(slot.cardId)?.name || 'a Catalyst'} (+1000 Pressure).`);
    }
  } else if (name === 'eternal greed') {
    p.eternalGreed = (p.eternalGreed || 0) + 1;
    addLog(state, 'Effect Script: Eternal Greed was registered as an active draw/discard watcher.');
  } else if (name === 'psychic burst the great') {
    const opp = state.players[1 - playerIdx];
    const targetZ = opp.catalysts.findIndex(s => s !== null);
    if (targetZ >= 0) {
      opp.catalysts[targetZ].atkMod = Number(opp.catalysts[targetZ].atkMod || 0) - 700;
      opp.catalysts[targetZ].tempAtkMod = Number(opp.catalysts[targetZ].tempAtkMod || 0) - 700;
      const tc = getCard(opp.catalysts[targetZ].cardId);
      addLog(state, `Effect Script: Psychic Burst The Great reduced ${tc?.name || 'a Catalyst'} by 700 Pressure until end of turn.`);
    } else addLog(state, `Effect Script: Psychic Burst The Great had no valid target.`);
  } else if (name === 'legat0 the great') {
    if (p.chi < 2000) {
      addLog(state, `Effect Script: LeGat0 The Great — not enough Chi to pay (need 2000, have ${p.chi}).`);
    } else {
      const opp = state.players[1 - playerIdx];
      let bestZ = -1, bestPR = -1;
      for (let z = 0; z < 5; z++) if (opp.catalysts[z]) { const pr = getEffectivePressure(state, 1 - playerIdx, z); if (pr > bestPR) { bestPR = pr; bestZ = z; } }
      if (bestZ < 0) addLog(state, `Effect Script: LeGat0 The Great — no opponent Catalyst to take control of.`);
      else {
        const emptyZ = getFirstEmptyCatalystZone(state, playerIdx);
        if (emptyZ < 0) addLog(state, `Effect Script: LeGat0 The Great — no empty zone to place the stolen Catalyst.`);
        else {
          p.chi -= 2000;
          const stolen = opp.catalysts[bestZ];
          opp.catalysts[bestZ] = null;
          const stolenCard = getCard(stolen.cardId);
          p.catalysts[emptyZ] = { cardId: stolen.cardId, position: 'atk', faceDown: false, attackedThisTurn: false, atkMod: 0, cpMod: 0, extraAttackThisTurn: 0, cannotAttackThisTurn: false, _stolenByLeGat0: true, _stolenFromPlayer: 1 - playerIdx, _stolenFromZone: bestZ, _leGat0DirectDraw: true };
          p.summonedThisTurn.add(emptyZ);
          addLog(state, `Effect Script: LeGat0 The Great paid 2000 Chi and took control of ${stolenCard?.name || 'a Catalyst'} (C${bestZ+1} → C${emptyZ+1}). Returns at End Phase.`);
        }
      }
    }
  } else if (name === 'jagan eye') {
    equipToFirstMatching(c => cardNameHas(c, 'hiei'), { atk:500 }, { _jaganEye:true });
  } else if (name === 'spirit orb') {
    equipToFirstMatching(c => cardNameHas(c, 'genkai') || cardNameHas(c, 'yusuke'), { atk:800 }, { _spiritOrb:true });
  } else if (name === 'trial sword') {
    equipToFirstMatching(c => cardNameHas(c, 'kuwabara'), { atk:300 }, { _trialSword:true });
  } else if (name === 'idun box') {
    if (equipToFirstMatching(c => cardNameHas(c, 'kurama'), null, { _idunBox:true })) {
      const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => cardNameHas(c, 'yoko kurama'));
      if (found) addLog(state, `Effect Script: Idun Box added ${found.name} to hand.`);
    }
  } else if (name === 'claim your bounty') {
    p.claimYourBounty = (p.claimYourBounty || 0) + 1;
    addLog(state, 'Effect Script: Claim Your Bounty is watching for Vash cards sent from the field to the Void.');
  } else if (name === 'tail of the saiyan') {
    equipToFirstMatching(c => cardHasKind(c, 'Saiyan') && !cardNameHas(c, 'super saiyan 4'), { atk:500, cp:500 }, { _tailSaiyan:true });
  } else if (name === 'kira yamato') {
    equipToFirstMatching(c => cardHasKind(c, 'Gundam') || cardHasKind(c, 'Mobile Suit'), null, { _cannotBeAttackedFaceUpAtk:true });
  } else if (name === 'shikon jewel') {
    equipToFirstMatching(() => true, { atk:200 }, { _shikonJewel:true });
  } else if (name === 'searchman') {
    if (p.chi >= 500) { p.chi -= 500; const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => c.cardType === 'Catalyst' && Number(c.level || 0) <= 4); if (found) addLog(state, `Effect Script: SearchMan added ${found.name} to hand.`); }
  } else if (name === 'genie') {
    if (p.chi >= 750) { p.chi -= 750; const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => c.cardType === 'Palm Trick'); if (found) addLog(state, `Effect Script: Genie added ${found.name} to hand.`); }
  } else if (name === 'spirit equipment') {
    const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => c.cardType === 'Palm Trick');
    if (found) addLog(state, `Effect Script: Spirit Equipment added ${found.name} to hand.`);
  } else if (name === 'ericks') {
    const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => cardNameHas(c, 'vash'));
    if (found) addLog(state, `Effect Script: Ericks added ${found.name} to hand.`);
  } else if (name === "morgan's greed") {
    if (p.chi >= 500) { p.chi -= 500; drawCard(state, playerIdx); drawCard(state, playerIdx); addLog(state, "Effect Script: Morgan's Greed paid 500 Chi to draw 2 cards."); }
  } else if (name === 'the joker') {
    drawCard(state, playerIdx); drawCard(state, playerIdx); drawCard(state, playerIdx);
    if (p.hand.length) { const removed = p.hand.pop(); p.rfg.push(removed); addLog(state, `Effect Script: The Joker removed ${getCard(removed)?.name || 'a card'} from play from your hand.`); }
  } else if (name === 'flip the clip') {
    const discarded = p.hand.splice(0, p.hand.length);
    if (discarded.length > 0) { p.void.push(...discarded); for (let i = 0; i < discarded.length * 2; i++) drawCard(state, playerIdx); addLog(state, `Effect Script: Flip The Clip discarded ${discarded.length} and drew ${discarded.length * 2}.`); }
  } else if (name === 'minesweeper' || name === 'spell dissolver') {
    const targets = getAllDestroyableTrickTargets(state);
    destroyTrickTarget(state, targets.find(t => t.player === 1 - playerIdx) || targets[0], card.name);
  } else if (name === 'storm') {
    const targets = getAllDestroyableTrickTargets(state);
    let count = 0;
    for (const t of targets.slice()) if (destroyTrickTarget(state, t, card.name)) count++;
    addLog(state, `Effect Script: Storm destroyed ${count} Trick/Field card(s).`);
  } else if (card.id === 's-m-043-kryptonite') {
    const opp = state.players[1 - playerIdx];
    const idx = opp.deck.findIndex(id => cardNameHas(getCard(id), 'super-man'));
    if (idx >= 0) {
      const [sent] = opp.deck.splice(idx, 1);
      opp.void.push(sent);
      addLog(state, `Effect Script: The Great Krypton sent ${getCard(sent)?.name || 'a Super-Man card'} from the opponent Deck to the Void.`);
    } else addLog(state, 'Effect Script: The Great Krypton found no "Super-Man" card in the opponent Deck.');
  } else if (card.id === 'slm-011-silvercrystal') {
    let res = specialSummonFromHandByPredicate(state, playerIdx, c => c.cardType === 'Catalyst' && cardNameHas(c, 'sailor'), 'The Great Silver Crystal');
    if (!res.ok) res = specialSummonFromDeckByPredicate(state, playerIdx, c => c.cardType === 'Catalyst' && cardNameHas(c, 'sailor'), 'The Great Silver Crystal');
    addLog(state, res.ok ? 'Effect Script: The Great Silver Crystal Special Summoned a Sailor Catalyst.' : `Effect Script: The Great Silver Crystal had no valid Sailor target. (${res.msg})`);
  } else if (card.id === 'ss1-016-spelloverload') {
    const trickCount = () => p.hand.filter(id => /trick/i.test(getCard(id)?.cardType || '')).length;
    let draws = 0;
    while (trickCount() < 2 && p.deck.length > 0) { drawCard(state, playerIdx); draws++; }
    addLog(state, `Effect Script: The Great Overload drew ${draws} card(s) until you had 2 Trick cards in hand.`);
  } else if (card.id === 'tuv-026-talentcompetitionprize') {
    p.greatTalentPrizeActive = true;
    p.greatTalentPrizeTicks = Number(p.greatTalentPrizeTicks || 0);
    addLog(state, 'Effect Script: The Great Talent Prize is now active during your Ignition Phase.');
  } else if (card.id === 'hls-043-fullmoon') {
    if (p.chi < 1500) addLog(state, 'Effect Script: The Great Full Moon needs 1500 Chi.');
    else {
      p.chi -= 1500;
      const voidIdx = p.void.findIndex(id => cardMatchesCanonicalName(getCard(id), 'alucard'));
      const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
      if (voidIdx < 0 || zoneIdx < 0) addLog(state, `Effect Script: The Great Full Moon could not find Alucard in the Void or an empty Catalyst Zone.`);
      else {
        const [cardId] = p.void.splice(voidIdx, 1);
        const res = specialSummonToZone(state, playerIdx, cardId, zoneIdx, 'The Great Full Moon');
        if (res.ok) {
          const slot = p.catalysts[zoneIdx];
          slot.atkMod = Number(slot.atkMod || 0) + 1000;
          slot.tempAtkMod = Number(slot.tempAtkMod || 0) + 1000;
          slot._greatFullMoon = true;
          addLog(state, 'Effect Script: The Great Full Moon Special Summoned Alucard from the Void with +1000 Pressure.');
        } else addLog(state, `Effect Script: The Great Full Moon failed to summon Alucard. (${res.msg})`);
      }
    }
  } else if (card.id === 'kir-020-nmepriceincrease') {
    if (p.chi < 2000) addLog(state, 'Effect Script: N.M.E The Great Price Increase needs 2000 Chi.');
    else {
      p.chi -= 2000;
      const res = specialSummonFromHandByPredicate(state, playerIdx, c => c.cardType === 'Catalyst' && Number(c.pr || 0) <= 3000, 'N.M.E The Great Price Increase');
      addLog(state, res.ok ? 'Effect Script: N.M.E The Great Price Increase Special Summoned a Catalyst from the hand.' : `Effect Script: N.M.E The Great Price Increase had no valid hand target. (${res.msg})`);
    }

} else if (name === 'flying numbus') {
  equipToFirstMatching(c => cardNameHas(c, 'goku') || cardNameHas(c, 'gohan'), null, { _flyingNumbus:true, _immunePalm:true, _immuneConcealed:true, _immuneCatalystEffects:true, _forcedAlignment:'Wind' });
} else if (name === 'bulma briefs') {
  if (p.chi >= 750) {
    p.chi -= 750;
    state.players[1 - playerIdx].spellNegator = true;
    addLog(state, 'Effect Script: Bulma Briefs paid 750 Chi and will negate the next Palm Trick timing window this turn.');
  }
} else if (name === 'light of the full moon') {
  p.ritualEnabledOozaru = true;
  addLog(state, 'Effect Script: Light of the Full Moon marked Oozaru ritual support for this turn.');
} else if (name === 'freak chip') {
  const hasVamp = p.catalysts.some(s => s && (() => { const cc = getCard(s.cardId); return cardHasKind(cc, 'Zombie') || cardHasKind(cc, 'Vampire') || cardNameHas(cc, 'vampire'); })());
  if (!hasVamp) addLog(state, 'Effect Script: Freak Chip needs a Vampire/Zombie-style Catalyst on your field.');
  else {
    const res = stealFirstOpponentCatalystUntilEndTurn(state, playerIdx, 'Freak Chip', c => !cardHasKind(c, 'Zombie') && !cardHasKind(c, 'Vampire') && !cardNameHas(c, 'vampire'), { atk:300, cp:300 });
    if (res.ok) {
      const slot = state.players[playerIdx].catalysts[res.zone];
      slot._forcedAlignment = 'Dark';
      slot._forcedKinds = ['Zombie','Vampire'];
    } else addLog(state, `Effect Script: Freak Chip had no valid target. (${res.msg})`);
  }
} else if (name === 'demons devour me') {
  p.ritualEnabledNaraku = true;
  addLog(state, 'Effect Script: Demons Devour Me marked Naraku ritual support for this turn.');
} else if (name === "brainiac's control") {
  const res = stealFirstOpponentCatalystUntilEndTurn(state, playerIdx, "Brainiac's Control");
  if (!res.ok) addLog(state, `Effect Script: Brainiac's Control had no valid target. (${res.msg})`);
} else if (name === 'enigma') {
  const types = ['Palm Trick','Concealed Trick','Catalyst'];
  const guessed = types[Math.floor(Math.random() * types.length)];
  let discarded = null;
  if (p.hand.length > 0) discarded = p.hand.splice(Math.floor(Math.random() * p.hand.length), 1)[0];
  if (discarded) p.void.push(discarded);
  const discardedCard = discarded ? getCard(discarded) : null;
  const actual = discardedCard ? discardedCard.cardType : 'None';
  addLog(state, `Effect Script: Enigma randomly called ${guessed} and discarded ${discardedCard?.name || 'nothing'} (${actual}).`);
  if (discardedCard && actual !== guessed) {
    const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => canonicalScriptName(c.name || '') === 'the joker') || addCardToHandFromVoidByPredicate(state, playerIdx, c => canonicalScriptName(c.name || '') === 'the joker');
    if (found) addLog(state, `Effect Script: Enigma added ${found.name} to hand because the guess was wrong.`);
  }
} else if (name === 'spiral heart moon sceptor') {
  p.spiralHeartMoonSceptor = (p.spiralHeartMoonSceptor || 0) + 1;
  addLog(state, 'Effect Script: Spiral Heart Moon Sceptor is watching for Chi gain events.');
} else if (name === 'frank marlon') {
  const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => c.cardType === 'Palm Trick' && /equip/i.test(c.sub || ''));
  if (found) addLog(state, `Effect Script: Frank Marlon added ${found.name} to hand.`);
} else if (name === 'legendary gun') {
  equipToFirstMatching(c => cardNameHas(c, 'vash'), null, { _legendaryGun:true }, 'Legendary Gun');
} else if (name === 'fighter of peace') {
  const vashZone = findFirstCatalystZoneByPredicate(state, playerIdx, c => cardNameHas(c, 'vash'));
  if (vashZone >= 0) {
    const res = specialSummonFromHandOrDeckOrVoidByPredicate ? specialSummonFromHandOrDeckOrVoidByPredicate(state, playerIdx, c => canonicalScriptName(c.name || '') === 'vash - fighter of peace', 'Fighter Of Peace') : specialSummonFromHandOrVoidByPredicate(state, playerIdx, c => canonicalScriptName(c.name || '') === 'vash - fighter of peace', 'Fighter Of Peace');
    if (res.ok) addLog(state, 'Effect Script: Fighter Of Peace Special Summoned Vash - Fighter Of Peace.');
    else {
      const deckRes = specialSummonFromDeckByPredicate(state, playerIdx, c => canonicalScriptName(c.name || '') === 'vash - fighter of peace', 'Fighter Of Peace');
      addLog(state, deckRes.ok ? 'Effect Script: Fighter Of Peace Special Summoned Vash - Fighter Of Peace from the Deck.' : `Effect Script: Fighter Of Peace had no valid Vash - Fighter Of Peace target. (${deckRes.msg})`);
    }
  } else addLog(state, 'Effect Script: Fighter Of Peace needs a Vash Catalyst on your field.');
} else if (name === 'legato bluesummers') {
  if (p.chi >= 1000) {
    p.chi -= 1000;
    const res = stealFirstOpponentCatalystUntilEndTurn(state, playerIdx, 'Legato Bluesummers');
    if (!res.ok) addLog(state, `Effect Script: Legato Bluesummers had no valid target. (${res.msg})`);
  }
} else if (name === '60,000,000,000 bounty on your head') {
  equipToFirstMatching(c => cardNameHas(c, 'vash'), { atk:700 }, { _bountyOnHead:true }, '60,000,000,000 Bounty On Your Head');
  } else if (name === '1-up mushroom') {
    if (p.chi >= 800) { p.chi -= 800; const res = specialSummonFromVoidByPredicate(state, playerIdx, c => c.cardType === 'Catalyst', '1-Up Mushroom'); addLog(state, res.ok ? 'Effect Script: 1-Up Mushroom Special Summoned a Catalyst from the Void.' : `Effect Script: 1-Up Mushroom had no valid target. (${res.msg})`); }
  } else if (name === '2nd wind') {
    if (p.chi >= 500) { p.chi -= 500; const res = specialSummonFromVoidByPredicate(state, playerIdx, c => c.cardType === 'Catalyst' && cardHasAlignment(c, 'Light'), '2nd Wind'); addLog(state, res.ok ? 'Effect Script: 2nd Wind Special Summoned a LIGHT Catalyst from the Void.' : `Effect Script: 2nd Wind had no valid LIGHT target. (${res.msg})`); }
  } else if (name === 'keep it moving') {
    const res = summonNamedToken(state, playerIdx, '__buck_token_1000__', 3, 'Keep It Moving');
    addLog(state, `Effect Script: Keep It Moving Special Summoned ${res.summoned || 0} BuCk The Great Token(s).`);
  } else if (name === "terra's past") {
    const targetZone = Number(manual && manual.targetZone);
    if (targetZone >= 0 && p.catalysts[targetZone] && cardNameHas(getCard(p.catalysts[targetZone].cardId), 'terra')) {
      const slot = p.catalysts[targetZone];
      slot.atkMod = Number(slot.atkMod || 0) + 500;
      slot.tempAtkMod = Number(slot.tempAtkMod || 0) + 500;
      slot._equipCount = Number(slot._equipCount || 0) + 1;
      slot._terraPast = true;
      slot._canAttackDirectly = true;
      addLog(state, `Effect Script: Terra's Past equipped to ${getCard(slot.cardId)?.name || 'a Terra Catalyst'}.`);
    } else addLog(state, `Effect Script: Terra's Past had no valid chosen Terra target.`);
  } else if (name === 'lightning strike') {
    const res = summonNamedToken(state, playerIdx, '__buck_token_1500__', 3, 'Lightning Strike');
    addLog(state, `Effect Script: Lightning Strike Special Summoned ${res.summoned || 0} BuCk The Great Token(s).`);
  } else if (name === "hyottoko's burn") {
    const opp = state.players[1 - playerIdx];
    const targetZ = Number(manual && manual.targetZone);
    if (targetZ >= 0 && opp.catalysts[targetZ]) {
      const target = opp.catalysts[targetZ];
      target.atkMod = Number(target.atkMod || 0) - 600;
      target.tempAtkMod = Number(target.tempAtkMod || 0) - 600;
      target._destroyOnTurn = Math.max(Number(target._destroyOnTurn || 0), state.turn + 3);
      addLog(state, `Effect Script: Hyottoko's Burn weakened ${getCard(target.cardId)?.name || 'a Catalyst'} by 600 Pressure and marked it for destruction in 3 turns.`);
    } else addLog(state, `Effect Script: Hyottoko's Burn had no valid chosen target.`);
  } else if (name === "aoshi's commands") {
    let destroyed = 0;
    for (let px = 0; px < 2; px++) {
      const z = state.players[px].catalysts.findIndex(Boolean);
      if (z >= 0) {
        const dyingId = state.players[px].catalysts[z].cardId;
        runOnSelfDestroyed(state, px, dyingId, { reason:"Aoshi's Commands" });
        state.players[px].catalysts[z] = null;
        state.players[px].void.push(dyingId);
        destroyed += 1;
      }
    }
    addLog(state, `Effect Script: Aoshi's Commands destroyed ${destroyed} Catalyst(s).`);
  } else if (name === "kauro's cry") {
    const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => cardNameHas(c, 'himura'));
    if (found) addLog(state, `Effect Script: Kauro's Cry added ${found.name} to hand.`);
  } else if (name === 'reverse blade sword') {
    const targetZone = Number(manual && manual.targetZone);
    if (targetZone >= 0 && p.catalysts[targetZone] && cardNameHas(getCard(p.catalysts[targetZone].cardId), 'himura')) {
      const slot = p.catalysts[targetZone];
      slot.atkMod = Number(slot.atkMod || 0) + 700;
      slot.tempAtkMod = Number(slot.tempAtkMod || 0) + 700;
      slot._equipCount = Number(slot._equipCount || 0) + 1;
      slot._reverseBladeSword = true;
      slot._equipType = 'Sword';
      addLog(state, `Effect Script: Reverse Blade Sword equipped to ${getCard(slot.cardId)?.name || 'a Himura Catalyst'}.`);
    } else addLog(state, `Effect Script: Reverse Blade Sword had no valid chosen Himura target.`);
  } else if (name === 'amakakuro ryo no herimeki') {
    const himuraOnField = state.players.some(pl => pl.catalysts.some(s => s && cardNameHas(getCard(s.cardId), 'himura')));
    if (!himuraOnField) addLog(state, 'Effect Script: Amakakuro Ryo No Herimeki needs a Himura card on the field.');
    else if (p.chi < 2000) addLog(state, 'Effect Script: Amakakuro Ryo No Herimeki needs 2000 Chi.');
    else {
      p.chi -= 2000;
      const opp = state.players[1 - playerIdx];
      let destroyed = 0;
      for (let z = 0; z < 5; z++) if (opp.catalysts[z]) {
        const dyingId = opp.catalysts[z].cardId;
        runOnSelfDestroyed(state, 1 - playerIdx, dyingId, { reason:'Amakakuro Ryo No Herimeki' });
        opp.catalysts[z] = null;
        opp.void.push(dyingId);
        destroyed += 1;
      }
      p.kills += destroyed;
      addLog(state, `Effect Script: Amakakuro Ryo No Herimeki destroyed ${destroyed} opponent Catalyst(s).`);
    }
  } else if (name === 'zero degrees') {
    state.zeroDegreesTurns = Math.max(Number(state.zeroDegreesTurns || 0), 2);
    addLog(state, 'Effect Script: Zero Degrees locked Palm and Concealed Trick play/set for the rest of this turn and the next turn.');
  } else if (name === 'ultimate price') {
    if (p.chi < 2500) addLog(state, 'Effect Script: Ultimate Price needs 2500 Chi.');
    else {
      const deckIdx = Number(manual && manual.deckIdx);
      const targetCard = getCard(p.deck[deckIdx]);
      if (!(deckIdx >= 0) || !targetCard || targetCard.cardType !== 'Catalyst' || Number(targetCard.cp || 0) > 2000) addLog(state, 'Effect Script: Ultimate Price had no valid chosen Deck target.');
      else {
        p.chi -= 2500;
        const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
        if (zoneIdx >= 0) {
          const [ssId] = p.deck.splice(deckIdx, 1);
          const res = specialSummonToZone(state, playerIdx, ssId, zoneIdx, 'Ultimate Price');
          if (res.ok && typeof res.zoneIdx === 'number' && p.catalysts[res.zoneIdx]) {
            p.catalysts[res.zoneIdx].cannotAttackThisTurn = true;
            p.catalysts[res.zoneIdx]._cannotAttackUntilTurn = state.turn + 2;
            p.catalysts[res.zoneIdx]._cannotActivateEffectsUntilTurn = state.turn + 2;
            addLog(state, `Effect Script: Ultimate Price Special Summoned ${getCard(p.catalysts[res.zoneIdx].cardId)?.name || 'a Catalyst'} from the Deck. It cannot attack or use its effects for 3 turns.`);
          }
        } else addLog(state, 'Effect Script: Ultimate Price had no empty Catalyst Zone.');
      }
    }
  } else if (name === 'toolbox') {
    p.toolboxActive = (p.toolboxActive || 0) + 1;
    addLog(state, 'Effect Script: Toolbox is active. During your Ignition Phase, you may pay 1000 Chi to shuffle 1 Equip Palm Trick from your hand into your Deck.');
  } else if (name === 'curse of the flame ghost') {
    const targetZone = Number(manual && manual.targetZone);
    if (targetZone >= 0 && p.catalysts[targetZone]) {
      const slot = p.catalysts[targetZone];
      slot._equipCount = Number(slot._equipCount || 0) + 1;
      slot._forcedAlignment = 'Fire';
      slot._bonusKinds = Array.from(new Set([...(slot._bonusKinds || []), 'Vampire']));
      slot._curseFlameGhost = true;
      addLog(state, `Effect Script: Curse of the Flame Ghost equipped to ${getCard(slot.cardId)?.name || 'a Catalyst'} and changed it to FIRE / Vampire.`);
    } else addLog(state, 'Effect Script: Curse of the Flame Ghost had no valid chosen target.');
  } else if (name === 'phoenix soul') {
    const mode = String(manual && manual.mode || '');
    if (mode === 'revive') {
      if (p.chi < 1000) addLog(state, 'Effect Script: Phoenix Soul needs 1000 Chi for revive mode.');
      else {
        const voidIdx = Number(manual && manual.voidIdx);
        const targetCard = getCard(p.void[voidIdx]);
        if (!(voidIdx >= 0) || !targetCard || targetCard.cardType !== 'Catalyst' || !cardHasAlignment(targetCard, 'Fire')) addLog(state, 'Effect Script: Phoenix Soul had no valid chosen FIRE target.');
        else {
          p.chi -= 1000;
          const zoneIdx = getFirstEmptyCatalystZone(state, playerIdx);
          if (zoneIdx >= 0) {
            const [cardId] = p.void.splice(voidIdx, 1);
            const res = specialSummonToZone(state, playerIdx, cardId, zoneIdx, 'Phoenix Soul');
            addLog(state, res.ok ? 'Effect Script: Phoenix Soul Special Summoned a FIRE Catalyst from the Void.' : `Effect Script: Phoenix Soul could not revive the chosen target. (${res.msg})`);
          } else addLog(state, 'Effect Script: Phoenix Soul had no empty Catalyst Zone.');
        }
      }
    } else if (mode === 'double') {
      if (p.chi < 2000) addLog(state, 'Effect Script: Phoenix Soul needs 2000 Chi for double mode.');
      else {
        p.chi -= 2000;
        let count = 0;
        for (const slot of p.catalysts) {
          if (!slot) continue;
          const c = getCard(slot.cardId);
          if (!c || !slotHasAlignment(slot, c, 'Fire')) continue;
          slot.atkMod = Number(slot.atkMod || 0) + Number(c.pr || 0);
          slot.tempAtkMod = Number(slot.tempAtkMod || 0) + Number(c.pr || 0);
          slot._destroyAtEndTurn = true;
          count += 1;
        }
        addLog(state, `Effect Script: Phoenix Soul doubled the Pressure of ${count} FIRE Catalyst(s) until End Phase, then they will be destroyed.`);
      }
    } else addLog(state, 'Effect Script: Phoenix Soul had no chosen mode.');
  } else if (name === 'dr zoom') {
    drawCard(state, playerIdx);
    addLog(state, 'Effect Script: Dr Zoom provided a simple draw support effect for ANM testing coverage.');
  } else if (name === 'stro donari - the great') {
    applyDrawDiscardHooks(state, playerIdx, 1, 'chi gain');
    p.chi += 400;
    addLog(state, 'Effect Script: Stro Donari - The Great granted 400 Chi for ANM testing coverage.');
  } else if (name === 'rapier') {
    const targetZone = Number(manual && manual.targetZone);
    if (targetZone >= 0 && p.catalysts[targetZone]) {
      const slot = p.catalysts[targetZone];
      slot.atkMod = Number(slot.atkMod || 0) + 800;
      slot.tempAtkMod = Number(slot.tempAtkMod || 0) + 800;
      slot._equipCount = Number(slot._equipCount || 0) + 1;
      slot._rapier = true;
      slot._equipType = 'Sword';
      addLog(state, `Effect Script: Rapier equipped to ${getCard(slot.cardId)?.name || 'a Catalyst'}.`);
    } else addLog(state, 'Effect Script: Rapier had no valid chosen equip target.');
  } else if (name === 'blazeing inferno') {
    if (!isFieldTrickActive(p.fieldTrick) || !/volcano/i.test(getCard(p.fieldTrick.cardId)?.name || '')) addLog(state, 'Effect Script: Blazeing Inferno needs Volcano to be face-up on the field.');
    else {
      p.blazeingInferno = 1;
      addLog(state, 'Effect Script: Blazeing Inferno is active while Volcano remains face-up.');
    }
  } else if (name === 'inferno takeover') {
    if (p.chi < 1000) addLog(state, 'Effect Script: Inferno Takeover needs 1000 Chi.');
    else {
      p.chi -= 1000;
      const opp = state.players[1 - playerIdx];
      let stolen = 0;
      for (let z = 0; z < 5; z++) {
        const slot = opp.catalysts[z];
        const empty = getFirstEmptyCatalystZone(state, playerIdx);
        if (!slot || empty < 0) continue;
        const c = getCard(slot.cardId);
        if (!c || !slotHasAlignment(slot, c, 'Fire')) continue;
        opp.catalysts[z] = null;
        p.catalysts[empty] = { cardId: slot.cardId, position: slot.position || 'atk', faceDown:false, attackedThisTurn:false, atkMod:0, cpMod:0, extraAttackThisTurn:0, cannotAttackThisTurn:false, _temporaryControl:true, _temporaryReturnToPlayer:1 - playerIdx };
        stolen += 1;
      }
      addLog(state, `Effect Script: Inferno Takeover took control of ${stolen} FIRE Catalyst(s) until End Phase.`);
    }

  // ─── TG1 PALM / CONCEALED HANDLERS ───
  } else if (name === 'saving rem') {
    // Ritual: SS Rem Saverem by discarding Catalysts totalling exactly her level
    const remLevel = 6;
    const handCats = p.hand.map((id,i) => ({i,c:getCard(id)})).filter(x => x.c && x.c.cardType === 'Catalyst');
    const total = handCats.reduce((s,x) => s + Number(x.c.level||0), 0);
    if (total < remLevel) { addLog(state, `Effect Script: Saving Rem needs Catalysts in hand totalling at least Level ${remLevel}.`); }
    else {
      const remInHand = p.hand.findIndex(id => cardNameHas(getCard(id), 'rem saverem'));
      if (remInHand < 0) { addLog(state, 'Effect Script: Saving Rem needs Rem Saverem in hand.'); }
      else {
        // Discard lowest-level cats first to reach exactly remLevel
        let remaining = remLevel;
        const toDiscard = [];
        for (const x of handCats.filter(x => !cardNameHas(x.c, 'rem saverem')).sort((a,b) => Number(a.c.level||0)-Number(b.c.level||0))) {
          if (remaining <= 0) break;
          toDiscard.push(x.i);
          remaining -= Number(x.c.level||0);
        }
        for (const idx of toDiscard.sort((a,b)=>b-a)) { p.void.push(p.hand.splice(idx,1)[0]); }
        const remIdx = p.hand.indexOf(p.hand.find(id => cardNameHas(getCard(id), 'rem saverem')));
        const [remId] = p.hand.splice(p.hand.findIndex(id => cardNameHas(getCard(id), 'rem saverem')), 1);
        const zone = getFirstEmptyCatalystZone(state, playerIdx);
        if (zone >= 0) { specialSummonToZone(state, playerIdx, remId, zone, 'Saving Rem'); addLog(state, 'Effect Script: Saving Rem Special Summoned Rem Saverem.'); }
        else { p.hand.push(remId); addLog(state, 'Effect Script: Saving Rem — no empty Catalyst Zone for Rem Saverem.'); }
      }
    }
  } else if (name === 'corrupting the priest') {
    // Ritual: SS Wolfwood by discarding Catalysts totalling exactly his level
    const wolfLevel = 7;
    const handCats = p.hand.map((id,i) => ({i,c:getCard(id)})).filter(x => x.c && x.c.cardType === 'Catalyst');
    const wolfIdx = p.hand.findIndex(id => cardNameHas(getCard(id), 'wolfwood gung ho gun in training'));
    if (wolfIdx < 0) { addLog(state, 'Effect Script: Corrupting The Priest needs Wolfwood - Gung-Ho Gun In Training in hand.'); }
    else {
      let remaining = wolfLevel;
      const toDiscard = [];
      for (const x of handCats.filter(x => !cardNameHas(x.c,'wolfwood')).sort((a,b)=>Number(a.c.level||0)-Number(b.c.level||0))) {
        if (remaining <= 0) break;
        toDiscard.push(x.i);
        remaining -= Number(x.c.level||0);
      }
      if (remaining > 0) { addLog(state, `Effect Script: Corrupting The Priest needs more Catalysts in hand to total Level ${wolfLevel}.`); }
      else {
        for (const idx of toDiscard.sort((a,b)=>b-a)) { p.void.push(p.hand.splice(idx,1)[0]); }
        const [wolfId] = p.hand.splice(p.hand.findIndex(id => cardNameHas(getCard(id), 'wolfwood gung ho gun in training')), 1);
        const zone = getFirstEmptyCatalystZone(state, playerIdx);
        if (zone >= 0) { specialSummonToZone(state, playerIdx, wolfId, zone, 'Corrupting The Priest'); addLog(state, 'Effect Script: Corrupting The Priest Special Summoned Wolfwood - Gung-Ho Gun In Training.'); }
        else { p.hand.push(wolfId); addLog(state, 'Effect Script: Corrupting The Priest — no empty Catalyst Zone.'); }
      }
    }
  } else if (name === 'elizabeth') {
    const opp = state.players[1-playerIdx];
    const vashCards = opp.hand.filter(id => cardNameHas(getCard(id), 'vash'));
    if (!vashCards.length) { addLog(state, 'Effect Script: Elizabeth — opponent has no Vash cards in hand.'); }
    else {
      opp.hand = opp.hand.filter(id => !cardNameHas(getCard(id), 'vash'));
      for (const id of vashCards) opp.deck.push(id);
      shuffleArray(opp.deck);
      addLog(state, `Effect Script: Elizabeth returned ${vashCards.length} Vash card(s) from the opponent's hand to their Deck.`);
    }
  } else if (name === "milly's love") {
    const found = addCardToHandFromDeckByPredicate(state, playerIdx, c => cardNameHas(c, 'nicholas d wolfwood'))
               || addCardToHandFromVoidByPredicate(state, playerIdx, c => cardNameHas(c, 'nicholas d wolfwood'));
    addLog(state, found ? `Effect Script: Milly's Love added ${found.name} to hand.` : "Effect Script: Milly's Love — Nicholas D. Wolfwood not found.");
  } else if (name === 'good deeds go rewarded') {
    const merylMillyCount = p.void.filter(id => { const c = getCard(id); return c && (cardNameHas(c,'meryl') || cardNameHas(c,'milly')); }).length;
    const gain = 1000 + (merylMillyCount * 200);
    p.chi += gain;
    addLog(state, `Effect Script: Good Deeds Go Rewarded restored ${gain} Chi (1000 base + ${merylMillyCount} Meryl/Milly in Void × 200).`);
  } else if (name === 'the nebraska family') {
    const mode = manual && manual.mode ? String(manual.mode) : '1';
    if (mode === '2') {
      if (p.chi < 1000) { addLog(state, 'Effect Script: The Nebraska Family Mode 2 needs 1000 Chi.'); }
      else { p.chi -= 1000; state.players[1-playerIdx].chi = Math.max(0, state.players[1-playerIdx].chi - 2000); addLog(state, 'Effect Script: The Nebraska Family dealt 2000 direct Chi damage (Mode 2).'); }
    } else {
      if (p.chi < 500) { addLog(state, 'Effect Script: The Nebraska Family Mode 1 needs 500 Chi.'); }
      else { p.chi -= 500; state.players[1-playerIdx].chi = Math.max(0, state.players[1-playerIdx].chi - 1000); addLog(state, 'Effect Script: The Nebraska Family dealt 1000 direct Chi damage (Mode 1).'); }
    }
  } else if (name === 'dead-man walking') {
    const ghgIdx = p.void.findIndex(id => { const c = getCard(id); return c && (cardNameHas(c,'gung-ho gun') || cardNameHas(c,'legato')); });
    if (ghgIdx < 0) { addLog(state, 'Effect Script: Dead-Man Walking — no Gung-Ho Gun or Legato in your Void.'); }
    else {
      const zone = getFirstEmptyCatalystZone(state, playerIdx);
      if (zone < 0) { addLog(state, 'Effect Script: Dead-Man Walking — no empty Catalyst Zone.'); }
      else {
        const [id] = p.void.splice(ghgIdx, 1);
        const res = specialSummonToZone(state, playerIdx, id, zone, 'Dead-Man Walking');
        if (res.ok && p.catalysts[zone]) p.catalysts[zone].cannotAttackThisTurn = true;
        addLog(state, res.ok ? `Effect Script: Dead-Man Walking Special Summoned ${getCard(id)?.name||'a Catalyst'} from Void. It cannot attack this turn.` : `Effect Script: Dead-Man Walking failed. (${res.msg})`);
      }
    }
  } else if (name === "vash's revenge") {
    const opp = state.players[1-playerIdx];
    const targetZ = opp.catalysts.findIndex(s => s && (cardNameHas(getCard(s.cardId),'knives') || /gung.ho gun/i.test(getCard(s.cardId)?.name||'')));
    if (targetZ < 0) { addLog(state, "Effect Script: Vash's Revenge — no Knives or Gung-Ho Gun Catalyst on opponent's field."); }
    else {
      const id = opp.catalysts[targetZ].cardId;
      runOnSelfDestroyed(state, 1-playerIdx, id, { reason:"Vash's Revenge" });
      opp.catalysts[targetZ] = null;
      opp.void.push(id);
      addLog(state, `Effect Script: Vash's Revenge destroyed ${getCard(id)?.name||'a Catalyst'}.`);
    }
  } else if (name === 'evil returns') {
    if (p.chi < 800) { addLog(state, 'Effect Script: Evil Returns needs 800 Chi.'); }
    else {
      const darkVoidIdx = p.void.findIndex(id => { const c = getCard(id); return c && c.cardType === 'Catalyst' && cardHasAlignment(c, 'Dark'); });
      if (darkVoidIdx < 0) { addLog(state, 'Effect Script: Evil Returns — no DARK Catalyst in your Void.'); }
      else {
        p.chi -= 800;
        const zone = getFirstEmptyCatalystZone(state, playerIdx);
        if (zone < 0) { addLog(state, 'Effect Script: Evil Returns — no empty Catalyst Zone.'); }
        else {
          const [id] = p.void.splice(darkVoidIdx, 1);
          const res = specialSummonToZone(state, playerIdx, id, zone, 'Evil Returns');
          if (res.ok && p.catalysts[zone]) {
            p.catalysts[zone]._equipCount = (p.catalysts[zone]._equipCount||0) + 1;
            p.catalysts[zone]._evilReturnsEquipped = true;
          }
          addLog(state, res.ok ? `Effect Script: Evil Returns Special Summoned ${getCard(id)?.name||'a DARK Catalyst'} and equipped it.` : `Effect Script: Evil Returns failed. (${res.msg})`);
        }
      }
    }
  }
  return { ok:true };
}

function applyDrawDiscardHooks(state, playerIdx, count, reason) {
  const p = state.players[playerIdx];
  if (p.eternalGreed) {
    const gain = 500 * Number(count || 0) * Number(p.eternalGreed || 0);
    if (gain > 0) {
      p.chi += gain;
      addLog(state, `Effect Script: Eternal Greed restored ${gain} Chi for P${playerIdx+1} from ${reason || 'a card movement'}.`);
    }
  }
  if (p.spiralHeartMoonSceptor && /chi/i.test(String(reason || ''))) {
    for (let i = 0; i < Number(p.spiralHeartMoonSceptor || 0); i++) drawCard(state, playerIdx);
    addLog(state, `Effect Script: Spiral Heart Moon Sceptor drew ${Number(p.spiralHeartMoonSceptor || 0)} card(s) after Chi gain.`);
  }
}

function runCombatPreHooks(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone) {
  const atkSlot = state.players[attackerPlayer].catalysts[attackerZone];
  const defSlot = defenderZone >= 0 ? state.players[defenderPlayer].catalysts[defenderZone] : null;
  const atkCard = atkSlot ? getCard(atkSlot.cardId) : null;
  const defCard = defSlot ? getCard(defSlot.cardId) : null;
  if (atkCard && /reese buck/i.test(atkCard.name || '')) {
    const opp = state.players[defenderPlayer];
    const trickTargets = getAllDestroyableTrickTargets(state).filter(t => t.player === defenderPlayer).slice(0,2);
    if (trickTargets.length >= 2) {
      trickTargets.forEach(t => destroyTrickTarget(state, t, 'Reese Buck'));
      addLog(state, 'Effect Script: Reese Buck forced the opponent to destroy 2 Trick cards.');
    } else {
      let discarded = 0;
      while (discarded < 2 && opp.hand.length > 0) {
        const idx = Math.floor(Math.random() * opp.hand.length);
        opp.void.push(opp.hand.splice(idx,1)[0]);
        discarded++;
      }
      addLog(state, `Effect Script: Reese Buck forced the opponent to discard ${discarded} card(s).`);
    }
  }
  if (defCard && /blue dragon/i.test(defCard.name || '') && atkCard && getEffectivePressure(state, attackerPlayer, attackerZone) >= 2000) {
    atkSlot.atkMod = Number(atkSlot.atkMod || 0) - 600;
    addLog(state, `Effect Script: Blue Dragon weakened ${atkCard.name} by 600 Pressure before battle.`);
  }
}

function runCombatPostHooks(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone, result, atkCard, defCard) {
  if (!result) return;
  if (atkCard && /cybot/i.test(atkCard.name || '') && result.type === 'kill' && defCard) {
    const burn = Number(defCard.level || 0);
    state.players[defenderPlayer].chi = Math.max(0, state.players[defenderPlayer].chi - burn);
    addLog(state, `Effect Script: Cybot dealt ${burn} bonus Chi damage based on ${defCard.name}'s Level.`);
  }
  if (defCard && /serge/i.test(defCard.name || '') && (result.type === 'killed' || result.type === 'mutual')) {
    const opp = state.players[attackerPlayer];
    const targetIdx = opp.catalysts.findIndex((s, i) => s && i !== attackerZone);
    if (targetIdx >= 0) {
      opp.catalysts[targetIdx].cannotAttackThisTurn = true;
      addLog(state, `Effect Script: Serge stopped ${getCard(opp.catalysts[targetIdx].cardId)?.name || 'a Catalyst'} from attacking this turn.`);
    }
  }
  if (atkCard && /milly thompson/i.test(atkCard.name || '') && state.players[attackerPlayer].catalysts[attackerZone]) {
    const roll = 1 + Math.floor(Math.random() * 6);
    const liveSlot = state.players[attackerPlayer].catalysts[attackerZone];
    if (roll === 1 || roll === 3) {
      state.players[attackerPlayer].hand.push(liveSlot.cardId);
      state.players[attackerPlayer].catalysts[attackerZone] = null;
      addLog(state, `Effect Script: Milly Thompson rolled ${roll} and returned to hand.`);
    } else if (roll === 2 || roll === 4) {
      liveSlot.position = 'def';
      addLog(state, `Effect Script: Milly Thompson rolled ${roll} and switched to DEF position.`);
    } else if (roll === 5) {
      liveSlot.extraAttackThisTurn = Number(liveSlot.extraAttackThisTurn || 0) + 1;
      liveSlot._destroyAtEndTurn = true;
      addLog(state, 'Effect Script: Milly Thompson rolled 5, may attack again, and will be destroyed at End Phase.');
    } else if (roll === 6) {
      const oppIdx = defenderPlayer;
      const targetIdx = state.players[oppIdx].catalysts.findIndex(Boolean);
      if (targetIdx >= 0) {
        const target = state.players[oppIdx].catalysts[targetIdx];
        runOnSelfDestroyed(state, oppIdx, target.cardId, { reason:'Milly Thompson' });
        state.players[oppIdx].catalysts[targetIdx] = null;
        state.players[oppIdx].void.push(target.cardId);
        addLog(state, 'Effect Script: Milly Thompson rolled 6 and destroyed an opponent Catalyst.');
      }
    }
  }
  if (atkCard && state.players[attackerPlayer].catalysts[attackerZone]?._legendaryGun) {
    const opp = state.players[defenderPlayer];
    if (opp.hand.length > 0) {
      const idx = Math.floor(Math.random() * opp.hand.length);
      opp.void.push(opp.hand.splice(idx,1)[0]);
      addLog(state, 'Effect Script: Legendary Gun forced a random discard.');
    } else {
      const t = getAllDestroyableTrickTargets(state).find(x => x.player === defenderPlayer);
      if (t) destroyTrickTarget(state, t, 'Legendary Gun');
    }
  }
  // PATCH 26: Zappa — attacker gets delayed destroy + half PR burn if Zappa was in DEF
  if (defCard && /zappa/i.test(defCard.name || '') && result.type === 'kill' && state.players[defenderPlayer].catalysts[defenderZone] === null) {
    const atkSlot = state.players[attackerPlayer].catalysts[attackerZone];
    if (atkSlot) {
      atkSlot._zappaDelayedDestroy = true;
      atkSlot._zappaDestroyTurn = state.turn + 1;
      const halfPR = Math.floor(getEffectivePressure(state, attackerPlayer, attackerZone) / 2);
      atkSlot._zappaBurnAmount = halfPR;
      addLog(state, `Effect Script: Zappa cursed ${atkCard?.name || 'the attacker'} — it will be destroyed at End Phase next turn and deal ${halfPR} Chi damage.`);
    }
  }
}

// ─── PATCH 26: ACTIVATED CATALYST EFFECTS ───
// Called by the UI layer when a player activates a Catalyst's special ability.
function activateCatalystEffect(state, playerIdx, zoneIdx, effectTag, manual) {
  const p = state.players[playerIdx];
  const slot = p.catalysts[zoneIdx];
  if (!slot) return { ok:false, msg:'No Catalyst in that zone.' };
  const card = getCard(slot.cardId);
  if (!card) return { ok:false, msg:'Unknown card.' };
  const name = canonicalScriptName(card.name || '');
  const opp = state.players[1 - playerIdx];
  const negatorZone = opp.catalysts.findIndex(s => s && s._negateCatalystAbilityAvailable);
  if (negatorZone >= 0) {
    const negatorCard = getCard(opp.catalysts[negatorZone].cardId);
    opp.catalysts[negatorZone]._negateCatalystAbilityAvailable = false;
    addLog(state, `Effect Script: ${negatorCard?.name || 'Giver Overlord Fusion'} negated ${card.name}'s activated effect.`);
    return { ok:true, prevented:true, msg:`${negatorCard?.name || 'A Fusion Catalyst'} negated that ability.` };
  }

  // Brad: self-tribute → SS Vash from Void
  if (effectTag === 'custom_brad' || name === 'brad') {
    const voidIdx = p.void.findIndex(id => cardNameHas(getCard(id), 'vash'));
    if (voidIdx < 0) return { ok:false, msg:'No Vash in the Void.' };
    // Tribute Brad
    p.void.push(slot.cardId);
    p.catalysts[zoneIdx] = null;
    // SS Vash to the zone Brad was in
    const [vashId] = p.void.splice(voidIdx, 1);
    const res = specialSummonToZone(state, playerIdx, vashId, zoneIdx, 'Brad');
    addLog(state, res.ok ? `Effect Script: Brad tributed himself to Special Summon ${getCard(vashId)?.name} from the Void.` : `Effect Script: Brad tribute failed. (${res.msg})`);
    return res;
  }

  // Captain Hook: discard 1 → draw 1 OR peek opponent hand
  if (effectTag === 'custom_captainhook' || name === 'captain hook') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'hookDiscard')) return { ok:false, msg:'Captain Hook already used this turn.' };
    if (p.hand.length < 1) return { ok:false, msg:'Need at least 1 card in hand to discard.' };
    const discIdx = manual?.handIdx ?? 0;
    const discarded = p.hand.splice(discIdx, 1)[0];
    p.void.push(discarded);
    const mode = manual?.mode || 'draw';
    if (mode === 'peek') {
      const oppHand = state.players[1 - playerIdx].hand.map(id => getCard(id)?.name || '???');
      addLog(state, `Effect Script: Captain Hook discarded ${getCard(discarded)?.name} and peeked at opponent hand: [${oppHand.join(', ')}].`);
    } else {
      drawCard(state, playerIdx);
      addLog(state, `Effect Script: Captain Hook discarded ${getCard(discarded)?.name} and drew 1 card.`);
    }
    markEffectUsed(state, playerIdx, slot.cardId, 'hookDiscard');
    return { ok:true };
  }

  // Magnet Man: pay 1000 Chi → draw 2 (once per summon)
  if (effectTag === 'custom_magnetman' || name === 'magnet man') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'magnetDraw')) return { ok:false, msg:'Magnet Man already used this ability.' };
    if (p.chi < 1000) return { ok:false, msg:'Need 1000 Chi.' };
    p.chi -= 1000;
    drawCard(state, playerIdx);
    drawCard(state, playerIdx);
    markEffectUsed(state, playerIdx, slot.cardId, 'magnetDraw');
    addLog(state, 'Effect Script: Magnet Man paid 1000 Chi and drew 2 cards.');
    return { ok:true };
  }

  // Broly - Legendary Super Saiyan: once per duel mass destroy
  if (effectTag === 'custom_broly' || /broly/i.test(name)) {
    if (state._brolyUsed) return { ok:false, msg:'Broly can only use this ability once per duel.' };
    if (p.chi < 2000) return { ok:false, msg:'Need 2000 Chi.' };
    p.chi -= 2000;
    const opp = state.players[1 - playerIdx];
    let destroyed = 0;
    // Destroy all opponent cards (Catalysts + Tricks)
    for (let z = 0; z < 5; z++) {
      if (opp.catalysts[z]) { runOnSelfDestroyed(state, 1 - playerIdx, opp.catalysts[z].cardId, { reason:'Broly' }); opp.void.push(opp.catalysts[z].cardId); opp.catalysts[z] = null; destroyed++; p.kills++; }
      if (opp.tricks[z]) { opp.void.push(opp.tricks[z].cardId); opp.tricks[z] = null; destroyed++; }
    }
    if (opp.fieldTrick) { opp.void.push(opp.fieldTrick.cardId); opp.fieldTrick = null; destroyed++; }
    const burn = destroyed * 300;
    opp.chi = Math.max(0, opp.chi - burn);
    state._brolyUsed = true;
    addLog(state, `Effect Script: Broly destroyed ${destroyed} opponent card(s) and dealt ${burn} Chi damage.`);
    return { ok:true };
  }

  // Naraku - The Wicked: pay 1000 Chi → mass send to Void + 300 damage per card
  if (effectTag === 'custom_naraku' || /naraku/i.test(name)) {
    if (p.chi < 1000) return { ok:false, msg:'Need 1000 Chi.' };
    p.chi -= 1000;
    let count = 0;
    // Send all cards in both hands and both fields to Void
    for (let pi = 0; pi < 2; pi++) {
      const pl = state.players[pi];
      while (pl.hand.length > 0) { pl.void.push(pl.hand.pop()); count++; }
      for (let z = 0; z < 5; z++) {
        if (pl.catalysts[z] && !(pi === playerIdx && z === zoneIdx)) {
          runOnSelfDestroyed(state, pi, pl.catalysts[z].cardId, { reason:'Naraku' });
          pl.void.push(pl.catalysts[z].cardId); pl.catalysts[z] = null; count++;
          if (pi !== playerIdx) p.kills++;
        }
        if (pl.tricks[z]) { pl.void.push(pl.tricks[z].cardId); pl.tricks[z] = null; count++; }
      }
    }
    const burn = count * 300;
    state.players[1 - playerIdx].chi = Math.max(0, state.players[1 - playerIdx].chi - burn);
    addLog(state, `Effect Script: Naraku sent ${count} card(s) to the Void and dealt ${burn} Chi damage.`);
    return { ok:true };
  }

  // Buster Gundam: flip 3 coins, 2+ heads → destroy 1 card on field
  if (effectTag === 'custom_bustergundam' || /buster gundam/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'busterCoinFlip')) return { ok:false, msg:'Buster Gundam already used this turn.' };
    const coins = [Math.random() < 0.5 ? 'H' : 'T', Math.random() < 0.5 ? 'H' : 'T', Math.random() < 0.5 ? 'H' : 'T'];
    const heads = coins.filter(c => c === 'H').length;
    markEffectUsed(state, playerIdx, slot.cardId, 'busterCoinFlip');
    if (heads >= 2) {
      const opp = state.players[1 - playerIdx];
      const targetZ = opp.catalysts.findIndex(Boolean);
      if (targetZ >= 0) {
        const tc = getCard(opp.catalysts[targetZ].cardId);
        runOnSelfDestroyed(state, 1 - playerIdx, opp.catalysts[targetZ].cardId, { reason:'Buster Gundam' });
        opp.void.push(opp.catalysts[targetZ].cardId); opp.catalysts[targetZ] = null; p.kills++;
        addLog(state, `Effect Script: Buster Gundam flipped ${coins.join(',')} (${heads} heads) and destroyed ${tc?.name}. +1 Kill.`);
      } else addLog(state, `Effect Script: Buster Gundam flipped ${coins.join(',')} (${heads} heads) but no target to destroy.`);
    } else {
      addLog(state, `Effect Script: Buster Gundam flipped ${coins.join(',')} (${heads} heads) — effect failed.`);
    }
    return { ok:true };
  }

  // Highwayman: flip 3 coins, 2+ tails → destroy 1 Catalyst
  if (effectTag === 'custom_highwayman' || /highwayman/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'highwaymanFlip')) return { ok:false, msg:'Highwayman already used this turn.' };
    const coins = [Math.random() < 0.5 ? 'H' : 'T', Math.random() < 0.5 ? 'H' : 'T', Math.random() < 0.5 ? 'H' : 'T'];
    const tails = coins.filter(c => c === 'T').length;
    markEffectUsed(state, playerIdx, slot.cardId, 'highwaymanFlip');
    if (tails >= 2) {
      const opp = state.players[1 - playerIdx];
      const targetZ = opp.catalysts.findIndex(Boolean);
      if (targetZ >= 0) {
        const tc = getCard(opp.catalysts[targetZ].cardId);
        runOnSelfDestroyed(state, 1 - playerIdx, opp.catalysts[targetZ].cardId, { reason:'Highwayman' });
        opp.void.push(opp.catalysts[targetZ].cardId); opp.catalysts[targetZ] = null; p.kills++;
        addLog(state, `Effect Script: Highwayman flipped ${coins.join(',')} (${tails} tails) and destroyed ${tc?.name}. +1 Kill.`);
      }
    } else {
      addLog(state, `Effect Script: Highwayman flipped ${coins.join(',')} (${tails} tails) — not enough. Effect failed.`);
    }
    return { ok:true };
  }

  // Tifa - Trance: pay 1000 Chi → double attack
  if (effectTag === 'custom_tifatrance' || name === 'tifa - trance') {
    if (p.chi < 1000) return { ok:false, msg:'Need 1000 Chi.' };
    if (isEffectUsed(state, playerIdx, slot.cardId, 'tifaDblAtk')) return { ok:false, msg:'Tifa already used double attack.' };
    p.chi -= 1000;
    slot.extraAttackThisTurn = (slot.extraAttackThisTurn || 0) + 1;
    markEffectUsed(state, playerIdx, slot.cardId, 'tifaDblAtk');
    addLog(state, 'Effect Script: Tifa - Trance paid 1000 Chi to attack twice this turn.');
    return { ok:true };
  }

  // Fire Dragon2-Enraged: pay 2000 Chi to negate targeting effect
  if (effectTag === 'custom_firedragon2' || /fire dragon2/i.test(name)) {
    if (p.chi < 2000) return { ok:false, msg:'Need 2000 Chi.' };
    p.chi -= 2000;
    addLog(state, 'Effect Script: Fire Dragon2-Enraged paid 2000 Chi to negate a targeting effect.');
    return { ok:true, negateEffect:true };
  }

  // Cabba: on PR reduction → spawn Saiyan Token instead
  if (effectTag === 'custom_cabba' || name === 'cabba') {
    const emptyZ = getFirstEmptyCatalystZone(state, playerIdx);
    if (emptyZ >= 0) {
      const tokenRes = summonNamedToken(state, playerIdx, '__saiyan_token_1000__', 1, 'Cabba');
      addLog(state, tokenRes.ok ? 'Effect Script: Cabba negated the PR reduction and spawned a Saiyan Token.' : 'Effect Script: Cabba had no empty zone for a Token.');
    }
    return { ok:true };
  }

  // Vash - The Stampede: if "Knives" is on your field, tribute it to destroy all cards except Vash - The Stampede
  if (effectTag === 'custom_vashstampede' || /vash.*the stampede/i.test(name)) {
    const knivesZone = p.catalysts.findIndex(s => s && cardNameHas(getCard(s.cardId), 'knives'));
    if (knivesZone < 0) return { ok:false, msg:'Need a Catalyst with "Knives" on your field.' };
    if (isEffectUsed(state, playerIdx, slot.cardId, 'vashStampede')) return { ok:false, msg:'Vash - The Stampede already used this effect.' };
    // Tribute Knives
    const knivesSlot = p.catalysts[knivesZone];
    runOnSelfDestroyed(state, playerIdx, knivesSlot.cardId, { reason:'Vash - The Stampede tribute' });
    p.catalysts[knivesZone] = null;
    p.void.push(knivesSlot.cardId);
    addLog(state, `Effect Script: Vash - The Stampede tributed ${getCard(knivesSlot.cardId)?.name || 'Knives'}.`);
    // Destroy ALL cards on the field except Vash - The Stampede
    let destroyed = 0;
    for (let px = 0; px < 2; px++) {
      for (let z = 0; z < 5; z++) {
        const s = state.players[px].catalysts[z];
        if (s && !(px === playerIdx && z === zoneIdx)) {
          runOnSelfDestroyed(state, px, s.cardId, { reason:'Vash - The Stampede' });
          state.players[px].catalysts[z] = null;
          state.players[px].void.push(s.cardId);
          destroyed++;
        }
      }
      // Destroy tricks too
      for (let z = 0; z < 5; z++) {
        if (state.players[px].tricks[z] && !state.players[px].tricks[z].isLibra) {
          state.players[px].void.push(state.players[px].tricks[z].cardId);
          state.players[px].tricks[z] = null;
          destroyed++;
        }
      }
      if (state.players[px].fieldTrick) {
        state.players[px].void.push(state.players[px].fieldTrick.cardId);
        state.players[px].fieldTrick = null;
        destroyed++;
      }
    }
    markEffectUsed(state, playerIdx, slot.cardId, 'vashStampede');
    addLog(state, `Effect Script: Vash - The Stampede destroyed ${destroyed} card(s) on the field.`);
    return { ok:true };
  }

  if (effectTag === 'custom_fusionDestroyFacedown' || /attack titan fusion|turbo possession fusion/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, effectTag || 'fusionDestroyFacedown')) return { ok:false, msg:'This Fusion effect was already used this turn.' };
    const targets = [];
    for (let z = 0; z < 5; z++) {
      if (opp.tricks[z] && opp.tricks[z].faceDown) targets.push({ kind:'trick', zone:z, cardId:opp.tricks[z].cardId });
      if (opp.catalysts[z] && opp.catalysts[z].faceDown) targets.push({ kind:'catalyst', zone:z, cardId:opp.catalysts[z].cardId });
    }
    const target = targets[0];
    if (!target) return { ok:false, msg:'No face-down target is available.' };
    if (target.kind === 'trick') {
      opp.void.push(target.cardId); opp.tricks[target.zone] = null;
    } else {
      runOnSelfDestroyed(state, 1 - playerIdx, target.cardId, { reason:card.name });
      opp.void.push(target.cardId); opp.catalysts[target.zone] = null; p.kills += 1;
    }
    markEffectUsed(state, playerIdx, slot.cardId, effectTag || 'fusionDestroyFacedown');
    addLog(state, `Effect Script: ${card.name} destroyed ${getCard(target.cardId)?.name || 'a face-down card'}.`);
    return { ok:true };
  }

  if (effectTag === 'custom_fusionDestroyTrick' || /bankai ichigo fusion|tensen ascendant fusion/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, effectTag || 'fusionDestroyTrick')) return { ok:false, msg:'This Fusion effect was already used this turn.' };
    const targets = getAllDestroyableTrickTargets(state).filter(t => t.player === 1 - playerIdx);
    if (!targets.length) return { ok:false, msg:'No opponent Palm/Concealed Trick is available.' };
    destroyTrickTarget(state, targets[0], card.name);
    markEffectUsed(state, playerIdx, slot.cardId, effectTag || 'fusionDestroyTrick');
    return { ok:true };
  }

  if (effectTag === 'custom_fusionDestroyTrickDraw' || /rudo & enjin fusion/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'rudoEnjinDestroyTrickDraw')) return { ok:false, msg:'This Fusion effect was already used this turn.' };
    const targets = getAllDestroyableTrickTargets(state).filter(t => t.player === 1 - playerIdx);
    if (!targets.length) return { ok:false, msg:'No opponent Palm/Concealed Trick is available.' };
    destroyTrickTarget(state, targets[0], card.name);
    drawCard(state, playerIdx);
    markEffectUsed(state, playerIdx, slot.cardId, 'rudoEnjinDestroyTrickDraw');
    addLog(state, `Effect Script: ${card.name} destroyed a Trick and drew 1 card.`);
    return { ok:true };
  }

  if (effectTag === 'custom_gear5SwitchAllDef' || /gear 5 luffy - sun god nika/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'nikaSwitchDef')) return { ok:false, msg:'This Fusion effect was already used this turn.' };
    let changed = 0;
    for (let z = 0; z < 5; z++) {
      const target = opp.catalysts[z];
      if (target && target.position !== 'def') { target.position = 'def'; changed += 1; }
    }
    markEffectUsed(state, playerIdx, slot.cardId, 'nikaSwitchDef');
    addLog(state, `Effect Script: ${card.name} changed ${changed} opponent Catalyst(s) to Defense position.`);
    return { ok:true };
  }

  if (effectTag === 'custom_bellion' || /bellion the shadow ruler/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'bellionWipe')) return { ok:false, msg:'Bellion already used this effect this turn.' };
    let destroyed = 0;
    for (let z = 0; z < 5; z++) {
      const target = opp.catalysts[z];
      if (target) {
        runOnSelfDestroyed(state, 1 - playerIdx, target.cardId, { reason:card.name });
        opp.void.push(target.cardId); opp.catalysts[z] = null; destroyed += 1; p.kills += 1;
      }
    }
    const burn = destroyed * 300;
    opp.chi = Math.max(0, opp.chi - burn);
    markEffectUsed(state, playerIdx, slot.cardId, 'bellionWipe');
    addLog(state, `Effect Script: ${card.name} destroyed ${destroyed} opponent Catalyst(s) and dealt ${burn} Chi damage.`);
    return { ok:true };
  }

  if (effectTag === 'custom_weapon' || name === 'weapon') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'weaponCoinFlip')) return { ok:false, msg:'Weapon already used this effect this turn.' };
    let heads = 0;
    for (let i = 0; i < 3; i++) if (Math.random() < 0.5) heads += 1;
    if (heads === 0) {
      while (p.hand.length > 0) p.void.push(p.hand.pop());
      for (let i = 0; i < 3 && p.deck.length; i++) p.rfg.push(p.deck.pop());
      addLog(state, 'Effect Script: Weapon flipped all tails, discarded your hand, and removed the top 3 cards of your deck from game.');
    } else {
      let destroyed = 0;
      for (let n = 0; n < heads; n++) {
        const target = opp.catalysts.findIndex(Boolean);
        if (target >= 0) {
          const dying = opp.catalysts[target];
          runOnSelfDestroyed(state, 1 - playerIdx, dying.cardId, { reason:card.name });
          opp.void.push(dying.cardId); opp.catalysts[target] = null; destroyed += 1; p.kills += 1;
        }
      }
      addLog(state, `Effect Script: Weapon flipped ${heads} head(s) and destroyed ${destroyed} opponent Catalyst(s).`);
    }
    markEffectUsed(state, playerIdx, slot.cardId, 'weaponCoinFlip');
    return { ok:true };
  }

  if (effectTag === 'custom_cable' || name === 'cable') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'cableBarrage')) return { ok:false, msg:'Cable already used this effect this turn.' };
    if (p.hand.length < 1) return { ok:false, msg:'Cable needs 1 discard.' };
    const discarded = p.hand.splice(0,1)[0];
    p.void.push(discarded);
    slot.extraAttackThisTurn = Number(slot.extraAttackThisTurn || 0) + 1;
    opp.chi = Math.max(0, opp.chi - 800);
    markEffectUsed(state, playerIdx, slot.cardId, 'cableBarrage');
    addLog(state, `Effect Script: Cable discarded ${getCard(discarded)?.name || 'a card'}, may attack twice, and dealt 800 Chi damage.`);
    return { ok:true };
  }

  if (effectTag === 'custom_gokuGreatRFG' || effectTag === 'gokuGreatRFG' || name === 'goku - the great') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'gokuGreatRFG')) return { ok:false, msg:'Goku - The Great already used this effect this turn.' };
    if (slot.attackedThisTurn || slot._doubleAttackUsed) return { ok:false, msg:'This effect can only be activated if this card has not attacked this turn.' };
    let removedName = null;
    const targetPlayer = 1 - playerIdx;
    const opp = state.players[targetPlayer];
    const catIdx = opp.catalysts.findIndex(Boolean);
    if (catIdx >= 0) {
      const target = opp.catalysts[catIdx];
      removedName = getCard(target.cardId)?.name || 'an opponent card';
      opp.catalysts[catIdx] = null;
      opp.rfg.push(target.cardId);
      runOnSelfDestroyed(state, targetPlayer, target.cardId, { reason: card.name, movedTo:'rfg' });
    } else {
      const trickTarget = getAllDestroyableTrickTargets(state).find(t => t.player === targetPlayer);
      if (!trickTarget) return { ok:false, msg:'No opponent card to remove from game.' };
      const cid = trickTarget.cardId;
      removedName = getCard(cid)?.name || 'an opponent card';
      if (trickTarget.kind === 'field') opp.fieldTrick = null; else opp.tricks[trickTarget.zone] = null;
      opp.rfg.push(cid);
    }
    slot.cannotAttackThisTurn = true;
    markEffectUsed(state, playerIdx, slot.cardId, 'gokuGreatRFG');
    addLog(state, `Effect Script: Goku - The Great removed ${removedName} from game. It cannot attack for the rest of this turn and could not have attacked earlier this turn.`);
    return { ok:true };
  }

  if (effectTag === 'custom_captainAmerica' || name === 'captain america') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'captainAmericaSweep')) return { ok:false, msg:'Captain America already used this effect this turn.' };
    slot._attackAllOnceEach = true;
    slot._captainAmericaNoDirectThisTurn = true;
    slot.atkMod = Number(slot.atkMod || 0) - 100;
    markEffectUsed(state, playerIdx, slot.cardId, 'captainAmericaSweep');
    addLog(state, 'Effect Script: Captain America may attack all opponent Catalysts once each this turn and lost 100 Pressure.');
    return { ok:true };
  }

  // ─── TG1 ACTIVATED HANDLERS ───
  if (effectTag === 'custom_dominique' || name === 'dominique the cyclops 2nd gung ho gun') {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'dominique')) return { ok:false, msg:'Dominique already used her effect this turn.' };
    const opp = state.players[1 - playerIdx];
    const targets = opp.catalysts.map((s,z) => s ? {z,s} : null).filter(Boolean);
    if (!targets.length) return { ok:false, msg:'No opponent Catalysts to target.' };
    const t = targets[Math.floor(Math.random() * targets.length)];
    t.s.cannotAttackThisTurn = true;
    t.s._posLocked = true;
    markEffectUsed(state, playerIdx, slot.cardId, 'dominique');
    addLog(state, `Effect Script: Dominique paralyzed opponent Zone C${t.z+1} — it cannot attack or change position this turn.`);
    return { ok:true };
  }

  if (effectTag === 'custom_leon' || /leonof.*puppet/i.test(name)) {
    const p = state.players[playerIdx];
    if (p.chi < 500) return { ok:false, msg:'Not enough Chi (need 500).' };
    p.chi -= 500;
    const res = specialSummonFromHandOrDeckOrVoidByPredicate(state, playerIdx, c => cardNameHas(c, 'puppet of demise'), 'Leonof');
    addLog(state, res.ok ? 'Effect Script: Leonof Special Summoned Puppet of Demise.' : `Effect Script: No Puppet of Demise available. (${res.msg})`);
    return { ok:true };
  }

  if (effectTag === 'custom_vashlegendary' || /vash.*legendary gunman/i.test(name)) {
    if (isEffectUsed(state, playerIdx, slot.cardId, 'vashLegendary')) return { ok:false, msg:'Vash already used this effect this turn.' };
    const p = state.players[playerIdx];
    const oppGungHo = state.players[1-playerIdx].catalysts.map((s,z) => s && /gung.ho gun/i.test(getCard(s.cardId)?.name||'') ? z : -1).filter(z=>z>=0);
    if (!oppGungHo.length) return { ok:false, msg:'No opponent Gung-Ho Gun Catalysts to remove from game.' };
    let removed = 0;
    for (const z of oppGungHo) {
      const id = state.players[1-playerIdx].catalysts[z].cardId;
      state.players[1-playerIdx].catalysts[z] = null;
      state.players[1-playerIdx].rfg = state.players[1-playerIdx].rfg || [];
      state.players[1-playerIdx].rfg.push(id);
      removed++;
    }
    slot.cannotAttackThisTurn = true;
    markEffectUsed(state, playerIdx, slot.cardId, 'vashLegendary');
    addLog(state, `Effect Script: Vash - The Legendary Gunman removed ${removed} Gung-Ho Gun(s) from game. Battle Phase skipped this turn.`);
    return { ok:true };
  }

  if (effectTag === 'custom_puppetofdemise' || /puppet of demise/i.test(name)) {
    const p = state.players[playerIdx];
    const inHand = p.hand.findIndex(id => cardNameHas(getCard(id), 'puppet of demise'));
    if (inHand < 0) return { ok:false, msg:'Puppet of Demise not in hand.' };
    p.hand.splice(inHand, 1);
    p.void.push(slot.cardId);
    let added = 0;
    for (let i = 0; i < 2; i++) {
      const di = p.deck.findIndex(id => cardNameHas(getCard(id), 'puppet of demise'));
      if (di >= 0) { p.hand.push(p.deck.splice(di,1)[0]); added++; }
    }
    addLog(state, `Effect Script: Puppet of Demise discarded itself to add ${added} Puppet of Demise card(s) from Deck to hand.`);
    return { ok:true };
  }

  if (effectTag === 'custom_knivesgreat' || /knives.*destroyer of mankind/i.test(name)) {
    const p = state.players[playerIdx];
    if (p.chi < 1000) return { ok:false, msg:'Not enough Chi (need 1000).' };
    p.chi -= 1000;
    const opp = state.players[1-playerIdx];
    const vashOrGHG = opp.catalysts.map((s,z) => s && (/vash/i.test(getCard(s.cardId)?.name||'') || /gung.ho gun/i.test(getCard(s.cardId)?.name||'')) ? z : -1).filter(z=>z>=0);
    let wiped = 0;
    for (const z of vashOrGHG) {
      const id = opp.catalysts[z].cardId;
      opp.catalysts[z] = null;
      opp.void.push(id);
      wiped++;
    }
    addLog(state, `Effect Script: Knives - Great Destroyer of Mankind destroyed ${wiped} Vash/Gung-Ho Gun Catalyst(s). Cost 1000 Chi.`);
    return { ok:true };
  }

  if (effectTag === 'custom_derringermeryl' || /derringer meryl/i.test(name)) {
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    const guess = Math.random() < 0.5 ? 'heads' : 'tails';
    const correct = flip === guess;
    addLog(state, `Effect Script: Derringer Meryl — flipped ${flip}, guessed ${guess} — ${correct ? 'CORRECT' : 'WRONG'}.`);
    if (correct) {
      const opp = state.players[1-playerIdx];
      const tricks = opp.tricks.map((t,z) => t ? z : -1).filter(z=>z>=0);
      if (tricks.length) {
        const z = tricks[0];
        opp.void.push(opp.tricks[z].cardId);
        opp.tricks[z] = null;
        addLog(state, 'Effect Script: Derringer Meryl destroyed an opponent Palm/Concealed Trick.');
      }
      const field = opp.fieldTrick;
      if (!tricks.length && field) {
        opp.void.push(field.cardId);
        opp.fieldTrick = null;
        addLog(state, 'Effect Script: Derringer Meryl destroyed the opponent Field Trick.');
      }
    }
    return { ok:true };
  }

  if (effectTag === 'genericTakeControl' || effectTag === 'genericOnSummonSteal') {
    return runGenericTakeControl(state, playerIdx, slot.cardId, { tag: effectTag, cost: undefined, ...(getAllCardEffects(slot.cardId).find(e => e.tag === effectTag) || {}) }, manual, card.name);
  }

  if (effectTag === 'custom_stungunmilly' || /stungun milly/i.test(name)) {
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    const guess = Math.random() < 0.5 ? 'heads' : 'tails';
    const correct = flip === guess;
    addLog(state, `Effect Script: Stungun Milly — flipped ${flip}, guessed ${guess} — ${correct ? 'CORRECT' : 'WRONG'}.`);
    if (correct) {
      const opp = state.players[1-playerIdx];
      const targets = opp.catalysts.filter(Boolean);
      if (targets.length) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.atkMod = (t.atkMod||0) - 300;
        t.cpMod  = (t.cpMod||0)  - 300;
        addLog(state, 'Effect Script: Stungun Milly reduced a random opponent Catalyst by 300 Pressure and 300 Counter Pressure.');
      }
    }
    return { ok:true };
  }
}

function getActivatableCatalystAbilities(state, playerIdx) {
  const out = [];
  const p = state.players[playerIdx];
  for (let z = 0; z < 5; z++) {
    const slot = p.catalysts[z];
    if (!slot || slot.faceDown) continue;
    const card = getCard(slot.cardId);
    if (!card) continue;
    for (const eff of getAllCardEffects(slot.cardId)) {
      if (!['activated','activeAbility','oncePerTurnActive'].includes(eff.type)) continue;
      out.push({ zoneIdx:z, cardId:slot.cardId, card, effect:eff, label:`${card.name} — ${eff.tag || 'Ability'}` });
    }
  }
  return out;
}

function runConcealedResolutionScript(state, link) {
  const card = getCard(link.cardId);
  if (!card) return;
  const name = canonicalScriptName(card.name || '');
  const pending = state.pendingAction;
  const atkPlayer = pending && pending.type === 'attack' ? pending.attackerPlayer : null;
  const atkZone = pending && pending.type === 'attack' ? pending.attackerZone : null;
  const defPlayer = pending && pending.type === 'attack' ? pending.defenderPlayer : null;
  const attacker = atkPlayer !== null ? state.players[atkPlayer].catalysts[atkZone] : null;


  const genericConcealedControl = inferCommonStringEffects(card).find(e => e.action === 'generic_takeControl');
  if (genericConcealedControl) {
    const res = runGenericTakeControl(state, link.player, link.cardId, genericConcealedControl, link.manual, card.name);
    if (!res.ok) addLog(state, `Effect Script: ${card.name} had no valid Catalyst to take control of.`);
    return;
  }

  if (name === 'dragon fortress' && attacker) {
    attacker.atkMod = Number(attacker.atkMod || 0) - 700;
    attacker.tempAtkMod = Number(attacker.tempAtkMod || 0) - 700;
    const count = state.players[atkPlayer].catalysts.filter(Boolean).length;
    const burn = count * 500;
    state.players[atkPlayer].chi = Math.max(0, state.players[atkPlayer].chi - burn);
    addLog(state, `Effect Script: Dragon Fortress reduced the attacker by 700 Pressure and dealt ${burn} Chi damage.`);
  } else if (name === 'the chosen one') {
    const p = state.players[link.player];
    if (p.chi < 1500) addLog(state, 'Effect Script: The Chosen One could not pay 1500 Chi.');
    else if (p.hand.length > 0 || p.catalysts.some(Boolean)) addLog(state, 'Effect Script: The Chosen One needs no cards in hand and no Catalysts on your field.');
    else {
      p.chi -= 1500;
      const res = specialSummonFromDeckByPredicate(state, link.player, c => c.cardType === 'Catalyst' && !/can only be special summoned|can only be summoned by/i.test(String(c.desc || '')), 'The Chosen One');
      if (res.ok) {
        if (typeof link.zoneIdx === 'number' && p.tricks[link.zoneIdx]) p.tricks[link.zoneIdx]._chosenOneLinkedCardId = p.catalysts[res.zoneIdx]?.cardId;
        addLog(state, `Effect Script: The Chosen One paid 1500 Chi and Special Summoned ${getCard(p.catalysts[res.zoneIdx]?.cardId)?.name || 'a Catalyst'} from the Deck.`);
      } else addLog(state, `Effect Script: The Chosen One had no valid target. (${res.msg})`);
    }
  } else if (name === 'ambush' && attacker) {
    runOnSelfDestroyed(state, atkPlayer, attacker.cardId, { reason:'Ambush' });
    state.players[atkPlayer].catalysts[atkZone] = null;
    state.players[atkPlayer].rfg.push(attacker.cardId);
    addLog(state, `Effect Script: Ambush destroyed and removed ${getCard(attacker.cardId)?.name || 'the attacker'} from game.`);
  } else if (name === 'area steal' && attacker) {
    pending.negated = true;
    const burn = Math.floor(getEffectivePressure(state, atkPlayer, atkZone) / 2);
    state.players[atkPlayer].chi = Math.max(0, state.players[atkPlayer].chi - burn);
    addLog(state, `Effect Script: Area Steal negated the attack and dealt ${burn} Chi damage.`);
  } else if (name === 'bang.') {
    let destroyed = 0;
    for (let p = 0; p < 2; p++) for (let z = 0; z < 5; z++) { const slot = state.players[p].catalysts[z]; if (slot) { runOnSelfDestroyed(state, p, slot.cardId, { reason:'Bang' }); state.players[p].catalysts[z] = null; state.players[p].void.push(slot.cardId); destroyed++; } }
    addLog(state, `Effect Script: Bang. destroyed all Catalysts on the field (${destroyed}).`);
  } else if (name === 'big bang' && attacker) {
    pending.negated = true;
    runOnSelfDestroyed(state, atkPlayer, attacker.cardId, { reason:'Big Bang' });
    state.players[atkPlayer].catalysts[atkZone] = null;
    state.players[atkPlayer].void.push(attacker.cardId);
    for (const slot of state.players[atkPlayer].catalysts) if (slot && slot.position === 'atk') slot.position = 'def';
    addLog(state, 'Effect Script: Big Bang negated the attack, destroyed the attacker, and turned the opponent field to DEF.');
  } else if (name === 'big shield') {
    state.players[link.player].preventBattleDamage = true;
    addLog(state, 'Effect Script: Big Shield reduced battle damage to 0 for this turn.');
  } else if (name === 'barrier') {
    for (let p = 0; p < 2; p++) for (const slot of state.players[p].catalysts) { const c = slot ? getCard(slot.cardId) : null; if (slot && Number(c?.level || 0) >= 4) slot.cannotAttackThisTurn = true; }
    addLog(state, 'Effect Script: Barrier stopped all face-up Level 4 or higher Catalysts from attacking this turn.');
  } else if (name === "dedede's hammer toss") {
    const targetPlayer = state.players[1 - link.player].catalysts.some(Boolean) ? 1 - link.player : link.player;
    const targetZone = getFirstFaceUpCatalystZone(state, targetPlayer);
    if (targetZone >= 0) { const slot = state.players[targetPlayer].catalysts[targetZone]; runOnSelfDestroyed(state, targetPlayer, slot.cardId, { reason:card.name }); state.players[targetPlayer].catalysts[targetZone] = null; state.players[targetPlayer].void.push(slot.cardId); addLog(state, `Effect Script: DeDeDe's Hammer Toss destroyed ${getCard(slot.cardId)?.name || 'a Catalyst'}.`); }
  } else if (name === "badwick's deed") {
    drawCard(state, link.player);
    addLog(state, `Effect Script: Badwick's Deed drew 1 card.`);
  } else if (name === 'blue ogre' && attacker) {
    attacker.atkMod = Number(attacker.atkMod || 0) - 500;
    attacker.tempAtkMod = Number(attacker.tempAtkMod || 0) - 500;
    addLog(state, 'Effect Script: Blue Ogre reduced the attacking Catalyst by 500 Pressure.');
  } else if (name === 'rose whip') {
    const targets = getAllDestroyableTrickTargets(state);
    destroyTrickTarget(state, targets.find(t => t.player === 1 - link.player) || targets[0], card.name);
  } else if (name === 'dragon of the darkness flame') {
    const burn = state.players[1 - link.player].catalysts.filter(Boolean).length * 500;
    state.players[1 - link.player].chi = Math.max(0, state.players[1 - link.player].chi - burn);
    addLog(state, `Effect Script: Dragon of the Darkness Flame dealt ${burn} Chi damage.`);
  } else if (name === 'spell negator') {
    if (state.players[link.player].chi >= 700) state.players[link.player].chi -= 700;
    state.players[link.player].spellNegator = true;
    if (pending && pending.type === 'palm') pending.negated = true;
    addLog(state, 'Effect Script: Spell Negator shut down Palm Tricks for the rest of the turn.');
  } else if (name === 'right back at you') {
    pending.negated = true;
    let destroyed = 0;
    for (let z = 0; z < 5; z++) { const slot = state.players[1 - link.player].catalysts[z]; if (slot && slot.position === 'atk') { runOnSelfDestroyed(state, 1 - link.player, slot.cardId, { reason:card.name }); state.players[1 - link.player].catalysts[z] = null; state.players[1 - link.player].void.push(slot.cardId); destroyed++; } }
    addLog(state, `Effect Script: Right Back At You negated the attack and destroyed ${destroyed} ATK-position Catalyst(s).`);
  } else if (name === 'kamehameha counter attack' && attacker) {
    pending.negated = true;
    const burn = getEffectivePressure(state, atkPlayer, atkZone);
    state.players[atkPlayer].chi = Math.max(0, state.players[atkPlayer].chi - burn);
    addLog(state, `Effect Script: Kamehameha Counter Attack negated the attack and dealt ${burn} Chi damage.`);
  } else if (name === 'betrayal of the sand' && attacker) {
    if (state.players[link.player].chi >= 1000) state.players[link.player].chi -= 1000;
    pending.negated = true;
    runOnSelfDestroyed(state, atkPlayer, attacker.cardId, { reason:card.name });
    state.players[atkPlayer].catalysts[atkZone] = null;
    state.players[atkPlayer].void.push(attacker.cardId);
    addLog(state, 'Effect Script: Betrayal of the Sand negated the activation and destroyed the attacking Catalyst.');
  } else if (name === 'frozenflame-blue') {
    let destroyed = 0;
    for (let p = 0; p < 2; p++) for (let z = 0; z < 5; z++) { const slot = state.players[p].catalysts[z]; const c = slot ? getCard(slot.cardId) : null; if (slot && Number(c?.pr || 0) >= 1500) { runOnSelfDestroyed(state, p, slot.cardId, { reason:card.name }); state.players[p].catalysts[z] = null; state.players[p].void.push(slot.cardId); destroyed++; } }
    addLog(state, `Effect Script: Frozenflame-blue destroyed ${destroyed} Catalyst(s) with 1500+ Pressure.`);
  } else if (name === 'bansho fan') {
    const opp = state.players[1 - link.player];
    let moved = 0, destroyed = 0;
    for (let z = 0; z < 5; z++) {
      const slot = opp.catalysts[z];
      const c = slot ? getCard(slot.cardId) : null;
      if (!slot) continue;
      opp.catalysts[z] = null;
      if (cardHasAlignment(c, 'Fire') || cardHasKind(c, 'Pyro')) { runOnSelfDestroyed(state, 1 - link.player, slot.cardId, { reason:card.name }); opp.void.push(slot.cardId); destroyed++; }
      else { opp.deck.push(slot.cardId); moved++; }
    }
    addLog(state, `Effect Script: Bansho Fan returned ${moved} Catalyst(s) to deck and destroyed ${destroyed} FIRE/Pyro Catalyst(s).`);
  } else if (name === "goku's promise") {
    const chiChiZone = findFirstCatalystZoneByPredicate(state, link.player, c => cardNameHas(c, 'chi chi'));
    if (chiChiZone >= 0) state.players[link.player].catalysts[chiChiZone].position = 'def';
    const res = specialSummonFromDeckByPredicate(state, link.player, c => c.cardType === 'Catalyst' && Number(c.level || 0) <= 4 && cardNameHas(c, 'goku'), card.name);
    addLog(state, res.ok ? "Effect Script: Goku's Promise shifted Chi-Chi to DEF and Special Summoned a small Goku from the Deck." : `Effect Script: Goku's Promise had no valid Goku target. (${res.msg})`);
  }
  // ─── PATCH 26: ADDITIONAL CONCEALED TRICK HANDLERS ───
  else if (name === "jessica's love") {
    // Continuous Concealed: all Vash Catalysts +300 PR while face-up
    const p = state.players[link.player];
    p._jessicasLoveActive = true;
    p.catalysts.forEach(s => {
      if (s && cardNameHas(getCard(s.cardId), 'vash')) {
        s.atkMod = Number(s.atkMod || 0) + 300;
        s._jessicasLoveBoost = true;
      }
    });
    addLog(state, "Effect Script: Jessica's Love is active — all Vash Catalysts gain +300 PR.");
  } else if (name === 'mai') {
    // FLIP: search for Shu or Emperor Pilaf
    const p = state.players[link.player];
    const found = addCardToHandFromDeckByPredicate(state, link.player, c => cardNameHas(c, 'shu') || cardNameHas(c, 'emperor pilaf') || cardNameHas(c, 'pilaf'));
    if (found) addLog(state, `Effect Script: Mai searched ${found.name} from the Deck.`);
    else addLog(state, 'Effect Script: Mai had no valid Shu or Pilaf in the Deck.');

  // ─── TG1 CONCEALED HANDLERS ───
  } else if (name === "milly's love") {
    const found = addCardToHandFromDeckByPredicate(state, link.player, c => cardNameHas(c, 'nicholas d wolfwood'))
               || addCardToHandFromVoidByPredicate(state, link.player, c => cardNameHas(c, 'nicholas d wolfwood'));
    addLog(state, found ? `Effect Script: Milly's Love added ${found.name} to hand.` : "Effect Script: Milly's Love — Nicholas D. Wolfwood not found in Deck or Void.");
  } else if (name === 'the nebraska family') {
    const p = state.players[link.player];
    const mode = state.pendingAction?.mode ? String(state.pendingAction.mode) : '1';
    if (mode === '2') {
      if (p.chi < 1000) addLog(state, 'Effect Script: The Nebraska Family Mode 2 needs 1000 Chi.');
      else { p.chi -= 1000; state.players[1-link.player].chi = Math.max(0, state.players[1-link.player].chi - 2000); addLog(state, 'Effect Script: The Nebraska Family dealt 2000 direct Chi damage (Mode 2).'); }
    } else {
      if (p.chi < 500) addLog(state, 'Effect Script: The Nebraska Family Mode 1 needs 500 Chi.');
      else { p.chi -= 500; state.players[1-link.player].chi = Math.max(0, state.players[1-link.player].chi - 1000); addLog(state, 'Effect Script: The Nebraska Family dealt 1000 direct Chi damage (Mode 1).'); }
    }
  }
}

// ── DRAW ──
function drawCard(state, playerIdx) {
  const p = state.players[playerIdx];
  if (Number(p._skipNextDraw || 0) > 0) {
    p._skipNextDraw = Math.max(0, Number(p._skipNextDraw || 0) - 1);
    addLog(state, `P${playerIdx+1} skipped a draw due to a lingering card effect.`);
    return null;
  }
  if (p.deck.length === 0) {
    addLog(state, `P${playerIdx+1} deck empty — skip draw (NOT a loss).`);
    return null;
  }
  const cardId = p.deck.shift();
  p.hand.push(cardId);
  addLog(state, `[DEBUG] P${playerIdx+1} deck: ${p.deck.length} remaining.`);
  applyDrawDiscardHooks(state, playerIdx, 1, 'draw');
  // Fire registered opponent-draw triggers
  runRegisteredOpponentDrawTriggers(state, playerIdx);
  return cardId;
}

// ── MATCH LOG EXPORT ──
function exportMatchLog(state) {
  if (!state || !state.log) return '';
  const header = [
    '═══════════════════════════════════════',
    'CARRY THE FLAME — Match Log Export',
    `Exported: ${new Date().toISOString()}`,
    `Turns completed: ${state.turn}`,
    `Game over: ${state.gameOver ? 'YES' : 'NO'}`,
    state.gameOver ? `Winner: P${state.winner+1}` : 'Winner: In Progress',
    `State hash: ${typeof computeStateHash === 'function' ? computeStateHash(state) : 'N/A'}`,
    '═══════════════════════════════════════',
    '',
    `P1 Chi: ${state.players[0].chi} | Kills: ${state.players[0].kills} | Captures: ${state.players[0].captures} | Extractions: ${state.players[0].extractions}`,
    `P1 Hand: ${state.players[0].hand.length} | Deck: ${state.players[0].deck.length} | Void: ${state.players[0].void.length} | Box: ${state.players[0].box.length} | RFG: ${state.players[0].rfg.length}`,
    `P2 Chi: ${state.players[1].chi} | Kills: ${state.players[1].kills} | Captures: ${state.players[1].captures} | Extractions: ${state.players[1].extractions}`,
    `P2 Hand: ${state.players[1].hand.length} | Deck: ${state.players[1].deck.length} | Void: ${state.players[1].void.length} | Box: ${state.players[1].box.length} | RFG: ${state.players[1].rfg.length}`,
    '',
    '─── FIELD SNAPSHOT ───',
  ];
  for (let p = 0; p < 2; p++) {
    const pl = state.players[p];
    const cats = pl.catalysts.map((s, i) => {
      if (!s) return `C${i+1}: empty`;
      const c = getCard(s.cardId);
      return `C${i+1}: ${c ? c.name : s.cardId} (${s.position.toUpperCase()}) PR=${getEffectivePressure(state,p,i)} CP=${getEffectiveCounterPressure(state,p,i)}${s.attackedThisTurn ? ' [ATK used]' : ''}`;
    });
    header.push(`P${p+1} Catalysts: ${cats.join(' | ')}`);
    const tricks = pl.tricks.map((s, i) => {
      if (!s) return null;
      const c = getCard(s.cardId);
      return `T${i+1}: ${s.faceDown ? '[face-down]' : (c ? c.name : s.cardId)}${s.isLibra ? ' (Libra)' : ''}`;
    }).filter(Boolean);
    if (tricks.length) header.push(`P${p+1} Tricks: ${tricks.join(' | ')}`);
    if (pl.fieldTrick) {
      const fc = getCard(pl.fieldTrick.cardId);
      header.push(`P${p+1} Field Trick: ${pl.fieldTrick.faceDown ? '[face-down]' : (fc ? fc.name : pl.fieldTrick.cardId)}`);
    }
  }
  header.push('', '─── FULL LOG ───', '');
  const lines = state.log.map((e, i) => `[${String(i+1).padStart(4,'0')}] T${e.turn} ${String(e.phase||'').padEnd(16)} ${e.msg}`);
  return header.concat(lines).join('\n');
}

// ── POST-MATCH DEBUG SUMMARY ──
function generatePostMatchSummary(state) {
  if (!state) return null;
  const summary = {
    turns: state.turn,
    gameOver: state.gameOver,
    winner: state.gameOver ? state.winner : -1,
    winMethod: 'none',
    totalActions: state.log.length,
    combatCount: state.log.filter(e => e.msg.includes('⚔')).length,
    chainCount: state.log.filter(e => e.msg.toLowerCase().includes('chain opened')).length,
    specialSummonCount: state.log.filter(e => e.msg.includes('Special Summon')).length,
    fusionCount: state.log.filter(e => e.msg.includes('Fusion Summon')).length,
    libraSummonCount: state.log.filter(e => e.msg.includes('Libra Summon')).length,
    effectScriptCount: state.log.filter(e => e.msg.includes('Effect Script')).length,
    shotgunDraws: state.log.filter(e => e.msg.includes('Shotgun Rule')).length,
    desyncEvents: state.log.filter(e => e.msg.toLowerCase().includes('desync')).length,
    players: []
  };
  if (state.gameOver) {
    const lastMsg = state.log[state.log.length - 1]?.msg || '';
    if (lastMsg.includes('Chi KO')) summary.winMethod = 'Chi KO';
    else if (lastMsg.includes('7 Kills')) summary.winMethod = '7 Kills';
    else if (lastMsg.includes('7 Extractions')) summary.winMethod = '7 Extractions';
  }
  for (let p = 0; p < 2; p++) {
    const pl = state.players[p];
    summary.players.push({
      chi: pl.chi,
      chiLost: STARTING_CHI - pl.chi,
      kills: pl.kills,
      captures: pl.captures,
      extractions: pl.extractions,
      deckRemaining: pl.deck.length,
      voidSize: pl.void.length,
      boxSize: pl.box.length,
      rfgSize: pl.rfg.length,
      handSize: pl.hand.length,
      fieldCatalysts: pl.catalysts.filter(Boolean).length,
      fieldTricks: pl.tricks.filter(Boolean).length,
    });
  }
  return summary;
}


function isFieldClearForDirectAttack(state, defenderPlayer) {
  const p = state.players[defenderPlayer];
  const hasCatalyst = p.catalysts.some(c => c !== null);
  // Libra Zone cards are treated as Tricks while in the Libra Zone and do NOT block direct attacks.
  return !hasCatalyst;
}

function getLegalAttackTargets(state, attackerPlayer, attackerZone) {
  const defPlayer = 1 - attackerPlayer;
  const def = state.players[defPlayer];
  const targets = [];
  def.catalysts.forEach((c, idx) => { if (c) targets.push(idx); });
  const atkSlot = state.players[attackerPlayer].catalysts[attackerZone];
  if ((targets.length === 0 && isFieldClearForDirectAttack(state, defPlayer)) || (atkSlot && atkSlot._canAttackDirectly)) targets.push(-1);
  return targets;
}

function setLastBattleResult(state, data) {
  state.lastBattleResult = Object.assign({ at: Date.now() }, data || {});
}

// ── PHASE SYSTEM ──
function advancePhase(state) {
  const prevPhase = PHASE_NAMES[state.phase] || 'unknown';
  state.phase++;
  if (state.phase >= PHASES.length) {
    addLog(state, `[DEBUG] Phase overflow past ${prevPhase}. Ending turn for P${state.activePlayer+1}.`);
    endTurn(state);
    return;
  }
  state.phaseName = PHASES[state.phase];
  addLog(state, `[DEBUG] Phase transition: ${prevPhase} → ${PHASE_NAMES[state.phase]}`);
  executePhaseAuto(state);
}

function executePhaseAuto(state) {
  const p = state.activePlayer;
  const pState = state.players[p];

  switch (state.phaseName) {
    case 'turnStart':
      state.lastBattleResult = null;
      addLog(state, `═══ Turn ${state.turn} — P${p+1} ═══`);
      addLog(state, `Phase 1: Turn Start`);
      // Auto-advance
      break;

    case 'draw':
      addLog(state, `Phase 2: Draw Phase`);
      const drawn = drawCard(state, p);
      if (drawn) {
        const card = getCard(drawn);
        addLog(state, `P${p+1} drew ${card ? card.name : 'a card'}.`);
      }
      break;

    case 'ignition':
      addLog(state, `Phase 3: Ignition Phase`);
      processDelayedRevives(state, p);
      runStarterIgnitionUpkeep(state, p);
      // Field trick refresh / turn-limited summon enablers reset into availability
      break;

    case 'action':
      addLog(state, `Phase 4: Action Phase — your main play window.`);
      pState.normalSummonUsed = false;
      pState.fusionEnabled = fieldTrickProvidesFusion(pState.fieldTrick);
      // Wait for player input
      return; // Don't auto-advance

    case 'battle':
      // P1 Turn 1: skip battle
      if (state.isP1FirstTurn && p === 0) {
        addLog(state, `Phase 5: Battle Phase — SKIPPED (P1 cannot attack Turn 1).`);
        advancePhase(state);
        return;
      }
      addLog(state, `Phase 5: Battle Phase — declare attacks (optional).`);
      // Hiei-type effects: battle phase start triggers
      runRegisteredBattlePhaseStart(state, p);
      return; // Wait for player input

    case 'resolution':
      addLog(state, `Phase 6: Resolution Phase`);
      checkWinConditions(state);
      break;

    case 'end':
      addLog(state, `Phase 7: End Phase`);
      // Check if player has eligible catalysts for End Phase action
      return; // Wait for player input (4 buttons)
  }
}

function finalizeTurnSwitch(state) {
  const p = state.activePlayer;
  const pState = state.players[p];

  // Return any Catalysts stolen by temporary control effects
  for (let z = 0; z < 5; z++) {
    const slot = pState.catalysts[z];
    if (!slot) continue;
    if (slot._destroyAtEndTurn) {
      const dyingId = slot.cardId;
      runOnSelfDestroyed(state, p, dyingId, { reason:'end phase' });
      pState.catalysts[z] = null;
      pState.void.push(dyingId);
      addLog(state, `Effect Script: ${getCard(dyingId)?.name || 'A Catalyst'} was destroyed at End Phase.`);
      continue;
    }
    if (slot._stolenByLeGat0 || slot._temporaryControl) {
      const returnTo = slot._stolenByLeGat0 ? slot._stolenFromPlayer : slot._temporaryReturnToPlayer;
      const returnCard = getCard(slot.cardId);
      pState.catalysts[z] = null;
      const returnZone = getFirstEmptyCatalystZone(state, returnTo);
      if (returnZone >= 0) {
        state.players[returnTo].catalysts[returnZone] = {
          cardId: slot.cardId, position: 'atk', faceDown: false,
          attackedThisTurn: false, atkMod: 0, cpMod: 0,
          extraAttackThisTurn: 0, cannotAttackThisTurn: false
        };
        addLog(state, `Effect Script: ${returnCard?.name || 'Stolen Catalyst'} returned to P${returnTo+1}'s field (C${returnZone+1}).`);
      } else {
        state.players[returnTo].void.push(slot.cardId);
        addLog(state, `Effect Script: ${returnCard?.name || 'Stolen Catalyst'} returned to P${returnTo+1}'s Void (no empty zone).`);
      }
    }
  }

  pState.summonedThisTurn = new Set();
  pState.posChanged = new Set();
  pState.specialSummonCount = 0;
  state.players.forEach(pl => { pl.preventBattleDamage = false; pl.spellNegator = false; });
  pState.hasAttackedThisTurn = false;
  pState.catalysts.forEach(c => { if (c) { c.attackedThisTurn = false; c.cannotAttackThisTurn = false; c._doubleAttackUsed = false; c._attackedDefenders = {}; c._captainAmericaNoDirectThisTurn = false; c._negateConcealedAvailable = /captain's resolve fusion|hogyoku ascension fusion|momo & okarun fusion|gabimaru & sagiri fusion/i.test(getCard(c.cardId)?.name || '') || !!c._negateConcealedAvailable; c._negateCatalystAbilityAvailable = /giver overlord fusion/i.test(getCard(c.cardId)?.name || '') || !!c._negateCatalystAbilityAvailable; if (c.tempAtkMod) { c.atkMod = Math.max(0, Number(c.atkMod||0) - Number(c.tempAtkMod||0)); c.tempAtkMod = 0; } } });

  if (state.zeroDegreesTurns && state.zeroDegreesTurns > 0) {
    state.zeroDegreesTurns = Math.max(0, Number(state.zeroDegreesTurns || 0) - 1);
    if (!state.zeroDegreesTurns) addLog(state, 'Effect Script: Zero Degrees lock ended.');
  }

  // Reset per-turn effect usage tracking for BOTH players
  resetEffectsUsed(state);
  // Clean up any effects copied by Ace The Great
  cleanupAceCopiedEffects();

  state.activePlayer = 1 - state.activePlayer;
  state.phase = 0;
  state.phaseName = 'turnStart';
  state.pendingDiscard = null;

  if (state.activePlayer === 0) {
    state.turn++;
    state.isP1FirstTurn = false;
  }

  executePhaseAuto(state);
}

function getDiscardCountForLimit(state, playerIdx) {
  const p = state.players[playerIdx];
  return Math.max(0, p.hand.length - HAND_LIMIT);
}

function discardForHandLimit(state, playerIdx, handIdx) {
  if (!state.pendingDiscard || state.pendingDiscard.playerIdx !== playerIdx) {
    return { ok: false, msg: 'No discard is pending.' };
  }
  const p = state.players[playerIdx];
  if (handIdx < 0 || handIdx >= p.hand.length) {
    return { ok: false, msg: 'Invalid hand card selected.' };
  }
  const discarded = p.hand.splice(handIdx, 1)[0];
  p.void.push(discarded);
  const card = getCard(discarded);
  state.pendingDiscard.remaining = Math.max(0, state.pendingDiscard.remaining - 1);
  addLog(state, `P${playerIdx+1} discarded ${card ? card.name : 'a card'} (hand limit).`);
  applyDrawDiscardHooks(state, playerIdx, 1, 'discard');

  if (state.pendingDiscard.remaining <= 0 || p.hand.length <= HAND_LIMIT) {
    finalizeTurnSwitch(state);
  }
  return { ok: true, discarded };
}

function endTurn(state) {
  const p = state.activePlayer;
  const discardCount = getDiscardCountForLimit(state, p);
  if (discardCount > 0) {
    state.pendingDiscard = { playerIdx: p, remaining: discardCount };
    addLog(state, `P${p+1} must discard ${discardCount} card${discardCount === 1 ? '' : 's'} to reach the hand limit.`);
    return;
  }
  finalizeTurnSwitch(state);
}

// ── SUMMONING ──
function canNormalSummon(state, playerIdx) {
  const p = state.players[playerIdx];
  if (p.normalSummonUsed) return false;
  if (state.phaseName !== 'action') return false;
  if (state.activePlayer !== playerIdx) return false;
  return true;
}

function normalSummon(state, playerIdx, handIdx, zoneIdx, position, tributeZones) {
  const p = state.players[playerIdx];
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card) return { ok: false, msg: 'Invalid card.' };
  if (p.normalSummonUsed) return { ok: false, msg: 'Already used Normal Summon this turn.' };
  if (p.catalysts[zoneIdx] !== null) return { ok: false, msg: 'Zone is occupied.' };
  if (card.cardType !== 'Catalyst') return { ok: false, msg: 'Only Catalysts can be Normal Summoned.' };

  const level = card.level || 0;
  // Summon restrictions — cards that cannot be Normal Summoned
  if (/vash.*the stampede/i.test(card.name || '')) return { ok: false, msg: 'Vash - The Stampede cannot be Normal Summoned. It must be Special Summoned by offering a "Vash" equipped with "Knives Manipulation".' };
  if (/megastarky/i.test(card.name || '') && !p.catalysts.some(s => s && cardNameHas(getCard(s.cardId), 'starky'))) return { ok: false, msg: 'MegaStarky can only be summoned by tributing Starky.' };
  const isNolan = /nolan-the-great/i.test(card.name || '');
  const requiredTributes = isNolan ? 0 : (level >= 7 ? 2 : level >= 5 ? 1 : 0);
  const occupiedZones = p.catalysts.map((c, i) => c !== null ? i : -1).filter(i => i >= 0 && i !== zoneIdx);
  if (!isNolan && occupiedZones.length < requiredTributes) {
    return { ok: false, msg: requiredTributes === 2 ? 'Need 2 Tributes for Level 7+.' : 'Need 1 Tribute for Level 5-6.' };
  }

  if (isNolan) {
    if (!Array.isArray(tributeZones) || !tributeZones.length) return { ok:false, msg:'Select Catalysts whose total Levels equal 8 or more for Nolan-The-Great.' };
    const uniqueZones = [...new Set(tributeZones)];
    if (uniqueZones.length !== tributeZones.length) return { ok:false, msg:'Tributes must be different Catalysts.' };
    let totalLevels = 0;
    for (const tz of uniqueZones) {
      if (!occupiedZones.includes(tz)) return { ok:false, msg:'Invalid Tribute selected.' };
      const tributeCard = getCard(p.catalysts[tz]?.cardId);
      if (tributeCard && /cannot be used as a? ?tribute/i.test(tributeCard.desc || '')) return { ok:false, msg:`${tributeCard.name} cannot be used as Tribute.` };
      totalLevels += Number(tributeCard?.level || 0);
    }
    if (totalLevels < 8) return { ok:false, msg:'Nolan-The-Great needs Tribute Levels totaling 8 or more.' };
    uniqueZones.sort((a,b)=>b-a).forEach(tz => {
      const sent = p.catalysts[tz];
      if (sent) {
        const tributeCard = getCard(sent.cardId);
        runOnSelfDestroyed(state, playerIdx, sent.cardId, { reason:'tribute' });
        p.void.push(sent.cardId);
        p.catalysts[tz] = null;
        addLog(state, `P${playerIdx+1} offered ${tributeCard ? tributeCard.name : 'a Catalyst'} (Lv${tributeCard?.level || 0}) for Nolan-The-Great.`);
      }
    });
  } else if (requiredTributes > 0) {
    if (!Array.isArray(tributeZones) || tributeZones.length !== requiredTributes) {
      return { ok: false, msg: `Select ${requiredTributes} Tribute${requiredTributes === 1 ? '' : 's'}.`, tributeNeeded: requiredTributes };
    }
    const uniqueZones = [...new Set(tributeZones)];
    if (uniqueZones.length !== requiredTributes) return { ok: false, msg: 'Tributes must be different Catalysts.' };
    for (const tz of uniqueZones) {
      if (!occupiedZones.includes(tz)) return { ok: false, msg: 'Invalid Tribute selected.' };
    }
    // Check if any selected tribute has card text forbidding it from being tributed.
    for (const tz of uniqueZones) {
      const catSlot = p.catalysts[tz];
      const tc = catSlot ? getCard(catSlot.cardId) : null;
      if (tc && /cannot be used as a? ?tribute/i.test(tc.desc || '')) {
        return { ok: false, msg: `${tc.name} cannot be used as Tribute.` };
      }
    }
    // Perform the tributes — send the selected Catalysts to the Void and log the action
    for (const tz of uniqueZones) {
      const tc = getCard(p.catalysts[tz].cardId);
      p.void.push(p.catalysts[tz].cardId);
      addLog(state, `P${playerIdx+1} tributed ${tc ? tc.name : 'a Catalyst'}.`);
      p.catalysts[tz] = null;
    }
  }

  p.hand.splice(handIdx, 1);
  p.catalysts[zoneIdx] = { cardId, position: position || 'atk', faceDown: false, attackedThisTurn: false, atkMod:0, cpMod:0, extraAttackThisTurn:0, cannotAttackThisTurn:false };
  p.normalSummonUsed = true;
  p.summonedThisTurn.add(zoneIdx);

  addLog(state, `P${playerIdx+1} Normal Summoned ${card.name} (Lv${card.level}, ${card.pr}/${card.cp}) in ${position === 'def' ? 'DEF' : 'ATK'} position.`);
  runOnSummonScripts(state, playerIdx, zoneIdx, 'normal');
  return { ok: true };
}

function setTrick(state, playerIdx, handIdx, zoneIdx) {
  const p = state.players[playerIdx];
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card) return { ok: false, msg: 'Invalid card.' };

  const isTrick = ['Palm Trick','Concealed Trick','Counter Trick','Field Trick'].includes(card.cardType);
  if (!isTrick) return { ok: false, msg: 'Only settable Tricks can be set face-down here.' };
  if (isZeroDegreesLockActive(state) && ['Palm Trick','Concealed Trick','Counter Trick'].includes(card.cardType)) return { ok:false, msg:'Zero Degrees is active — Palm and Concealed Tricks cannot be played or set right now.' };

  if (card.cardType === 'Field Trick') {
    // Replace existing field trick
    if (p.fieldTrick) {
      p.void.push(p.fieldTrick.cardId);
      addLog(state, `Previous Field Trick was destroyed.`);
    }
    p.hand.splice(handIdx, 1);
    p.fieldTrick = { cardId, faceDown: true, setTurn: state.turn };
    addLog(state, `P${playerIdx+1} set a Field Trick face-down in the Field Trick location.`);
    return { ok: true };
  }

  if (p.tricks[zoneIdx] !== null) return { ok: false, msg: 'Trick zone occupied.' };

  p.hand.splice(handIdx, 1);
  p.tricks[zoneIdx] = { cardId, faceDown: true, setTurn: state.turn };
  addLog(state, `P${playerIdx+1} set a card face-down.`);
  return { ok: true };
}

function changePosition(state, playerIdx, zoneIdx) {
  const p = state.players[playerIdx];
  const cat = p.catalysts[zoneIdx];
  if (!cat) return { ok: false, msg: 'No catalyst in this zone.' };
  if (p.summonedThisTurn.has(zoneIdx)) return { ok: false, msg: 'Cannot change position the same turn summoned.' };
  if (p.posChanged.has(zoneIdx)) return { ok: false, msg: 'Already changed position this turn.' };

  cat.position = cat.position === 'atk' ? 'def' : 'atk';
  p.posChanged.add(zoneIdx);
  const card = getCard(cat.cardId);
  addLog(state, `P${playerIdx+1} changed ${card ? card.name : 'Catalyst'} to ${cat.position === 'atk' ? 'ATK' : 'DEF'} position.`);
  return { ok: true };
}


function isNormalCatalystCard(card) {
  if (!card || card.cardType !== 'Catalyst') return false;
  // Great Cards that are Normal (non-effect) Catalysts ARE allowed in Libra.
  const desc = String(card.desc || '').trim();
  if (card.sub === 'Effect') return false;
  const effectWords = /(when|if|once|special summon|destroy|draw|search|pay |increase|decrease|take control|cannot|during|flip|return|banish|remove from game|inflict)/i;
  return !effectWords.test(desc);
}

function registerSpecialSummon(state, playerIdx, label) {
  const p = state.players[playerIdx];
  p.specialSummonCount += 1;
  const oppIdx = 1 - playerIdx;
  const drawn = drawCard(state, oppIdx);
  if (drawn) {
    const c = getCard(drawn);
    addLog(state, `Shotgun Rule: P${oppIdx+1} drew ${c ? c.name : 'a card'} because P${playerIdx+1} Special Summoned${label ? ' (' + label + ')' : ''}.`);
  } else {
    addLog(state, `Shotgun Rule: P${oppIdx+1} skipped draw because deck is empty.`);
  }
}

function specialSummonToZone(state, playerIdx, cardId, zoneIdx, sourceLabel) {
  const p = state.players[playerIdx];
  const card = getCard(cardId);
  const summonBlock = getSummonRestriction(state, playerIdx, card);
  if (summonBlock) return { ok:false, msg:summonBlock };
  if (p.specialSummonCount >= MAX_SPECIAL_SUMMONS) return { ok: false, msg: 'Maximum of 5 Special Summons reached this turn.' };
  if (p.catalysts[zoneIdx] !== null) return { ok: false, msg: 'Chosen Catalyst Zone is occupied.' };
  p.catalysts[zoneIdx] = { cardId, position: 'atk', faceDown: false, attackedThisTurn: false, atkMod:0, cpMod:0, extraAttackThisTurn:0, cannotAttackThisTurn:false };
  p.summonedThisTurn.add(zoneIdx);
  registerSpecialSummon(state, playerIdx, sourceLabel);
  const c = getCard(cardId);
  addLog(state, `P${playerIdx+1} Special Summoned ${c ? c.name : 'a card'} to C${zoneIdx+1}${sourceLabel ? ' via ' + sourceLabel : ''}.`);
  runOnSummonScripts(state, playerIdx, zoneIdx, 'special');
  return { ok: true, zoneIdx, cardId };
}

function placeLibraScale(state, playerIdx, handIdx, zoneIdx) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Libra scales can only be placed during your Action Phase.' };
  if (![0,4].includes(zoneIdx)) return { ok: false, msg: 'Libra scales must go in the outer Libra Zones.' };
  if (p.tricks[zoneIdx] !== null) return { ok: false, msg: 'That Libra Zone is occupied.' };
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!isNormalCatalystCard(card)) return { ok: false, msg: 'Only Normal Catalysts can be placed in Libra Zones.' };
  p.hand.splice(handIdx, 1);
  p.tricks[zoneIdx] = { cardId, faceDown: false, setTurn: state.turn, isLibra: true, scale: card.level || 0 };
  addLog(state, `P${playerIdx+1} placed ${card.name} in a Libra Zone as Scale ${card.level || 0}.`);
  return { ok: true };
}

function getLibraScales(state, playerIdx) {
  const p = state.players[playerIdx];
  const left = p.tricks[0] && p.tricks[0].isLibra ? getCard(p.tricks[0].cardId) : null;
  const right = p.tricks[4] && p.tricks[4].isLibra ? getCard(p.tricks[4].cardId) : null;
  if (!left || !right) return null;
  return { left: left.level || 0, right: right.level || 0, min: Math.min(left.level || 0, right.level || 0), max: Math.max(left.level || 0, right.level || 0) };
}

function libraSummon(state, playerIdx, handIdxs, zoneIdxs) {
  const scales = getLibraScales(state, playerIdx);
  const p = state.players[playerIdx];
  if (!scales) return { ok: false, msg: 'Both Libra Zones need valid scales first.' };
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Libra Summon can only happen in your Action Phase.' };
  if (!Array.isArray(handIdxs) || !Array.isArray(zoneIdxs) || handIdxs.length === 0 || handIdxs.length !== zoneIdxs.length) return { ok: false, msg: 'Choose 1 to 5 Catalysts and matching zones.' };
  if (handIdxs.length > 5) return { ok: false, msg: 'Libra Summon can Special Summon up to 5 Catalysts.' };
  if (p.specialSummonCount >= MAX_SPECIAL_SUMMONS) return { ok: false, msg: 'Maximum of 5 Special Summons reached this turn.' };
  const uniqueHands = [...new Set(handIdxs)];
  const uniqueZones = [...new Set(zoneIdxs)];
  if (uniqueHands.length !== handIdxs.length || uniqueZones.length !== zoneIdxs.length) return { ok: false, msg: 'Duplicate cards or zones were selected.' };
  const chosen = handIdxs.map((h, i) => ({ h, z: zoneIdxs[i], id: p.hand[h], card: getCard(p.hand[h]) }));
  for (const entry of chosen) {
    if (!entry.card || entry.card.cardType !== 'Catalyst') return { ok: false, msg: 'Libra Summon only Special Summons Catalysts.' };
    const lv = entry.card.level || 0;
    if (!(lv > scales.min && lv < scales.max)) return { ok: false, msg: `${entry.card.name} is not strictly between your Libra Scales.` };
    if (p.catalysts[entry.z] !== null) return { ok: false, msg: `Catalyst Zone C${entry.z+1} is occupied.` };
  }
  for (const entry of chosen.sort((a,b)=>b.h-a.h)) { p.hand.splice(entry.h, 1); }
  registerSpecialSummon(state, playerIdx, 'Libra Summon');
  for (const entry of chosen) {
    p.catalysts[entry.z] = { cardId: entry.id, position: 'atk', faceDown: false, attackedThisTurn: false };
    p.summonedThisTurn.add(entry.z);
    addLog(state, `Libra Summon: ${entry.card.name} entered C${entry.z+1}.`);
  }
  return { ok: true };
}


function activateSetPalmTrick(state, playerIdx, zoneIdx, manual) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Set Palm Tricks can only be activated during your Action Phase.' };
  const slot = p.tricks[zoneIdx];
  if (!slot) return { ok: false, msg: 'No set card in that Trick Zone.' };
  const card = getCard(slot.cardId);
  if (!card || card.cardType !== 'Palm Trick') return { ok: false, msg: 'That set card is not a Palm Trick.' };
  if (isZeroDegreesLockActive(state)) return { ok:false, msg:'Zero Degrees is active — Palm Tricks cannot be played right now.' };
  if (state.players[1 - playerIdx].spellNegator) return { ok:false, msg:'Spell Negator is active — Palm Tricks are negated this turn.' };
  p.tricks[zoneIdx] = null;
  p.void.push(slot.cardId);
  addLog(state, `P${playerIdx+1} flipped and activated set Palm Trick: ${card.name}.`);
  if (/fusion dance/i.test((card.name || '') + ' ' + (card.desc || ''))) {
    p.fusionEnabled = true;
    addLog(state, `Fusion is enabled for P${playerIdx+1} this Action Phase.`);
  }
  runPalmScript(state, playerIdx, card, manual);
  runRegisteredPalmTriggers(state, playerIdx);
  return { ok: true, cardId: slot.cardId };
}

function activateSetFieldTrick(state, playerIdx) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Field Tricks can only be flipped during your Action Phase.' };
  if (!p.fieldTrick) return { ok: false, msg: 'No Field Trick is set.' };
  if (!p.fieldTrick.faceDown) return { ok: false, msg: 'Field Trick is already active.' };
  p.fieldTrick.faceDown = false;
  if (/road to greatness/i.test(getCard(p.fieldTrick.cardId)?.name || '')) p.fieldTrick.counters = Number(p.fieldTrick.counters || 0);
  const card = getCard(p.fieldTrick.cardId);
  addLog(state, `P${playerIdx+1} activated Field Trick: ${card ? card.name : 'Field Trick'}.`);
  p.fusionEnabled = fieldTrickProvidesFusion(p.fieldTrick);
  return { ok: true, cardId: p.fieldTrick.cardId };
}

function executePalmTrickCore(state, playerIdx, handIdx, manual) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Palm Tricks may only be activated during your Action Phase.' };
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card || card.cardType !== 'Palm Trick') return { ok: false, msg: 'Selected card is not a Palm Trick.' };
  if (isZeroDegreesLockActive(state)) return { ok:false, msg:'Zero Degrees is active — Palm Tricks cannot be played right now.' };
  if (state.players[1 - playerIdx].spellNegator) return { ok:false, msg:'Spell Negator is active — Palm Tricks are negated this turn.' };
  const opp = state.players[1 - playerIdx];
  const colossusZone = opp.catalysts.findIndex(sl => sl && /colossus/i.test(getCard(sl.cardId)?.name || ''));
  if (colossusZone >= 0) {
    p.hand.splice(handIdx, 1);
    p.void.push(cardId);
    addLog(state, `P${playerIdx+1} activated Palm Trick: ${card.name}.`);
    addLog(state, 'Effect Script: Colossus negated that Palm Trick.');
    return { ok:true, negated:true, cardId };
  }
  const pilafZone = opp.catalysts.findIndex(sl => sl && sl._pilafRobotSummonLock);
  if (pilafZone >= 0 && /dragon ball/i.test(String(card.name || ''))) {
    return { ok:false, msg:`${getCard(opp.catalysts[pilafZone].cardId)?.name || "Emperor Pilaf's Great Robot"} prevents Dragon Ball cards from being activated.` };
  }
  p.hand.splice(handIdx, 1);
  p.void.push(cardId);
  addLog(state, `P${playerIdx+1} activated Palm Trick: ${card.name}.`);
  if (/fusion dance/i.test((card.name || '') + ' ' + (card.desc || ''))) {
    p.fusionEnabled = true;
    addLog(state, `Fusion is enabled for P${playerIdx+1} this Action Phase.`);
  }
  runPalmScript(state, playerIdx, card, manual);
  runRegisteredPalmTriggers(state, playerIdx);
  return { ok: true, cardId };
}

// Fusion helpers
const FUSION_SPECS = {
  'anm-001-kenosuke': { materials:[{label:'Himura Kenshin', exact:'Himura Kenshin'},{label:'Sanosuke', exact:'Sanosuke'}] },
  'anm-000-destinthegreatwarlord': { materials:[{label:'Newz The Great Watcher', exact:'Newz The Great Watcher'},{label:'1 Warrior-Type Catalyst Level 5 or higher', cardType:'Catalyst', kind:'Warrior', levelMin:5}] },
  'aot-016-attacktitanfusion': { materials:[{label:'Eren The Great', exact:'Eren The Great'},{label:'Armin Arlert', exact:'Armin Arlert'}] },
  'aot-017-captainsresolvefusion': { materials:[{label:'Levi The Great', exact:'Levi The Great'},{label:'Erwin The Great', exact:'Erwin The Great'}] },
  'bl1-019-bluelockteamzunited': { materials:[{label:'Yoichi Isagi', exact:'Yoichi Isagi'},{label:'Meguru Bachira', exact:'Meguru Bachira'},{label:'Rensuke Kunigami', exact:'Rensuke Kunigami'},{label:'Hyoma Chigiri', exact:'Hyoma Chigiri'}], inferred:true },
  'bl1-020-isagimetavisionawakened': { materials:[{label:'Yoichi Isagi', exact:'Yoichi Isagi'},{label:'Isagi - The Great', exact:'Isagi - The Great'}], inferred:true },
  'bl1-021-rinandsaeitoshibrothers': { materials:[{label:'Rin Itoshi', exact:'Rin Itoshi'},{label:'Sae Itoshi - The Great', exact:'Sae Itoshi - The Great'}], inferred:true },
  'blc-016-bankaiichigofusion': { materials:[{label:'Ichigo The Great', exact:'Ichigo The Great'},{label:'Rukia Kuchiki', exact:'Rukia Kuchiki'}] },
  'blc-017-hogyokuascensionfusion': { materials:[{label:'Aizen The Great', exact:'Aizen The Great'},{label:'Grimmjow', exact:'Grimmjow'}] },
  'bro-017-borutokarmaawakened': { materials:[{label:'Boruto Uzumaki', exact:'Boruto Uzumaki'},{label:'Kawaki', exact:'Kawaki'}], inferred:true },
  'bro-018-team7nextgeneration': { materials:[{label:'Boruto Uzumaki', exact:'Boruto Uzumaki'},{label:'Sarada Uchiha', exact:'Sarada Uchiha'},{label:'Mitsuki', exact:'Mitsuki'}], inferred:true },
  'cbb-005-edwardthebountyhunter': { materials:[{label:'Ein', exact:'Ein'},{label:'Edward', exact:'Edward'}] },
  'db1-023-emperorpilafsgreatrobot': { materials:[{label:'Mai', exact:'Mai'},{label:'Shu', exact:'Shu'},{label:'Emperor Pilaf', exact:'Emperor Pilaf'}] },
  'dbs-021-gogetasupersaiyanblue': { materials:[{label:'Son Goku - Super Saiyan Blue', exact:'Son Goku - Super Saiyan Blue'},{label:'Vegeta - Super Saiyan Blue', exact:'Vegeta - Super Saiyan Blue'}], inferred:true },
  'dbs-022-vegitosupersaiyanblue': { materials:[{label:'Son Goku - Super Saiyan Blue', exact:'Son Goku - Super Saiyan Blue'},{label:'Vegeta - Super Saiyan Blue', exact:'Vegeta - Super Saiyan Blue'},{label:'1 Palm Trick from hand', cardType:'Palm Trick', zones:['hand']}] },
  'dbs-023-keflalegendaryfusion': { materials:[{label:'Caulifla - Super Saiyan 2', exact:'Caulifla - Super Saiyan 2'},{label:'Kale - Legendary Super Saiyan', exact:'Kale - Legendary Super Saiyan'}], inferred:true },
  'dbs-024-vegetathegreat': { materials:[{label:'Vegeta - Super Saiyan Blue', exact:'Vegeta - Super Saiyan Blue'},{label:'Beerus - God of Destruction', exact:'Beerus - God of Destruction'}], inferred:true },
  'dbs-025-gokuthegreat': { materials:[{label:'Goku - Super Saiyan Blue', exact:'Son Goku - Super Saiyan Blue'},{label:'Beerus - God of Destruction', exact:'Beerus - God of Destruction'}], inferred:true },
  'dnd-016-momoandokarunfusion': { materials:[{label:'Momo The Great', exact:'Momo The Great'},{label:'Okarun The Great', exact:'Okarun The Great'}] },
  'dnd-017-turbopossessionfusion': { materials:[{label:'Turbo Granny The Great', exact:'Turbo Granny The Great'},{label:'Evil Eye', exact:'Evil Eye'}] },
  'gck-016-rudoandenjinfusion': { materials:[{label:'Rudo The Great', exact:'Rudo The Great'},{label:'Enjin The Great', exact:'Enjin The Great'}] },
  'gck-017-giveroverlordfusion': { materials:[{label:'Corrupt Giver', exact:'Corrupt Giver'},{label:'Zodyl', exact:'Zodyl'}] },
  'gds-018-justicegundam': { materials:[{label:'Aegis Gundam', exact:'Aegis Gundam'},{label:'Duel Gundam', exact:'Duel Gundam'}] },
  'gds-019-freedomgundam': { materials:[{label:'Strike Gundam', exact:'Strike Gundam'},{label:'Buster Gundam', exact:'Buster Gundam'}] },
  'hlp-016-gabimaruandsagirifusion': { materials:[{label:'Gabimaru The Great', exact:'Gabimaru The Great'},{label:'Sagiri The Great', exact:'Sagiri The Great'}] },
  'hlp-017-tensenascendantfusion': { materials:[{label:'Rien (Tensen)', exact:'Rien (Tensen)'},{label:'Mu Dan (Tensen)', exact:'Mu Dan (Tensen)'}] },
  'op1-018-gear5luffysungodnika': { materials:[{label:'Monkey D. Luffy', exact:'Monkey D. Luffy'},{label:'Devil Fruit Awakening', exact:'Devil Fruit Awakening', cardType:'Palm Trick', zones:['hand']}], inferred:true },
  'op1-019-strawhatpiratesalltogether': { pickN:3, pool:[{label:'Monkey D. Luffy', exact:'Monkey D. Luffy'},{label:'Roronoa Zoro', exact:'Roronoa Zoro'},{label:'Nami', exact:'Nami'},{label:'Usopp', exact:'Usopp'},{label:'Vinsmoke Sanji', exact:'Vinsmoke Sanji'},{label:'Tony Tony Chopper', exact:'Tony Tony Chopper'},{label:'Nico Robin', exact:'Nico Robin'},{label:'Franky', exact:'Franky'},{label:'Brook', exact:'Brook'},{label:'Jinbe', exact:'Jinbe'}], inferred:true },
  'rkn-039-weapon': { materials:[{label:'Fuji', exact:'Fuji', zones:['field']},{label:'Saidzuchi Roujin', exact:'Saidzuchi Roujin', zones:['field']}] },
  'sh2-007-cable': { materials:[{label:'Cyclops', exact:'Cyclops'},{label:'Jean Grey', exact:'Jean Grey'}] },
  'sh2-009-captainamerica': { freeFusion:true, materials:[], inferred:true, anomaly:true },
  'sl1-017-belliontheshadowruler': { materials:[{label:'Shadow Soldier Igris', exact:'Shadow Soldier Igris'},{label:'Shadow Beast Beru', exact:'Shadow Beast Beru'},{label:'Shadow Knight Iron', exact:'Shadow Knight Iron'},{label:'Shadow Mage Kaisel', exact:'Shadow Mage Kaisel'}], inferred:true },
  'sl1-018-rulerofshadowsjinwoo': { materials:[{label:'Sung Jinwoo', exact:'Sung Jinwoo'},{label:'Shadow Soldier Igris', exact:'Shadow Soldier Igris'},{label:'Shadow Beast Beru', exact:'Shadow Beast Beru'}], inferred:true },
  'ss1-014-colossus': { freeFusion:true, materials:[], inferred:true, anomaly:true },
  'ss1-000-cometx': { materials:[{label:'The Comet', exact:'The Comet'},{label:'X', exact:'X'}] },
  'tuv-028-ryokomasaki': { materials:[{label:'Tenchi Masaki', exact:'Tenchi Masaki'},{label:'Ryoko', exact:'Ryoko'}] },
  'tuv-029-ayekamasaki': { materials:[{label:'Tenchi Masaki', exact:'Tenchi Masaki'},{label:'Ayeka', exact:'Ayeka'}] },
  'tuv-030-jurainsisters': { materials:[{label:'Ayeka', exact:'Ayeka'},{label:'Sasami', exact:'Sasami'}] },
  'dbz-017-gotenks': { materials:[{label:'Goten', exact:'Goten'},{label:'Young Trunks', exact:'Young Trunks'}] },
  'dbz-019-vegito': { materials:[{label:'1 Catalyst with "Goku" in its name', nameIncludesAll:['goku'], cardType:'Catalyst'},{label:'1 Catalyst with "Vegeta" in its name', nameIncludesAll:['vegeta'], cardType:'Catalyst'}], inferred:true },
  'hls-009-celesthevampire': { materials:[{label:'Celes Victoria', exact:'Celes Victoria'},{label:'Celes Victoria', exact:'Celes Victoria'},{label:'Celes Victoria', exact:'Celes Victoria'}] },
  'hls-039-thevalentinebrothers': { materials:[{label:'Yan Valentine', exact:'Yan Valentine'},{label:'Big Brother Valentine', exact:'Big Brother Valentine'}] },
  'syd-015-kazumafinalform': { materials:[{label:'Kazuma of the Shell Bullet', exact:'Kazuma of the Shell Bullet'},{label:"Kazuma's Alter", exact:"Kazuma's Alter"}] },
  'syd-027-ryuhouofzetsuei': { materials:[{label:'Ryuhou-the one who commands Zetsuei', exact:'Ryuhou-the one who commands Zetsuei'},{label:'Zetsuei-Unbound', exact:'Zetsuei-Unbound'}] }
};

function getFusionSpec(fusionCard) {
  if (!fusionCard) return null;
  const explicit = FUSION_SPECS[fusionCard.id];
  if (explicit) return explicit;
  const parsed = parseFusionMaterialsFromText(fusionCard);
  if (parsed.length) return { materials: parsed.map(name => ({ label: name, exact: name })) };
  return null;
}

function parseFusionMaterialsFromText(fusionCard) {
  const raw = String((fusionCard && fusionCard.desc) || '').split('[')[0].trim();
  if (!raw) return [];
  const m1 = raw.match(/^(.+?)\s*\+\s*(.+?)(?:\.|$)/);
  if (m1) return [m1[1].trim(), m1[2].trim()];
  return raw.split('+').map(s => s.trim()).filter(Boolean);
}

function parseFusionMaterials(fusionCard) {
  const spec = getFusionSpec(fusionCard);
  if (!spec) return [];
  if (spec.freeFusion) return ['Legacy Free Fusion'];
  if (spec.pickN && spec.pool) return [`Any ${spec.pickN} of: ${spec.pool.map(m => m.label || m.exact).join(', ')}`];
  return (spec.materials || []).map(m => m.label || m.exact || 'Material');
}

function cardMatchesFusionDescriptor(card, desc) {
  if (!card || !desc) return false;
  if (desc.cardType && String(card.cardType || '') !== String(desc.cardType)) return false;
  if (desc.kind && !(card.kinds || []).some(k => String(k).toLowerCase() === String(desc.kind).toLowerCase())) return false;
  if (desc.levelMin != null && Number(card.level || 0) < Number(desc.levelMin)) return false;
  if (desc.levelMax != null && Number(card.level || 0) > Number(desc.levelMax)) return false;
  if (desc.alignment && String(card.alignment || '').toLowerCase() !== String(desc.alignment).toLowerCase()) return false;
  if (desc.exact && canonicalScriptName(card.name || '') !== canonicalScriptName(desc.exact)) return false;
  if (desc.nameIncludesAll && !desc.nameIncludesAll.every(tok => cardNameHas(card, tok))) return false;
  if (desc.nameIncludesAny && !desc.nameIncludesAny.some(tok => cardNameHas(card, tok))) return false;
  return true;
}

function getFusionMaterialCandidates(state, playerIdx, desc, usedFieldIdxs, usedHandIdxs) {
  const p = state.players[playerIdx];
  const zones = Array.isArray(desc.zones) && desc.zones.length ? desc.zones : ['field', 'hand'];
  const out = [];
  if (zones.includes('field')) {
    p.catalysts.forEach((slot, idx) => {
      if (!slot || usedFieldIdxs.has(idx)) return;
      const c = getCard(slot.cardId);
      if (cardMatchesFusionDescriptor(c, desc)) out.push({ src:'field', idx, card: c, cardId: slot.cardId });
    });
  }
  if (zones.includes('hand')) {
    p.hand.forEach((id, idx) => {
      if (usedHandIdxs.has(idx)) return;
      const c = getCard(id);
      if (cardMatchesFusionDescriptor(c, desc)) out.push({ src:'hand', idx, card: c, cardId: id });
    });
  }
  return out;
}

function findFusionAssignment(state, playerIdx, spec, pos, usedFieldIdxs, usedHandIdxs, acc) {
  if (spec?.freeFusion) return { steps: [], fieldIdxs: [], handIdxs: [], materialCardIds: [] };
  /* ── pickN / pool: choose any N distinct cards from a pool ── */
  if (spec?.pickN && spec?.pool) {
    return _findPickNAssignment(state, playerIdx, spec.pool, spec.pickN, 0, new Set(), new Set(), []);
  }
  const materials = spec?.materials || [];
  if (pos >= materials.length) {
    return { steps: acc.slice(), fieldIdxs: acc.filter(x => x.src === 'field').map(x => x.idx), handIdxs: acc.filter(x => x.src === 'hand').map(x => x.idx), materialCardIds: acc.map(x => x.cardId) };
  }
  const desc = materials[pos];
  const candidates = getFusionMaterialCandidates(state, playerIdx, desc, usedFieldIdxs, usedHandIdxs);
  for (const cand of candidates) {
    const nextUsedField = new Set(usedFieldIdxs);
    const nextUsedHand = new Set(usedHandIdxs);
    if (cand.src === 'field') nextUsedField.add(cand.idx); else nextUsedHand.add(cand.idx);
    acc.push({ ...cand, label: desc.label || desc.exact || cand.card.name });
    const found = findFusionAssignment(state, playerIdx, spec, pos + 1, nextUsedField, nextUsedHand, acc);
    if (found) return found;
    acc.pop();
  }
  return null;
}
/* Backtracking search: pick exactly N distinct cards that each match a different pool descriptor */
function _findPickNAssignment(state, playerIdx, pool, n, pos, usedFieldIdxs, usedHandIdxs, acc) {
  if (acc.length === n) {
    return { steps: acc.slice(), fieldIdxs: acc.filter(x => x.src === 'field').map(x => x.idx), handIdxs: acc.filter(x => x.src === 'hand').map(x => x.idx), materialCardIds: acc.map(x => x.cardId) };
  }
  if (pos >= pool.length) return null;              // exhausted pool before finding N
  if (pool.length - pos < n - acc.length) return null; // not enough pool entries left
  for (let i = pos; i < pool.length; i++) {
    const desc = pool[i];
    const candidates = getFusionMaterialCandidates(state, playerIdx, desc, usedFieldIdxs, usedHandIdxs);
    for (const cand of candidates) {
      const nf = new Set(usedFieldIdxs); const nh = new Set(usedHandIdxs);
      if (cand.src === 'field') nf.add(cand.idx); else nh.add(cand.idx);
      acc.push({ ...cand, label: desc.label || desc.exact || cand.card.name });
      const found = _findPickNAssignment(state, playerIdx, pool, n, i + 1, nf, nh, acc);
      if (found) return found;
      acc.pop();
    }
  }
  return null;
}

function getAvailableFusionSummons(state, playerIdx) {
  const p = state.players[playerIdx];
  const canUseFusion = p.fusionEnabled || fieldTrickProvidesFusion(p.fieldTrick);
  if (!canUseFusion) return [];
  const options = [];
  p.fusionDeck.forEach((fusionId, fusionDeckIdx) => {
    const fusionCard = getCard(fusionId);
    if (!fusionCard) return;
    const spec = getFusionSpec(fusionCard);
    if (!spec) return;
    const assignment = findFusionAssignment(state, playerIdx, spec, 0, new Set(), new Set(), []);
    if (!assignment) return;
    options.push({ fusionDeckIdx, fusionId, fusionCard, materials: parseFusionMaterials(fusionCard), materialDescriptors: spec.pool || spec.materials || [], steps: assignment.steps || [], fieldIdxs: assignment.fieldIdxs || [], handIdxs: assignment.handIdxs || [], materialCardIds: assignment.materialCardIds || [], usesFieldEnabler: fieldTrickProvidesFusion(p.fieldTrick), freeFusion: !!spec.freeFusion, pickN: spec.pickN || 0, inferred: !!spec.inferred, anomaly: !!spec.anomaly });
  });
  return options;
}

function fusionSummonDetailed(state, playerIdx, fusionDeckIdx, zoneIdx, fieldIdxs, handIdxs, removeMode, manual) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Fusion Summon can only happen in your Action Phase.' };
  const fusionId = p.fusionDeck[fusionDeckIdx];
  const fusionCard = getCard(fusionId);
  if (!fusionCard) return { ok:false, msg:'Invalid Fusion card.' };
  const spec = getFusionSpec(fusionCard);
  if (!spec) return { ok:false, msg:'No Fusion spec found for that card.' };
  const assignment = spec.freeFusion ? { fieldIdxs:[], handIdxs:[], materialCardIds:[] } : findFusionAssignment(state, playerIdx, spec, 0, new Set(), new Set(), []);
  if (!assignment) return { ok:false, msg:'No legal Fusion material assignment exists right now.' };
  /* ── pickN validation: any N distinct pool members are legal ── */
  if (spec.pickN && spec.pool) {
    const totalChosen = (fieldIdxs||[]).length + (handIdxs||[]).length;
    if (totalChosen !== spec.pickN) return { ok:false, msg:`This Fusion requires exactly ${spec.pickN} materials from its crew pool.` };
    const poolNames = spec.pool.map(m => (m.exact||m.label||'').toLowerCase());
    const chosenNames = [];
    for (const idx of (fieldIdxs||[])) { const s = p.catalysts[idx]; const c = s ? getCard(s.cardId) : null; if (!c) return { ok:false, msg:'Invalid field material.' }; chosenNames.push(c.name.toLowerCase()); }
    for (const idx of (handIdxs||[])) { const c = getCard(p.hand[idx]); if (!c) return { ok:false, msg:'Invalid hand material.' }; chosenNames.push(c.name.toLowerCase()); }
    if (new Set(chosenNames).size !== spec.pickN) return { ok:false, msg:'Each Fusion material must be a different Catalyst.' };
    for (const cn of chosenNames) { if (!poolNames.includes(cn)) return { ok:false, msg:`"${cn}" is not a valid Fusion material for this card.` }; }
  } else if (!spec.freeFusion) {
    const chosenField = (fieldIdxs || []).slice().sort((a,b)=>a-b).join('|');
    const chosenHand = (handIdxs || []).slice().sort((a,b)=>a-b).join('|');
    const legalField = (assignment.fieldIdxs || []).slice().sort((a,b)=>a-b).join('|');
    const legalHand = (assignment.handIdxs || []).slice().sort((a,b)=>a-b).join('|');
    if (chosenField !== legalField || chosenHand !== legalHand) return { ok:false, msg:'Chosen Fusion materials do not match a legal assignment.' };
  }
  if (p.catalysts[zoneIdx] !== null) return { ok:false, msg:'Chosen Catalyst Zone is occupied.' };
  const consumedIds = [];
  const finalRemoveMode = removeMode === 'rfg' ? 'rfg' : 'void';
  (fieldIdxs || []).slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.catalysts[idx]; p.catalysts[idx] = null; if (sent) { consumedIds.push(sent.cardId); if (finalRemoveMode === 'rfg') p.rfg.push(sent.cardId); else p.void.push(sent.cardId); } });
  (handIdxs || []).slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.hand.splice(idx,1)[0]; if (sent) { consumedIds.push(sent); if (finalRemoveMode === 'rfg') p.rfg.push(sent); else p.void.push(sent); } });
  p._manualSummonContext = manual || null;
  const removedFusionId = p.fusionDeck.splice(fusionDeckIdx, 1)[0];
  const placed = specialSummonToZone(state, playerIdx, removedFusionId, zoneIdx, finalRemoveMode === 'rfg' ? 'Fusion Zone' : 'Fusion Summon');
  p._manualSummonContext = null;
  if (!placed.ok) { p.fusionDeck.splice(fusionDeckIdx, 0, removedFusionId); return placed; }
  if (p.catalysts[zoneIdx]) p.catalysts[zoneIdx]._fusionMaterialIds = consumedIds.slice();
  addLog(state, `Fusion materials used: ${parseFusionMaterials(fusionCard).join(' + ')}.${finalRemoveMode === 'rfg' ? ' Materials were removed from game.' : ''}`);
  return { ok:true, fusionId:removedFusionId, materials:parseFusionMaterials(fusionCard) };
}

function fusionSummon(state, playerIdx, fusionDeckIdx, zoneIdx) {
  const p = state.players[playerIdx];
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Fusion Summon can only happen in your Action Phase.' };
  const options = getAvailableFusionSummons(state, playerIdx);
  const option = options.find(o => o.fusionDeckIdx === fusionDeckIdx);
  if (!option) return { ok: false, msg: 'No legal Fusion Summon available for that card.' };
  if (p.catalysts[zoneIdx] !== null) return { ok: false, msg: 'Chosen Catalyst Zone is occupied.' };
  if (!option.freeFusion) {
    option.fieldIdxs.slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.catalysts[idx]; p.catalysts[idx] = null; if (sent) p.void.push(sent.cardId); });
    option.handIdxs.slice().sort((a,b)=>b-a).forEach(idx => { const sent = p.hand.splice(idx,1)[0]; if (sent) p.void.push(sent); });
  }
  if (!option.usesFieldEnabler && !p.fusionEnabled) return { ok: false, msg: 'Fusion Dance or Fusion Zone is required.' };
  const fusionId = p.fusionDeck.splice(option.fusionDeckIdx, 1)[0];
  const placed = specialSummonToZone(state, playerIdx, fusionId, zoneIdx, option.usesFieldEnabler ? 'Fusion Zone' : 'Fusion Summon');
  if (!placed.ok) { p.fusionDeck.splice(option.fusionDeckIdx, 0, fusionId); return placed; }
  if (p.catalysts[zoneIdx]) p.catalysts[zoneIdx]._fusionMaterialIds = (option.materialCardIds || []).slice();
  p.fusionEnabled = !!option.usesFieldEnabler;
  addLog(state, option.freeFusion ? `Legacy Fusion Summon: ${option.fusionCard.name} used no explicit material line in source data.` : `Fusion materials used: ${option.materials.join(' + ')}.`);
  return { ok: true, fusionId, materials: option.materials };
}

function resetChainState(state) {
  state.waitingForResponse = false;
  state.chain = [];
  state.currentResponder = null;
  state.consecutivePasses = 0;
  state.pendingAction = null;
}

function classifyChainEffect(card) {
  const txt = `${(card && card.name) || ''} ${(card && card.desc) || ''}`.toLowerCase();
  if (/negate attack|stop attack|cancel attack/.test(txt)) return 'negate_attack';
  if (/negate|counter/.test(txt)) return 'negate';
  return 'generic';
}

function getRespondableTricks(state, playerIdx) {
  const p = state.players[playerIdx];
  const chainTop = state.chain[state.chain.length - 1] || null;
  const counterOnly = !!(chainTop && chainTop.isCounter);
  const out = [];
  p.tricks.forEach((slot, zone) => {
    if (!slot || !slot.faceDown || slot.isLibra) return;
    const card = getCard(slot.cardId);
    if (!card) return;
    if (!['Concealed Trick','Counter Trick'].includes(card.cardType)) return;
    const isCounter = card.cardType === 'Counter Trick' || /subtype:\s*counter/i.test(String(card.desc||'')) || /counter/i.test(String(card.cardType||''));
    if (counterOnly && !isCounter) return;
    out.push({ zone, cardId: slot.cardId, card, isCounter, effectType: classifyChainEffect(card) });
  });
  return out;
}

function beginResponseWindow(state, pendingAction, openerLink) {
  state.pendingAction = pendingAction;
  state.chain = [openerLink];
  state.waitingForResponse = true;
  state.currentResponder = 1 - openerLink.player;
  state.consecutivePasses = 0;
  addLog(state, `Chain opened: ${getCard(openerLink.cardId)?.name || 'Effect'} as Link 1.`);
  addLog(state, `Response window: P${state.currentResponder + 1} may respond.`);
  return { ok: true, waiting: true };
}

function activatePalmTrick(state, playerIdx, handIdx, manual) {
  const p = state.players[playerIdx];
  if (state.waitingForResponse) return { ok: false, msg: 'A chain is already open.' };
  if (state.phaseName !== 'action' || state.activePlayer !== playerIdx) return { ok: false, msg: 'Palm Tricks may only be activated during your Action Phase.' };
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card || card.cardType !== 'Palm Trick') return { ok: false, msg: 'Selected card is not a Palm Trick.' };
  if (isZeroDegreesLockActive(state)) return { ok:false, msg:'Zero Degrees is active — Palm Tricks cannot be played right now.' };
  return beginResponseWindow(state, { type: 'palm', playerIdx, handIdx, cardId, manual }, { player: playerIdx, cardId, source: 'palm', effectType: classifyChainEffect(card), isCounter: false });
}

function declareAttack(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone) {
  const atk = state.players[attackerPlayer];
  const atkCat = atk.catalysts[attackerZone];
  if (!atkCat) return { ok: false, msg: 'No attacker in this zone.' };
  if (atkCat.position !== 'atk') return { ok: false, msg: 'Catalyst must be in ATK position to attack.' };
  if (atkCat.attackedThisTurn) return { ok: false, msg: 'This Catalyst already attacked this turn.' };
  if (state.waitingForResponse) return { ok: false, msg: 'A chain is already open.' };
  return beginResponseWindow(state, { type: 'attack', attackerPlayer, attackerZone, defenderPlayer, defenderZone, cardId: atkCat.cardId }, { player: attackerPlayer, cardId: atkCat.cardId, source: 'attack', effectType: 'attack', isCounter: false });
}

function queueConcealedResponse(state, playerIdx, zoneIdx, manual) {
  if (!state.waitingForResponse) return { ok: false, msg: 'No response window is open.' };
  if (state.currentResponder !== playerIdx) return { ok: false, msg: 'It is not your response window.' };
  if (isZeroDegreesLockActive(state)) return { ok:false, msg:'Zero Degrees is active — Concealed Tricks cannot be played right now.' };
  const opts = getRespondableTricks(state, playerIdx);
  const chosen = opts.find(o => o.zone === zoneIdx);
  if (!chosen) return { ok: false, msg: 'That set card cannot respond right now.' };
  const p = state.players[playerIdx];
  const opp = state.players[1 - playerIdx];
  const negatorZone = opp.catalysts.findIndex(s => s && s._negateConcealedAvailable);
  if (negatorZone >= 0) {
    const negatorCard = getCard(opp.catalysts[negatorZone].cardId);
    opp.catalysts[negatorZone]._negateConcealedAvailable = false;
    p.tricks[zoneIdx] = null;
    p.void.push(chosen.cardId);
    addLog(state, `Effect Script: ${negatorCard?.name || 'A Fusion Catalyst'} negated the activation of ${chosen.card.name}.`);
    return { ok:true, waiting:true, prevented:true };
  }
  p.tricks[zoneIdx] = { ...p.tricks[zoneIdx], faceDown: false };
  state.chain.push({ player: playerIdx, cardId: chosen.cardId, source: 'concealed', zoneIdx, effectType: chosen.effectType, isCounter: chosen.isCounter, manual });
  state.currentResponder = 1 - playerIdx;
  state.consecutivePasses = 0;
  addLog(state, `P${playerIdx+1} chained ${chosen.card.name} as Link ${state.chain.length}.`);
  addLog(state, chosen.isCounter ? 'Counter Trick priority is now active.' : `Response window: P${state.currentResponder + 1} may respond.`);
  runRegisteredConcealedTriggers(state, playerIdx);
  return { ok: true, waiting: true };
}

function passChain(state, playerIdx) {
  if (!state.waitingForResponse) return { ok: false, msg: 'No response window is open.' };
  if (state.currentResponder !== playerIdx) return { ok: false, msg: 'It is not your response window.' };
  state.consecutivePasses += 1;
  addLog(state, `P${playerIdx+1} passed response.`);
  if (state.consecutivePasses >= 2) {
    return resolveChain(state);
  }
  state.currentResponder = 1 - playerIdx;
  addLog(state, `Response window: P${state.currentResponder + 1} may respond.`);
  return { ok: true, waiting: true };
}

function resolveChain(state) {
  addLog(state, `Resolving chain with ${state.chain.length} link${state.chain.length === 1 ? '' : 's'} (LIFO).`);
  const negated = new Set();
  for (let i = state.chain.length - 1; i >= 0; i--) {
    const link = state.chain[i];
    const card = getCard(link.cardId);
    if (negated.has(i)) {
      addLog(state, `Link ${i+1} — ${card ? card.name : 'Effect'} was negated.`);
      continue;
    }
    if (link.source === 'concealed' && (link.effectType === 'negate' || link.effectType === 'negate_attack')) {
      let targetIdx = i - 1;
      while (targetIdx >= 0 && negated.has(targetIdx)) targetIdx -= 1;
      if (targetIdx >= 0) {
        negated.add(targetIdx);
        const targetCard = getCard(state.chain[targetIdx].cardId);
        addLog(state, `Link ${i+1} — ${card ? card.name : 'Concealed Trick'} negated Link ${targetIdx+1} (${targetCard ? targetCard.name : 'Effect'}).`);
      }
      if (state.pendingAction && state.pendingAction.type === 'attack' && link.effectType === 'negate_attack') {
        state.pendingAction.negated = true;
        addLog(state, 'The pending attack was negated.');
      }
      continue;
    }
    addLog(state, `Link ${i+1} — ${card ? card.name : 'Effect'} resolved.`);
    if (link.source === 'concealed') {
      runConcealedResolutionScript(state, link);
      const inferredKeepsFaceUp = /continuous/i.test(String(card?.sub || '')) || inferCommonStringEffects(card).some(e => e.type === 'fieldAuraPR' || e.type === 'fieldAuraCP');
      const keepFaceUp = /jessica'?s love/i.test(card?.name || '') || /spell negator/i.test(card?.name || '') || /the chosen one/i.test(card?.name || '') || inferredKeepsFaceUp;
      if (!keepFaceUp) {
        const zoneIdx = typeof link.zoneIdx === 'number' ? link.zoneIdx : -1;
        if (zoneIdx >= 0 && state.players[link.player].tricks[zoneIdx]) {
          state.players[link.player].tricks[zoneIdx] = null;
          state.players[link.player].void.push(link.cardId);
        }
      }
    }
  }
  const pending = state.pendingAction;
  const openerNegated = negated.has(0) || (pending && pending.negated);
  resetChainState(state);
  if (!pending || openerNegated) {
    if (pending && pending.type === 'attack') {
      addLog(state, 'Attack resolution was stopped by the chain.');
      // onAttackNegated triggers (e.g. Goku gains PR when negated)
      const atkSlot = state.players[pending.attackerPlayer]?.catalysts[pending.attackerZone];
      if (atkSlot) {
        const atkEffects = getCardEffects(atkSlot.cardId);
        for (const eff of atkEffects) {
          if (eff.type !== 'onAttackNegated') continue;
          if (eff.action === 'boostSelfPR') {
            atkSlot.atkMod = Number(atkSlot.atkMod || 0) + (eff.amount || 0);
            if (eff.permanent) { /* permanent — do not add to tempAtkMod */ }
            addLog(state, `Effect Script: ${getCard(atkSlot.cardId)?.name} ${eff.log || 'gained Pressure'}.`);
          }
        }
      }
    }
    return { ok: true, resolved: true, negated: true };
  }
  if (pending.type === 'palm') return executePalmTrickCore(state, pending.playerIdx, pending.handIdx, pending.manual);
  if (pending.type === 'attack') return executeAttackCore(state, pending.attackerPlayer, pending.attackerZone, pending.defenderPlayer, pending.defenderZone);
  return { ok: true, resolved: true };
}

// ── COMBAT ──
function executeAttackCore(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone) {
  const atk = state.players[attackerPlayer];
  const def = state.players[defenderPlayer];
  const atkCat = atk.catalysts[attackerZone];
  if (!atkCat) return { ok: false, msg: 'No attacker in this zone.' };
  if (atkCat.position !== 'atk') return { ok: false, msg: 'Catalyst must be in ATK position to attack.' };
  if (atkCat.cannotAttackThisTurn) return { ok: false, msg: 'This Catalyst cannot attack this turn.' };
  if (atkCat._cannotAttackUntilTurn && state.turn <= atkCat._cannotAttackUntilTurn) return { ok:false, msg:'This Catalyst cannot attack yet.' };
  const defSlotCheck = defenderZone >= 0 ? state.players[defenderPlayer].catalysts[defenderZone] : null;
  if (defSlotCheck && defSlotCheck._cannotBeAttackedFaceUpAtk && defSlotCheck.position === 'atk') return { ok:false, msg:'That Catalyst cannot be attacked while face-up in ATK position.' };
  if (defSlotCheck && defSlotCheck._cannotBeAttackedUntilEndTurn) return { ok:false, msg:'That Catalyst cannot be attacked this turn.' };
  const attackAllMode = !!atkCat._attackAllOnceEach && defenderZone >= 0;
  if (attackAllMode && atkCat._attackedDefenders && atkCat._attackedDefenders[defenderZone]) return { ok:false, msg:'This Fusion Catalyst already attacked that defender this Battle Phase.' };
  if (!attackAllMode && atkCat.attackedThisTurn && !(atkCat.extraAttackThisTurn > 0) && !hasDoubleAttack(atkCat.cardId)) return { ok: false, msg: 'This Catalyst already attacked this turn.' };
  // Double attack: if card has doubleAttack and already attacked once, allow a second
  if (!attackAllMode && atkCat.attackedThisTurn && hasDoubleAttack(atkCat.cardId) && !atkCat._doubleAttackUsed) {
    // Second attack allowed
  } else if (!attackAllMode && atkCat.attackedThisTurn && !(atkCat.extraAttackThisTurn > 0)) {
    return { ok: false, msg: 'This Catalyst already attacked this turn.' };
  }

  const atkCard = getCard(atkCat.cardId);
  runCombatPreHooks(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone);
  // Apply registered battle calc boosts (once per turn PR boosts during combat)
  const battleBoost = runRegisteredBattleCalcBoost(state, attackerPlayer, attackerZone);
  if (battleBoost) atkCat.atkMod = Number(atkCat.atkMod || 0) + battleBoost;
  let atkPR = getEffectivePressure(state, attackerPlayer, attackerZone);
  let damageMultiplier = 1;
  if (defenderZone >= 0) {
    const pendingDef = state.players[defenderPlayer].catalysts[defenderZone];
    const pendingDefCard = pendingDef ? getCard(pendingDef.cardId) : null;
    if (atkCard && /celes the vampire/i.test(atkCard.name || '') && pendingDefCard && (cardHasKind(pendingDefCard, 'Zombie') || /zombie/i.test(String(pendingDefCard.subType || pendingDefCard.sub || pendingDefCard.desc || '')))) {
      atkPR += 750;
      addLog(state, 'Effect Script: Celes the vampire gained 750 Pressure against a Zombie-type Catalyst.');
    }
    if (atkCard && /ryoko masaki/i.test(atkCard.name || '')) {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll <= 4) {
        damageMultiplier = 2;
        addLog(state, `Effect Script: Ryoko Masaki rolled ${roll} and will double the battle damage it deals this battle.`);
      } else {
        runOnSelfDestroyed(state, attackerPlayer, atkCat.cardId, { destroyerPlayer:defenderPlayer, destroyerZone:defenderZone, reason:'effect' });
        atk.catalysts[attackerZone] = null;
        atk.void.push(atkCat.cardId);
        addLog(state, `Effect Script: Ryoko Masaki rolled ${roll} and destroyed itself before damage calculation.`);
        setLastBattleResult(state, { type:'selfdestruct', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:0, summary:'Ryoko Masaki destroyed itself before damage calculation.' });
        checkWinConditions(state);
        return { ok:true, type:'selfdestruct', dmg:0 };
      }
    }
  }

  // Direct attack?
  if (defenderZone === -1) {
    const planetJuraiActive = isFieldTrickActive(atk.fieldTrick) && /planet jurai/i.test(getCard(atk.fieldTrick.cardId)?.name || '');
    const canDirectByEffect = !!atkCat._canAttackDirectly || (/jurain sisters/i.test(atkCard.name || '') && planetJuraiActive);
    if (atkCat._captainAmericaNoDirectThisTurn) return { ok:false, msg:'Captain America cannot attack Chi directly after using its sweep effect this turn.' };
    if (!canDirectByEffect && !isFieldClearForDirectAttack(state, defenderPlayer)) return { ok: false, msg: 'Opponent still controls a Catalyst — cannot attack directly.' };

    // Direct attack
    let dmg = def.preventBattleDamage ? 0 : atkPR * damageMultiplier;
    if (atkCat._halfDirectDamage) dmg = Math.floor(dmg / 2);
    def.chi = Math.max(0, def.chi - dmg);
    addLog(state, `⚔ P${attackerPlayer+1}'s ${atkCard.name} (${atkPR}) attacks directly! ${dmg} Logic damage to P${defenderPlayer+1}'s Chi.`);
    addLog(state, `Chi: P${defenderPlayer+1} = ${def.chi}`);
    // Battle damage triggers
    runRegisteredOnBattleDamage(state, attackerPlayer, attackerZone, defenderPlayer, dmg);
    if (dmg > 0 && atk.catalysts[attackerZone]?._trialSword) { const drawn = drawCard(state, attackerPlayer); if (drawn) addLog(state, `Effect Script: Trial Sword drew ${getCard(drawn)?.name || 'a card'} after a direct attack.`); }

    // LeGat0: if a stolen Catalyst attacks directly, controller draws 1
    if (atkCat._leGat0DirectDraw) {
      const drawn = drawCard(state, attackerPlayer);
      if (drawn) {
        const dc = getCard(drawn);
        addLog(state, `Effect Script: LeGat0 bonus — drew ${dc?.name || 'a card'} (stolen Catalyst attacked directly).`);
      }
    }

    if (atk.catalysts[attackerZone]) {
      if (hasDoubleAttack(atkCat.cardId) && atkCat.attackedThisTurn) atkCat._doubleAttackUsed = true;
      else if (atk.catalysts[attackerZone].extraAttackThisTurn > 0) atk.catalysts[attackerZone].extraAttackThisTurn -= 1;
      else atk.catalysts[attackerZone].attackedThisTurn = true;
      if (atk.catalysts[attackerZone]._attackedDefenders) atk.catalysts[attackerZone]._attackedDefenders.direct = true;
    }
    checkWinConditions(state);
    return { ok: true, result: 'direct', dmg };
  }

  const defCat = def.catalysts[defenderZone];
  if (!defCat) return { ok: false, msg: 'No defender in this zone.' };

  const defCard = getCard(defCat.cardId);
  const defPR = getEffectivePressure(state, defenderPlayer, defenderZone);
  const defCP = getEffectiveCounterPressure(state, defenderPlayer, defenderZone);
  const isGreat = defCard ? defCard.great : false;

  let result = {};

  if (defCat.position === 'atk') {
    // ATK vs ATK
    if (atkPR > defPR) {
      // Attacker wins — defender to Void (Kill)
      const dmg = (atkPR - defPR) * damageMultiplier;
      def.chi = Math.max(0, def.chi - dmg);
      if (defCat._surviveBattleOnce) {
        defCat._surviveBattleOnce = false;
        addLog(state, `⚔ ATK vs ATK: ${atkCard.name} (${atkPR}) beats ${defCard.name} (${defPR}), but ${defCard.name} survived battle destruction once this turn. ${dmg} Logic damage.`);
        setLastBattleResult(state, { type:'survive_battle', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:dmg, summary:`Battle damage dealt, defender survived once-per-turn protection.` });
        result = { type:'survive_battle', dmg };
      } else {
        runOnSelfDestroyed(state, defenderPlayer, defCat.cardId, { destroyerPlayer:attackerPlayer, destroyerZone:attackerZone, reason:'battle' });
        def.catalysts[defenderZone] = null;
        def.void.push(defCat.cardId);
        atk.kills++;
        addLog(state, `⚔ ATK vs ATK: ${atkCard.name} (${atkPR}) beats ${defCard.name} (${defPR}). ${defCard.name} → Void. ${dmg} Logic damage. +1 Kill for P${attackerPlayer+1}.`);
        setLastBattleResult(state, { type:'kill', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:dmg, summary:`Kill + ${dmg} Chi damage.` });
        addRoadToGreatnessCounter(state, attackerPlayer, 1);
        result = { type: 'kill', dmg };
      }
    } else if (atkPR < defPR) {
      // Defender wins — attacker to Void
      const dmg = defPR - atkPR;
      atk.chi = Math.max(0, atk.chi - dmg);
      if (atkCat._surviveBattleOnce) {
        atkCat._surviveBattleOnce = false;
        addLog(state, `⚔ ATK vs ATK: ${defCard.name} (${defPR}) beats ${atkCard.name} (${atkPR}), but ${atkCard.name} survived battle destruction once this turn. ${dmg} recoil damage to P${attackerPlayer+1}.`);
        setLastBattleResult(state, { type:'survive_battle', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:dmg, summary:`Attacker survived once-per-turn battle protection.` });
        result = { type:'survive_battle', dmg };
      } else {
        runOnSelfDestroyed(state, attackerPlayer, atkCat.cardId, { destroyerPlayer:defenderPlayer, destroyerZone:defenderZone, reason:'battle' });
        atk.catalysts[attackerZone] = null;
        atk.void.push(atkCat.cardId);
        def.kills++;
        addLog(state, `⚔ ATK vs ATK: ${defCard.name} (${defPR}) beats ${atkCard.name} (${atkPR}). ${atkCard.name} → Void. ${dmg} recoil damage to P${attackerPlayer+1}. +1 Kill for P${defenderPlayer+1}.`);
        setLastBattleResult(state, { type:'killed', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:dmg, summary:`Attacker destroyed. ${dmg} Chi rebound.` });
        addRoadToGreatnessCounter(state, defenderPlayer, 1);
        result = { type: 'killed', dmg };
      }
    } else {
      // Mutual Kill
      const atkProtected = !!atkCat._surviveBattleOnce;
      const defProtected = !!defCat._surviveBattleOnce;
      if (atkProtected) atkCat._surviveBattleOnce = false;
      if (defProtected) defCat._surviveBattleOnce = false;
      if (!atkProtected) {
        runOnSelfDestroyed(state, attackerPlayer, atkCat.cardId, { destroyerPlayer:defenderPlayer, destroyerZone:defenderZone, reason:'battle' });
        atk.catalysts[attackerZone] = null;
        atk.void.push(atkCat.cardId);
        def.kills++;
        addRoadToGreatnessCounter(state, defenderPlayer, 1);
      }
      if (!defProtected) {
        runOnSelfDestroyed(state, defenderPlayer, defCat.cardId, { destroyerPlayer:attackerPlayer, destroyerZone:attackerZone, reason:'battle' });
        def.catalysts[defenderZone] = null;
        def.void.push(defCat.cardId);
        atk.kills++;
        addRoadToGreatnessCounter(state, attackerPlayer, 1);
      }
      addLog(state, `⚔ ATK vs ATK: ${atkCard.name} (${atkPR}) = ${defCard.name} (${defPR}). ${atkProtected && defProtected ? 'Both survived once-per-turn protection.' : atkProtected ? `${atkCard.name} survived once-per-turn protection.` : defProtected ? `${defCard.name} survived once-per-turn protection.` : 'Both → Void. +1 Kill each.'} No Logic damage.`);
      setLastBattleResult(state, { type: (atkProtected || defProtected) ? 'survive_battle' : 'mutual', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:0, summary: (atkProtected || defProtected) ? 'Mutual battle with once-per-turn survival applied.' : 'Mutual Kill. No Chi damage.' });
      result = { type: (atkProtected || defProtected) ? 'survive_battle' : 'mutual', dmg: 0 };
    }
  } else {
    // ATK vs DEF
    if (atkPR > defCP) {
      if (isGreat) {
        // Great Card → Void as Kill
        runOnSelfDestroyed(state, defenderPlayer, defCat.cardId, { destroyerPlayer:attackerPlayer, destroyerZone:attackerZone, reason:'battle' });
        def.catalysts[defenderZone] = null;
        def.void.push(defCat.cardId);
        atk.kills++;
        addLog(state, `⚔ ATK vs DEF (Great): ${atkCard.name} (${atkPR}) beats ${defCard.name} ★ (CP ${defCP}). Great Card → Void. +1 Kill. No Logic damage.`);
        setLastBattleResult(state, { type:'great_kill', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:0, summary:'Great Card sent to Void. Kill scored.' });
        addRoadToGreatnessCounter(state, attackerPlayer, 1);
        result = { type: 'great_kill', dmg: 0 };
      } else {
        // Normal DEF → Capture to Box
        def.catalysts[defenderZone] = null;
        atk.box.push(defCat.cardId);
        atk.captures++;
        let bonusChi = 0;
        for (const eff of getCardEffects(atkCat.cardId)) {
          if (eff.type === 'pierce' && eff.mode === 'difference') bonusChi += Math.max(0, atkPR - defCP);
          if (eff.type === 'atkVsDefWinBurn' && eff.mode === 'defenderLevelTimes') bonusChi += Number(defCard?.level || 0) * Number(eff.amount || 0);
        }
        if (atk.catalysts[attackerZone]?._shikonJewel) bonusChi += Math.max(0, atkPR - defCP);
        if (atk.catalysts[attackerZone]?._rapier) bonusChi += Math.max(0, atkPR - defCP);
        if (bonusChi > 0) {
          def.chi = Math.max(0, def.chi - bonusChi);
          addLog(state, `Effect Script: ${atkCard.name} inflicted ${bonusChi} bonus Chi damage through a DEF-position battle.`);
          if (atk.catalysts[attackerZone]?._shikonJewel) { const drawn = drawCard(state, attackerPlayer); if (drawn) addLog(state, `Effect Script: Shikon Jewel drew ${getCard(drawn)?.name || 'a card'} after inflicting battle damage.`); }
        }
        addLog(state, `⚔ ATK vs DEF: ${atkCard.name} (${atkPR}) beats ${defCard.name} (CP ${defCP}). ${defCard.name} → P${attackerPlayer+1}'s Box (Capture).${bonusChi > 0 ? ` ${bonusChi} bonus Chi damage.` : ' No Logic damage.'}`);
        setLastBattleResult(state, { type:'capture', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:bonusChi, summary:'Defender captured to the Box.' });
        result = { type: 'capture', dmg: bonusChi };
      }
    } else if (atkPR === defCP) {
      // Tie — bounce
      addLog(state, `⚔ ATK vs DEF: ${atkCard.name} (${atkPR}) = ${defCard.name} (CP ${defCP}). Attacker bounces. No damage.`);
      setLastBattleResult(state, { type:'bounce', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:0, summary:'Attack bounced. No damage.' });
      result = { type: 'bounce', dmg: 0 };
    } else {
      // ATK < DEF — rebound Chi damage, no Kill/Capture
      const dmg = atk.preventBattleDamage ? 0 : (defCP - atkPR);
      atk.chi = Math.max(0, atk.chi - dmg);
      addLog(state, `⚔ ATK vs DEF: ${atkCard.name} (${atkPR}) < ${defCard.name} (CP ${defCP}). No Kill. No Capture. P${attackerPlayer+1} takes ${dmg} Chi damage.`);
      setLastBattleResult(state, { type:'rebound', attackerPlayer, attackerZone, defenderPlayer, defenderZone, chiDamage:dmg, summary:`Rebound for ${dmg} Chi damage. No Kill, no Capture.` });
      result = { type: 'rebound', dmg };
    }
  }

  if (atk.catalysts[attackerZone]) {
    if (hasDoubleAttack(atkCat.cardId) && atk.catalysts[attackerZone].attackedThisTurn) atk.catalysts[attackerZone]._doubleAttackUsed = true;
    else if (atk.catalysts[attackerZone].extraAttackThisTurn > 0) atk.catalysts[attackerZone].extraAttackThisTurn -= 1;
    else atk.catalysts[attackerZone].attackedThisTurn = true;
    if (defenderZone >= 0 && atk.catalysts[attackerZone]._attackedDefenders) atk.catalysts[attackerZone]._attackedDefenders[defenderZone] = true;
  }
  runCombatPostHooks(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone, result, atkCard, defCard);

  // Registry: battle damage triggers (ATK vs ATK where attacker wins)
  if (result.type === 'kill' && result.dmg > 0) {
    runRegisteredOnBattleDamage(state, attackerPlayer, attackerZone, defenderPlayer, result.dmg);
  }
  // Registry: battle result triggers (e.g., on-kill draw)
  runRegisteredOnBattleResult(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone, result);
  // Registry: ally destroyed triggers
  if (result.type === 'kill' || result.type === 'great_kill' || result.type === 'capture') {
    runRegisteredAllyDestroyed(state, defenderPlayer, defenderZone);
  }
  if (result.type === 'killed') {
    runRegisteredAllyDestroyed(state, attackerPlayer, attackerZone);
  }
  if (result.type === 'mutual') {
    runRegisteredAllyDestroyed(state, defenderPlayer, defenderZone);
    runRegisteredAllyDestroyed(state, attackerPlayer, attackerZone);
  }

  addLog(state, `Chi: P1 = ${state.players[0].chi} | P2 = ${state.players[1].chi} | Kills: P1 = ${state.players[0].kills} P2 = ${state.players[1].kills}`);
  checkWinConditions(state);
  return { ok: true, ...result };
}

// ── END PHASE ACTIONS ──
function getEligibleCatalysts(state, playerIdx) {
  const p = state.players[playerIdx];
  const eligible = [];
  for (let i = 0; i < 5; i++) {
    const slot = p.catalysts[i];
    if (slot !== null) {
      const c = getCard(slot.cardId);
      // Great Cards and cards/runtime states that forbid tribute/sacrifice are not eligible.
      if (slot && slot._cannotBeTributed) continue;
      if (c && c.great) continue;
      if (c && /cannot be used as a? ?tribute/i.test(c.desc || '')) continue;
      eligible.push(i);
    }
  }
  return eligible;
}

function endPhaseAction(state, playerIdx, action, sacrificeZone, targetIdx) {
  const p = state.players[playerIdx];
  const opp = state.players[1 - playerIdx];

  if (action === 'endTurn') {
    addLog(state, `P${playerIdx+1} chose: End Turn.`);
    advancePhase(state);
    return { ok: true };
  }

  const eligible = getEligibleCatalysts(state, playerIdx);
  if (sacrificeZone === undefined || !eligible.includes(sacrificeZone)) {
    return { ok: false, msg: 'Must sacrifice an eligible Catalyst.' };
  }

  if (action === 'extraction') {
    if (p.box.length === 0) return { ok: false, msg: 'No cards in your Box to Extract.' };
    if (targetIdx === undefined || targetIdx < 0 || targetIdx >= p.box.length) return { ok: false, msg: 'Select a valid Box target.' };
  } else if (action === 'rescue') {
    if (opp.box.length === 0) return { ok: false, msg: 'Opponent has none of your cards in their Box.' };
    if (targetIdx === undefined || targetIdx < 0 || targetIdx >= opp.box.length) return { ok: false, msg: 'Select a valid Rescue target.' };
  } else if (action === 'destroyTrick') {
    if (!targetIdx || targetIdx.player === undefined) return { ok: false, msg: 'Must select a Trick to destroy.' };
    const tp = state.players[targetIdx.player];
    if (targetIdx.kind === 'field') {
      if (!tp.fieldTrick) return { ok: false, msg: 'No Field Trick there.' };
    } else {
      if (targetIdx.zone === undefined || !tp.tricks[targetIdx.zone]) return { ok: false, msg: 'No Trick in that zone.' };
    }
  }

  const sacCat = p.catalysts[sacrificeZone];
  const sacCard = getCard(sacCat.cardId);
  p.catalysts[sacrificeZone] = null;
  p.void.push(sacCat.cardId);
  addLog(state, `P${playerIdx+1} sacrificed ${sacCard ? sacCard.name : 'a Catalyst'} to the Void.`);

  if (action === 'extraction') {
    const extracted = p.box.splice(targetIdx, 1)[0];
    const exCard = getCard(extracted);
    if (exCard && exCard.great) {
      p.void.push(extracted);
      p.kills++;
      addLog(state, `Great Card extraction redirect: ${exCard.name} cannot be Extracted and is sent to the Void instead. +1 Kill for P${playerIdx+1}.`);
      setLastBattleResult(state, { type:'great_extract_redirect', attackerPlayer:playerIdx, attackerZone:-1, defenderPlayer:1-playerIdx, defenderZone:-1, chiDamage:0, summary:'Great Card could not be Extracted and was redirected to the Void.' });
    } else {
      p.rfg.push(extracted);
      p.extractions++;
      addLog(state, `P${playerIdx+1} Extracted ${exCard ? exCard.name : 'a Catalyst'} from Box → RFG. Extractions: ${p.extractions}/7.`);
      setLastBattleResult(state, { type:'extraction', attackerPlayer:playerIdx, attackerZone:-1, defenderPlayer:1-playerIdx, defenderZone:-1, chiDamage:0, summary:'Box target Extracted to RFG.' });
    }
    checkWinConditions(state);
  } else if (action === 'rescue') {
    const rescued = opp.box.splice(targetIdx, 1)[0];
    p.deck.push(rescued);
    p.deck = shuffle(p.deck);
    const resCard = getCard(rescued);
    addLog(state, `P${playerIdx+1} Rescued ${resCard ? resCard.name : 'a Catalyst'} from opponent's Box → Deck (shuffled).`);
  } else if (action === 'destroyTrick') {
    const tp = state.players[targetIdx.player];
    let destroyed;
    if (targetIdx.kind === 'field') {
      destroyed = tp.fieldTrick;
      tp.fieldTrick = null;
      tp.fusionEnabled = false;
    } else {
      destroyed = tp.tricks[targetIdx.zone];
      tp.tricks[targetIdx.zone] = null;
    }
    tp.void.push(destroyed.cardId);
    const tCard = getCard(destroyed.cardId);
    addLog(state, `P${playerIdx+1} destroyed ${tCard ? tCard.name : 'a Trick card'} (P${targetIdx.player+1} ${targetIdx.kind === 'field' ? 'Field Trick' : 'zone ' + targetIdx.zone}).`);
  }

  advancePhase(state);
  return { ok: true };
}

// ── WIN CONDITIONS ──
function checkWinConditions(state) {
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const opp = state.players[1 - i];

    // Chi KO (highest priority)
    if (opp.chi <= 0) {
      state.gameOver = true;
      state.winner = i;
      addLog(state, `🏆 P${i+1} WINS by Chi KO! P${1-i+1}'s Chi reached 0.`);
      return;
    }
  }
  for (let i = 0; i < 2; i++) {
    // 7 Kills (second priority)
    if (state.players[i].kills >= KILLS_TO_WIN) {
      state.gameOver = true;
      state.winner = i;
      addLog(state, `🏆 P${i+1} WINS by 7 Kills! (${state.players[i].kills} Kills)`);
      return;
    }
  }
  for (let i = 0; i < 2; i++) {
    // 7 Extractions (third priority)
    if (state.players[i].extractions >= EXTRACTIONS_TO_WIN) {
      state.gameOver = true;
      state.winner = i;
      addLog(state, `🏆 P${i+1} WINS by 7 Extractions! (${state.players[i].extractions} Extractions)`);
      return;
    }
  }
}

// ── SERIALIZATION (for P2P sync) ──
function serializeState(state) {
  return JSON.parse(JSON.stringify(state, (key, value) => {
    if (value instanceof Set) return { __set: [...value] };
    return value;
  }));
}

function deserializeState(data) {
  return JSON.parse(JSON.stringify(data), (key, value) => {
    if (value && value.__set) return new Set(value.__set);
    return value;
  });
}

function computeStateHash(state) {
  const plain = serializeState(state);
  const str = JSON.stringify(plain);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return ('00000000' + hash.toString(16)).slice(-8).toUpperCase();
}

// ── P2P NETWORKING (PeerJS) ──
class CTFNet {
  constructor(onConnected, onData, onDisconnect, onError) {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = '';
    this.onConnected = onConnected;
    this.onData = onData;
    this.onDisconnect = onDisconnect;
    this.onError = onError;
    this._debugLog = [];
  }

  _log(msg) {
    const entry = { time: Date.now(), msg };
    this._debugLog.push(entry);
    if (this._debugLog.length > 200) this._debugLog.shift();
    console.log('[CTFNet]', msg);
  }

  getNetDebugLog() {
    return this._debugLog.map(e => `[${new Date(e.time).toISOString()}] ${e.msg}`).join('\n');
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomCode = this.generateRoomCode();
      const peerId = 'ctf-' + this.roomCode;
      this.isHost = true;
      this._log(`Creating room ${this.roomCode} (peerId: ${peerId})`);

      this.peer = new Peer(peerId, { debug: 1 });

      this.peer.on('open', (id) => {
        this._log(`Peer open: ${id}`);
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        this._log(`Incoming connection from ${conn.peer}`);
        this.conn = conn;
        this._setupConn();
      });

      this.peer.on('error', (err) => {
        this._log(`Peer error: ${err.type} — ${err.message}`);
        if (this.onError) this.onError(err.type + ': ' + err.message);
        reject(err);
      });

      this.peer.on('disconnected', () => {
        this._log('Peer disconnected from signaling server');
      });
    });
  }

  joinRoom(code) {
    return new Promise((resolve, reject) => {
      this.roomCode = code.toUpperCase();
      const peerId = 'ctf-join-' + Date.now();
      const hostId = 'ctf-' + this.roomCode;
      this.isHost = false;
      this._log(`Joining room ${this.roomCode} (peerId: ${peerId}, hostId: ${hostId})`);

      this.peer = new Peer(peerId, { debug: 1 });

      this.peer.on('open', () => {
        this._log(`Peer open, connecting to host ${hostId}`);
        this.conn = this.peer.connect(hostId, { reliable: true });
        this._setupConn();
        resolve();
      });

      this.peer.on('error', (err) => {
        this._log(`Peer error: ${err.type} — ${err.message}`);
        if (this.onError) this.onError(err.type + ': ' + err.message);
        reject(err);
      });

      this.peer.on('disconnected', () => {
        this._log('Peer disconnected from signaling server');
      });
    });
  }

  _setupConn() {
    this.conn.on('open', () => {
      this._log(`Connection open (isHost: ${this.isHost})`);
      if (this.onConnected) this.onConnected(this.isHost);
    });
    this.conn.on('data', (data) => {
      this._log(`Data received: type=${data?.type || 'unknown'}, size=${JSON.stringify(data).length}`);
      if (this.onData) this.onData(data);
    });
    this.conn.on('close', () => {
      this._log('Connection closed');
      if (this.onDisconnect) this.onDisconnect();
    });
    this.conn.on('error', (err) => {
      this._log(`Connection error: ${err}`);
      if (this.onError) this.onError(err.toString());
    });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this._log(`Sending: type=${data?.type || 'unknown'}, size=${JSON.stringify(data).length}`);
      this.conn.send(data);
    } else {
      this._log(`Send FAILED (conn not open): type=${data?.type || 'unknown'}`);
    }
  }

  disconnect() {
    this._log('Manual disconnect called');
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
  }
}

window.computeStateHash = computeStateHash;
window.exportMatchLog = exportMatchLog;
window.generatePostMatchSummary = generatePostMatchSummary;
