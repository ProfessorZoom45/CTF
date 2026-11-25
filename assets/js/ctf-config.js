(function(global){
  const CTF_CONFIG = {
    build: {
      version: '0.16.0-browser',
      label: 'Browser Game',
      releasedAt: '2026-10-28'
    },
    beta: {
      browserFirst: true,
      cardsViewable: true,
      deckbuilder: true,
      tutorial: true,
      hotSeat: true,
      sandbox: true,
      betaSignup: true,
      discordInvite: 'https://discord.gg/cKj3ayt2Mp',
      discordInviteLimit: null,
      accountSystems: 'Later',
      futureStack: ['Node/Express','PostgreSQL','WebRTC friend matches']
    },
    game: {
      startingChi: 10000,
      startingHand: 5,
      handLimit: 7,
      draw: {
        emptyDeckEndsGame: false,
        emptyDeckBehavior: 'Skip draw and continue'
      },
      deck: {
        mainMin: 40,
        mainMax: 60,
        fusionMax: 15,
        sideMin: 0,
        sideMax: 15,
        copiesPerCard: 3
      },
      great: {
        maxPerName: 1,
        maxPerDeck: 5,
        maxPerMainDeck: 5,
        maxPerFusionDeck: 5,
        maxAcrossMainAndFusion: 10,
        cannotEnterBox: true,
        cannotBeExtracted: true,
        cannotPayEndPhaseCost: false
      },
      phases: [
        'Turn Start',
        'Draw Phase',
        'Ignition Phase',
        'Action Phase',
        'Battle Phase',
        'Resolution Phase',
        'End Phase'
      ],
      shotgun: {
        maxSpecialSummonsPerTurn: 5,
        opponentDrawsPerSpecialSummon: 1,
        appliesFromSummonNumber: 1,
        libraCountsAsOneSpecialSummon: true,
        triggersAfterSuccessfulSpawn: true,
        timingWindow: 'After a qualifying Special Spawn resolves, before any on-Spawn effect or the next player action begins.',
        failedOrNegatedSpawnsCount: false,
        failedOrNegatedSpawnsDraw: false,
        summary: 'Immediately after each qualifying Special Spawn resolves, before any on-Spawn effect or the next player action begins, the opponent draws 1 card. Announcing a Spawn does not trigger Shotgun. Failed or negated Spawns do not count or draw. A whole Libra group resolves first, then counts as 1 Special Spawn and 1 draw. Hard cap: 5 Special Spawns per turn.'
      },
      libra: {
        requiresNormalCatalysts: true,
        usesOutermostTrickZones: true,
        validLevelsRule: 'strictly between both Scale values',
        maxCatalystsPerSummon: 5,
        countsAsExactlyOneSpecialSummon: true,
        causesExactlyOneShotgunDrawTotal: true,
        noExtraLibraDraw: true,
        treatedAsTricksWhileInZone: true,
        cannotBeEndPhaseSacrifice: true,
        destroyedScaleDoesNotRemoveExistingSummons: true,
        summary: 'Place Normal Catalysts in the two outermost Libra Zones. Their Ranks become your Scales. You may Libra Spawn up to 5 Catalysts whose Ranks are strictly between those Scales. The whole Libra Spawn counts as exactly 1 Special Spawn and causes exactly 1 Shotgun draw total.'
      },
      assertions: {
        sideDeckOptionalRange: '0–15',
        shotgunAppliesToEverySpecialSummon: true,
        freeEndTurnInLockedBetaPath: true,
        openingHandIsFive: true,
        deckOutIsNotALoss: true,
        rescueReturnsToDeckAndShuffles: true,
        paidEndPhaseActionsRequireEligibleCatalyst: true,
        endTurnAlwaysLegal: true,
        libraSummonCountsAsOneSpecialSummon: true,
        maxSpecialSummonsPerTurn: 5,
        greatCatalystsSkipBoxInBattle: true
      },
      endPhase: {
        allowFreeEndTurn: true,
        skipWhenNoEligibleCatalyst: false,
        actions: {
          endTurn: {
            name: 'END TURN',
            cost: 'No sacrifice required',
            effect: 'Finish the End Phase without using Extraction, Rescue, or Destroy Trick.',
            notes: 'Valid even when you have eligible Catalysts.'
          },
          extraction: {
            name: 'Extraction',
            cost: 'Send 1 eligible Catalyst you own and control to your Void.',
            effect: 'Move 1 opponent-owned Catalyst from your Box to its owner’s RFG.',
            notes: 'Scores +1 toward 7 Extractions on your turn.'
          },
          rescue: {
            name: 'Rescue',
            cost: 'Sacrifice 1 eligible Catalyst → Void',
            effect: 'Return 1 of your own Catalysts from the opponent\'s Box to your Deck.',
            notes: 'Shuffle your Deck after Rescue.'
          },
          destroyTrick: {
            name: 'Destroy Trick',
            cost: 'Sacrifice 1 eligible Catalyst → Void',
            effect: 'Destroy 1 Trick card on the field.',
            notes: 'Can target either player\'s Trick. Does not count as a Kill.'
          }
        }
      }
    }
  };

  const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
  const ui = {
    number: fmtNum,
    get mainDeckRange(){ return `${CTF_CONFIG.game.deck.mainMin}–${CTF_CONFIG.game.deck.mainMax}`; },
    get fusionDeckRange(){ return `0–${CTF_CONFIG.game.deck.fusionMax}`; },
    get sideDeckRange(){ return `${CTF_CONFIG.game.deck.sideMin}–${CTF_CONFIG.game.deck.sideMax}`; },
    get sideDeckMax(){ return `${CTF_CONFIG.game.deck.sideMax}`; },
    get startingChi(){ return fmtNum(CTF_CONFIG.game.startingChi); },
    get handLimit(){ return `${CTF_CONFIG.game.handLimit}`; },
    get phaseCount(){ return `${CTF_CONFIG.game.phases.length}`; },
    get phaseList(){ return CTF_CONFIG.game.phases.join(' → '); },
    get greatCap(){ return `${CTF_CONFIG.game.great.maxPerMainDeck}`; },
    get greatFusionCap(){ return `${CTF_CONFIG.game.great.maxPerFusionDeck}`; },
    get greatCombinedCap(){ return `${CTF_CONFIG.game.great.maxAcrossMainAndFusion}`; },
    get shotgunSummary(){ return CTF_CONFIG.game.shotgun.summary; },
    get endTurnSummary(){ const a=CTF_CONFIG.game.endPhase.actions.endTurn; return `${a.cost}. ${a.effect} ${a.notes}`; },
    get extractionSummary(){ const a=CTF_CONFIG.game.endPhase.actions.extraction; return `${a.cost}. ${a.effect} ${a.notes}`; },
    get rescueSummary(){ const a=CTF_CONFIG.game.endPhase.actions.rescue; return `${a.cost}. ${a.effect} ${a.notes}`; },
    get destroyTrickSummary(){ const a=CTF_CONFIG.game.endPhase.actions.destroyTrick; return `${a.cost}. ${a.effect} ${a.notes}`; },
    get libraSummary(){ return CTF_CONFIG.game.libra.summary; },
    get logicTestAssumptions(){ return [
      `Substitute Deck: ${CTF_CONFIG.game.assertions.sideDeckOptionalRange}`,
      'Shotgun: every Special Spawn draws 1 for the opponent',
      'END TURN: locked beta path and always legal',
      `Opening hand: ${CTF_CONFIG.game.startingHand}`,
      'Deck-out: skip draw, not a loss',
      'Rescue: returns to Deck and shuffles',
      'Paid End Phase actions: choose an eligible Catalyst you own and control',
      `Libra: ${CTF_CONFIG.game.libra.summary}`,
      `Special Spawn cap: ${CTF_CONFIG.game.assertions.maxSpecialSummonsPerTurn}`,
      'Great Catalyst defeated in Counter Pressure: owner’s Void and one battle Kill'
    ].join(' • '); },
    get discordLimitNote(){ return 'Join Perfect Timing Gaming to request exclusive alpha download access.'; }
  };

  function resolvePath(path){
    return path.split('.').reduce((acc,key)=>acc && acc[key], {CTF_CONFIG, ui});
  }

  function hydrate(root=document){
    root.querySelectorAll('[data-ctf]').forEach((el)=>{
      const key = el.getAttribute('data-ctf');
      const val = resolvePath(key);
      if (val == null) return;
      if (el.tagName === 'A' && el.hasAttribute('data-ctf-href')) el.href = String(val);
      else el.textContent = String(val);
    });
  }

  global.CTF_CONFIG = CTF_CONFIG;
  global.CTF_UI = ui;
  global.hydrateCTFConfig = hydrate;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => hydrate(document));
  }
})(window);
