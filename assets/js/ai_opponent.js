/* CARRY THE FLAME — VS CPU AI Opponent v3.2 */
(function(){
  'use strict';

  const AI_VERSION = '3.2';

  function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  function getPlayer(gs, idx){ return gs && gs.players ? gs.players[idx] : null; }

  function emptyZoneIndex(zones){
    if (!Array.isArray(zones)) return -1;
    return zones.findIndex(z => !z || !z.card);
  }

  function cardLevel(card){ return Number(card?.level ?? card?.LEVEL ?? 0) || 0; }
  function cardPressure(card){ return Number(card?.pressure ?? card?.atk ?? card?.ATK ?? 0) || 0; }
  function cardCounterPressure(card){ return Number(card?.counterPressure ?? card?.def ?? card?.DEF ?? 0) || 0; }
  function cardKindText(card){ return String(card?.kind || card?.kinds || card?.group || card?.GROUP || '').toLowerCase(); }
  function isCatalyst(card){
    const type = String(card?.type || card?.TYPE || card?.category || '').toLowerCase();
    const kinds = cardKindText(card);
    return type.includes('catalyst') || kinds.includes('catalyst') || kinds.includes('effect') || kinds.includes('normal');
  }
  function isTrick(card){
    const type = String(card?.type || card?.TYPE || card?.category || '').toLowerCase();
    const group = cardKindText(card);
    return type.includes('trick') || type.includes('palm') || type.includes('concealed') || group.includes('trick') || group.includes('spell') || group.includes('trap');
  }

  function chooseSummonFromHand(player){
    if (!player || !Array.isArray(player.hand)) return -1;
    let best = { idx:-1, score:-Infinity };
    player.hand.forEach((card, idx) => {
      if (!isCatalyst(card)) return;
      const level = cardLevel(card);
      let score = cardPressure(card) + cardCounterPressure(card) * 0.45;
      if (level <= 4) score += 600;
      if (level >= 5) score -= 900;
      if (level >= 7) score -= 1600;
      if (score > best.score) best = { idx, score };
    });
    return best.idx;
  }

  function chooseSetTrickFromHand(player){
    if (!player || !Array.isArray(player.hand)) return -1;
    return player.hand.findIndex(card => isTrick(card));
  }

  function chooseBestAttacker(player){
    if (!player || !Array.isArray(player.catalysts)) return -1;
    let best = { idx:-1, pressure:-1 };
    player.catalysts.forEach((slot, idx) => {
      if (!slot || !slot.card) return;
      if (slot.position && slot.position !== 'atk') return;
      const p = cardPressure(slot.card);
      if (p > best.pressure) best = { idx, pressure:p };
    });
    return best.idx;
  }

  function chooseBestTarget(opponent, attackerCard){
    if (!opponent || !Array.isArray(opponent.catalysts)) return -1;
    const atk = cardPressure(attackerCard);
    let best = { idx:-1, score:-Infinity };
    opponent.catalysts.forEach((slot, idx) => {
      if (!slot || !slot.card) return;
      const defMode = slot.position === 'def';
      const compare = defMode ? cardCounterPressure(slot.card) : cardPressure(slot.card);
      let score = atk - compare;
      if (score >= 0) score += defMode ? 200 : 400;
      if (slot.card.great) score += 150;
      if (score > best.score) best = { idx, score };
    });
    return best.idx;
  }

  function canCall(fn){ return typeof window[fn] === 'function'; }

  async function runCpuTurn(options={}){
    const gs = window.GS;
    if (!gs || gs.gameOver) return false;
    const cpuIdx = options.cpuPlayer ?? 1;
    const humanIdx = cpuIdx === 0 ? 1 : 0;
    if (gs.activePlayer !== cpuIdx) return false;
    const cpu = getPlayer(gs, cpuIdx);
    const human = getPlayer(gs, humanIdx);
    if (!cpu || !human) return false;

    const delay = Number(options.delay ?? 350);

    try {
      if (gs.phaseName === 'turnStart' || gs.phase === 0) {
        await sleep(delay);
        if (canCall('nextPhase')) window.nextPhase();
        return true;
      }

      if (gs.phaseName === 'draw' || gs.phase === 1) {
        await sleep(delay);
        if (canCall('nextPhase')) window.nextPhase();
        return true;
      }

      if (gs.phaseName === 'ignition' || gs.phase === 2) {
        await sleep(delay);
        if (canCall('nextPhase')) window.nextPhase();
        return true;
      }

      if (gs.phaseName === 'action' || gs.phase === 3) {
        await sleep(delay);
        const emptyCat = emptyZoneIndex(cpu.catalysts);
        const summonIdx = chooseSummonFromHand(cpu);
        if (emptyCat >= 0 && summonIdx >= 0 && canCall('cpuNormalSummon')) {
          window.cpuNormalSummon(cpuIdx, summonIdx, emptyCat);
          await sleep(delay);
        }

        const emptyTrick = emptyZoneIndex(cpu.tricks);
        const trickIdx = chooseSetTrickFromHand(cpu);
        if (emptyTrick >= 0 && trickIdx >= 0 && canCall('cpuSetTrick')) {
          window.cpuSetTrick(cpuIdx, trickIdx, emptyTrick);
          await sleep(delay);
        }

        if (canCall('nextPhase')) window.nextPhase();
        return true;
      }

      if (gs.phaseName === 'battle' || gs.phase === 4) {
        await sleep(delay);
        const attackerIdx = chooseBestAttacker(cpu);
        if (attackerIdx >= 0 && cpu.catalysts[attackerIdx]?.card && canCall('cpuAttack')) {
          const targetIdx = chooseBestTarget(human, cpu.catalysts[attackerIdx].card);
          window.cpuAttack(cpuIdx, attackerIdx, targetIdx);
          await sleep(delay);
        }
        if (canCall('nextPhase')) window.nextPhase();
        return true;
      }

      if (gs.phaseName === 'resolution' || gs.phase === 5) {
        await sleep(delay);
        if (canCall('nextPhase')) window.nextPhase();
        return true;
      }

      if (gs.phaseName === 'end' || gs.phase === 6) {
        await sleep(delay);
        if (canCall('cpuEndTurn')) window.cpuEndTurn(cpuIdx);
        else if (canCall('endTurn')) window.endTurn();
        return true;
      }
    } catch (err) {
      console.warn('[CTF CPU] turn error', err);
      if (canCall('showToast')) window.showToast('CPU turn helper hit a recoverable error.');
    }
    return false;
  }

  function maybeRunCpuTurn(options={}){
    const gs = window.GS;
    if (!gs || gs.gameOver) return false;
    const cpuIdx = options.cpuPlayer ?? 1;
    if (!window.CTF_CPU_ENABLED && !options.force) return false;
    if (gs.activePlayer !== cpuIdx) return false;
    if (window.__ctfCpuBusy) return false;
    window.__ctfCpuBusy = true;
    runCpuTurn(options).finally(() => { window.__ctfCpuBusy = false; });
    return true;
  }

  window.CTFAIOpponent = {
    version: AI_VERSION,
    runCpuTurn,
    maybeRunCpuTurn,
    helpers: {
      chooseSummonFromHand,
      chooseSetTrickFromHand,
      chooseBestAttacker,
      chooseBestTarget
    }
  };
})();
