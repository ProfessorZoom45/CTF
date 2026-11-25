import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const scriptNames = [
  'ctf-config.js', 'data.js', 'sets-2026-08-24-patch.js', 'sets-2026-08-25-patch.js',
  'zf1-tutorial-data.js', 'deck-utils.js', 'starter-decks-2026-08-25.js', 'engine.js'
];
const browserRules = scriptNames.map(name =>
  new Script(readFileSync(new URL('assets/js/' + name, import.meta.url), 'utf8'), { filename:name })
);
const refereeRules = new Script(`
  ({
    validate(deck) { return CTFDeckUtils.validateDeck(deck, CTF_CARDS).ok; },
    start(decks) {
      const state = createGameState(...decks);
      executePhaseAuto(state);
      return state;
    },
    clone(state) { return deserializeState(serializeState(state)); },
    advancePhase, handleDrawPhaseClick, normalSummon, setCatalyst, setTrick,
    declareAttack, passChain, queueConcealedResponse, endPhaseAction,
    discardForHandLimit, changeCatalystPositionInResolution, finishDuel,
    placeLibraScale, libraSummon, fusionSummon, activatePalmTrick,
    activateSetPalmTrick, activateSetFieldTrick, getEligibleCatalysts,
    getEligibleBoxTargets, getRespondableTricks, getEffectivePressure,
    getEffectiveCounterPressure, canNormalSummon
  })
`);

function loadRules() {
  // Card-effect registry state belongs to a duel, as it does in each local tab.
  const context = createContext({
    console: { info(){}, warn(){}, error(){}, log(){} },
    ruleRandom: () => randomInt(0x100000000) / 0x100000000
  });
  new Script('var window = globalThis; Math.random = ruleRandom;').runInContext(context);
  for (const script of browserRules) script.runInContext(context);
  return refereeRules.runInContext(context);
}

function viewSlot(slot, ownSeat, values) {
  if (!slot) return null;
  const view = { faceDown:!!slot.faceDown };
  if (slot.position === 'atk' || slot.position === 'def') view.position = slot.position;
  if (!slot.faceDown || ownSeat) view.cardId = slot.cardId;
  if (values && view.cardId) Object.assign(view, values());
  return view;
}

export function viewForSeat(state, seat, revision, events, rules) {
  // The match state and raw engine log can contain private card IDs, choices,
  // and draw order. Build the response from an allowlist for both seats.
  return {
    revision, seat,
    turn:state.turn,
    phase:state.phaseName,
    activeSeat:state.activePlayer,
    prioritySeat:state.waitingForResponse ? state.currentResponder : state.activePlayer,
    waitingForResponse:state.waitingForResponse,
    pendingDiscard:state.pendingDiscard?.playerIdx === seat,
    drawResolved:!!state.players[seat]._drawPhaseResolved,
    skippedBattle:!!state._p1BattleSkipPending,
    result:state.gameOver ? { winner:state.winner, reason:state.winReason || 'Duel ended' } : null,
    events:events.map(({ revision, seat, action, phase }) => ({ revision, seat, action, phase })),
    players:state.players.map((player, index) => ({
      chi:player.chi,
      kills:player.kills,
      captures:player.captures,
      extractions:player.extractions,
      handCount:player.hand.length,
      deckCount:player.deck.length,
      fusionCount:player.fusionDeck.length,
      ...(index === seat ? { hand:[...player.hand], fusionDeck:[...player.fusionDeck] } : {}),
      catalysts:player.catalysts.map((slot, zone) => viewSlot(slot, index === seat, rules && (() => ({
        pressure:rules.getEffectivePressure(state,index,zone),
        counterPressure:rules.getEffectiveCounterPressure(state,index,zone)
      })))),
      tricks:player.tricks.map(slot => viewSlot(slot, index === seat)),
      fieldTrick:viewSlot(player.fieldTrick, index === seat),
      void:[...player.void],
      box:[...player.box],
      rfg:[...player.rfg]
    }))
  };
}

const index = (value, max) => Number.isInteger(value) && value >= 0 && value < max;
const zone = value => index(value, 5);
const handIndex = (state, seat, value) => index(value, state.players[seat].hand.length);
const validZones = values => Array.isArray(values) && values.length <= 5 &&
  values.every(zone) && new Set(values).size === values.length;
const reject = () => ({ ok:false });

