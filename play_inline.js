
// ═══════════════════════════════════════
// CTF GAME CLIENT v1.0
// ═══════════════════════════════════════

let GS = null;  // GameState
let net = null;  // CTFNet instance
let myPlayer = 0; // 0 or 1
let selectedHandIdx = -1;
let logFilter = 'all';
let logSearch = '';
let deferredInstallPrompt = null;
let selectedFieldZone = null; // {type:'cat'|'trick', zone:idx}
let lastStateHash = '';
let attackMode = false;
let attackerZone = -1;
let sacrificeMode = false;
let pendingEndAction = '';
let selectedDeckIdx = 0;
let lobbyDecks = [];
let choiceModalHandler = null;
const APP_SETTINGS_KEY = 'ctf:settings';
let isSandboxMode = false;
let isHotSeatMode = false;
let lastRoomCode = localStorage.getItem('ctf:lastRoomCode') || '';
if ('serviceWorker' in navigator) { window.addEventListener('load', ()=> navigator.serviceWorker.register('service-worker.js').catch(()=>{})); }

const $ = id => document.getElementById(id);

// ═══ POSITION LABEL HELPER ═══
// Maps internal state values ('atk'/'def') to CTF display terms.
// Never expose Yu-Gi-Oh ATK/DEF to the player.
function posLabel(pos) {
  if (!pos) return 'P';
  const p = pos.toLowerCase();
  if (p === 'def') return 'CP';
  return 'P'; // 'atk' and any unknown default to Pressure
}

// ═══ CONFIRM MODAL ═══
// Replaces native browser confirm() with an in-game modal that doesn't
// block the JS thread and matches the CTF visual style.
let _confirmResolve = null;
function ctfConfirm(message, title = 'Are you sure?') {
  return new Promise((resolve) => {
    _confirmResolve = resolve;
    const modal = $('confirm-modal');
    const titleEl = $('confirm-title');
    const bodyEl  = $('confirm-body');
    if (!modal) { resolve(window.confirm(message)); return; } // graceful fallback
    if (titleEl) titleEl.textContent = title;
    if (bodyEl)  bodyEl.textContent  = message;
    modal.classList.add('show');
    // Focus the cancel button for keyboard safety (Escape / Enter pattern)
    setTimeout(() => $('confirm-cancel')?.focus(), 50);
  });
}
function resolveConfirm(value) {
  const modal = $('confirm-modal');
  if (modal) modal.classList.remove('show');
  if (typeof _confirmResolve === 'function') {
    _confirmResolve(value);
    _confirmResolve = null;
  }
}

// ═══ LOBBY ═══
const starterDecks = typeof buildStarterDecks === 'function' ? buildStarterDecks() : [];
function buildLobbyDecks(){
  const decks = starterDecks.map((d, i) => ({
    id: `starter-${i}`,
    source: 'starter',
    name: d.name,
    desc: d.desc,
    deck: { name: d.name, main: d.cards.slice(), fusion: [], side: [] }
  }));
  const custom = CTFDeckUtils.getPreparedPlayDeck();
  if (custom && (custom.main.length || custom.fusion.length || custom.side.length)) {
    decks.unshift({
      id: 'custom-saved',
      source: 'custom',
      name: custom.name || 'Saved Custom Deck',
      desc: 'Saved custom deck from Deck Builder',
      deck: custom
    });
  }
  return decks;
}
function toggleSettings(force){
  const el = $('settings-drawer');
  const bd = $('settings-backdrop');
  const show = typeof force === 'boolean' ? force : !el.classList.contains('show');
  el.classList.toggle('show', show);
  if (bd) bd.classList.toggle('active', show);
}
function loadSettings(){
  let s = { cardArt:true, contrast:false, motion:false, scale:100, compact:false, clarity:true, logMax:100 };
  try { Object.assign(s, JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}')); } catch {}
  if ($('set-card-art'))   $('set-card-art').checked   = !!s.cardArt;
  if ($('set-contrast'))  $('set-contrast').checked   = !!s.contrast;
  if ($('set-motion'))    $('set-motion').checked     = !!s.motion;
  if ($('set-scale'))   { $('set-scale').value        = String(s.scale || 100); if ($('set-scale-val')) $('set-scale-val').textContent = String(s.scale || 100); }
  if ($('set-compact'))   $('set-compact').checked    = !!s.compact;
  if ($('set-clarity'))  $('set-clarity').checked    = s.clarity !== false;
  if ($('set-log-max'))   $('set-log-max').value      = String(s.logMax || 100);
  applySettings();
}
function applySettings(){
  const s = {
    cardArt:  $('set-card-art')?.checked  !== false,
    contrast: !!$('set-contrast')?.checked,
    motion:   !!$('set-motion')?.checked,
    scale:    parseInt($('set-scale')?.value || '100', 10),
    compact:  !!$('set-compact')?.checked,
    clarity: $('set-clarity') ? !!$('set-clarity').checked : true,
    logMax:   parseInt($('set-log-max')?.value || '100', 10),
  };
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(s));
  document.body.classList.toggle('card-art-off',    !s.cardArt);
  document.body.classList.toggle('high-contrast',    s.contrast);
  document.body.classList.toggle('reduced-motion',   s.motion);
  document.body.classList.toggle('compact-zones',    s.compact);
  document.body.classList.toggle('board-clarity',   s.clarity !== false);
  document.documentElement.style.fontSize = (s.scale / 100 * 16) + 'px';
  renderAll?.();
}
function startHotSeat(){ const deck = selectedDeckPayload() || (lobbyDecks[0] && CTFDeckUtils.normalizeDeck(lobbyDecks[0].deck)); if(!deck) return showToast('No deck available.'); isHotSeatMode=true; isSandboxMode=false; initGame(deck, deck); showToast('Hot-seat local duel started.'); }
function startSandbox(){ const deck = selectedDeckPayload() || (lobbyDecks[0] && CTFDeckUtils.normalizeDeck(lobbyDecks[0].deck)); if(!deck) return showToast('No deck available.'); isSandboxMode=true; isHotSeatMode=true; initGame(deck, deck); showToast('Sandbox duel started.'); }
function reconnectRoom(){ const code = localStorage.getItem('ctf:lastRoomCode') || ''; if (!code) return showToast('No saved room code.'); $('join-input').value = code; joinRoom(); }
function showResultCard(){ if(!GS) return; const winner = GS.gameOver ? `P${GS.winner+1}` : 'In Progress'; const reason = GS.gameOver ? (GS.winReason||'Duel Ended') : 'Live Snapshot'; $('result-winner').textContent = winner; $('result-reason').textContent = reason; $('result-turn').textContent = String(GS.turn||1); $('result-phase').textContent = PHASE_NAMES[GS.phase]||'—'; const p1=GS.players[0], p2=GS.players[1]; $('result-p1').textContent = `CHI ${p1.chi} · K ${p1.kills} · E ${p1.extractions}`; $('result-p2').textContent = `CHI ${p2.chi} · K ${p2.kills} · E ${p2.extractions}`; $('result-sub').textContent = `${($('my-deck-name')?.textContent)||'Deck'} vs ${($('opp-deck-name')?.textContent)||'Deck'}`; $('result-card').classList.add('show'); }
function hideResultCard(){ $('result-card').classList.remove('show'); }
function copyResultCardText(){ const txt = `CTF Result — ${$('result-winner').textContent} — ${$('result-reason').textContent} — Turn ${$('result-turn').textContent} — ${$('result-p1').textContent} / ${$('result-p2').textContent}`; navigator.clipboard?.writeText(txt); showToast('Result summary copied.'); }

// ── EXPORT MATCH LOG ──
function downloadMatchLog() {
  if (!GS) return showToast('No active match to export.');
  const text = typeof exportMatchLog === 'function' ? exportMatchLog(GS) : 'Export function not available.';
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ctf_match_log_T${GS.turn}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Match log exported.');
}

// ── EXPORT NET DEBUG LOG ──
function downloadNetDebugLog() {
  let text = '═══ CTF Network Debug Log ═══\n';
  text += `Exported: ${new Date().toISOString()}\n`;
  text += `Room code: ${net?.roomCode || 'N/A'}\n`;
  text += `Is host: ${net?.isHost ?? 'N/A'}\n`;
  text += `My player: P${myPlayer + 1}\n`;
  text += `Last state hash: ${lastStateHash || 'N/A'}\n\n`;
  text += net && typeof net.getNetDebugLog === 'function' ? net.getNetDebugLog() : 'No network log available (local/hot-seat mode).';
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ctf_net_debug_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Network debug log exported.');
}

// ── POST-MATCH DEBUG SUMMARY ──
function showPostMatchSummary() {
  if (!GS) return showToast('No active match.');
  const summary = typeof generatePostMatchSummary === 'function' ? generatePostMatchSummary(GS) : null;
  if (!summary) return showToast('Summary function not available.');
  const p1 = summary.players[0]; const p2 = summary.players[1];
  const lines = [
    `Turns: ${summary.turns}  |  Game Over: ${summary.gameOver ? 'YES' : 'NO'}`,
    summary.gameOver ? `Winner: P${summary.winner+1} by ${summary.winMethod}` : 'Winner: In progress',
    '',
    `Total log entries: ${summary.totalActions}`,
    `Battles: ${summary.combatCount}  |  Chains: ${summary.chainCount}`,
    `Special Summons: ${summary.specialSummonCount}  |  Fusions: ${summary.fusionCount}`,
    `Libra Summons: ${summary.libraSummonCount}  |  Shotgun draws: ${summary.shotgunDraws}`,
    `Effect scripts fired: ${summary.effectScriptCount}`,
    `Desync events: ${summary.desyncEvents}`,
    '',
    `─── P1 ───`,
    `Chi: ${p1.chi} (lost ${p1.chiLost})  |  Kills: ${p1.kills}  |  Captures: ${p1.captures}  |  Extractions: ${p1.extractions}`,
    `Deck: ${p1.deckRemaining}  |  Void: ${p1.voidSize}  |  Box: ${p1.boxSize}  |  RFG: ${p1.rfgSize}`,
    `Hand: ${p1.handSize}  |  Field Catalysts: ${p1.fieldCatalysts}  |  Field Tricks: ${p1.fieldTricks}`,
    '',
    `─── P2 ───`,
    `Chi: ${p2.chi} (lost ${p2.chiLost})  |  Kills: ${p2.kills}  |  Captures: ${p2.captures}  |  Extractions: ${p2.extractions}`,
    `Deck: ${p2.deckRemaining}  |  Void: ${p2.voidSize}  |  Box: ${p2.boxSize}  |  RFG: ${p2.rfgSize}`,
    `Hand: ${p2.handSize}  |  Field Catalysts: ${p2.fieldCatalysts}  |  Field Tricks: ${p2.fieldTricks}`,
  ];
  alert('CTF Post-Match Summary\n\n' + lines.join('\n'));
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; const btn = $('install-btn'); if (btn) btn.style.display = ''; });
async function installApp(){ if (!deferredInstallPrompt) return showToast('Install prompt not ready yet.'); deferredInstallPrompt.prompt(); const choice = await deferredInstallPrompt.userChoice; if (choice && choice.outcome === 'accepted') showToast('App install started.'); deferredInstallPrompt = null; const btn = $('install-btn'); if (btn) btn.style.display = 'none'; }

function renderDeckSelect() {
  const el = $('deck-select');
  lobbyDecks = buildLobbyDecks();
  if (!lobbyDecks.length) { el.innerHTML = '<div style="color:var(--red);font-size:.8rem">No decks available. Build a deck first or make sure data.js is loaded.</div>'; return; }
  const forcedCustom = new URLSearchParams(location.search).get('deck') === 'custom';
  if (forcedCustom) {
    const idx = lobbyDecks.findIndex(d => d.source === 'custom');
    if (idx >= 0) selectedDeckIdx = idx;
  }
  selectedDeckIdx = Math.min(selectedDeckIdx, Math.max(0, lobbyDecks.length - 1));
  el.innerHTML = lobbyDecks.map((d, i) => {
    const report = CTFDeckUtils.validateDeck(d.deck, CTF_CARDS);
    const classes = `${i === selectedDeckIdx ? ' selected' : ''}${report.ok ? '' : ' invalid'}`;
    const status = report.ok
      ? `Ready · Main ${report.stats.main} · Fusion ${report.stats.fusion}`
      : `Blocked · ${report.errors[0]}`;
    return `<div class="deck-opt${classes}" onclick="selectDeck(${i})"><div><div class="deck-opt-name">${d.name}</div><div class="deck-opt-desc">${d.desc}</div><div class="deck-opt-meta">${status}</div></div></div>`;
  }).join('');
}
function selectDeck(i) { selectedDeckIdx = i; loadSettings();
renderDeckSelect();
if (lastRoomCode && $('join-input')) $('join-input').value = lastRoomCode; }
function selectedDeckEntry(){ return lobbyDecks[selectedDeckIdx] || null; }
function selectedDeckPayload(){ const entry = selectedDeckEntry(); return entry ? CTFDeckUtils.normalizeDeck(entry.deck) : null; }
function selectedDeckCheck(){ const deck = selectedDeckPayload(); return deck ? CTFDeckUtils.validateDeck(deck, CTF_CARDS) : { ok:false, errors:['No deck selected.'] }; }

