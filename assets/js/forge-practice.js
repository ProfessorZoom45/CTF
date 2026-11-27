/* Draft cards exist only in the guided practice tab. */
(function (global) {
  'use strict';

  const cards = new Map();
  const slots = ['Catalyst 1', 'Catalyst 2', 'Catalyst 3', 'Great Fusion', 'Trick'];
  const trickRule = /^Target 1 Catalyst you control that is face-up; it gains (\d{1,3}) (Pressure|Counter Pressure) until the end of this turn\.$/i;
  const spawnRule = /^When this card is (Normal|Special) Spawned, draw 1 card\.$/i;
  const boostText = stat => 'Target 1 Catalyst you control that is face-up; it gains 300 ' + stat + ' until the end of this turn.';
  const presets = {
    normalDraw: {
      label: 'Draw on Normal Spawn',
      text: 'When this card is Normal Spawned, draw 1 card.',
      timing: 'After this card’s Normal Spawn resolves, before the next player action begins.'
    },
    specialDraw: {
      label: 'Draw on Special Spawn',
      text: 'When this card is Special Spawned, draw 1 card.',
      timing: 'After any Shotgun draw from this card’s Special Spawn resolves, before the next player action begins.'
    },
    pressure: { label: 'Grant 300 Pressure', text: boostText('Pressure'), timing: '' },
    counterPressure: { label: 'Grant 300 Counter Pressure', text: boostText('Counter Pressure'), timing: '' }
  };

  function compileEffect(card, isTrick) {
    const text = card.effectText.trim();
    const trick = text.match(trickRule);
    if (isTrick) {
      if (!card.timingWindow?.trim() && trick && Number(trick[1]) >= 1 && Number(trick[1]) <= 300) {
        return { type: 'boost', amount: Number(trick[1]), stat: trick[2].toLowerCase() };
      }
      return null;
    }

    const spawn = text.match(spawnRule);
    if (spawn && ['Effect', 'Fusion'].includes(card.effectClass)) {
      const kind = spawn[1].toLowerCase();
      const timing = presets[kind === 'special' ? 'specialDraw' : 'normalDraw'].timing;
      if (card.timingWindow?.trim() === timing && (card.effectClass !== 'Fusion' || kind === 'special')) {
        return { type: 'draw', spawn: kind };
      }
    }
    return null;
  }

  function create(draft, baseDeck) {
    const draftCards = draft.cards.map((card, index) => {
      const isTrick = index === 4;
      const effect = compileEffect(card, isTrick);
      const cardType = isTrick ? card.trickType : index === 3 ? 'Fusion' : 'Catalyst';
      const isNormal = !isTrick && card.effectClass === 'Normal';
      const text = isNormal ? card.lore : card.effectText;
      return {
        id: 'forge-practice-' + (index + 1),
        // The engine uses canonical names to select scripted card effects.
        name: 'Forge Practice ' + (index < 3 && global.CTFDeckUtils.isGreatCard(card) ? 'Great ' : '') + slots[index],
        displayName: card.name.trim(),
        cardType,
        sub: isTrick ? '' : card.effectClass,
        set: 'Private Forge',
        desc: '',
        printedText: [text, card.timingWindow, card.fusionRules, card.resolution].filter(Boolean).join('\n\n'),
        level: Number(card.rank || 0),
        pr: Number(card.pressure || 0),
        cp: Number(card.counterPressure || 0),
        alignment: isTrick ? '' : card.alignment,
        kinds: isTrick ? [] : [card.race, card.skill],
        kindsStr: isTrick ? '' : card.race + ' / ' + card.skill,
        practiceEffect: effect,
        practiceNote: isNormal || effect
          ? 'Available in this practice duel.'
          : isTrick
            ? 'Reference only. Use the Forge practice template to activate this Trick here.'
            : 'Stats and placement are playable. This free-text effect shows for reference only.'
      };
    });

    const fusion = draftCards[3];
    fusion.practiceFusion = {
      requiresFieldAndHand: true,
      materials: [draft.cards[3].materialOne, draft.cards[3].materialTwo].map(index => {
        const card = draftCards[Number(index)];
        return { label: card.displayName, exact: card.name, cardType: 'Catalyst' };
      })
    };
    const main = draftCards.filter(card => card.cardType !== 'Fusion').map(card => card.id);
    const deck = {
      ...baseDeck,
      name: 'Private Forge Practice',
      main: [...main, ...baseDeck.main],
      fusion: [fusion.id],
      fixedOpeningHand: [...main, 'zf1-026']
    };
    return { cards: draftCards, deck };
  }

  function getTarget(state, player, manual) {
    const zone = manual?.targetZone;
    const slot = Number.isInteger(zone) && state.players[player].catalysts[zone];
    return slot && !slot.faceDown && slot.cardId === manual.targetCardId ? slot : null;
  }

  function validateTrick(state, player, card, manual) {
    if (!card.practiceNote) return null;
    if (card.practiceEffect?.type !== 'boost') return card.practiceNote;
    if (!getTarget(state, player, manual)) return 'Choose one of your face-up Catalysts first.';
    return null;
  }

  function resolveTrick(state, player, card, manual) {
    const slot = getTarget(state, player, manual);
    if (!slot) {
      addLog(state, 'The Forge Trick’s target is no longer eligible.');
      return;
    }
    const { stat, amount } = card.practiceEffect;
    const prior = slot.practiceBoost;
    const boost = prior?.turn === state.turn && prior.activePlayer === state.activePlayer
      ? prior : { turn: state.turn, activePlayer: state.activePlayer, pr: 0, cp: 0 };
    boost[stat === 'pressure' ? 'pr' : 'cp'] += amount;
    slot.practiceBoost = boost;
    addLog(state, 'Forge practice effect: the chosen Catalyst gained ' + amount + ' ' + stat + ' until end of turn.');
  }

  function getBoost(state, slot, stat) {
    const boost = slot.practiceBoost;
    return boost?.turn === state.turn && boost.activePlayer === state.activePlayer ? boost[stat] : 0;
  }

  function onSpawn(state, player, zone, spawn) {
    const card = cards.get(state.players[player].catalysts[zone]?.cardId);
    if (card?.practiceEffect?.type === 'draw' && card.practiceEffect.spawn === spawn) {
      drawCard(state, player);
    }
  }

  global.CTF_FORGE_PRACTICE = {
    presets,
    create,
    use(practice) {
      cards.clear();
      for (const card of practice?.cards || []) cards.set(card.id, card);
    },
    getCard: id => cards.get(id),
    validateTrick,
    resolveTrick,
    getBoost,
    onSpawn
  };
})(window);
