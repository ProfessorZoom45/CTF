/* The browser sends choices and renders seat views. Duel state stays with the referee. */
(() => {
  const byId = id => document.getElementById(id);
  const lobby = byId('lobby');
  const duelPage = byId('friend-duel');
  const choiceDialog = byId('friend-duel-choice');
  const controlPanel = byId('friend-duel-controls');
  const joinInput = byId('join-input');
  const note = byId('friend-room-note');
  const configured = document.querySelector('meta[name="ctf-friend-room-api"]').content.trim();
  const local = ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  const phases = [
    ['turnStart','Turn Start','Start the turn and apply turn-start effects.'],
    ['draw','Draw','Draw one card, or skip the draw if the Main Deck is empty.'],
    ['ignition','Ignition','Apply eligible start-of-turn effects.'],
    ['action','Action','Spawn Catalysts, Set cards or play Tricks.'],
    ['battle','Battle','Attack with a Catalyst in Pressure position.'],
    ['resolution','Resolution','You may change the position of one eligible Catalyst.'],
    ['end','End','Choose an End Phase action or pass without paying. Discard to seven if required.']
  ];
  let endpoint;
  try {
    const url = new URL(configured || 'api/private-multiplayer/', location.href);
    if ((configured && url.protocol === 'https:' || !configured && local && url.origin === location.origin) &&
        !url.search && !url.hash && !url.username && !url.password) {
      if (!url.pathname.endsWith('/')) url.pathname += '/';
      endpoint = url;
    }
  } catch { /* The lobby reports an unavailable service. */ }

  let room = null;
  let view = null;
  let connected = false;
  let pending = false;
  let pollTimer;
  let choice;

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const cardName = id => getCard(id)?.name || 'Unknown card';
  function button(label, callback, primary = false) {
    const node = element('button', label, 'lb-btn ' + (primary ? 'lb-btn-fire' : 'lb-btn-ghost'));
    node.type = 'button';
    node.disabled = pending;
    node.addEventListener('click', callback);
    return node;
  }
  async function api(route, body, token) {
    if (!endpoint) throw Error('The online referee is unavailable here. Use the local preview to test Friend Rooms.');
    const response = await fetch(new URL(route, endpoint), {
      method:body === undefined ? 'GET' : 'POST',
      headers:{
        ...(body === undefined ? {} : {'Content-Type':'application/json'}),
        ...(token ? {Authorization:'Bearer ' + token} : {})
      },
      body:body === undefined ? undefined : JSON.stringify(body),
      cache:'no-store',
      signal:AbortSignal.timeout(9000)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw Error(result?.error || 'The referee service did not respond.');
    return result;
  }

  function storageKey(code) { return 'ctf:private-seat:' + endpoint?.href + code; }
  function savedToken(code) {
    try { return sessionStorage.getItem(storageKey(code)) || ''; } catch { return ''; }
  }
  function rememberSeat(seat) {
    try { sessionStorage.setItem(storageKey(seat.code), seat.token); } catch { /* Play can continue in this tab. */ }
  }

  function invitation(code) {
    const url = new URL('play.html', location.href);
    url.searchParams.set('room', code);
    return url;
  }
  function updateLink(code) {
    const link = invitation(code);
    byId('room-code').textContent = code;
    byId('room-code').hidden = false;
    byId('room-link').href = link.href;
    byId('room-link').hidden = false;
    byId('copy-room-link').hidden = !navigator.clipboard;
    joinInput.value = code;
    history.replaceState(null, '', link.href);
  }
  function selectedLegalDeck() {
    const deck = selectedDeckPayload();
    if (!deck || !CTFDeckUtils.validateDeck(deck, CTF_CARDS).ok) throw Error('Select a legal deck in the lobby.');
    return deck;
  }
  function lobbyBusy(value) {
    byId('create-btn').disabled = value || !endpoint;
    byId('join-btn').disabled = value || !endpoint;
  }
  async function enter(kind, code) {
    if (room) return;
    const status = byId(kind === 'create' ? 'create-status' : 'join-status');
    lobbyBusy(true);
    status.textContent = 'Connecting to the referee…';
    try {
      const token = kind === 'join' ? savedToken(code) : '';
      const deck = token ? null : selectedLegalDeck();
      const seat = kind === 'create'
        ? await api('rooms', {})
        : await api('rooms/' + code + '/join', {}, token);
      rememberSeat(seat);
      updateLink(seat.code);
      if (!seat.registered && !seat.snapshot) {
        await api('rooms/' + seat.code + '/messages', {type:'deckChoice',deck:deck || selectedLegalDeck()}, seat.token);
      }
      room = seat;
      byId('cancel-waiting-room').hidden = false;
      lobby.querySelectorAll('[data-local-mode]').forEach(node => { node.disabled = true; });
      status.textContent = 'Waiting for both players and their decks.';
      if (seat.snapshot) acceptView(seat.snapshot);
      void poll(seat);
    } catch (error) {
      lobbyBusy(false);
      status.textContent = error.message;
    }
  }

  function acceptView(next) {
    if (!next || view && next.revision < view.revision) return;
    if (choiceDialog.open && view && next.revision > view.revision) choiceDialog.close();
    view = next;
    duelPage.hidden = false;
    lobby.style.display = 'none';
    render();
  }

  async function poll(seat) {
    if (room !== seat) return;
    try {
      const update = await api('rooms/' + seat.code + '/events?after=' + (view?.revision || 0), undefined, seat.token);
      if (room !== seat) return;
      const old = connected;
      connected = update.connected;
      if (update.view) acceptView(update.view);
      else if (view && old !== connected) render();
    } catch {
      if (room !== seat) return;
      connected = false;
      if (view) render();
      else byId('create-status').textContent = 'Trying to reconnect to the referee…';
    }
    if (room === seat) pollTimer = setTimeout(() => poll(seat), view?.result ? 1400 : 750);
  }

  async function send(body) {
    if (!room || !view || pending) return;
    const seat = room;
    pending = true;
    controlPanel.querySelectorAll('button').forEach(node => { node.disabled = true; });
    try {
      const result = await api('rooms/' + seat.code + '/messages', {...body, revision:view.revision}, seat.token);
      if (room === seat) acceptView(result.view);
    } catch (error) {
      if (room === seat) byId('friend-duel-status').textContent = error.message;
    } finally {
      pending = false;
      if (room === seat) renderControls();
    }
  }
  const act = action => send({type:'actionRequest',action});

  function fieldPanel(player, target, title) {
    const content = [element('h2', title),
      element('p', `Chi ${player.chi.toLocaleString()} · Kills ${player.kills} · Extractions ${player.extractions} · Captures ${player.captures}`),
      element('p', `Hand ${player.handCount} · Main Deck ${player.deckCount} · Fusion ${player.fusionCount}`)];
    function group(label, slots, prefix) {
      content.push(element('h3', label));
      const zones = element('div', undefined, 'friend-duel-zones');
      slots.forEach((slot, i) => {
        const item = element('div', undefined, 'friend-duel-card' + (slot?.faceDown ? ' face-down' : ''));
        item.append(element('strong', prefix + (i + 1)));
        const id = slot?.cardId;
        item.append(element('span', id ? cardName(id) : slot ? 'Face-down card' : 'Empty'));
        if (slot?.faceDown && id) item.append(element('span', 'Face down'));
        if (slot?.position && id) item.append(element('span',
          `${slot.position === 'atk' ? 'Pressure' : 'Counter Pressure'} · ${slot.pressure}/${slot.counterPressure}`));
        zones.append(item);
      });
      content.push(zones);
    }
    group('Catalysts',player.catalysts,'C');
    group('Tricks and Libra',player.tricks,'T');
    const field = player.fieldTrick;
    content.push(element('p', 'Field Trick · ' + (field?.cardId ? cardName(field.cardId) : field ? 'Face-down card' : 'Empty')));
    for (const [label, cards] of [['Box',player.box],['Void',player.void],['Removed from Game',player.rfg]]) {
      const details = element('details');
      details.append(element('summary', label + ' · ' + cards.length));
      const list = element('ul');
      list.append(...cards.map(id => element('li',cardName(id))));
      details.append(list);
      content.push(details);
    }
    target.replaceChildren(...content);
  }

  function render() {
    const {seat, players, activeSeat, prioritySeat, phase, turn, result} = view;
    const me = players[seat], other = players[1-seat];
    byId('friend-duel-room').textContent = 'Room ' + room.code + ' · Player ' + (seat + 1);
    let status = prioritySeat === seat ? 'Your action' : 'Waiting for your opponent';
    if (result) status = result.winner < 0 ? 'Draw' : result.winner === seat ? 'You win' : 'Your opponent wins';
    if (!connected && !result) status = 'Waiting for your opponent to reconnect';
    byId('friend-duel-status').textContent = `Turn ${turn} · ${status}${result ? ' · ' + result.reason : ''}`;
    byId('friend-duel-phases').replaceChildren(...phases.map(([key, name]) => {
      const step = element('li', name);
      if (key === phase) step.setAttribute('aria-current','step');
      return step;
    }));
    byId('friend-duel-guidance').textContent = result ? 'Choose a deck and confirm a rematch, or return to the lobby.'
      : view.skippedBattle ? 'The first player skips Battle on their first turn.'
      : view.waitingForResponse ? 'Resolve the Chain before continuing.'
      : (phases.find(([key]) => key === phase)?.[2] || '');
    fieldPanel(other, byId('friend-duel-opponent'), 'Opponent’s field');
    fieldPanel(me, byId('friend-duel-board'), 'Your field');
    const hand = element('div', undefined, 'friend-duel-zones');
    me.hand.forEach((id, index) => {
      const card = getCard(id), item = element('details', undefined, 'friend-duel-card');
      item.append(element('summary', (index + 1) + '. ' + cardName(id)),
        element('span', card?.cardType || 'Card'));
      if (card?.cardType === 'Catalyst') item.append(element('span', `Rank ${card.level} · P ${card.pr} · CP ${card.cp}`));
      if (card?.desc) item.append(element('p', card.desc));
      hand.append(item);
    });
    byId('friend-duel-hand').replaceChildren(element('h2','Your hand'),hand);
    byId('friend-duel-log').replaceChildren(...view.events.map(event =>
      element('li', `Player ${event.seat + 1} · ${actionLabel(event.action)}`)));
    renderControls();
  }

  const labels = {
    advancePhase:'Continued to next phase', drawPhaseClick:'Resolved Draw',
    normalSummon:'Normal Spawned', setCatalyst:'Set a Catalyst', setTrick:'Set a Trick',
    activatePalmTrick:'Played a Trick', activateSetPalmTrick:'Activated a Set Trick',
    activateSetFieldTrick:'Activated a Field Trick', placeLibraScale:'Placed a Libra Scale',
    libraSummon:'Libra Spawned', fusionSummon:'Fusion Spawned', attack:'Declared an attack',
    passChain:'Passed response', queueConcealedResponse:'Responded in the Chain',
    resolutionFlipPosition:'Changed a Catalyst’s position', endPhaseAction:'Resolved an End Phase action',
    discardForHandLimit:'Discarded for the hand limit', concede:'Conceded'
  };
  const actionLabel = key => labels[key] || 'Resolved an action';
  const option = (value, label) => ({value,label});
  const selector = (name, label, options, multiple = false) => ({name,label,options,multiple});
  const indexes = (slots, predicate, prefix) => slots.flatMap((slot,i) => predicate(slot)
    ? [option(i, `${prefix}${i + 1}${slot?.cardId ? ' · ' + cardName(slot.cardId) : slot ? ' · Face down' : ''}`)]
    : []);

  function choose(title, fields, submit, onChange) {
    byId('friend-choice-title').textContent = title;
    byId('friend-choice-note').textContent = '';
    const container = byId('friend-choice-fields');
    const inputs = fields.map(field => {
      const select = element('select');
      select.multiple = field.multiple;
      select.name = field.name;
      select.id = 'friend-choice-' + field.name;
      select.required = !field.multiple;
      for (const item of field.options) {
        const opt = element('option', item.label);
        opt.value = String(item.value);
        select.append(opt);
      }
      const label = element('label', field.label);
      label.htmlFor = select.id;
      const row = element('div', undefined, 'friend-choice-field');
      row.append(label,select);
      return {field, row, select};
    });
    function currentValues() {
      return Object.fromEntries(inputs.map(({field, select}) => {
        const value = opt => field.options.find(item => String(item.value) === opt.value)?.value;
        return [field.name, field.multiple ? Array.from(select.selectedOptions,value) : value(select.selectedOptions[0])];
      }));
    }
    choice = () => submit(currentValues());
    if (onChange) {
      const update = () => { byId('friend-choice-note').textContent = onChange(currentValues()); };
      inputs.forEach(({select}) => select.addEventListener('change',update));
      update();
    }
    container.replaceChildren(...inputs.map(({row})=>row));
    choiceDialog.showModal();
  }

  function renderControls() {
    if (!view) return;
    controlPanel.replaceChildren();
    const {seat, players, phase, prioritySeat, waitingForResponse, pendingDiscard, result, choices} = view;
    const me = players[seat], other = players[1-seat];
    const simple = (label, command, primary = false) => controlPanel.append(button(label,()=>act(command),primary));
    const prompt = (label, type, fields, params = {}, onChange) => {
      if (fields.some(field => !field.multiple && !field.options.length)) return;
      controlPanel.append(button(label,()=>choose(label, fields, data=>act({type,...params,...data}),onChange)));
    };
    if (result) {
      const deck = element('select');
      deck.id = 'friend-rematch-deck';
      const label = element('label','Rematch deck');
      label.htmlFor = deck.id;
      const last = element('option','Keep current deck');
      last.value = '';
      deck.append(last);
      for (const item of lobbyDecks) {
        if (!CTFDeckUtils.validateDeck(item.deck,CTF_CARDS).ok) continue;
        const opt = element('option',item.name);
        opt.value = item.id;
        deck.append(opt);
      }
      const ready = view.rematchReady?.[seat];
      const rematch = button(ready ? 'Rematch ready' : 'Ready for Rematch', () => send({
        type:'rematchRequest', deck:lobbyDecks.find(item=>item.id===deck.value)?.deck
      }),true);
      rematch.disabled ||= !!ready;
      controlPanel.append(label,deck,rematch);
      if (view.rematchReady?.[1-seat]) controlPanel.append(element('p','Your opponent is ready.'));
      return;
    }
    if (!connected) return;
    controlPanel.append(button('Concede Duel',() => choose('Concede this duel?',[],()=>act({type:'concede'}))));
    if (prioritySeat !== seat) return;
    const occupied = indexes(me.catalysts,Boolean,'C');
    const empty = indexes(me.catalysts,slot=>!slot,'C');
    const hand = predicate => me.hand.flatMap((id,i)=>predicate(getCard(id)) ? [option(i,cardName(id))] : []);
    const catalysts = hand(card=>card?.cardType==='Catalyst');
    const tricks = hand(card=>card?.cardType?.endsWith('Trick'));
    const setHand = predicate => selector('handIdx','Hand card',hand(predicate));
    if (waitingForResponse) {
      simple('Pass Response',{type:'passChain'},true);
      prompt('Respond with a Trick','queueConcealedResponse',[
        selector('zone','Set Trick',choices.counters.map(i=>option(i,'T' + (i+1) + ' · ' + cardName(me.tricks[i]?.cardId))))
      ]);
      return;
    }
    if (pendingDiscard) {
      prompt('Discard to Seven','discardForHandLimit',[setHand(Boolean)]);
      return;
    }
    if (phase === 'draw' && !view.drawResolved) {
      simple(me.deckCount ? 'Draw Card' : 'Skip Draw',{type:'drawPhaseClick'},true);
      return;
    }
    if (phase !== 'end') simple('Continue',{type:'advancePhase'},true);
    if (phase === 'action') {
      if (choices.normalSpawn) {
        prompt('Normal Spawn','normalSummon',[
          selector('handIdx','Catalyst',catalysts),selector('zone','Open Catalyst Zone',empty),
          selector('position','Position',[option('atk','Pressure'),option('def','Counter Pressure')]),
          selector('tributeZones','Tributes when required',occupied,true)
        ]);
        prompt('Set Catalyst','setCatalyst',[
          setHand(card=>card?.cardType==='Catalyst' && card.level>=1 && card.level<=4),
          selector('zone','Open Catalyst Zone',empty)
        ]);
      }
      prompt('Set Trick','setTrick',[
        selector('handIdx','Trick',tricks),selector('zone','Trick Zone',indexes(me.tricks,slot=>!slot,'T').filter(item=>item.value>0&&item.value<4))
      ]);
      prompt('Play Trick','activatePalmTrick',[setHand(card=>['Palm Trick','Field Trick'].includes(card?.cardType))]);
      prompt('Activate Set Palm Trick','activateSetPalmTrick',[
        selector('zone','Set Palm Trick',indexes(me.tricks,slot=>slot?.faceDown && getCard(slot.cardId)?.cardType==='Palm Trick','T'))
      ]);
      if (me.fieldTrick?.faceDown) simple('Activate Field Trick',{type:'activateSetFieldTrick'});
      prompt('Place Libra Scale','placeLibraScale',[
        selector('handIdx','Catalyst',catalysts),selector('zone','Open Libra Zone',indexes(me.tricks,slot=>!slot,'T').filter(item=>item.value===0||item.value===4))
      ]);
      if (me.tricks[0]?.cardId && me.tricks[4]?.cardId && empty.length && catalysts.length) {
        prompt('Libra Spawn','libraSummon',[
          selector('handIdxs','Catalysts in order',catalysts,true),
          selector('zoneIdxs','Open zones in order',empty,true)
        ]);
      }
      prompt('Fusion Spawn','fusionSummon',[
        selector('fusionDeckIdx','Fusion Catalyst',me.fusionDeck.map((id,i)=>option(i,cardName(id)))),
        selector('zone','Catalyst Zone',indexes(me.catalysts,()=>true,'C'))
      ]);
    }
    if (phase === 'battle' && !view.skippedBattle) {
      const defenders = indexes(other.catalysts, Boolean,'C');
      prompt('Declare Attack','attack',[
        selector('attackerZone','Your attacker',indexes(me.catalysts,slot=>slot?.position==='atk' && !slot.faceDown,'C')),
        selector('defenderZone','Attack target',defenders.length ? defenders : [option(-1,'Opposing Chi')])
      ],{}, ({attackerZone, defenderZone})=>{
        const attacker = me.catalysts[attackerZone], target = other.catalysts[defenderZone];
        if (target?.faceDown) return 'The defender’s value will be known when it is revealed.';
        const recoil = target?.position === 'def' ? target.counterPressure - attacker?.pressure : 0;
        return recoil > 0 ? `At current values, this attack risks ${recoil} Chi before responses or effects.` : '';
      });
    }
    if (phase === 'resolution') prompt('Change Catalyst Position','resolutionFlipPosition',[selector('zoneIdx','Your Catalyst',occupied)]);
    if (phase === 'end') {
      simple('End Turn',{type:'endPhaseAction',action:'endTurn'},true);
      const payment = selector('sacrificeZone','Catalyst you own and control',occupied.filter(item=>choices.payWith.includes(item.value)));
      for (const [action,label,box,targets] of [['extraction','Extract',me.box,choices.extract],['rescue','Rescue',other.box,choices.rescue]]) {
        prompt(label,'endPhaseAction',[payment,selector('targetIdx','Box target',targets.map(i=>option(i,cardName(box[i]))))],{action});
      }
      const destroy = players.flatMap((player,i) => [
        ...player.tricks.flatMap((slot,z) => slot ? [option(`${i}:${z}`, `Player ${i+1} · T${z+1} · ${slot.cardId ? cardName(slot.cardId) : 'Face down'}`)] : []),
        ...(player.fieldTrick ? [option(`${i}:field`,`Player ${i+1} · Field Trick`)] : [])
      ]);
      if (payment.options.length && destroy.length) controlPanel.append(button('Destroy Trick',()=>choose('Destroy Trick', [
        payment,selector('target','Trick target',destroy)
      ], ({sacrificeZone,target})=>{
        const [player,z] = target.split(':');
        act({type:'endPhaseAction',action:'destroyTrick',sacrificeZone,
          targetIdx:z==='field'?{player:Number(player),kind:'field'}:{player:Number(player),zone:Number(z)}});
      })));
    }
  }

  choiceDialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const execute = choice;
    choiceDialog.close();
    execute?.();
  });
  byId('friend-choice-cancel').addEventListener('click',()=>choiceDialog.close());
  byId('create-btn').addEventListener('click',()=>enter('create'));
  byId('join-btn').addEventListener('click',()=>{
    const code = joinInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      byId('join-status').textContent = 'Enter a six-character room code.';
      return;
    }
    void enter('join',code);
  });
  byId('copy-room-link').addEventListener('click',async()=>{
    try {
      await navigator.clipboard.writeText(byId('room-link').href);
      byId('create-status').textContent = 'Invitation link copied.';
    } catch { byId('create-status').textContent = 'Copy the invitation link shown with the room code.'; }
  });
  function returnToLobby(){
    room = null;
    view = null;
    connected = false;
    clearTimeout(pollTimer);
    byId('cancel-waiting-room').hidden = true;
    byId('room-code').hidden = true;
    byId('room-link').hidden = true;
    byId('copy-room-link').hidden = true;
    byId('create-status').textContent = '';
    byId('join-status').textContent = '';
    lobby.querySelectorAll('[data-local-mode]').forEach(node => { node.disabled = false; });
    duelPage.hidden = true;
    lobby.style.display = '';
    lobbyBusy(false);
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null,'',url.href);
    joinInput.focus();
  }
  byId('friend-duel-leave').addEventListener('click',returnToLobby);
  byId('cancel-waiting-room').addEventListener('click',returnToLobby);
  if (!endpoint) note.textContent = 'Friend Rooms need a connected referee service. Guided Play, CPU and local hot-seat are available here.';
  lobbyBusy(false);
  const requested = new URLSearchParams(location.search).get('room')?.toUpperCase();
  if (endpoint && requested && /^[A-Z0-9]{6}$/.test(requested) && savedToken(requested)) void enter('join',requested);
})();