function createRoom() {
  const check = selectedDeckCheck();
  if (!check.ok) { $('create-status').textContent = check.errors[0]; $('create-status').className = 'lb-status err'; return; }
  $('create-btn').disabled = true;
  $('create-status').textContent = 'Creating room...';
  $('create-status').className = 'lb-status';

  net = new CTFNet(
    (isHost) => { $('create-status').textContent = 'Opponent connected! Starting...'; $('create-status').className = 'lb-status ok'; $('net-state').textContent = 'Connected'; $('net-state').className = 'net-pill ok'; setTimeout(startGame, 500); },
    (data) => handleNetData(data),
    () => { showToast('Opponent disconnected.'); markDisconnected(); },
    (err) => { $('create-status').textContent = err; $('create-status').className = 'lb-status err'; $('create-btn').disabled = false; }
  );

  net.createRoom().then(code => {
    $('room-code').textContent = code;
    $('room-code').style.display = 'block';
    localStorage.setItem('ctf:lastRoomCode', code);
    $('net-state').textContent = 'Waiting'; $('net-state').className = 'net-pill warn';
    $('create-status').textContent = 'Waiting for opponent...';
    $('create-status').className = 'lb-status';
    myPlayer = 0;
  }).catch(e => {
    $('create-status').textContent = 'Error: ' + e.message;
    $('create-status').className = 'lb-status err';
    $('create-btn').disabled = false;
  });
}

function joinRoom() {
  const code = $('join-input').value.trim() || lastRoomCode;
  if (code.length < 4) { $('join-status').textContent = 'Enter a valid room code.'; $('join-status').className = 'lb-status err'; return; }
  const check = selectedDeckCheck();
  if (!check.ok) { $('join-status').textContent = check.errors[0]; $('join-status').className = 'lb-status err'; return; }

  $('join-btn').disabled = true;
  $('join-status').textContent = 'Connecting...';
  $('join-status').className = 'lb-status';

  net = new CTFNet(
    (isHost) => { $('join-status').textContent = 'Connected! Waiting for host to start...'; $('join-status').className = 'lb-status ok'; $('net-state').textContent = 'Connected'; $('net-state').className = 'net-pill ok'; },
    (data) => handleNetData(data),
    () => { showToast('Host disconnected.'); markDisconnected(); },
    (err) => { $('join-status').textContent = err; $('join-status').className = 'lb-status err'; $('join-btn').disabled = false; }
  );

  myPlayer = 1;
  if (code) localStorage.setItem('ctf:lastRoomCode', code);
  net.joinRoom(code).catch(e => {
    $('join-status').textContent = 'Error: ' + e.message;
    $('join-status').className = 'lb-status err';
    $('join-btn').disabled = false;
  });
}

// ═══ START GAME ═══
function startGame() {
  const myDeck = selectedDeckPayload();
  const check = selectedDeckCheck();
  if (!myDeck || !check.ok) {
    showToast(check.errors ? check.errors[0] : 'Selected deck is invalid.');
    return;
  }
  if (net && net.isHost) {
    net.send({ type: 'requestDeck' });
  }
  if (net && !net.isHost) {
    net.send({ type: 'deckChoice', deck: myDeck });
  }
  if (net && net.isHost) {
    window._hostDeck = myDeck;
    return;
  }
}

function initGame(p1Deck, p2Deck) {
  GS = createGameState(CTFDeckUtils.normalizeDeck(p1Deck), CTFDeckUtils.normalizeDeck(p2Deck));
  GS.deckMeta = { p1: CTFDeckUtils.normalizeDeck(p1Deck), p2: CTFDeckUtils.normalizeDeck(p2Deck) };
  $('lobby').style.display = 'none';
  $('game').style.display = 'grid';
  $('my-num').textContent = myPlayer + 1;
  $('opp-num').textContent = (1 - myPlayer) + 1;
  $('my-deck-name').textContent = myPlayer === 0 ? GS.deckMeta.p1.name : GS.deckMeta.p2.name;
  $('opp-deck-name').textContent = myPlayer === 0 ? GS.deckMeta.p2.name : GS.deckMeta.p1.name;
  executePhaseAuto(GS);
  updateStateHashNotice();
  clearDisconnectState();
  renderAll();
}

// ═══ NETWORKING ═══

function showIllegal(msg) {
  const el = $('illegal-panel');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
  console.warn('[CTF:Illegal]', msg);
  if (GS) addLog(GS, `[DEBUG] Illegal action warning: ${msg}`);
  setTimeout(() => { if (el.textContent === '⚠ ' + msg) el.style.display = 'none'; }, 6000);
}

function markDisconnected() {
  const el = $('net-state');
  if (el) { el.textContent = 'Disconnected'; el.className = 'net-pill err'; }
  const btn = $('reconnect-btn');
  if (btn) btn.style.display = '';
}

function clearDisconnectState() {
  const el = $('net-state');
  if (el) { el.textContent = 'Connected'; el.className = 'net-pill ok'; }
  const btn = $('reconnect-btn');
  if (btn) btn.style.display = 'none';
}

function updateStateHashNotice() {
  if (!GS || typeof computeStateHash !== 'function') return;
  const current = computeStateHash(GS);
  lastStateHash = current;
}

function applyActionLocal(action) {
  if (!GS) return { ok:false, msg:'Game not initialized.' };
  let result = { ok:true, msg:'' };
  switch (action.type) {
    case 'normalSummon': result = normalSummon(GS, action.player, action.handIdx, action.zone, action.position, action.tributeZones); break;
    case 'setTrick': result = setTrick(GS, action.player, action.handIdx, action.zone); break;
    case 'changePosition': result = changePosition(GS, action.player, action.zone); break;
    case 'attack': result = declareAttack(GS, action.attacker, action.attackerZone, action.defender, action.defenderZone); break;
    case 'advancePhase': advancePhase(GS); result = { ok:true, msg:'' }; break;
    case 'endPhaseAction': result = endPhaseAction(GS, action.player, action.action, action.sacrificeZone, action.targetIdx); break;
    case 'discardForHandLimit': result = discardForHandLimit(GS, action.player, action.handIdx); break;
    case 'activatePalmTrick': result = activatePalmTrick(GS, action.player, action.handIdx, action.manual); break;
    case 'activateSetPalmTrick': result = activateSetPalmTrick(GS, action.player, action.zone, action.manual); break;
    case 'activateSetFieldTrick': result = activateSetFieldTrick(GS, action.player); break;
    case 'placeLibraScale': result = placeLibraScale(GS, action.player, action.handIdx, action.zone); break;
    case 'libraSummon': result = libraSummon(GS, action.player, action.handIdxs, action.zoneIdxs); break;
    case 'fusionSummon': result = fusionSummon(GS, action.player, action.fusionDeckIdx, action.zone); break;
    case 'fusionSummonDetailed': result = fusionSummonDetailed(GS, action.player, action.fusionDeckIdx, action.zone, action.fieldIdxs, action.handIdxs, action.removeMode, action.manual); break;
    case 'queueConcealedResponse': result = queueConcealedResponse(GS, action.player, action.zone, action.manual); break;
    case 'toolboxIgnition': result = activateToolboxIgnition(GS, action.player, action.handIdx); break;
    case 'activateRoadToGreatness': result = activateRoadToGreatnessSearch(GS, action.player, action.payload); break;
    case 'activateAceCopy': result = activateAceCopyAbility(GS, action.player, action.targetPlayer, action.targetZone); break;
    case 'activateCatalystEffect': result = activateCatalystEffect(GS, action.player, action.zone, action.effectTag, action.manual); break;
    case 'specialSummonSerpent': result = specialSummonSerpent(GS, action.player, action.handIdx, action.zone, action.voidIdxs); break;
    case 'passChain': result = passChain(GS, action.player); break;
    default: result = { ok:false, msg:'Unknown action type.' };
  }
  renderAll();
  updateStateHashNotice();
  return result || { ok:true, msg:'' };
}

function commitAuthoritativeState() {
  if (!GS || !net || !net.isHost) return;
  const hash = (typeof computeStateHash === 'function') ? computeStateHash(GS) : '';
  lastStateHash = hash;
  net.send({ type: 'authoritativeState', state: serializeState(GS), hash });
}

function requestAction(action) {
  if (!net) {
    const result = applyActionLocal(action);
    if (!result.ok && result.msg) { showIllegal(result.msg); showToast(result.msg); }
    return result;
  }
  if (awaitingActionAck) return { ok:false, msg:'Waiting for previous action to resolve.' };
  if (net.isHost) {
    const result = applyActionLocal(action);
    if (!result.ok) { showIllegal(result.msg || 'Illegal action.'); return result; }
    commitAuthoritativeState();
    return result;
  }
  awaitingActionAck = true;
  $('net-state').textContent = 'Syncing'; $('net-state').className = 'net-pill warn';
  net.send({ type: 'actionRequest', action });
  return { ok:true, pending:true };
}

function attemptReconnect() {
  const code = localStorage.getItem('ctf:lastRoomCode') || '';
  if (!code) return showToast('No saved room code to reconnect.');
  if (!$('join-input').value.trim()) $('join-input').value = code;
  pendingReconnect = true;
  console.log('[CTF:Reconnect] Attempting reconnect to room:', code, 'myPlayer:', myPlayer, 'GS exists:', !!GS, 'hash:', lastStateHash);
  if (GS) addLog(GS, `[DEBUG] Reconnect attempt to room ${code}. Current hash: ${lastStateHash}.`);
  showToast('Trying to reconnect...');
  joinRoom();
}

function requestRematch() {
  if (!net) return showToast('Rematch is for online matches only.');
  rematchRequested = true;
  $('rematch-btn').style.display = 'none';
  console.log('[CTF:Rematch] Rematch requested. isHost:', net?.isHost, 'turn:', GS?.turn, 'winner:', GS?.winner);
  if (GS) addLog(GS, `[DEBUG] Rematch requested by P${myPlayer+1}. Previous winner: P${(GS.winner ?? -1)+1}.`);
  net.send({ type: 'rematchRequest' });
  showToast('Rematch request sent.');
}

function handleNetData(data) {
  if (!data || !data.type) return;

  switch (data.type) {
    case 'requestDeck': {
      const deck = selectedDeckPayload();
      const check = selectedDeckCheck();
      if (!deck || !check.ok) {
        $('join-status').textContent = (check.errors && check.errors[0]) || 'Deck invalid.';
        $('join-status').className = 'lb-status err';
        return;
      }
      net.send({ type: 'deckChoice', deck });
      break;
    }
    case 'deckChoice':
      if (net.isHost && window._hostDeck) {
        const p1Deck = window._hostDeck;
        const p2Deck = CTFDeckUtils.normalizeDeck(data.deck);
        const hostCheck = CTFDeckUtils.validateDeck(p1Deck, CTF_CARDS);
        const guestCheck = CTFDeckUtils.validateDeck(p2Deck, CTF_CARDS);
        if (!hostCheck.ok || !guestCheck.ok) {
          const msg = !hostCheck.ok ? hostCheck.errors[0] : guestCheck.errors[0];
          $('create-status').textContent = msg;
          $('create-status').className = 'lb-status err';
          return;
        }
        initGame(p1Deck, p2Deck);
        commitAuthoritativeState();
      }
      break;
    case 'initGame':
    case 'authoritativeState': {
      GS = deserializeState(data.state);
      $('lobby').style.display = 'none';
      $('game').style.display = 'grid';
      $('my-num').textContent = myPlayer + 1;
      $('opp-num').textContent = (1 - myPlayer) + 1;
      if (GS.deckMeta) { $('my-deck-name').textContent = myPlayer === 0 ? GS.deckMeta.p1.name : GS.deckMeta.p2.name; $('opp-deck-name').textContent = myPlayer === 0 ? GS.deckMeta.p2.name : GS.deckMeta.p1.name; }
      const incomingHash = data.hash || (typeof computeStateHash === 'function' ? computeStateHash(GS) : '');
      if (lastStateHash && incomingHash && lastStateHash !== incomingHash) {
        showIllegal(`Desync detected. Resynced to host state (${incomingHash}).`);
        $('net-state').textContent = 'Resynced'; $('net-state').className = 'net-pill warn';
      } else {
        clearDisconnectState();
      }
      awaitingActionAck = false;
      lastStateHash = incomingHash;
      renderAll();
      break;
    }
    case 'actionRequest':
      if (net.isHost) {
        const snapshot = serializeState(GS);
        const result = applyActionLocal(data.action);
        if (!result.ok) {
          GS = deserializeState(snapshot);
          net.send({ type: 'actionRejected', msg: result.msg || 'Illegal action.' });
          renderAll();
          break;
        }
        commitAuthoritativeState();
      }
      break;
    case 'actionRejected':
      awaitingActionAck = false;
      $('net-state').textContent = 'Rejected'; $('net-state').className = 'net-pill err';
      showIllegal(data.msg || 'Illegal action rejected by host.');
      showToast(data.msg || 'Illegal action rejected by host.');
      break;
    case 'stateHash':
      if (GS && typeof computeStateHash === 'function') {
        const localHash = computeStateHash(GS);
        if (data.hash && localHash !== data.hash) {
          showIllegal(`Desync flagged. Local ${localHash} vs host ${data.hash}.`);
          $('net-state').textContent = 'Desync'; $('net-state').className = 'net-pill err';
        }
      }
      break;
    case 'rematchRequest':
      $('rematch-btn').style.display = '';
      showToast('Opponent wants a rematch. Press Rematch to restart.');
      if (rematchRequested && net.isHost && GS && GS.deckMeta) {
        initGame(GS.deckMeta.p1, GS.deckMeta.p2);
        commitAuthoritativeState();
        rematchRequested = false;
      }
      break;
  }
}

