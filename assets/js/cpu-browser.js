// Browser adapter uses the same card IDs, zones, and engine commands as the human client.
(function () {
  let options = { thinkMs: 280 };
  const pause = () => options.thinkMs > 0 ? new Promise(resolve => setTimeout(resolve, options.thinkMs)) : Promise.resolve();
  async function takeTurn(state, playerIdx, onStep = () => {}) {
    for (let step = 0; step < 60 && !state.gameOver; step++) {
      if (state.waitingForResponse) {
        if (state.currentResponder !== playerIdx) return;
        passChain(state, playerIdx);
      } else if (state.activePlayer !== playerIdx) return;
      else if (state.pendingDiscard) discardForHandLimit(state, playerIdx, state.players[playerIdx].hand.length - 1);
      else if (state.phaseName === 'draw') {
        if (!state.players[playerIdx]._drawPhaseResolved) handleDrawPhaseClick(state);
        advancePhase(state);
      } else if (state.phaseName === 'action') {
        const player = state.players[playerIdx];
        const zone = player.catalysts.indexOf(null);
        const candidates = player.hand.map((id,index) => ({index,card:getCard(id)}))
          .filter(({card}) => card && card.cardType === 'Catalyst')
          .sort((a,b) => b.card.pr-a.card.pr);
        if (zone >= 0 && canNormalSummon(state,playerIdx)) {
          for (const candidate of candidates) {
            const count = candidate.card.level >= 7 ? 2 : candidate.card.level >= 5 ? 1 : 0;
            const tributes = player.catalysts.map((slot,index) => ({slot,index,card:slot && getCard(slot.cardId)}))
              .filter(item => item.slot && !/cannot be used as a? ?tribute/i.test(item.card?.desc || ''))
              .sort((a,b) => (a.card?.pr || 0)-(b.card?.pr || 0)).slice(0,count);
            if (tributes.length !== count) continue;
            if (normalSummon(state,playerIdx,candidate.index,zone,'atk',tributes.map(item=>item.index)).ok) break;
          }
        }
        advancePhase(state);
      } else if (state.phaseName === 'battle') {
        const player = state.players[playerIdx];
        let attack = null;
        for (let zone = 0; zone < 5 && !attack; zone++) {
          const slot = player.catalysts[zone];
          if (!slot || slot.position !== 'atk' || slot.attackedThisTurn || slot.cannotAttackThisTurn) continue;
          const pressure = getEffectivePressure(state,playerIdx,zone);
          const targets = getLegalAttackTargets(state,playerIdx,zone).filter(target => {
            if (target < 0) return true;
            const defender = state.players[1-playerIdx].catalysts[target];
            const value = defender.position === 'def' ? getEffectiveCounterPressure(state,1-playerIdx,target) : getEffectivePressure(state,1-playerIdx,target);
            return defender.position === 'def' ? pressure > value : pressure >= value;
          });
          if (targets.length) attack = {zone,target:targets[0]};
        }
        if (attack) {
          const result = declareAttack(state,playerIdx,attack.zone,1-playerIdx,attack.target);
          if (!result.ok) advancePhase(state);
        } else advancePhase(state);
      } else if (state.phaseName === 'end') {
        const player = state.players[playerIdx];
        const eligible = getEligibleCatalysts(state,playerIdx);
        const [target] = getEligibleBoxTargets(state, playerIdx, 'extraction');
        const extracted = eligible.length && target !== undefined &&
          endPhaseAction(state, playerIdx, 'extraction', eligible[0], target).ok;
        if (!extracted) endPhaseAction(state, playerIdx, 'endTurn');
      } else advancePhase(state);
      onStep();
      await pause();
    }
  }
  window.CTF_AI = { configure(next) { options = {...options,...next}; }, takeTurn };
  let coachEnabled = false;
  window.CTF_COACH = {
    enable() { coachEnabled = true; }, disable() { coachEnabled = false; },
    isActive() { return coachEnabled; },
    onPhaseChange() {
      if (typeof GS === 'undefined' || !GS) return;
      let panel = document.getElementById('cpu-phase-coach');
      if (!panel) {
        panel = document.createElement('div'); panel.id = 'cpu-phase-coach';
        panel.className = 'helper-panel';
        document.getElementById('actions-panel')?.after(panel);
      }
      panel.hidden = !coachEnabled || GS.turn > 3;
      if (!panel.hidden) panel.textContent = 'Coach: ' + (window.CTFTutorialCoach?.phaseTip(GS.phaseName) || 'Follow the phase rail to continue.');
    }
  };
})();
