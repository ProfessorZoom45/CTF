/* CARRY THE FLAME — Tutorial Coach Helpers v3.2 */
(function(){
  'use strict';

  const PHASE_TIPS = {
    turnStart: 'Turn Start: automatic start-of-turn effects resolve here.',
    draw: 'Draw Phase: draw 1 card. Empty deck is not a loss in CTF.',
    ignition: 'Ignition Phase: ongoing effects and upkeep-style effects check here.',
    action: 'Action Phase: spawn, set Tricks, activate Palm Tricks, change one eligible position, Libra/Fusion if available.',
    battle: 'Battle Phase: attacks are optional. Player 1 cannot attack on their first turn.',
    resolution: 'Resolution Phase: battle outcomes, Chi damage, Box/Void movement, and win checks finalize.',
    end: 'End Phase: choose one action if eligible, then discard down to 7 cards.'
  };

  const WIN_TIPS = {
    chi: 'Chi KO: reduce opponent Chi to 0 for an immediate win.',
    kills: '7 Kills: destroy 7 opposing Catalysts in battle that count as Kills.',
    extraction: '7 Extractions: capture non-Great DEF Catalysts to Box, then Extract them during End Phase.'
  };

  function phaseTip(phaseName){
    return PHASE_TIPS[phaseName] || 'Follow the highlighted legal actions. When unsure, advance the phase and read the log.';
  }

  function battleTip(attacker, defender){
    if (!attacker || !defender) return 'Choose a Catalyst in Pressure position, then choose a legal target.';
    const ap = Number(attacker.pressure ?? attacker.atk ?? 0);
    const dp = defender.position === 'def' ? Number(defender.counterPressure ?? defender.def ?? 0) : Number(defender.pressure ?? defender.atk ?? 0);
    if (defender.position === 'def') {
      if (ap > dp) return defender.great ? 'Pressure beats Great Card Counter Pressure: Great goes to Void as a Kill, never Box.' : 'Pressure beats Counter Pressure: defender is Captured to your Box.';
      if (ap === dp) return 'Pressure equals Counter Pressure: no destruction, no Capture, no Chi damage.';
      return 'Pressure is lower than Counter Pressure: no Kill/Capture; attacker controller takes rebound Chi damage equal to the difference.';
    }
    if (ap > dp) return 'Pressure beats Pressure: defender goes to Void as a Kill and opponent takes Chi damage equal to the difference.';
    if (ap === dp) return 'Equal Pressure battle: both Catalysts go to Void as mutual Kills, no Chi damage.';
    return 'Your Pressure is lower: your Catalyst goes to Void and you take Chi damage equal to the difference.';
  }

  function endPhaseTip(action){
    switch(action){
      case 'extract': return 'Extraction: sacrifice 1 eligible Catalyst, then move 1 opponent card from your Box to RFG. Great Cards cannot be Extracted.';
      case 'rescue': return 'Rescue: sacrifice 1 eligible Catalyst, then shuffle one of your captured Catalysts from opponent Box back into your Deck.';
      case 'destroyTrick': return 'Destroy Trick: sacrifice 1 eligible Catalyst to destroy one Trick on the field. This does not count as a Kill.';
      default: return 'End Turn costs nothing. Use it when you do not want to pay a Catalyst for an End Phase action.';
    }
  }

  function buildLessonSummary(gs){
    if (!gs || !gs.players) return 'No active game state yet.';
    const p1 = gs.players[0] || {};
    const p2 = gs.players[1] || {};
    return `P1 Chi ${p1.chi ?? '?'} / Kills ${p1.kills ?? 0} / Extractions ${p1.extractions ?? 0} — P2 Chi ${p2.chi ?? '?'} / Kills ${p2.kills ?? 0} / Extractions ${p2.extractions ?? 0}`;
  }

  window.CTFTutorialCoach = {
    phaseTip,
    battleTip,
    endPhaseTip,
    buildLessonSummary,
    WIN_TIPS,
    PHASE_TIPS
  };
})();