function sendAction(action) {
  return requestAction(action);
}

function syncState() {
  if (!net || !GS) return;
  if (net.isHost) {
    commitAuthoritativeState();
  } else {
    net.send({ type: 'stateHash', hash: (typeof computeStateHash === 'function') ? computeStateHash(GS) : '' });
  }
}

function applyAction(action) {
  return applyActionLocal(action);
}

function openChoiceModal(title, subtitle, items, onChoose) {
  choiceModalHandler = onChoose;
  $('choice-title').textContent = title;
  $('choice-sub').textContent = subtitle || '';
  $('choice-list').innerHTML = items.map((item, idx) => `
    <button class="choice-item" onclick="pickChoiceItem(${idx})">
      <strong>${item.label}</strong>
      ${item.meta ? `<small>${item.meta}</small>` : ''}
      ${item.tag ? `<span class="choice-tag">${item.tag}</span>` : ''}
    </button>`).join('');
  $('choice-modal').classList.add('show');
}
function closeChoiceModal() { $('choice-modal').classList.remove('show'); choiceModalHandler = null; }
function pickChoiceItem(idx) { if (typeof choiceModalHandler === 'function') choiceModalHandler(idx); }


function isPalmNeedingManualChoice(card) {
  if (!card) return false;
  const name = String(card.name || '').toLowerCase();
  return [
    "terra's past",
    "hyottoko's burn",
    "aoshi's commands",
    'reverse blade sword',
    'ultimate price',
    'curse of the flame ghost',
    'phoenix soul',
    'rapier'
  ].includes(name);
}

function preparePalmActivation(card, sourceCtx, onReady) {
  if (!card || !isPalmNeedingManualChoice(card)) return onReady(null);
  const me = GS.players[myPlayer];
  const opp = GS.players[1 - myPlayer];
  const name = String(card.name || '').toLowerCase();

  const ownCats = me.catalysts.map((slot, zone) => slot ? { slot, zone, card: getCard(slot.cardId) } : null).filter(Boolean);
  const oppCats = opp.catalysts.map((slot, zone) => slot ? { slot, zone, card: getCard(slot.cardId) } : null).filter(Boolean);

  const chooseZone = (title, subtitle, items, mapFn) => {
    if (!items.length) return onReady(null);
    openChoiceModal(title, subtitle, items.map(item => mapFn(item)), (pickIdx) => {
      closeChoiceModal();
      onReady({ targetZone: items[pickIdx].zone });
    });
  };

  if (name === "terra's past") {
    const targets = ownCats.filter(x => cardNameHas(x.card, 'terra'));
    return chooseZone("Terra's Past", 'Choose a Terra Catalyst to equip.', targets, x => ({ label: `Zone C${x.zone + 1} — ${x.card?.name || 'Unknown'}`, meta: `Pressure ${x.card?.pr || 0} · Counter Pressure ${x.card?.cp || 0}` }));
  }
  if (name === "hyottoko's burn") {
    return chooseZone("Hyottoko's Burn", 'Choose an opponent Catalyst to weaken.', oppCats, x => ({ label: `Opp C${x.zone + 1} — ${x.card?.name || 'Unknown'}`, meta: `Pressure ${x.card?.pr || 0} · Counter Pressure ${x.card?.cp || 0}` }));
  }
  if (name === "aoshi's commands") {
    if (!ownCats.length || !oppCats.length) return onReady(null);
    return openChoiceModal("Aoshi's Commands", 'Choose your Catalyst to destroy first.', ownCats.map(x => ({ label: `Your C${x.zone + 1} — ${x.card?.name || 'Unknown'}`, meta: `Pressure ${x.card?.pr || 0} · Counter Pressure ${x.card?.cp || 0}` })), (selfPickIdx) => {
      const selfZone = ownCats[selfPickIdx].zone;
      closeChoiceModal();
      openChoiceModal("Aoshi's Commands", 'Choose the opponent Catalyst to destroy.', oppCats.map(x => ({ label: `Opp C${x.zone + 1} — ${x.card?.name || 'Unknown'}`, meta: `Pressure ${x.card?.pr || 0} · Counter Pressure ${x.card?.cp || 0}` })), (oppPickIdx) => {
        const oppZone = oppCats[oppPickIdx].zone;
        closeChoiceModal();
        onReady({ selfZone, oppZone });
      });
    });
  }
  if (name === 'reverse blade sword') {
    const targets = ownCats.filter(x => cardNameHas(x.card, 'himura'));
    return chooseZone('Reverse Blade Sword', 'Choose a Himura Catalyst to equip.', targets, x => ({ label: `Zone C${x.zone + 1} — ${x.card?.name || 'Unknown'}`, meta: `Pressure ${x.card?.pr || 0} · Counter Pressure ${x.card?.cp || 0}` }));
  }
  if (name === 'ultimate price') {
    const targets = me.deck.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Catalyst' && Number(x.card.cp || 0) <= 2000);
    if (!targets.length) return onReady(null);
    return openChoiceModal('Ultimate Price', 'Choose a Deck Catalyst with 2000 or less Counter Pressure.', targets.map(x => ({ label: x.card.name, meta: `Deck #${x.idx + 1} · Pressure ${x.card.pr || 0} / ${x.card.cp || 0}` })), (pickIdx) => {
      closeChoiceModal();
      onReady({ deckIdx: targets[pickIdx].idx });
    });
  }
  if (name === 'curse of the flame ghost' || name === 'rapier') {
    return chooseZone(card.name, 'Choose your Catalyst to equip.', ownCats, x => ({ label: `Zone C${x.zone + 1} — ${x.card?.name || 'Unknown'}`, meta: `Pressure ${x.card?.pr || 0} · Counter Pressure ${x.card?.cp || 0}` }));
  }
  if (name === 'phoenix soul') {
    const fireVoid = me.void.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Catalyst' && cardHasAlignment(x.card, 'Fire'));
    const modes = [
      { mode: 'double', label: 'Double FIRE Pressure', meta: 'Pay 2000 Chi. Double your FIRE Catalysts until End Phase.' },
      { mode: 'revive', label: 'Revive from Void', meta: 'Pay 1000 Chi. Special Summon 1 FIRE Catalyst from your Void.' }
    ].filter(x => x.mode !== 'revive' || fireVoid.length > 0);
    if (!modes.length) return onReady(null);
    return openChoiceModal('Phoenix Soul', 'Choose which effect to use.', modes.map(x => ({ label: x.label, meta: x.meta })), (pickIdx) => {
      const chosen = modes[pickIdx];
      closeChoiceModal();
      if (chosen.mode === 'double') return onReady({ mode: 'double' });
      openChoiceModal('Phoenix Soul', 'Choose a FIRE Catalyst in your Void to revive.', fireVoid.map(x => ({ label: x.card.name, meta: `Void #${x.idx + 1} · Pressure ${x.card.pr || 0} / ${x.card.cp || 0}` })), (voidPickIdx) => {
        closeChoiceModal();
        onReady({ mode: 'revive', voidIdx: fireVoid[voidPickIdx].idx });
      });
    });
  }

  onReady(null);
}

function prepareConcealedResponse(card, zoneIdx, onReady) {
  const me = GS.players[myPlayer];
  const name = String(card?.name || '').toLowerCase();
  if (name !== 'the chosen one') return onReady(null);
  const targets = me.deck.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Catalyst' && !/can only be special summoned|can only be summoned by/i.test(String(x.card.desc || '')));
  if (!targets.length) return onReady(null);
  openChoiceModal('The Chosen One', 'Choose the Deck Catalyst to Special Summon if this resolves.', targets.map(x => ({ label: x.card.name, meta: `Deck #${x.idx + 1} · Pressure ${x.card.pr || 0} / ${x.card.cp || 0}` })), (pickIdx) => {
    closeChoiceModal();
    onReady({ deckIdx: targets[pickIdx].idx, zoneIdx });
  });
}

function promptTributeSelectionByLevelSum(requiredTotal, onDone) {
  const me = GS.players[myPlayer];
  const candidates = me.catalysts.map((slot, zone) => slot ? { zone, slot, card: getCard(slot.cardId) } : null).filter(Boolean);
  if (!candidates.length) return showToast('No Catalysts available to tribute.');
  const chosen = [];
  const totalLevel = () => chosen.reduce((sum, zone) => sum + Number(getCard(me.catalysts[zone]?.cardId)?.level || 0), 0);
  function askNext() {
    const remaining = candidates.filter(c => !chosen.includes(c.zone));
    if (!remaining.length) return onDone(chosen.slice());
    const title = `Choose Tribute — Total Levels ${totalLevel()} / ${requiredTotal}`;
    openChoiceModal(title, 'Pick another tribute. When the total is high enough, you can finish.', remaining.map(c => ({ label: `Zone C${c.zone + 1} — ${c.card?.name || 'Unknown'}`, meta: `Lv ${c.card?.level || 0} · ${posLabel(c.slot.position)}` })), (pickIdx) => {
      chosen.push(remaining[pickIdx].zone);
      closeChoiceModal();
      if (totalLevel() >= requiredTotal) {
        openChoiceModal('Finish Tribute Selection?', `Current total Levels: ${totalLevel()}.`, [
          { label: 'Finish', meta: `Use ${chosen.length} tribute(s)` },
          { label: 'Add More', meta: 'Select another Catalyst' }
        ], (doneIdx) => {
          closeChoiceModal();
          if (doneIdx === 0) onDone(chosen.slice()); else askNext();
        });
      } else askNext();
    });
  }
  askNext();
}

function promptSerpentVoidSelection(onDone) {
  const me = GS.players[myPlayer];
  const candidates = me.void.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Catalyst');
  if (candidates.length < 4) return showToast('Need at least 4 Catalyst cards in your Void for Serpent.');
  const chosen = [];
  function countAlign(list, align) {
    return list.reduce((n, idx) => {
      const c = getCard(me.void[idx]);
      return n + (c && cardHasAlignment(c, align) ? 1 : 0);
    }, 0);
  }
  function askNext() {
    const remaining = candidates.filter(c => !chosen.includes(c.idx));
    openChoiceModal(`Serpent Materials ${chosen.length}/4`, 'Choose 4 Void Catalysts total. You need at least 2 EARTH and 2 WIND among them.', remaining.map(c => ({ label: c.card.name, meta: `Void #${c.idx + 1} · ${c.card.alignment || 'No Alignment'} · Lv ${c.card.level || 0}` })), (pickIdx) => {
      chosen.push(remaining[pickIdx].idx);
      closeChoiceModal();
      if (chosen.length >= 4) {
        const earth = countAlign(chosen, 'Earth');
        const wind = countAlign(chosen, 'Wind');
        if (earth >= 2 && wind >= 2) onDone(chosen.slice());
        else showToast(`Current Serpent pick is invalid: EARTH ${earth}, WIND ${wind}. Pick again.`), promptSerpentVoidSelection(onDone);
      } else askNext();
    });
  }
  askNext();
}