const commands = new Map([
  ['advancePhase', (rules, state) => rules.advancePhase(state) ?? { ok:true }],
  ['drawPhaseClick', (rules, state) => rules.handleDrawPhaseClick(state)],
  ['normalSummon', (rules, state, seat, action) => {
    if (!handIndex(state, seat, action.handIdx) || !zone(action.zone) ||
        !['atk','def'].includes(action.position) || !validZones(action.tributeZones)) return reject();
    return rules.normalSummon(state, seat, action.handIdx, action.zone, action.position, action.tributeZones);
  }],
  ['setCatalyst', (rules, state, seat, action) => handIndex(state, seat, action.handIdx) && zone(action.zone)
    ? rules.setCatalyst(state, seat, action.handIdx, action.zone) : reject()],
  ['setTrick', (rules, state, seat, action) => handIndex(state, seat, action.handIdx) && zone(action.zone)
    ? rules.setTrick(state, seat, action.handIdx, action.zone) : reject()],
  ['activatePalmTrick', (rules, state, seat, action) => state.phaseName === 'action' &&
    handIndex(state, seat, action.handIdx) && action.manual === undefined
    ? rules.activatePalmTrick(state, seat, action.handIdx) : reject()],
  ['activateSetPalmTrick', (rules, state, seat, action) => state.phaseName === 'action' &&
    zone(action.zone) && action.manual === undefined
    ? rules.activateSetPalmTrick(state, seat, action.zone) : reject()],
  ['activateSetFieldTrick', (rules, state, seat) => state.phaseName === 'action'
    ? rules.activateSetFieldTrick(state, seat) : reject()],
  ['placeLibraScale', (rules, state, seat, action) => state.phaseName === 'action' &&
    handIndex(state, seat, action.handIdx) && [0,4].includes(action.zone)
    ? rules.placeLibraScale(state, seat, action.handIdx, action.zone) : reject()],
  ['libraSummon', (rules, state, seat, action) => state.phaseName === 'action' &&
    validZones(action.zoneIdxs) && Array.isArray(action.handIdxs) &&
    action.handIdxs.length === action.zoneIdxs.length &&
    new Set(action.handIdxs).size === action.handIdxs.length &&
    action.handIdxs.every(value => handIndex(state, seat, value))
    ? rules.libraSummon(state, seat, action.handIdxs, action.zoneIdxs) : reject()],
  ['fusionSummon', (rules, state, seat, action) => state.phaseName === 'action' && zone(action.zone) &&
    index(action.fusionDeckIdx, state.players[seat].fusionDeck.length)
    ? rules.fusionSummon(state, seat, action.fusionDeckIdx, action.zone) : reject()],
  ['attack', (rules, state, seat, action) => zone(action.attackerZone) &&
    (zone(action.defenderZone) || action.defenderZone === -1)
    ? rules.declareAttack(state, seat, action.attackerZone, 1 - seat, action.defenderZone) : reject()],
  ['passChain', (rules, state, seat) => rules.passChain(state, seat)],
  ['queueConcealedResponse', (rules, state, seat, action) => zone(action.zone) && action.manual === undefined
    ? rules.queueConcealedResponse(state, seat, action.zone) : reject()],
  ['resolutionFlipPosition', (rules, state, seat, action) => zone(action.zoneIdx)
    ? rules.changeCatalystPositionInResolution(state, seat, action.zoneIdx) : reject()],
  ['endPhaseAction', (rules, state, seat, action) => {
    if (action.action === 'endTurn') return rules.endPhaseAction(state, seat, 'endTurn');
    if (!zone(action.sacrificeZone)) return reject();
    if (['extraction','rescue'].includes(action.action) && Number.isInteger(action.targetIdx)) {
      return rules.endPhaseAction(state, seat, action.action, action.sacrificeZone, action.targetIdx);
    }
    if (action.action === 'destroyTrick' && index(action.targetIdx?.player, 2)) {
      const {player, kind, zone:targetZone} = action.targetIdx;
      if (kind === 'field' || zone(targetZone)) {
        return rules.endPhaseAction(state, seat, action.action, action.sacrificeZone, {player, kind, zone:targetZone});
      }
    }
    return reject();
  }],
  ['discardForHandLimit', (rules, state, seat, action) => handIndex(state, seat, action.handIdx)
    ? rules.discardForHandLimit(state, seat, action.handIdx) : reject()],
  ['concede', (rules, state, seat) => {
    rules.finishDuel(state, 1 - seat, 'Concession');
    return { ok:true };
  }]
]);

function safeDeck(deck) {
  if (!deck || !Array.isArray(deck.main)) return null;
  const {main, fusion = [], side = []} = deck;
  const valid = (ids, max) => Array.isArray(ids) && ids.length <= max &&
    ids.every(id => typeof id === 'string' && id.length <= 150);
  if (!valid(main, 60) || !valid(fusion, 15) || !valid(side, 15)) return null;
  // Online decks always shuffle. Client-only options cannot change opening draws.
  return { main:[...main], fusion:[...fusion], side:[...side] };
}

