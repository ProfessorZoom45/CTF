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
function createPlayer(deckCardIds) {
  return {
    chi: STARTING_CHI,
    hand: [],
    catalysts: [null, null, null, null, null],   // 5 zones, each: {cardId, position:'atk'|'def', faceDown:bool}
    tricks: [null, null, null, null, null],       // 5 zones (idx 0,4 = libra, 1-3 = trick)
    fieldTrick: null,
    deck: shuffle([...deckCardIds]),
    fusionDeck: [],
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
  };
}

function createGameState(p1Deck, p2Deck) {
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
  return CTF_CARDS.find(c => c.id === id) || null;
}

function addLog(state, msg) {
  state.log.push({ turn: state.turn, phase: PHASE_NAMES[state.phase], msg, time: Date.now() });
}

// ── DRAW ──
function drawCard(state, playerIdx) {
  const p = state.players[playerIdx];
  if (p.deck.length === 0) {
    addLog(state, `P${playerIdx+1} deck empty — skip draw (NOT a loss).`);
    return null;
  }
  const cardId = p.deck.shift();
  p.hand.push(cardId);
  return cardId;
}

// ── PHASE SYSTEM ──
function advancePhase(state) {
  state.phase++;
  if (state.phase >= PHASES.length) {
    // Turn ends, pass to next player
    endTurn(state);
    return;
  }
  state.phaseName = PHASES[state.phase];
  executePhaseAuto(state);
}