function startToolboxIgnition() {
  const me = GS.players[myPlayer];
  const equips = me.hand.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Palm Trick' && /equip/i.test(String(x.card.sub || '')));
  if (!equips.length) return showToast('No Equip Palm Trick is in your hand for Toolbox.');
  openChoiceModal('Toolbox', 'Choose an Equip Palm Trick from your hand to shuffle into your Deck.', equips.map(x => ({ label: x.card.name, meta: `Hand #${x.idx + 1}` })), (pickIdx) => {
    const handIdx = equips[pickIdx].idx;
    closeChoiceModal();
    const result = activateToolboxIgnition(GS, myPlayer, handIdx);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'toolboxIgnition', player: myPlayer, handIdx });
    renderAll();
  });
}

function startRoadToGreatnessSearch() {
  const me = GS.players[myPlayer];
  const deckTargets = me.deck.map((id, idx) => ({ idx, card: getCard(id), source: 'deck' })).filter(x => x.card && x.card.cardType === 'Catalyst' && cardNameHas(x.card, 'the great'));
  const voidTargets = me.void.map((id, idx) => ({ idx, card: getCard(id), source: 'void' })).filter(x => x.card && x.card.cardType === 'Catalyst' && cardNameHas(x.card, 'the great'));
  const all = [...deckTargets, ...voidTargets];
  if (!all.length) return showToast('No valid "The Great" target is in your Deck or Void.');
  openChoiceModal('Road To Greatness', 'Choose a "The Great" Catalyst from your Deck or Void to add to your hand.', all.map(x => ({ label: x.card.name, meta: `${x.source.toUpperCase()} #${x.idx + 1}` })), (pickIdx) => {
    const pick = all[pickIdx];
    closeChoiceModal();
    const payload = { source: pick.source, idx: pick.idx };
    const result = activateRoadToGreatnessSearch(GS, myPlayer, payload);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'activateRoadToGreatness', player: myPlayer, payload });
    renderAll();
  });
}

function startUseAceCopy() {
  const targets = [];
  GS.players.forEach((pl, playerIdx) => {
    pl.catalysts.forEach((slot, zone) => {
      if (!slot) return;
      const card = getCard(slot.cardId);
      targets.push({ playerIdx, zone, card });
    });
  });
  if (!targets.length) return showToast('No Catalyst is available for Ace The Great to copy.');
  openChoiceModal('Ace The Great', 'Choose a field Catalyst for Ace The Great to copy.', targets.map(t => ({ label: `P${t.playerIdx + 1} C${t.zone + 1} — ${t.card?.name || 'Unknown'}`, meta: `Pressure ${t.card?.pr || 0} / ${t.card?.cp || 0}` })), (pickIdx) => {
    const pick = targets[pickIdx];
    closeChoiceModal();
    const result = activateAceCopyAbility(GS, myPlayer, pick.playerIdx, pick.zone);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'activateAceCopy', player: myPlayer, targetPlayer: pick.playerIdx, targetZone: pick.zone });
    renderAll();
  });
}


function startUseCatalystAbility() {
  const options = getActivatableCatalystAbilities(GS, myPlayer) || [];
  if (!options.length) return showToast('No activatable Catalyst abilities are available right now.');
  openChoiceModal('Use Catalyst Ability', 'Choose a Catalyst ability to activate.', options.map(o => ({ label: `${o.card?.name || 'Unknown'} — C${o.zoneIdx + 1}`, meta: o.effect?.action || o.effect?.tag || 'Activated ability' })), (pickIdx) => {
    const pick = options[pickIdx];
    closeChoiceModal();
    const manual = null;
    const result = activateCatalystEffect(GS, myPlayer, pick.zoneIdx, pick.effect?.action || pick.effect?.tag, manual);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'activateCatalystEffect', player: myPlayer, zone: pick.zoneIdx, effectTag: pick.effect?.action || pick.effect?.tag, manual });
    renderAll();
  });
}

function promptTributeSelection(requiredTributes, onDone) {
  const me = GS.players[myPlayer];
  const candidates = me.catalysts.map((c, i) => c ? { zone: i, card: getCard(c.cardId), pos: c.position } : null).filter(Boolean);
  let chosen = [];
  function askNext() {
    const remaining = candidates.filter(c => !chosen.includes(c.zone));
    openChoiceModal(
      `Choose Tribute ${chosen.length + 1} of ${requiredTributes}`,
      'Select the Catalyst you want to send to the Void as Tribute.',
      remaining.map(c => ({ label: `Zone C${c.zone + 1} — ${c.card ? c.card.name : 'Unknown'}`, meta: `${posLabel(c.pos)} · ${c.card ? `Lv ${c.card.level || 0} · ${c.card.pr || 0}/${c.card.cp || 0}` : ''}` })),
      (pickIdx) => {
        chosen.push(remaining[pickIdx].zone);
        if (chosen.length >= requiredTributes) { closeChoiceModal(); onDone(chosen); } else { askNext(); }
      }
    );
  }
  askNext();
}

function promptEndPhaseAction(action) {
  const eligible = getEligibleCatalysts(GS, myPlayer);
  if (!eligible.length) { showToast('No eligible Catalysts to sacrifice.'); return; }
  const me = GS.players[myPlayer];
  openChoiceModal(
    'Choose Sacrifice',
    'Pick the Catalyst to sacrifice for this End Phase action.',
    eligible.map(zone => { const slot = me.catalysts[zone]; const card = slot ? getCard(slot.cardId) : null; return { label: `Zone C${zone + 1} — ${card ? card.name : 'Unknown'}`, meta: `${slot ? posLabel(slot.position) : ''} · ${card ? `Lv ${card.level || 0} · ${card.pr || 0}/${card.cp || 0}` : ''}`, tag: action.toUpperCase() }; }),
    (pickIdx) => {
      const sacrificeZone = eligible[pickIdx];
      closeChoiceModal();
      if (action === 'extraction') return promptExtractionTarget(sacrificeZone);
      if (action === 'rescue') return promptRescueTarget(sacrificeZone);
      if (action === 'destroyTrick') return promptDestroyTrickTarget(sacrificeZone);
    }
  );
}

function promptExtractionTarget(sacrificeZone) {
  const me = GS.players[myPlayer];
  openChoiceModal('Choose Extraction Target', 'Pick which card in your Box to Extract.', me.box.map((id, idx) => {
    const c = getCard(id);
    return { label: `${c ? c.name : 'Unknown Card'}`, meta: `Box Slot ${idx + 1}${c ? ` · ${c.cardType} · ${c.set}` : ''}` };
  }), async (pickIdx) => {
    closeChoiceModal();
    // Ask the player to confirm the extraction. This prevents accidental moves.
    const targetCard = getCard(me.box[pickIdx]);
    const confirmMsg = targetCard ? `Extract ${targetCard.name} from your Box?` : 'Confirm Extraction?';
    if (!await ctfConfirm(confirmMsg, 'Confirm Extraction')) return;
    const result = endPhaseAction(GS, myPlayer, 'extraction', sacrificeZone, pickIdx);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'endPhaseAction', player: myPlayer, action: 'extraction', sacrificeZone, targetIdx: pickIdx });
    renderAll();
  });
}

function promptRescueTarget(sacrificeZone) {
  const opp = GS.players[1 - myPlayer];
  openChoiceModal(
    'Choose Rescue Target',
    'Pick which of your cards to Rescue from the opponent\'s Box.',
    opp.box.map((id, idx) => {
      const c = getCard(id);
      return { label: `${c ? c.name : 'Unknown Card'}`, meta: `Opponent Box Slot ${idx + 1}${c ? ` · ${c.cardType} · ${c.set}` : ''}` };
    }),
    async (pickIdx) => {
      closeChoiceModal();
      // Confirm rescue so the player doesn't accidentally pick the wrong card.
      const targetCard = getCard(opp.box[pickIdx]);
      const confirmMsg = targetCard ? `Rescue ${targetCard.name} from your opponent's Box?` : 'Confirm Rescue?';
      if (!await ctfConfirm(confirmMsg, 'Confirm Rescue')) return;
      const result = endPhaseAction(GS, myPlayer, 'rescue', sacrificeZone, pickIdx);
      if (!result.ok) return showToast(result.msg);
      sendAction({ type: 'endPhaseAction', player: myPlayer, action: 'rescue', sacrificeZone, targetIdx: pickIdx });
      renderAll();
    }
  );
}

function promptDestroyTrickTarget(sacrificeZone) {
  const targets = [];
  GS.players.forEach((pl, player) => {
    if (pl.fieldTrick) { const c = getCard(pl.fieldTrick.cardId); targets.push({ payload: { player, kind: 'field' }, label: `P${player + 1} Field — ${c ? c.name : 'Unknown Field Trick'}`, meta: 'Field Trick' }); }
    pl.tricks.forEach((slot, zone) => { if (slot) { const c = getCard(slot.cardId); targets.push({ payload: { player, kind: 'trick', zone }, label: `P${player + 1} Trick ${zone + 1} — ${c ? c.name : 'Face-down / Unknown'}`, meta: slot.faceDown ? 'Set Trick' : (c ? c.cardType : 'Trick') }); } });
  });
  if (!targets.length) return showToast('No Trick cards are on the field.');
  openChoiceModal(
    'Choose Trick Target',
    'Pick any Trick or Field Trick on the field to destroy.',
    targets,
    async (pickIdx) => {
      closeChoiceModal();
      const target = targets[pickIdx].payload;
      const label = targets[pickIdx].label || 'this Trick';
      if (!await ctfConfirm(`Destroy ${label}?`, 'Confirm Destroy')) return;
      const result = endPhaseAction(GS, myPlayer, 'destroyTrick', sacrificeZone, target);
      if (!result.ok) return showToast(result.msg);
      sendAction({ type: 'endPhaseAction', player: myPlayer, action: 'destroyTrick', sacrificeZone, targetIdx: target });
      renderAll();
    }
  );
}




function flipMyFieldTrick() {
  const result = activateSetFieldTrick(GS, myPlayer);
  if (!result.ok) return showToast(result.msg);
  sendAction({ type: 'activateSetFieldTrick', player: myPlayer });
  renderAll();
}

async function fieldSlotClick() {
  if (!GS || GS.gameOver) return;
  if (GS.activePlayer !== myPlayer || GS.phaseName !== 'action') return;
  const me = GS.players[myPlayer];
  const selected = selectedHandIdx >= 0 ? getCard(me.hand[selectedHandIdx]) : null;
  if (selected && selected.cardType === 'Field Trick') {
    const handIdx = selectedHandIdx;
    if (me.fieldTrick) {
      const current = getCard(me.fieldTrick.cardId);
      const ok = await ctfConfirm(`Replace ${current ? current.name : 'the current Field Trick'} with ${selected.name}? The current Field Trick will be sent to the Void.`, 'Replace Field Trick?');
      if (!ok) return;
    }
    const result = setTrick(GS, myPlayer, handIdx, -1);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'setTrick', player: myPlayer, handIdx, zone: -1 });
    selectedHandIdx = -1;
    renderAll();
    return;
  }
  if (me.fieldTrick?.faceDown) {
    const card = getCard(me.fieldTrick.cardId);
    const ok = await ctfConfirm(`Activate set Field Trick ${card ? card.name : ''}?`, 'Activate Field Trick?');
    if (!ok) return;
    flipMyFieldTrick();
    return;
  }
  showToast('Select a Field Trick from your hand first, or flip your set Field Trick.');
}

function refreshInteractiveA11y() {
  document.querySelectorAll('.deck-opt,.choice-item,.hand-card,.zone,.field-slot,.log-filter,.act-btn,.lb-btn').forEach((el) => {
    if (!el.hasAttribute('tabindex') && !el.matches('button,input,select,textarea,a[href]')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role') && (el.classList.contains('deck-opt') || el.classList.contains('choice-item') || el.classList.contains('hand-card') || el.classList.contains('zone') || el.classList.contains('field-slot'))) el.setAttribute('role', 'button');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (t.id === 'my-field-slot') { e.preventDefault(); fieldSlotClick(); return; }
  if (t.classList.contains('zone') || t.classList.contains('deck-opt') || t.classList.contains('choice-item') || t.classList.contains('hand-card') || t.classList.contains('log-filter')) {
    e.preventDefault();
    t.click();
  }
});

function startActivatePalm() {
  if (selectedHandIdx < 0) return showToast('Select a Palm Trick from your hand first.');
  const c = getCard(GS.players[myPlayer].hand[selectedHandIdx]);
  if (!c || c.cardType !== 'Palm Trick') return showToast('Selected card is not a Palm Trick.');
  const handIdx = selectedHandIdx;
  preparePalmActivation(c, { handIdx }, (manual) => {
    const result = activatePalmTrick(GS, myPlayer, handIdx, manual);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'activatePalmTrick', player: myPlayer, handIdx, manual });
    selectedHandIdx = -1;
    renderAll();
  });
}