export class PrivateDuel {
  #rules;
  #decks = [null, null];
  #state = null;
  #revision = 0;
  #events = [];
  #rematchDecks = [null, null];

  get revision() { return this.#revision; }

  registered(seat) { return !!this.#decks[seat]; }

  register(seat, deck) {
    if (this.#state) return { status:409, body:{ error:'This duel already started.' } };
    const deckChoice = safeDeck(deck);
    if (!deckChoice) return { status:400, body:{ error:'Choose a legal deck.' } };
    this.#rules ??= loadRules();
    if (!this.#rules.validate(deckChoice)) return { status:400, body:{ error:'Choose a legal deck.' } };
    this.#decks[seat] = deckChoice;
    if (this.#decks.every(Boolean)) {
      this.#start();
    }
    return { status:200, body:{ ok:true, ready:!!this.#state } };
  }

  #start() {
    this.#state = this.#rules.start(this.#decks);
    this.#events = [];
    this.#revision += 1;
  }

  rematch(seat, deck, revision) {
    if (!this.#state?.gameOver || revision !== this.#revision) {
      return { status:409, body:{ error:'Refresh the finished duel before requesting a rematch.' } };
    }
    const choice = deck === undefined ? this.#decks[seat] : safeDeck(deck);
    if (!choice || !this.#rules.validate(choice)) return { status:400, body:{ error:'Choose a legal deck.' } };
    this.#rematchDecks[seat] = choice;
    if (this.#rematchDecks.every(Boolean)) {
      this.#decks = this.#rematchDecks;
      this.#rematchDecks = [null, null];
      this.#rules = loadRules();
      this.#start();
    } else {
      this.#revision += 1;
    }
    return { status:200, body:{ ok:true, view:this.view(seat) } };
  }

  view(seat) {
    const state = this.#state;
    if (!state) return null;
    const view = viewForSeat(state, seat, this.#revision, this.#events, this.#rules);
    const ownPriority = view.prioritySeat === seat && !view.result;
    view.choices = {
      normalSpawn:ownPriority && this.#rules.canNormalSummon(state,seat),
      payWith:ownPriority && view.phase === 'end' ? Array.from(this.#rules.getEligibleCatalysts(state,seat)) : [],
      extract:ownPriority && view.phase === 'end' ? Array.from(this.#rules.getEligibleBoxTargets(state,seat,'extraction')) : [],
      rescue:ownPriority && view.phase === 'end' ? Array.from(this.#rules.getEligibleBoxTargets(state,seat,'rescue')) : [],
      counters:ownPriority && view.waitingForResponse
        ? Array.from(this.#rules.getRespondableTricks(state,seat), option => option.zone) : []
    };
    if (view.result) view.rematchReady = this.#rematchDecks.map(Boolean);
    return view;
  }

  act(seat, action, revision) {
    if (!this.#state || this.#state.gameOver) return { status:409, body:{ error:'There is no active duel.' } };
    if (revision !== this.#revision) return { status:409, body:{ error:'The duel advanced. Refresh your view.' } };
    const handler = commands.get(action?.type);
    if (!handler || (action.player !== undefined && action.player !== seat) ||
        (action.attacker !== undefined && action.attacker !== seat)) {
      return { status:400, body:{ error:'This command is unavailable for your seat.' } };
    }
    const state = this.#state;
    if (action.type !== 'concede') {
      const hasPriority = state.waitingForResponse ? seat === state.currentResponder : seat === state.activePlayer;
      const response = action.type === 'passChain' || action.type === 'queueConcealedResponse';
      if (!hasPriority || response !== state.waitingForResponse ||
          (!!state.pendingDiscard !== (action.type === 'discardForHandLimit'))) {
        return { status:400, body:{ error:'This command is unavailable in the current window.' } };
      }
    }
    const next = this.#rules.clone(state);
    let result;
    try { result = handler(this.#rules, next, seat, action); } catch { result = reject(); }
    // An engine message can contain the name of a hidden card. Use a public reason.
    if (!result?.ok) return { status:400, body:{ error:'That action is not legal.' } };
    this.#state = next;
    this.#revision += 1;
    this.#events.push({ revision:this.#revision, seat, action:action.type, phase:next.phaseName });
    if (this.#events.length > 50) this.#events.shift();
    return { status:200, body:{ ok:true, view:this.view(seat) } };
  }
}