function executePhaseAuto(state) {
  const p = state.activePlayer;
  const pState = state.players[p];

  switch (state.phaseName) {
    case 'turnStart':
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
      // Field trick refresh — stub for v1
      break;

    case 'action':
      addLog(state, `Phase 4: Action Phase — your main play window.`);
      pState.normalSummonUsed = false;
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

function endTurn(state) {
  const p = state.activePlayer;
  const pState = state.players[p];

  // Hand limit check
  while (pState.hand.length > HAND_LIMIT) {
    // Auto-discard last card (in real game, player chooses)
    const discarded = pState.hand.pop();
    pState.void.push(discarded);
    const card = getCard(discarded);
    addLog(state, `P${p+1} discarded ${card ? card.name : 'a card'} (hand limit).`);
  }

  // Reset turn-specific flags
  pState.summonedThisTurn = new Set();
  pState.posChanged = new Set();
  pState.specialSummonCount = 0;
  pState.hasAttackedThisTurn = false;

  // Switch active player
  state.activePlayer = 1 - state.activePlayer;
  state.phase = 0;
  state.phaseName = 'turnStart';

  if (state.activePlayer === 0) {
    state.turn++;
    state.isP1FirstTurn = false;
  }

  executePhaseAuto(state);
}

// ── SUMMONING ──
function canNormalSummon(state, playerIdx) {
  const p = state.players[playerIdx];
  if (p.normalSummonUsed) return false;
  if (state.phaseName !== 'action') return false;
  if (state.activePlayer !== playerIdx) return false;
  return true;
}

function normalSummon(state, playerIdx, handIdx, zoneIdx, position) {
  const p = state.players[playerIdx];
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card) return { ok: false, msg: 'Invalid card.' };
  if (p.normalSummonUsed) return { ok: false, msg: 'Already used Normal Summon this turn.' };
  if (p.catalysts[zoneIdx] !== null) return { ok: false, msg: 'Zone is occupied.' };

  // Check if catalyst
  if (card.cardType !== 'Catalyst') return { ok: false, msg: 'Only Catalysts can be Normal Summoned.' };

  // Tribute check
  const level = card.level || 0;
  if (level >= 7) {
    const tribCount = p.catalysts.filter(c => c !== null).length;
    if (tribCount < 2) return { ok: false, msg: 'Need 2 Tributes for Level 7+.' };
  } else if (level >= 5) {
    const tribCount = p.catalysts.filter(c => c !== null).length;
    if (tribCount < 1) return { ok: false, msg: 'Need 1 Tribute for Level 5-6.' };
  }

  // Remove from hand
  p.hand.splice(handIdx, 1);

  // Handle tributes (auto-tribute first available for v1)
  if (level >= 7) {
    let tributed = 0;
    for (let i = 0; i < 5 && tributed < 2; i++) {
      if (p.catalysts[i] !== null) {
        p.void.push(p.catalysts[i].cardId);
        const tc = getCard(p.catalysts[i].cardId);
        addLog(state, `P${playerIdx+1} tributed ${tc ? tc.name : 'a Catalyst'}.`);
        p.catalysts[i] = null;
        tributed++;
      }
    }
  } else if (level >= 5) {
    for (let i = 0; i < 5; i++) {
      if (p.catalysts[i] !== null) {
        p.void.push(p.catalysts[i].cardId);
        const tc = getCard(p.catalysts[i].cardId);
        addLog(state, `P${playerIdx+1} tributed ${tc ? tc.name : 'a Catalyst'}.`);
        p.catalysts[i] = null;
        break;
      }
    }
  }

  // Place on field
  p.catalysts[zoneIdx] = { cardId, position: position || 'atk', faceDown: false };
  p.normalSummonUsed = true;
  p.summonedThisTurn.add(zoneIdx);

  addLog(state, `P${playerIdx+1} Normal Summoned ${card.name} (Lv${card.level}, ${card.pr}/${card.cp}) in ${position === 'def' ? 'DEF' : 'ATK'} position.`);
  return { ok: true };
}

function setTrick(state, playerIdx, handIdx, zoneIdx) {
  const p = state.players[playerIdx];
  const cardId = p.hand[handIdx];
  const card = getCard(cardId);
  if (!card) return { ok: false, msg: 'Invalid card.' };

  const isTrick = ['Palm Trick','Concealed Trick','Counter Trick','Field Trick'].includes(card.cardType);
  if (!isTrick) return { ok: false, msg: 'Only Trick cards can be set here.' };

  if (card.cardType === 'Field Trick') {
    // Replace existing field trick
    if (p.fieldTrick) {
      p.void.push(p.fieldTrick.cardId);
      addLog(state, `Previous Field Trick was destroyed.`);
    }
    p.hand.splice(handIdx, 1);
    p.fieldTrick = { cardId, faceDown: false, setTurn: state.turn };
    addLog(state, `P${playerIdx+1} activated Field Trick: ${card.name}.`);
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

// ── COMBAT ──
function declareAttack(state, attackerPlayer, attackerZone, defenderPlayer, defenderZone) {
  const atk = state.players[attackerPlayer];
  const def = state.players[defenderPlayer];
  const atkCat = atk.catalysts[attackerZone];
  if (!atkCat) return { ok: false, msg: 'No attacker in this zone.' };
  if (atkCat.position !== 'atk') return { ok: false, msg: 'Catalyst must be in ATK position to attack.' };

  const atkCard = getCard(atkCat.cardId);
  const atkPR = atkCard ? atkCard.pr : 0;

  // Direct attack?
  if (defenderZone === -1) {
    // Check if all catalyst zones empty
    const hasDefender = def.catalysts.some(c => c !== null);
    if (hasDefender) return { ok: false, msg: 'Opponent has Catalysts — cannot attack directly.' };

    // Direct attack
    const dmg = atkPR;
    def.chi = Math.max(0, def.chi - dmg);
    addLog(state, `⚔ P${attackerPlayer+1}'s ${atkCard.name} (${atkPR}) attacks directly! ${dmg} Logic damage to P${defenderPlayer+1}'s Chi.`);
    addLog(state, `Chi: P${defenderPlayer+1} = ${def.chi}`);

    checkWinConditions(state);
    return { ok: true, result: 'direct', dmg };
  }

  const defCat = def.catalysts[defenderZone];
  if (!defCat) return { ok: false, msg: 'No defender in this zone.' };

  const defCard = getCard(defCat.cardId);
  const defPR = defCard ? defCard.pr : 0;
  const defCP = defCard ? defCard.cp : 0;
  const isGreat = defCard ? defCard.great : false;

  let result = {};

  if (defCat.position === 'atk') {
    // ATK vs ATK
    if (atkPR > defPR) {
      // Attacker wins — defender to Void (Kill)
      const dmg = atkPR - defPR;
      def.chi = Math.max(0, def.chi - dmg);
      def.catalysts[defenderZone] = null;
      def.void.push(defCat.cardId);
      atk.kills++;
      addLog(state, `⚔ ATK vs ATK: ${atkCard.name} (${atkPR}) beats ${defCard.name} (${defPR}). ${defCard.name} → Void. ${dmg} Logic damage. +1 Kill for P${attackerPlayer+1}.`);
      result = { type: 'kill', dmg };
    } else if (atkPR < defPR) {
      // Defender wins — attacker to Void
      const dmg = defPR - atkPR;
      atk.chi = Math.max(0, atk.chi - dmg);
      atk.catalysts[attackerZone] = null;
      atk.void.push(atkCat.cardId);
      def.kills++;
      addLog(state, `⚔ ATK vs ATK: ${defCard.name} (${defPR}) beats ${atkCard.name} (${atkPR}). ${atkCard.name} → Void. ${dmg} recoil damage to P${attackerPlayer+1}. +1 Kill for P${defenderPlayer+1}.`);
      result = { type: 'killed', dmg };
    } else {
      // Mutual Kill
      atk.catalysts[attackerZone] = null;
      def.catalysts[defenderZone] = null;
      atk.void.push(atkCat.cardId);
      def.void.push(defCat.cardId);
      atk.kills++;
      def.kills++;
      addLog(state, `⚔ ATK vs ATK: Mutual Kill! ${atkCard.name} (${atkPR}) = ${defCard.name} (${defPR}). Both → Void. +1 Kill each. No Logic damage.`);
      result = { type: 'mutual', dmg: 0 };
    }
  } else {
    // ATK vs DEF
    if (atkPR > defCP) {
      if (isGreat) {
        // Great Card → Void as Kill
        def.catalysts[defenderZone] = null;
        def.void.push(defCat.cardId);
        atk.kills++;
        addLog(state, `⚔ ATK vs DEF (Great): ${atkCard.name} (${atkPR}) beats ${defCard.name} ★ (CP ${defCP}). Great Card → Void. +1 Kill. No Logic damage.`);
        result = { type: 'great_kill', dmg: 0 };
      } else {
        // Normal DEF → Capture to Box
        def.catalysts[defenderZone] = null;
        atk.box.push(defCat.cardId);
        atk.captures++;
        addLog(state, `⚔ ATK vs DEF: ${atkCard.name} (${atkPR}) beats ${defCard.name} (CP ${defCP}). ${defCard.name} → P${attackerPlayer+1}'s Box (Capture). No Logic damage.`);
        result = { type: 'capture', dmg: 0 };
      }
    } else if (atkPR === defCP) {
      // Tie — bounce
      addLog(state, `⚔ ATK vs DEF: ${atkCard.name} (${atkPR}) = ${defCard.name} (CP ${defCP}). Attacker bounces. No damage.`);
      result = { type: 'bounce', dmg: 0 };
    } else {
      // ATK < DEF — bounce
      addLog(state, `⚔ ATK vs DEF: ${atkCard.name} (${atkPR}) < ${defCard.name} (CP ${defCP}). Attacker bounces. No damage.`);
      result = { type: 'bounce', dmg: 0 };
    }
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
    if (p.catalysts[i] !== null) {
      const card = getCard(p.catalysts[i].cardId);
      // Great Card Catalysts cannot be tributed for End Phase actions
      if (card && card.great && card.cardType === 'Catalyst') continue;
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

  // All other actions require sacrifice
  const eligible = getEligibleCatalysts(state, playerIdx);
  if (sacrificeZone === undefined || !eligible.includes(sacrificeZone)) {
    return { ok: false, msg: 'Must sacrifice an eligible Catalyst.' };
  }

  const sacCat = p.catalysts[sacrificeZone];
  const sacCard = getCard(sacCat.cardId);
  p.catalysts[sacrificeZone] = null;
  p.void.push(sacCat.cardId);
  addLog(state, `P${playerIdx+1} sacrificed ${sacCard ? sacCard.name : 'a Catalyst'} to the Void.`);

  if (action === 'extraction') {
    if (p.box.length === 0) return { ok: false, msg: 'No cards in your Box to Extract.' };
    const extractIdx = targetIdx !== undefined ? targetIdx : 0;
    if (extractIdx >= p.box.length) return { ok: false, msg: 'Invalid Box target.' };
    const extracted = p.box.splice(extractIdx, 1)[0];
    p.rfg.push(extracted);
    p.extractions++;
    const exCard = getCard(extracted);
    addLog(state, `P${playerIdx+1} Extracted ${exCard ? exCard.name : 'a Catalyst'} from Box → RFG. Extractions: ${p.extractions}/7.`);
    checkWinConditions(state);
  } else if (action === 'rescue') {
    // Rescue: return YOUR OWN catalyst from OPPONENT'S box to YOUR deck
    if (opp.box.length === 0) return { ok: false, msg: 'Opponent has none of your cards in their Box.' };
    // Find your cards in opponent's box
    const myCardsInOppBox = opp.box.filter(id => true); // In v1, all box cards are "yours" from opp's perspective
    const rescueIdx = targetIdx !== undefined ? targetIdx : 0;
    if (rescueIdx >= opp.box.length) return { ok: false, msg: 'Invalid rescue target.' };
    const rescued = opp.box.splice(rescueIdx, 1)[0];
    p.deck.push(rescued);
    p.deck = shuffle(p.deck);
    const resCard = getCard(rescued);
    addLog(state, `P${playerIdx+1} Rescued ${resCard ? resCard.name : 'a Catalyst'} from opponent's Box → Deck (shuffled).`);
  } else if (action === 'destroyTrick') {
    // Destroy 1 trick on field (either player's)
    // targetIdx format: {player: 0|1, zone: 0-4}
    if (!targetIdx || targetIdx.player === undefined) return { ok: false, msg: 'Must select a Trick to destroy.' };
    const tp = state.players[targetIdx.player];
    const trick = tp.tricks[targetIdx.zone];
    if (!trick) return { ok: false, msg: 'No Trick in that zone.' };
    tp.tricks[targetIdx.zone] = null;
    tp.void.push(trick.cardId);
    const tCard = getCard(trick.cardId);
    addLog(state, `P${playerIdx+1} destroyed ${tCard ? tCard.name : 'a Trick card'} (P${targetIdx.player+1} zone ${targetIdx.zone}).`);
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
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomCode = this.generateRoomCode();
      const peerId = 'ctf-' + this.roomCode;
      this.isHost = true;

      this.peer = new Peer(peerId, { debug: 1 });

      this.peer.on('open', (id) => {
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.conn = conn;
        this._setupConn();
      });

      this.peer.on('error', (err) => {
        if (this.onError) this.onError(err.type + ': ' + err.message);
        reject(err);
      });
    });
  }

  joinRoom(code) {
    return new Promise((resolve, reject) => {
      this.roomCode = code.toUpperCase();
      const peerId = 'ctf-join-' + Date.now();
      const hostId = 'ctf-' + this.roomCode;
      this.isHost = false;

      this.peer = new Peer(peerId, { debug: 1 });

      this.peer.on('open', () => {
        this.conn = this.peer.connect(hostId, { reliable: true });
        this._setupConn();
        resolve();
      });

      this.peer.on('error', (err) => {
        if (this.onError) this.onError(err.type + ': ' + err.message);
        reject(err);
      });
    });
  }

  _setupConn() {
    this.conn.on('open', () => {
      if (this.onConnected) this.onConnected(this.isHost);
    });
    this.conn.on('data', (data) => {
      if (this.onData) this.onData(data);
    });
    this.conn.on('close', () => {
      if (this.onDisconnect) this.onDisconnect();
    });
    this.conn.on('error', (err) => {
      if (this.onError) this.onError(err.toString());
    });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  disconnect() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
  }
}