function startLibraSummon() {
  const scales = getLibraScales(GS, myPlayer);
  if (!scales) return showToast('Place two Normal Catalysts in the Libra Zones first.');
  const me = GS.players[myPlayer];
  const eligible = me.hand.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Catalyst' && (x.card.level||0) > scales.min && (x.card.level||0) < scales.max);
  const emptyZones = me.catalysts.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  if (!eligible.length) return showToast('No hand Catalysts fit between your Libra Scales.');
  if (!emptyZones.length) return showToast('No empty Catalyst Zones are available.');
  let chosenHands = [];
  let chosenZones = [];
  function askCard() {
    const remainingCards = eligible.filter(x => !chosenHands.includes(x.idx));
    const remainingZones = emptyZones.filter(z => !chosenZones.includes(z));
    if (!remainingCards.length || !remainingZones.length || chosenHands.length >= 5) return finish();
    openChoiceModal(`Libra Summon — Choose Card ${chosenHands.length + 1}`, `Scales ${scales.left} and ${scales.right}. Choose a Catalyst to Special Summon.`, remainingCards.map(x => ({ label: x.card.name, meta: `Lv ${x.card.level || 0} · ${x.card.pr || 0}/${x.card.cp || 0}` })), (pickIdx) => {
      const chosenCard = remainingCards[pickIdx];
      closeChoiceModal();
      openChoiceModal('Choose Destination Zone', 'Pick an empty Catalyst Zone.', remainingZones.map(z => ({ label: `Catalyst Zone C${z + 1}` })), (zonePickIdx) => {
        chosenHands.push(chosenCard.idx);
        chosenZones.push(remainingZones[zonePickIdx]);
        closeChoiceModal();
        const afterCards = eligible.filter(x => !chosenHands.includes(x.idx));
        const afterZones = emptyZones.filter(z => !chosenZones.includes(z));
        if (!afterCards.length || !afterZones.length || chosenHands.length >= 5) return finish();
        openChoiceModal('Continue Libra Summon?', 'A Libra Summon can bring out up to 5 Catalysts at once.', [{ label: 'Add another Catalyst', meta: 'Keep building this Libra Summon' }, { label: 'Finish Libra Summon', meta: `Summon ${chosenHands.length} chosen card(s) now` }], (contIdx) => {
          closeChoiceModal();
          if (contIdx === 0) askCard(); else finish();
        });
      });
    });
  }
  function finish() {
    if (!chosenHands.length) return showToast('No Catalysts were chosen for the Libra Summon.');
    const result = libraSummon(GS, myPlayer, chosenHands, chosenZones);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'libraSummon', player: myPlayer, handIdxs: chosenHands, zoneIdxs: chosenZones }); renderAll();
  }
  askCard();
}

function startFusionSummon() {
  const me = GS.players[myPlayer];
  const options = getAvailableFusionSummons(GS, myPlayer);
  if (!options.length) return showToast('No legal Fusion Summon is available right now.');
  const emptyZones = me.catalysts.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  if (!emptyZones.length) return showToast('No empty Catalyst Zones are available.');
  const activeField = me.fieldTrick ? getCard(me.fieldTrick.cardId) : null;
  const detailed = !!(me.fieldTrick && !me.fieldTrick.faceDown && activeField && /fusion zone/i.test(activeField.name || ''));
  openChoiceModal('Choose Fusion Card', 'Select the Fusion Monster you want to bring out.', options.map(o => ({ label: o.fusionCard.name, meta: `Materials: ${o.materials.join(' + ')}` })), (pickIdx) => {
    const picked = options[pickIdx];
    closeChoiceModal();
    openChoiceModal('Choose Fusion Zone', 'Pick an empty Catalyst Zone for the Fusion Summon.', emptyZones.map(z => ({ label: `Catalyst Zone C${z + 1}` })), (zonePickIdx) => {
      const zone = emptyZones[zonePickIdx];
      closeChoiceModal();
      if (!detailed) {
        const result = fusionSummon(GS, myPlayer, picked.fusionDeckIdx, zone);
        if (!result.ok) return showToast(result.msg);
        sendAction({ type: 'fusionSummon', player: myPlayer, fusionDeckIdx: picked.fusionDeckIdx, zone });
        return renderAll();
      }
      const chosenFieldIdxs = [];
      const chosenHandIdxs = [];
      const steps = Array.isArray(picked.steps) ? picked.steps.slice() : [];
      function finish(manual) {
        const result = fusionSummonDetailed(GS, myPlayer, picked.fusionDeckIdx, zone, chosenFieldIdxs, chosenHandIdxs, 'rfg', manual || null);
        if (!result.ok) return showToast(result.msg);
        sendAction({ type: 'fusionSummonDetailed', player: myPlayer, fusionDeckIdx: picked.fusionDeckIdx, zone, fieldIdxs: chosenFieldIdxs, handIdxs: chosenHandIdxs, removeMode: 'rfg', manual: manual || null });
        renderAll();
      }
      function afterMaterials() {
        const fusionName = String(picked.fusionCard?.name || '').toLowerCase();
        if (fusionName.includes('destin')) {
          const warriorOptions = me.hand.map((id, idx) => ({ idx, card: getCard(id) })).filter(x => x.card && x.card.cardType === 'Catalyst' && Number(x.card.pr || 0) <= 1000 && (x.card.kinds || []).some(k => /warrior/i.test(k)));
          if (!warriorOptions.length) return finish(null);
          openChoiceModal('Destin Follow-Up', 'Choose the Warrior in your hand that Destin will Special Summon.', warriorOptions.map(x => ({ label: x.card.name, meta: `Hand #${x.idx + 1} · Pressure ${x.card.pr || 0}` })), (wpick) => {
            closeChoiceModal();
            finish({ destin: { handIdx: warriorOptions[wpick].idx } });
          });
        } else finish(null);
      }
      function chooseStep(pos) {
        if (picked.freeFusion || pos >= steps.length) return afterMaterials();
        const opt = steps[pos];
        openChoiceModal('Fusion Material', `Confirm ${opt.label}.`, [{ label: `${opt.card.name} (${opt.src})`, meta: opt.src === 'field' ? `Catalyst Zone C${opt.idx + 1}` : `Hand #${opt.idx + 1}` }], () => {
          closeChoiceModal();
          if (opt.src === 'field') chosenFieldIdxs.push(opt.idx); else chosenHandIdxs.push(opt.idx);
          chooseStep(pos + 1);
        });
      }
      chooseStep(0);
    });
  });
}


function doRespondFromZone(zoneIdx) {
  const slot = GS.players[myPlayer].tricks[zoneIdx];
  const card = slot ? getCard(slot.cardId) : null;
  prepareConcealedResponse(card, zoneIdx, (manual) => {
    const result = queueConcealedResponse(GS, myPlayer, zoneIdx, manual);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'queueConcealedResponse', player: myPlayer, zone: zoneIdx, manual });
    renderAll();
  });
}

function doPassChain() {
  const result = passChain(GS, myPlayer);
  if (!result.ok) return showToast(result.msg);
  sendAction({ type: 'passChain', player: myPlayer });
  renderAll();
}

function getChainSummaryHtml() {
  if (!GS || !GS.chain || !GS.chain.length) return '';
  const depth = GS.chain.length;
  const ordinal = (n) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const sourceLabel = (src) => ({ palm:'Palm', concealed:'Concealed', attack:'Attack' }[src] || 'Effect');
  const effectLabel = (link) => {
    if (link.effectType === 'attack') return 'Battle action';
    if (link.effectType) return String(link.effectType).replace(/[-_]/g,' ');
    return 'Manual effect';
  };
  const entries = GS.chain.map((link, idx) => {
    const c = getCard(link.cardId);
    const name = c ? c.name : 'Effect';
    const type = c ? c.cardType : '';
    const isCounter = !!link.isCounter;
    const resolveOrder = depth - idx;
    const tags = [];
    if (type) tags.push(`<span class="chain-tag">${type}</span>`);
    tags.push(`<span class="chain-tag src">${sourceLabel(link.source)}</span>`);
    if (isCounter) tags.push(`<span class="chain-tag counter">Counter</span>`);
    return `<div class="chain-entry">
      <span class="chain-idx">#${idx + 1}</span>
      <span class="chain-who">P${link.player + 1}</span>
      <span class="chain-name">${name}</span>
      <span class="chain-resolve">resolves ${ordinal(resolveOrder)}</span>
      <span class="chain-meta">${effectLabel(link)} · ${sourceLabel(link.source)} source</span>
      ${tags.join('')}
    </div>`;
  });
  const arrowRow = depth > 1
    ? `<div class="chain-arrow">Top row resolves first. Bottom row resolves last.</div>`
    : '';
  return `<div class="chain-stack">
    <div class="chain-hdr">
      Chain Stack
      <span class="chain-depth">${depth}</span>
      <span class="chain-resolve-hint">LIFO · top resolves first</span>
    </div>
    ${entries.slice().reverse().join('')}
    ${arrowRow}
  </div>`;
}

function renderFieldSlot(playerIdx, elemId, perspectiveMe) {
  const slot = $(elemId);
  const pl = GS.players[playerIdx];
  slot.classList.remove('active','highlight','empty');
  if (!pl.fieldTrick) {
    slot.classList.add('empty');
    const selected = selectedHandIdx >= 0 ? getCard(GS.players[myPlayer].hand[selectedHandIdx]) : null;
    if (perspectiveMe && selected && selected.cardType === 'Field Trick' && GS.activePlayer === myPlayer && GS.phaseName === 'action') {
      slot.classList.add('highlight');
      slot.textContent = 'Play Field Trick';
    } else {
      slot.textContent = 'Field Empty';
    }
    return;
  }
  const c = getCard(pl.fieldTrick.cardId);
  slot.classList.add('active');
  slot.innerHTML = renderFieldCard(c, pl.fieldTrick, playerIdx !== myPlayer, true);
}


function getLegalActionsList() {
  if (!GS) return [{ label: 'No duel', tone: 'blocked' }];
  if (GS.gameOver) return [{ label: 'Game over', tone: 'blocked' }];
  const isMyTurn = GS.activePlayer === myPlayer;
  const me = GS.players[myPlayer];
  const items = [];
  if (GS.waitingForResponse) {
    if (GS.currentResponder === myPlayer) {
      const responses = getRespondableTricks(GS, myPlayer);
      items.push({ label: responses.length ? 'Respond with Concealed/Counter' : 'Pass chain', tone: responses.length ? '' : 'warn' });
    } else {
      items.push({ label: 'Wait for response', tone: 'blocked' });
    }
    return items;
  }
  if (!isMyTurn) return [{ label: 'Watch board', tone: 'blocked' }];
  if (GS.pendingDiscard && GS.pendingDiscard.playerIdx === myPlayer) return [{ label: 'Discard to 7', tone: 'warn' }];
  if (GS.phaseName === 'action') {
    if (!me.normalSummonUsed) items.push({ label: 'Normal Summon', tone: '' });
    if (me.hand.some(id => ['Palm Trick','Concealed Trick','Counter Trick','Field Trick'].includes(getCard(id)?.cardType))) items.push({ label: 'Set / play Trick', tone: '' });
    if (getLibraScales(GS, myPlayer)) items.push({ label: 'Libra Summon', tone: '' });
    if (getAvailableFusionSummons(GS, myPlayer).length) items.push({ label: 'Fusion Summon', tone: '' });
    if (me.catalysts.some((c, i) => c && !me.posChanged.has(i) && !me.summonedThisTurn.has(i))) items.push({ label: 'Change position', tone: '' });
    if (!items.length) items.push({ label: 'Continue phase', tone: 'warn' });
    return items;
  }
  if (GS.phaseName === 'battle') {
    const readyAtk = me.catalysts.some(c => c && c.position === 'atk' && !c.attackedThisTurn && !c.cannotAttackThisTurn);
    if (readyAtk) items.push({ label: 'Declare attack', tone: '' });
    if (!GS.players[1-myPlayer].catalysts.some(c => c !== null) && readyAtk) items.push({ label: 'Direct attack', tone: '' });
    if (!items.length) items.push({ label: 'Continue to End Phase', tone: 'warn' });
    return items;
  }
  if (GS.phaseName === 'end') {
    const eligible = getEligibleCatalysts(GS, myPlayer);
    items.push({ label: 'End turn', tone: '' });
    items.push({ label: eligible.length && me.box.length ? 'Extraction' : 'Extraction locked', tone: eligible.length && me.box.length ? '' : 'blocked' });
    items.push({ label: eligible.length && GS.players[1-myPlayer].box.length ? 'Rescue' : 'Rescue locked', tone: eligible.length && GS.players[1-myPlayer].box.length ? '' : 'blocked' });
    items.push({ label: eligible.length ? 'Destroy Trick' : 'Destroy Trick locked', tone: eligible.length ? '' : 'blocked' });
    return items;
  }
  return [{ label: 'Continue phase', tone: '' }];
}

function renderLegalActions(){
  const el = $('legal-actions');
  if (!el) return;
  const items = getLegalActionsList();
  el.innerHTML = items.map(item => `<span class="legal-chip${item.tone ? ' ' + item.tone : ''}">${item.label}</span>`).join('');
}

function getStatusMessage() {
  if (!GS) return { main: 'Waiting to start duel…', sub: '', mode: '' };
  if (GS.gameOver) return { main: GS.winner === myPlayer ? 'Victory secured.' : 'Defeat recorded.', sub: GS.log[GS.log.length - 1]?.msg || '', mode: 'alert' };
  const isMyTurn = GS.activePlayer === myPlayer;
  const me = GS.players[myPlayer];
  if ((isHotSeatMode || isSandboxMode) && isMyTurn) { $('status-sub').textContent = `Pass device to P${myPlayer+1} if needed. Local ${isSandboxMode ? 'sandbox' : 'hot-seat'} mode.`; }
  if (GS.waitingForResponse) {
    const mine = GS.currentResponder === myPlayer;
    return { main: mine ? 'Response window is open.' : `Waiting for P${GS.currentResponder + 1} to respond.`, sub: mine ? 'Use a set Concealed/Counter Trick or pass the chain.' : 'Chain is open. Watch the stack and duel log.', mode: mine ? 'alert' : 'waiting' };
  }
  if (GS.pendingDiscard && GS.pendingDiscard.playerIdx === myPlayer) {
    return { main: `Discard ${GS.pendingDiscard.remaining} card${GS.pendingDiscard.remaining === 1 ? '' : 's'} to finish your turn.`, sub: 'Choose cards from your hand. Nothing else can happen until hand size is legal.', mode: 'alert' };
  }
  const turnLead = isMyTurn ? 'Your turn.' : `Opponent turn (P${GS.activePlayer + 1}).`;
  switch (GS.phaseName) {
    case 'action': {
      const selected = selectedHandIdx >= 0 ? getCard(me.hand[selectedHandIdx]) : null;
      if (selected) {
        if (selected.cardType === 'Catalyst') return { main: `${turnLead} Summon ${selected.name}.`, sub: 'Click an empty Catalyst Zone. Level 5+ needs manual Tribute selection.', mode: '' };
        if (selected.cardType === 'Field Trick') return { main: `${turnLead} Activate ${selected.name}.`, sub: 'Click your Field slot to set it. If one is already active, you will be asked to confirm the overwrite.', mode: '' };
        return { main: `${turnLead} Set or activate ${selected.name}.`, sub: 'Click an open Trick Zone. Palm Tricks may activate from hand or be set face-down first.', mode: '' };
      }
      return { main: turnLead, sub: 'Action Phase: summon, set, activate, or change one Catalyst position. Use Continue when you are done.', mode: isMyTurn ? '' : 'waiting' };
    }
    case 'battle':
      if (!isMyTurn) return { main: turnLead, sub: 'Watch for attacks and upcoming responses.', mode: 'waiting' };
      if (attackMode && attackerZone < 0) return { main: 'Select your attacker.', sub: 'Choose a P-position Catalyst that has not attacked this turn.', mode: '' };
      if (attackMode && attackerZone >= 0) {
        const atk = me.catalysts[attackerZone];
        const atkCard = atk ? getCard(atk.cardId) : null;
        return { main: `${atkCard ? atkCard.name : 'Attacker'} is lined up.`, sub: 'Click an opponent Catalyst to attack, or cancel to back out.', mode: '' };
      }
      return { main: turnLead, sub: 'Battle Phase: attacks are optional. You can declare attacks or continue to End Phase.', mode: '' };
    case 'end':
      return { main: turnLead, sub: 'Choose one End Phase action. Extraction, Rescue, or Destroy Trick.', mode: '' };
    case 'resolution':
      return { main: turnLead, sub: 'Resolution Phase: battle results and win checks are finalizing.', mode: '' };
    default:
      return { main: turnLead, sub: `Phase ${GS.phase + 1}: ${PHASE_NAMES[GS.phase]}. Press Continue when ready.`, mode: isMyTurn ? '' : 'waiting' };
  }
}

function getHelperCopy() {
  if (!GS) return 'Choose a deck to begin.';
  const isMyTurn = GS.activePlayer === myPlayer;
  const me = GS.players[myPlayer];
  if ((isHotSeatMode || isSandboxMode) && isMyTurn) { $('status-sub').textContent = `Pass device to P${myPlayer+1} if needed. Local ${isSandboxMode ? 'sandbox' : 'hot-seat'} mode.`; }
  if (GS.waitingForResponse) {
    if (GS.currentResponder === myPlayer) return 'A chain is open. You may respond with a face-down Concealed Trick or Counter Trick, or pass.';
    return 'A chain is open for the other player. Watch the stack, then wait for resolution.';
  }
  if (!isMyTurn) return 'The opponent is currently acting. You can inspect cards, track the board, and watch the duel log.';
  if (GS.pendingDiscard && GS.pendingDiscard.playerIdx === myPlayer) return 'Hand limit is active. Click cards in your hand to discard until you reach 7.';
  if (GS.phaseName === 'action') {
    const selected = selectedHandIdx >= 0 ? getCard(me.hand[selectedHandIdx]) : null;
    if (selected?.cardType === 'Catalyst') return 'Selected Catalyst: click an empty Catalyst Zone to Normal Summon. Level 5–6 needs 1 Tribute. Level 7+ needs 2 Tributes.';
    if (selected?.cardType === 'Field Trick') return 'Selected Field Trick: click your Field slot to set it. Overwriting an active Field Trick now asks for confirmation.';
    if (selected?.cardType === 'Palm Trick') return 'Selected Palm Trick: activate it from hand with the Palm button. Patch 9 adds scripted Palm resolution for supported cards.';
    if (selected?.cardType === 'Catalyst') return 'Selected Catalyst: click an empty Catalyst Zone to Normal Summon, or click a Libra Zone with a Normal Catalyst to place a Scale.';
    if (selected) return 'Selected Concealed/Counter Trick: click an open Trick Zone to set it face-down.';
    return 'No card selected. You can summon once, set tricks, activate supported scripted effects, or rotate one Catalyst that was not summoned this turn.';
  }
  if (GS.phaseName === 'battle') {
    if (attackMode && attackerZone < 0) return 'Attack mode is live. Pick one of your P-position Catalysts that has not attacked this turn.';
    if (attackMode && attackerZone >= 0) return 'Attacker chosen. Pick an opponent Catalyst to battle it, or cancel attack mode.';
    return 'Battle Phase is optional. Use Declare Attack or Direct Attack if the opponent field is empty.';
  }
  if (GS.phaseName === 'end') return 'Big End Phase choice: Extraction moves a Box card to RFG, Rescue returns your card from the opponent Box to your Deck, Destroy Trick removes any Trick or Field Trick.';
  return 'Use Continue to move through automatic phases. Watch the status banner and duel log for the next legal step.';
}

function getLogType(msg) {
  if (msg.includes('🏆')) return 'win';
  if (msg.includes('⚔')) return 'combat';
  if (msg.includes('[DEBUG]')) return 'debug';
  if (msg.toLowerCase().includes('chain') || msg.toLowerCase().includes('link ') || msg.toLowerCase().includes('response window') || msg.toLowerCase().includes('passed response')) return 'system';
  if (msg.includes('Phase') || msg.includes('═══ Turn')) return 'phase';
  if (msg.includes('Effect Script')) return 'effect';
  if (msg.includes('Shotgun Rule')) return 'system';
  return 'system';
}

function setLogFilter(filter) {
  logFilter = filter;
  document.querySelectorAll('.log-filter').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  renderLog();
}
function setLogSearch(value) {
  logSearch = String(value || '').toLowerCase();
  renderLog();
}

function showFieldTip(event, playerIdx) {
  if (!GS) return;
  const pl = GS.players[playerIdx];
  if (!pl.fieldTrick) return;
  showTip(event, pl.fieldTrick.cardId);
}

// ═══ RENDERING ═══
function renderAll() {
  if (!GS) return;
  if (isHotSeatMode || isSandboxMode) myPlayer = GS.activePlayer;
  const me = GS.players[myPlayer];
  const opp = GS.players[1 - myPlayer];
  const isMyTurn = GS.activePlayer === myPlayer;

  // Chi & scores
  $('my-chi').textContent = me.chi.toLocaleString();
  $('opp-chi').textContent = opp.chi.toLocaleString();
  $('my-kills').textContent = me.kills;
  $('opp-kills').textContent = opp.kills;
  $('my-captures').textContent = me.captures;
  $('opp-captures').textContent = opp.captures;
  $('my-extractions').textContent = me.extractions;
  $('opp-extractions').textContent = opp.extractions;
  if (GS.lastBattleResult) {
    $('battle-result-main').textContent = GS.lastBattleResult.summary || 'Battle resolved.';
    const t = GS.lastBattleResult.type || 'result';
    const chi = GS.lastBattleResult.chiDamage || 0;
    $('battle-result-sub').textContent = `Type: ${t}${chi ? ' · Chi: ' + chi : ''}`;
  } else {
    $('battle-result-main').textContent = 'No battle resolved yet.';
    $('battle-result-sub').textContent = 'Kills, captures, and rebound Chi damage will appear here.';
  }
  $('my-box').textContent = me.box.length;
  $('opp-box').textContent = opp.box.length;

  // Side zone counts
  $('my-deck-c').textContent = me.deck.length;
  $('my-void-c').textContent = me.void.length;
  $('my-box-c').textContent = me.box.length;
  $('my-fusion-c').textContent = me.fusionDeck.length;
  $('opp-deck-c').textContent = opp.deck.length;
  $('opp-void-c').textContent = opp.void.length;
  $('opp-box-c').textContent = opp.box.length;
  $('opp-fusion-c').textContent = opp.fusionDeck.length;
  $('my-rfg-c').textContent = me.rfg.length;
  $('opp-rfg-c').textContent = opp.rfg.length;

  // Turn info
  $('turn-num').textContent = GS.turn;
  $('active-p').textContent = GS.activePlayer + 1;

  // Phase rail
  $('phase-list').innerHTML = PHASE_NAMES.map((name, i) => `<div class="phase-item${i === GS.phase ? ' active' : ''}${i < GS.phase ? ' done' : ''}">${i + 1}. ${name}</div>`).join('');

  // Opponent hand (card backs)
  $('opp-hand').innerHTML = Array(opp.hand.length).fill('<div class="card-back"></div>').join('');

  renderFieldSlot(1 - myPlayer, 'opp-field-slot', false);
  renderFieldSlot(myPlayer, 'my-field-slot', true);

  const status = getStatusMessage();
  $('status-main').textContent = status.main;
  $('status-sub').textContent = status.sub;
  $('status-banner').className = 'status-banner' + (status.mode ? ' ' + status.mode : '');
  $('helper-copy').textContent = getHelperCopy();
  renderLegalActions();

  // My hand
  renderMyHand(me);

  // Field zones
  renderFieldZones(me, opp);

  // Actions
  renderActions(isMyTurn);

  // Log
  renderLog();

  refreshInteractiveA11y();

  // Game over
  if (GS.gameOver) {
    const won = GS.winner === myPlayer;
    $('go-title').textContent = won ? 'VICTORY' : 'DEFEAT';
    $('go-title').className = 'go-title ' + (won ? 'go-win' : 'go-lose');
    $('go-reason').textContent = GS.log[GS.log.length - 1]?.msg || '';
    $('game-over').classList.add('show');
  }
}

function renderMyHand(me) {
  const hand = $('my-hand');
  hand.innerHTML = me.hand.map((id, i) => {
    const c = getCard(id);
    if (!c) return '';
    const isCat = c.cardType === 'Catalyst' || c.cardType === 'Fusion';
    const color = c.cardType === 'Catalyst' ? 'var(--flame)' : c.cardType === 'Palm Trick' ? 'var(--blue)' : c.cardType === 'Field Trick' ? 'var(--green)' : ['Concealed Trick','Counter Trick'].includes(c.cardType) ? 'var(--purple)' : 'var(--amber)';
    const art = cardArtUrl(c);
    const artClass = art ? ' has-art' : '';
    const artStyle = art ? ` style="background-image:url('${art.replace(/'/g,"%27")}')"` : '';
    return `<div class="hand-card${artClass}${i === selectedHandIdx ? ' selected' : ''}"${artStyle} onclick="handClick(${i})" onmouseenter="showTip(event,'${id}')" onmouseleave="hideTip()" role="button" tabindex="0" aria-label="Hand card ${i + 1}: ${String(c.name).replace(/"/g,'&quot;')}">
      <div class="hc-bar" style="background:${color}"></div>
      <div class="hc-name">${c.name}</div>
      <div class="hc-type">${c.cardType}${c.level ? ' Lv' + c.level : ''}</div>
      ${isCat ? `<div class="hc-stats">${c.pr}/${c.cp}</div>` : ''}
    </div>`;
  }).join('');
}

function renderFieldZones(me, opp) {
  // My catalysts
  for (let i = 0; i < 5; i++) {
    const zone = document.querySelector(`.zone[data-p="me"][data-type="cat"][data-z="${i}"]`);
    const cat = me.catalysts[i];
    zone.innerHTML = '<span class="zone-label">C' + (i+1) + '</span>';
    zone.classList.remove('highlight', 'atk-target');
    if (cat) {
      const c = getCard(cat.cardId);
      const isDef = cat.position === 'def';
      zone.innerHTML = renderFieldCard(c, cat, false, false, me, i);
    }
    if (selectedHandIdx >= 0 && !cat) {
      const sel = getCard(me.hand[selectedHandIdx]);
      if (sel && sel.cardType === 'Catalyst') zone.classList.add('highlight');
    }
    if (attackMode && cat && cat.position === 'atk' && attackerZone < 0) zone.classList.add('highlight');
  }

  // Opponent catalysts
  for (let i = 0; i < 5; i++) {
    const zone = document.querySelector(`.zone[data-p="opp"][data-type="cat"][data-z="${i}"]`);
    const cat = opp.catalysts[i];
    zone.innerHTML = '<span class="zone-label">C' + (i+1) + '</span>';
    zone.classList.remove('highlight', 'atk-target');
    if (cat) {
      const c = getCard(cat.cardId);
      zone.innerHTML = renderFieldCard(c, cat, true, false, opp, i);
    }
    if (attackMode && attackerZone >= 0) zone.classList.add('atk-target');
  }

  // My tricks
  for (let i = 0; i < 5; i++) {
    const zone = document.querySelector(`.zone[data-p="me"][data-type="trick"][data-z="${i}"]`);
    const trick = me.tricks[i];
    const lbl = (i === 0 || i === 4) ? 'LIB' : 'T';
    zone.innerHTML = `<span class="zone-label">${lbl}</span>`;
    if (trick) {
      if (trick.faceDown) {
        zone.innerHTML = '<div class="field-card face-down" style="width:54px;height:64px"></div>';
      } else {
        const c = getCard(trick.cardId);
        zone.innerHTML = renderFieldCard(c, trick, false, false, me, i);
      }
    }
    if (selectedHandIdx >= 0 && !trick) {
      const selCard = getCard(me.hand[selectedHandIdx]);
      const isLib = (i === 0 || i === 4);
      if (selCard && ['Concealed Trick','Counter Trick','Palm Trick'].includes(selCard.cardType) && selCard.cardType !== 'Field Trick') zone.classList.add('highlight');
      if (isLib && selCard && selCard.cardType === 'Catalyst' && typeof isNormalCatalystCard === 'function' && isNormalCatalystCard(selCard)) zone.classList.add('highlight');
    }
  }

  // Opponent tricks
  for (let i = 0; i < 5; i++) {
    const zone = document.querySelector(`.zone[data-p="opp"][data-type="trick"][data-z="${i}"]`);
    const trick = opp.tricks[i];
    const lbl = (i === 0 || i === 4) ? 'LIB' : 'T';
    zone.innerHTML = `<span class="zone-label">${lbl}</span>`;
    if (trick) {
      if (trick.faceDown) zone.innerHTML = '<div class="field-card face-down" style="width:54px;height:64px"></div>';
      else { const c = getCard(trick.cardId); zone.innerHTML = renderFieldCard(c, trick, true, false, opp, i); }
    }
  }
}

function cardArtUrl(card){ return (card && (card.image || card.imagePath || card.img || '')) || ''; }
function renderFieldCard(card, slot, isOpp, mini = false, playerIdx = null, zoneIdx = null) {
  if (!card) return '';
  const isCat = card.cardType === 'Catalyst' || card.cardType === 'Fusion';
  const color = isCat ? 'var(--flame)' : card.cardType === 'Palm Trick' ? 'var(--blue)' : card.cardType === 'Field Trick' ? 'var(--green)' : card.cardType === 'Concealed Trick' || card.cardType === 'Counter Trick' ? 'var(--purple)' : 'var(--amber)';
  const defClass = slot.position === 'def' ? ' def-pos' : '';
  const greatClass = card.great ? ' fc-great' : '';
  const art = cardArtUrl(card);
  const artClass = art ? ' has-art' : '';
  const artStyle = art ? ` style="background-image:url('${art.replace(/'/g,"%27")}')"` : '';
  const statusBits = [];
  if (slot.attackedThisTurn) statusBits.push('Pressure used');
  if (slot.cannotAttackThisTurn) statusBits.push('Cannot attack');
  if (slot.faceDown) statusBits.push('Face-down');
  const shownPr = (playerIdx !== null && zoneIdx !== null && typeof getEffectivePressure === 'function' && isCat) ? getEffectivePressure(GS, playerIdx, zoneIdx) : card.pr;
  const shownCp = (playerIdx !== null && zoneIdx !== null && typeof getEffectiveCounterPressure === 'function' && isCat) ? getEffectiveCounterPressure(GS, playerIdx, zoneIdx) : card.cp;
  // Position badge: P (Pressure) | CP (Counter Pressure) | FACE-DOWN
  const posBadge = isCat ? (() => {
    if (slot.faceDown) return '<div class="fc-pos fc-pos-fd">FACE-DOWN</div>';
    const lbl = posLabel(slot.position);
    const cls = lbl === 'CP' ? 'fc-pos fc-pos-cp' : 'fc-pos fc-pos-p';
    return `<div class="${cls}">${lbl}</div>`;
  })() : '';
  return `<div class="field-card${mini ? ' mini' : ''}${defClass}${greatClass}${artClass}"${artStyle} onmouseenter="showTip(event,'${card.id}')" onmouseleave="hideTip()" role="img" aria-label="${String(card.name).replace(/"/g,'&quot;')}">
    <div class="fc-bar" style="background:${color}"></div>
    ${posBadge}
    <div class="fc-name">${card.name}</div>
    ${isCat ? `<div class="fc-stats">${shownPr}/${shownCp}${statusBits.length ? ' · ' + statusBits.join(' · ') : ''}</div>` : (!mini ? `<div class="fc-stats">${card.cardType}</div>` : '')}
  </div>`;
}

function renderActions(isMyTurn) {
  const panel = $('action-btns');
  const epPanel = $('end-phase-panel');
  epPanel.style.display = 'none';
  $('actions-panel').style.display = '';

  if (GS.gameOver) { panel.innerHTML = '<div style="color:var(--gold);font-size:.8rem">Game Over</div>'; return; }

  let html = getChainSummaryHtml();
  if (GS.waitingForResponse) {
    if (GS.currentResponder === myPlayer) {
      const opts = getRespondableTricks(GS, myPlayer);
      html += `<div style="font-size:.65rem;color:var(--cream);margin-bottom:4px">Chain response window. Counter Tricks take priority if one is already on the stack.</div>`;
      if (opts.length) {
        opts.forEach(o => {
          html += `<button class="act-btn ${o.isCounter ? 'act-btn-purple' : 'act-btn-blue'}" onclick="doRespondFromZone(${o.zone})">Chain ${o.card.name} ${o.isCounter ? '· Counter' : ''}</button>`;
        });
      } else {
        html += `<div style="color:var(--ash);font-size:.72rem;margin-bottom:4px">No legal set Concealed/Counter Trick responses.</div>`;
      }
      html += `<button class="act-btn act-btn-ghost" onclick="doPassChain()">Pass Response</button>`;
    } else {
      html += `<div style="color:var(--ash);font-size:.75rem">Waiting for P${GS.currentResponder + 1} to respond...</div>`;
    }
    panel.innerHTML = html;
    return;
  }
  if (!isMyTurn) { panel.innerHTML = html + '<div style="color:var(--ash);font-size:.75rem">Opponent\'s turn...</div>'; return; }

  const phase = GS.phaseName;

  if (phase === 'turnStart' || phase === 'draw') {
    html += `<button class="act-btn act-btn-fire" onclick="doAdvance()">Continue →</button>`;
  } else if (phase === 'ignition') {
    html += `<button class="act-btn act-btn-fire" onclick="doAdvance()">Continue →</button>`;
    const me = GS.players[myPlayer];
    if (me.toolboxActive) html += `<button class="act-btn act-btn-blue" onclick="startToolboxIgnition()">Use Toolbox</button>`;
  } else if (phase === 'action') {
    html += `<div style="font-size:.65rem;color:var(--cream);margin-bottom:4px">Normal Summon, activate Palm Tricks, set Tricks face-down, place Libra Scales, flip a set Field Trick, or Fusion Summon.</div>`;
    const selected = selectedHandIdx >= 0 ? getCard(GS.players[myPlayer].hand[selectedHandIdx]) : null;
    if (selected?.cardType === 'Palm Trick') html += `<button class="act-btn act-btn-fire" onclick="startActivatePalm()">Activate Palm</button>`;
    const setPalmZones = GS.players[myPlayer].tricks.map((t,i)=>({t,i})).filter(x => x.t && x.t.faceDown && !x.t.isLibra && getCard(x.t.cardId)?.cardType === 'Palm Trick');
    if (setPalmZones.length) html += `<button class="act-btn act-btn-blue" onclick="showToast('Click your set Palm Trick to flip and activate it.')">Flip Set Palm</button>`;
    if (GS.players[myPlayer].fieldTrick?.faceDown) html += `<button class="act-btn act-btn-blue" onclick="flipMyFieldTrick()">Activate Set Field Trick</button>`;
    const activeField = GS.players[myPlayer].fieldTrick ? getCard(GS.players[myPlayer].fieldTrick.cardId) : null;
    if (activeField && !GS.players[myPlayer].fieldTrick.faceDown && /road to greatness/i.test(activeField.name || '') && Number(GS.players[myPlayer].fieldTrick.counters || 0) >= 2) html += `<button class="act-btn act-btn-blue" onclick="startRoadToGreatnessSearch()">Road To Greatness Search</button>`;
    const aceOnField = GS.players[myPlayer].catalysts.some(slot => slot && /ace the great/i.test(getCard(slot.cardId)?.name || ''));
    if (aceOnField) html += `<button class="act-btn act-btn-purple" onclick="startUseAceCopy()">Use Ace The Great</button>`;
    if ((getActivatableCatalystAbilities(GS, myPlayer) || []).length) html += `<button class="act-btn act-btn-purple" onclick="startUseCatalystAbility()">Use Catalyst Ability</button>`;
    if (getLibraScales(GS, myPlayer)) html += `<button class="act-btn act-btn-fire" onclick="startLibraSummon()">Libra Summon</button>`;
    if (getAvailableFusionSummons(GS, myPlayer).length) html += `<button class="act-btn act-btn-fire" onclick="startFusionSummon()">Fusion Summon</button>`;
    html += `<button class="act-btn act-btn-ghost" onclick="doAdvance()">→ To Battle Phase</button>`;
    if (selectedHandIdx >= 0) {
      html += `<button class="act-btn act-btn-red" onclick="cancelSelection()">Cancel Selection</button>`;
    }
  } else if (phase === 'battle') {
    if (!attackMode) {
      html += `<button class="act-btn act-btn-fire" onclick="enterAttackMode()">Declare Attack</button>`;
      // Direct attack button
      const oppHasCats = GS.players[1-myPlayer].catalysts.some(c=>c!==null);
      if (!oppHasCats) {
        html += `<button class="act-btn act-btn-red" onclick="directAttack()">Direct Attack!</button>`;
      }
      html += `<button class="act-btn act-btn-ghost" onclick="doAdvance()">→ To End Phase</button>`;
    } else {
      if (attackerZone < 0) {
        html += `<div style="font-size:.65rem;color:var(--cream);margin-bottom:4px">Click YOUR P-position Catalyst to select attacker.</div>`;
      } else {
        html += `<div style="font-size:.65rem;color:var(--cream);margin-bottom:4px">Click OPPONENT Catalyst to attack.</div>`;
      }
      html += `<button class="act-btn act-btn-red" onclick="cancelAttack()">Cancel Attack</button>`;
    }
  } else if (phase === 'resolution') {
    html += `<button class="act-btn act-btn-fire" onclick="doAdvance()">Continue →</button>`;
  } else if (phase === 'end') {
    $('actions-panel').style.display = 'none';
    epPanel.style.display = '';
    const eligible = getEligibleCatalysts(GS, myPlayer);
    const extractLocked = eligible.length === 0 || GS.players[myPlayer].box.length === 0;
    const rescueLocked = eligible.length === 0 || GS.players[1-myPlayer].box.length === 0;
    const destroyLocked = eligible.length === 0;
    $('ep-extract').disabled = extractLocked;
    $('ep-rescue').disabled = rescueLocked;
    $('ep-destroy').disabled = destroyLocked;
    const reasons = [];
    if (!eligible.length) reasons.push('Need a non-Great Catalyst on your field to pay the End Phase cost.');
    if (!GS.players[myPlayer].box.length) reasons.push('Extraction is locked because your Box is empty.');
    if (!GS.players[1-myPlayer].box.length) reasons.push('Rescue is locked because the opponent has none of your cards in their Box.');
    $('end-phase-note').textContent = reasons.length ? reasons.join(' ') : 'All End Phase options are live. Pick one.';
    return;
  }
  panel.innerHTML = html;
}

function renderLog() {
  const log = $('log');
  const settings = (() => { try { return JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}'); } catch { return {}; } })();
  const logMax = Number(settings.logMax || 100);
  let entries = logMax >= 500 ? GS.log.slice() : GS.log.slice(-Math.max(10, logMax));
  if (logFilter !== 'all') entries = entries.filter(e => getLogType(e.msg) === logFilter);
  if (logSearch) entries = entries.filter(e => String(e.msg || '').toLowerCase().includes(logSearch));
  if (!entries.length) {
    log.innerHTML = '<div class="log-empty">No log lines match this filter.</div>';
    return;
  }
  log.innerHTML = entries.map(e => {
    const kind = getLogType(e.msg);
    let cls = 'log-entry ' + kind;
    if (kind === 'phase') cls += ' phase-change';
    return `<div class="${cls}"><span class="log-meta">T${e.turn} · ${String(e.phase || '').toUpperCase()}</span>${e.msg}</div>`;
  }).join('');
  log.scrollTop = log.scrollHeight;
}

// ═══ PLAYER ACTIONS ═══
function handClick(idx) {
  if (GS.activePlayer !== myPlayer) return;
  if (GS.pendingDiscard && GS.pendingDiscard.playerIdx === myPlayer) {
    const result = discardForHandLimit(GS, myPlayer, idx);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'discardForHandLimit', player: myPlayer, handIdx: idx });
    renderAll();
    return;
  }
  if (GS.phaseName !== 'action') return;
  if (selectedHandIdx === idx) { selectedHandIdx = -1; } else { selectedHandIdx = idx; }
  attackMode = false;
  renderAll();
}

function zoneClick(player, type, zone) {
  if (!GS || GS.gameOver) return;
  const isMyTurn = GS.activePlayer === myPlayer;

  // Attack mode — selecting target
  if (attackMode && attackerZone >= 0 && player === 'opp' && type === 'cat') {
    const result = declareAttack(GS, myPlayer, attackerZone, 1 - myPlayer, zone);
    sendAction({ type: 'attack', attacker: myPlayer, attackerZone, defender: 1 - myPlayer, defenderZone: zone });
    attackMode = false;
    attackerZone = -1;
    renderAll();
    return;
  }

  // Attack mode — selecting MY attacker
  if (attackMode && attackerZone < 0 && player === 'me' && type === 'cat') {
    const cat = GS.players[myPlayer].catalysts[zone];
    if (cat && cat.position === 'atk') {
      attackerZone = zone;
      renderAll();
    }
    return;
  }

  if (GS.waitingForResponse && player === 'me' && type === 'trick') {
    return doRespondFromZone(zone);
  }


  if (!isMyTurn) return;

  // Normal Summon — place from hand
  if (selectedHandIdx >= 0 && player === 'me') {
    const cardId = GS.players[myPlayer].hand[selectedHandIdx];
    const card = getCard(cardId);

    if (type === 'cat' && card && card.cardType === 'Catalyst') {
      const handIdx = selectedHandIdx;
      if (/serpent/i.test(card.name || '')) {
        promptSerpentVoidSelection((voidIdxs) => {
          const result = specialSummonSerpent(GS, myPlayer, handIdx, zone, voidIdxs);
          if (!result.ok) return showToast(result.msg);
          sendAction({ type: 'specialSummonSerpent', player: myPlayer, handIdx, zone, voidIdxs });
          selectedHandIdx = -1;
          renderAll();
        });
        return;
      }
      const isNolan = /nolan-the-great/i.test(card.name || '') || /nolan the great/i.test(card.name || '');
      const requiredTributes = isNolan ? -1 : ((card.level || 0) >= 7 ? 2 : (card.level || 0) >= 5 ? 1 : 0);
      const executeSummon = async (tributeZones=[]) => {
        if (tributeZones.length) {
          const tributeNames = tributeZones.map((tz) => getCard(GS.players[myPlayer].catalysts[tz]?.cardId)?.name || `C${tz+1}`).join(', ');
          const ok = await ctfConfirm(`Normal Summon ${card.name} by sending ${tributeNames} to the Void?`, 'Confirm Tribute Summon');
          if (!ok) return;
        }
        const result = normalSummon(GS, myPlayer, handIdx, zone, 'atk', tributeZones);
        if (result.ok) {
          sendAction({ type: 'normalSummon', player: myPlayer, handIdx, zone, position: 'atk', tributeZones });
        } else {
          showToast(result.msg);
        }
        selectedHandIdx = -1;
        renderAll();
      };
      if (isNolan) {
        promptTributeSelectionByLevelSum(8, executeSummon);
      } else if (requiredTributes > 0) {
        promptTributeSelection(requiredTributes, executeSummon);
      } else {
        executeSummon([]);
      }
      return;
    }

    if (type === 'trick' && card) {
      if (card.cardType === 'Catalyst' && (zone === 0 || zone === 4)) {
        const handIdx = selectedHandIdx;
        const result = placeLibraScale(GS, myPlayer, handIdx, zone);
        if (result.ok) {
          sendAction({ type: 'placeLibraScale', player: myPlayer, handIdx, zone });
          selectedHandIdx = -1;
        } else {
          showToast(result.msg);
        }
        renderAll();
        return;
      }
      if (['Palm Trick','Concealed Trick','Counter Trick','Field Trick'].includes(card.cardType)) {
        if (card.cardType === 'Field Trick') {
          showToast('Field Tricks must be set in the Field Trick location.');
          return;
        }
        const handIdx = selectedHandIdx;
        const result = setTrick(GS, myPlayer, handIdx, zone);
        if (result.ok) {
          sendAction({ type: 'setTrick', player: myPlayer, handIdx, zone });
        } else {
          showToast(result.msg);
        }
        selectedHandIdx = -1;
        renderAll();
        return;
      }
    }
  }

  // Activate set Palm Trick / flip set Field Trick during Action Phase
  if (player === 'me' && type === 'trick' && GS.phaseName === 'action' && selectedHandIdx < 0) {
    const slot = GS.players[myPlayer].tricks[zone];
    if (slot && slot.faceDown && !slot.isLibra) {
      const c = getCard(slot.cardId);
      if (c && c.cardType === 'Palm Trick') {
        preparePalmActivation(c, { zoneIdx: zone, source: 'set' }, (manual) => {
          const result = activateSetPalmTrick(GS, myPlayer, zone, manual);
          if (result.ok) {
            sendAction({ type: 'activateSetPalmTrick', player: myPlayer, zone, manual });
          } else {
            showToast(result.msg);
          }
          renderAll();
        });
        return;
      }
    }
  }


  // Change position (click own catalyst during Action Phase)
  if (player === 'me' && type === 'cat' && GS.phaseName === 'action' && selectedHandIdx < 0) {
    const cat = GS.players[myPlayer].catalysts[zone];
    if (cat) {
      const result = changePosition(GS, myPlayer, zone);
      if (result.ok) {
        sendAction({ type: 'changePosition', player: myPlayer, zone });
      } else {
        showToast(result.msg);
      }
      renderAll();
    }
  }
}

async function doAdvance() {
  if (GS.activePlayer !== myPlayer) return;
  if (GS.phaseName === 'action') {
    const me = GS.players[myPlayer];
    const hasSetPalm = me.tricks.some(t => t && t.faceDown && !t.isLibra && getCard(t.cardId)?.cardType === 'Palm Trick');
    if ((selectedHandIdx >= 0 || !me.normalSummonUsed || hasSetPalm)) {
      if (!await ctfConfirm('You may still have playable actions. Leave Action Phase anyway?', 'Leave Action Phase?')) return;
    }
  }
  if (GS.phaseName === 'battle') {
    const me = GS.players[myPlayer];
    const hasReadyAttacker = me.catalysts.some(c => c && c.position === 'atk' && !c.attackedThisTurn && !c.cannotAttackThisTurn);
    if (hasReadyAttacker) {
      if (!await ctfConfirm('You still have at least one P-position Catalyst ready to attack. Leave Battle Phase anyway?', 'Leave Battle Phase?')) return;
    }
  }
  advancePhase(GS);
  sendAction({ type: 'advancePhase' });
  renderAll();
}

function enterAttackMode() {
  attackMode = true;
  attackerZone = -1;
  renderAll();
}

function cancelAttack() {
  attackMode = false;
  attackerZone = -1;
  renderAll();
}

function cancelSelection() {
  selectedHandIdx = -1;
  renderAll();
}

function directAttack() {
  const me = GS.players[myPlayer];
  const attackers = [];
  for (let i = 0; i < 5; i++) {
    const slot = me.catalysts[i];
    if (slot && slot.position === 'atk' && !slot.attackedThisTurn) attackers.push({ zone: i, card: getCard(slot.cardId) });
  }
  if (!attackers.length) { showToast('No P-position Catalyst available.'); return; }
  // Wrap the direct attack declaration with a confirmation prompt. This helps prevent
  // accidental direct attacks which can be costly. Ask the player to confirm
  // before sending the attack to the engine/network. If the player cancels,
  // simply abort the action.
  const doDirect = async (atkZone) => {
    const slot = GS.players[myPlayer].catalysts[atkZone];
    const card = slot ? getCard(slot.cardId) : null;
    const confirmName = card ? card.name : 'this Catalyst';
    const ok = await ctfConfirm(`${confirmName} will attack directly. This deals full Pressure damage to the opponent. Proceed?`, 'Direct Attack');
    if (!ok) return;
    const result = declareAttack(GS, myPlayer, atkZone, 1 - myPlayer, -1);
    if (!result.ok) return showToast(result.msg);
    sendAction({ type: 'attack', attacker: myPlayer, attackerZone: atkZone, defender: 1 - myPlayer, defenderZone: -1 });
    renderAll();
  };
  if (attackers.length === 1) return doDirect(attackers[0].zone);
  openChoiceModal('Choose Direct Attacker', 'Select which P-position Catalyst attacks directly.', attackers.map(a => ({ label: `Zone C${a.zone + 1} — ${a.card ? a.card.name : 'Unknown'}`, meta: a.card ? `Pressure ${a.card.pr} · Counter Pressure ${a.card.cp}` : '' })), (idx) => { closeChoiceModal(); doDirect(attackers[idx].zone); });
}

function doEndPhase(action) {
  if (GS.activePlayer !== myPlayer) return;
  if (action === 'endTurn') {
    endPhaseAction(GS, myPlayer, 'endTurn');
    sendAction({ type: 'endPhaseAction', player: myPlayer, action: 'endTurn' });
    renderAll();
    return;
  }
  promptEndPhaseAction(action);
}

// ═══ TOOLTIP ═══
function showTip(event, id) {
  const c = getCard(id);
  if (!c) return;
  const tip = $('tip');
  $('tip-name').textContent = c.name + (c.great ? ' ★' : '');
  $('tip-info').textContent = `${c.cardType}${c.sub && c.sub !== 'Normal' ? ' (' + c.sub + ')' : ''} · ${c.set}${c.alignment ? ' · ' + c.alignment : ''}${c.level ? ' · Lv ' + c.level : ''}${c.kindsStr ? ' · ' + c.kindsStr : ''}`;
  const isCat = c.cardType === 'Catalyst' || c.cardType === 'Fusion';
  $('tip-stats').textContent = isCat ? `Pressure: ${c.pr}  ·  Counter Pressure: ${c.cp}` : '';
  $('tip-desc').textContent = c.desc || 'No text.';

  const rect = event.target.getBoundingClientRect();
  let left = rect.right + 8, top = rect.top;
  if (left + 250 > window.innerWidth) left = rect.left - 250;
  if (top + 180 > window.innerHeight) top = window.innerHeight - 190;
  tip.style.left = Math.max(4, left) + 'px';
  tip.style.top = Math.max(4, top) + 'px';
  tip.classList.add('show');
}
function hideTip() { $('tip').classList.remove('show'); }

// ═══ TOAST ═══
let toastTimer = null;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// ═══ INIT ═══
loadSettings();
renderDeckSelect();
if (lastRoomCode && $('join-input')) $('join-input').value = lastRoomCode;
