(function () {
  let lastWindowTap = null;
  const page=document.getElementById('friend-duel') ? 'play' : (location.pathname.split('/').pop()||'index').replace(/\.html$/,'');
  document.body.dataset.ctfPage=page;
  if (page === 'play') {
    window.CTF_DUEL_WINDOWS = setupDuelPrompts();
    setupDuelDisplay();
    document.dispatchEvent(new Event('ctf-duel-windows-ready'));
  }
  if(page==='rules')for(const table of document.querySelectorAll('.rule-table')){const scroll=document.createElement('div');scroll.className='ctf-table-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','Scrollable rules table');table.before(scroll);scroll.append(table);}
  const sidebar = document.querySelector('#game .sidebar');
  if (sidebar) {
    sidebar.querySelector('.phase-rail').after(document.getElementById('tutorial-panel'));
    for (const id of ['p1-skip-battle-banner','tutorial-phase-banner']) {
      const banner = document.getElementById(id);
      if (banner) sidebar.prepend(banner);
    }
  }
  const nav = document.querySelector('nav .nav-links');
  if (nav) {
    const root=nav.closest('nav');root.classList.add('ctf-unified');root.setAttribute('aria-label','Primary');
    const brand=root.querySelector('.nav-brand,.brand');
    if(brand){brand.classList.add('nav-brand');brand.setAttribute('aria-label','Carry The Flame — Home');brand.innerHTML='<img class="ctf-nav-logo" src="assets/img/ctf-torch-badge.png" alt="" width="42" height="46"><span class="ctf-nav-wordmark">Carry the <strong>Flame</strong></span>';}
    if(!root.querySelector('.menu-toggle')){
      const button=document.createElement('button');button.type='button';button.className='menu-toggle';button.textContent='☰';button.setAttribute('aria-label','Open navigation');button.setAttribute('aria-expanded','false');nav.id=nav.id||'ctf-nav-list';button.setAttribute('aria-controls',nav.id);nav.before(button);
      const close=()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false');document.body.classList.remove('ctf-nav-open');};
      button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));document.body.classList.toggle('ctf-nav-open',open);});nav.addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    }
  }
  const footer=document.querySelector('footer');
  if(footer&&!footer.querySelector('.ctf-footer-mark')){const logo=document.createElement('img');Object.assign(logo,{className:'ctf-footer-mark',src:'assets/img/ctf-torch-badge.png',alt:'Perfect Timing Gaming · Carry The Flame',width:62,height:62,loading:'lazy'});footer.prepend(logo);}
  if(!document.querySelector('script[src*="embers-bg.js"]')){const script=document.createElement('script');script.src='assets/js/embers-bg.js';document.head.append(script);}
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('service-worker.js').catch(error => console.warn('Offline cache could not be installed:',error));
  }

  function setupDuelDisplay() {
    const root = document.documentElement;
    const localDuel = document.getElementById('game');
    const friendDuel = document.getElementById('friend-duel');
    const status = document.getElementById('duel-display-status');
    const touch = matchMedia('(pointer: coarse)');
    const fullscreenButtons = document.querySelectorAll('[data-duel-fullscreen]');
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    let automaticFullscreenTried = false;
    let statusTimer;

    function updateMode() {
      const mode = !friendDuel.hidden ? 'friend' : localDuel.style.display === 'grid' ? 'local' : '';
      if ((document.body.dataset.ctfDuel || '') === mode) return;
      if (mode) document.body.dataset.ctfDuel = mode;
      else {
        delete document.body.dataset.ctfDuel;
        window.CTF_DUEL_WINDOWS.reset();
      }
      closeCardText();
    }
    const modeObserver = new MutationObserver(updateMode);
    modeObserver.observe(localDuel, {attributes:true, attributeFilter:['style']});
    modeObserver.observe(friendDuel, {attributes:true, attributeFilter:['hidden']});
    updateMode();

    function displayStatus(message) {
      status.textContent = message;
      status.hidden = false;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { status.hidden = true; }, 4800);
    }

    function syncFullscreenLabels() {
      const active = !!fullscreenElement();
      document.body.classList.toggle('ctf-duel-fullscreen', active);
      for (const button of fullscreenButtons) button.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    }
    document.addEventListener('fullscreenchange', syncFullscreenLabels);
    document.addEventListener('webkitfullscreenchange', syncFullscreenLabels);

    document.addEventListener('pointerdown', () => { lastWindowTap = null; }, true);
    document.addEventListener('click', event => {
      const physicalMouse = event.pointerType === 'mouse' && !event.sourceCapabilities?.firesTouchEvents;
      if (!lastWindowTap || !event.detail || physicalMouse || performance.now() - lastWindowTap.at > 500) return;
      if (Math.hypot(event.clientX - lastWindowTap.x, event.clientY - lastWindowTap.y) > 8) return;
      // A response can replace the button before the same touch also produces a click.
      lastWindowTap = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    async function setFullscreen(explicit) {
      const enter = root.requestFullscreen || root.webkitRequestFullscreen;
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try {
        if (fullscreenElement()) {
          if (explicit && exit) await exit.call(document);
          return;
        }
        if (!enter || (document.fullscreenEnabled === false && !document.webkitFullscreenEnabled)) throw new Error();
        await enter.call(root);
        if (touch.matches && screen.orientation?.lock) {
          try { await screen.orientation.lock('landscape'); }
          catch { if (matchMedia('(orientation: portrait)').matches) displayStatus('Rotate your device for the landscape layout.'); }
        }
      } catch {
        if (explicit) displayStatus(touch.matches ? 'Rotate your device for the landscape layout.' : 'Use your browser’s fullscreen command.');
      }
    }

    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.hasAttribute('data-duel-fullscreen')) {
        automaticFullscreenTried = true;
        void setFullscreen(true);
      } else if (!automaticFullscreenTried && !touch.matches && event.isTrusted &&
          button.matches('[data-local-mode], #create-btn, #join-btn, .tpb-primary, .duel-prompt-actions button')) {
        automaticFullscreenTried = true;
        void setFullscreen(false);
      }
    }, true);

    for (const [selector, close, visible] of [
      ['#tip', closeCardText, panel => panel.classList.contains('show')],
      ['#choice-modal .choice-card', closeChoiceModal, panel => panel.parentElement.classList.contains('show')],
      ['#end-phase-modal .epm-card', closeEndPhaseModal, panel => panel.parentElement.classList.contains('show')],
      ['#result-card .result-panel', hideResultCard, panel => panel.parentElement.classList.contains('show')],
      ['#confirm-modal .confirm-card', () => resolveConfirm(false), panel => panel.parentElement.classList.contains('show')],
      ['#friend-duel-choice', () => document.getElementById('friend-choice-cancel').click(), panel => panel.open],
      ['#settings-drawer', () => toggleSettings(false), panel => panel.getAttribute('aria-hidden') === 'false']
    ]) {
      setupWindow(document.querySelector(selector), close, visible);
    }

    document.addEventListener('contextmenu', event => {
      const card = event.target.closest('#game [data-inspect-card]') || event.target.closest('#game :is(.zone,.field-slot)')?.querySelector('[data-inspect-card]');
      if (!card) return;
      event.preventDefault();
      inspectCardText(card.dataset.inspectCard, card);
    });
    document.addEventListener('keydown', event => {
      if (event.key.toLowerCase() !== 'i' || event.ctrlKey || event.altKey || event.metaKey) return;
      const card = event.target.closest('#game [data-inspect-card]') || event.target.closest('#game :is(.zone,.field-slot)')?.querySelector('[data-inspect-card]');
      if (!card) return;
      event.preventDefault();
      inspectCardText(card.dataset.inspectCard, card);
    });
  }

  function setupDuelPrompts() {
    const dock = document.querySelector('.duel-prompt-dock');
    const states = {};
    for (const kind of ['next', 'chain']) {
      const panel = document.getElementById(`duel-${kind}-window`);
      const reopen = document.getElementById(`duel-reopen-${kind}`);
      const state = {
        panel, reopen,
        heading: panel.querySelector('h2'), copy: panel.querySelector('.duel-prompt-copy'),
        controls: panel.querySelector('.duel-prompt-actions'),
        actions: [], visibleKey: null, available: false, dismissed: false, placed: false
      };
      states[kind] = state;
      state.window = setupWindow(panel, () => {
        state.dismissed = true;
        renderVisibility();
        reopen.focus({preventScroll:true});
      }, node => !node.hidden, true);
      bindWindowPress(reopen, () => {
        if (!state.available) return;
        state.dismissed = false;
        renderVisibility();
        state.window.expand();
        panel.querySelector('.duel-window-bar').focus({preventScroll:true});
      });
    }

    function place(state) {
      const mat = document.querySelector('#friend-duel:not([hidden]) .ctf-playmat') || document.querySelector('#game .ctf-playmat');
      const bounds = mat.getBoundingClientRect();
      const x = Math.min(innerWidth - state.panel.offsetWidth - 8, Math.max(8, bounds.left + 10));
      const y = Math.min(innerHeight - state.panel.offsetHeight - 8, Math.max(8, bounds.top + 10));
      state.panel.style.left = `${Math.max(8, x)}px`;
      state.panel.style.top = `${Math.max(8, y)}px`;
      state.placed = true;
    }

    function renderVisibility() {
      const active = states.chain.available ? states.chain : states.next.available ? states.next : null;
      for (const state of Object.values(states)) {
        state.reopen.hidden = state !== active || !state.dismissed;
        state.panel.hidden = state !== active || state.dismissed;
        if (!state.panel.hidden && !state.placed) place(state);
      }
      if (active?.dismissed) {
        dock.style.left = `${Math.max(8, Math.min(parseFloat(active.panel.style.left), innerWidth - dock.offsetWidth - 8))}px`;
        dock.style.top = `${Math.max(8, Math.min(parseFloat(active.panel.style.top), innerHeight - dock.offsetHeight - 8))}px`;
      }
    }
    window.addEventListener('resize', renderVisibility);

    function update(kind, {show = true, key, title, copy, actions = []}) {
      const state = states[kind];
      state.available = show;
      if (!show) {
        state.actions = [];
        state.controls.replaceChildren();
        state.copy.textContent = '';
        state.heading.textContent = kind === 'chain' ? 'Chain response' : 'Next step';
        renderVisibility();
        return;
      }
      const changed = key !== state.visibleKey;
      if (changed) {
        state.visibleKey = key;
        state.dismissed = false;
      }
      if (state.heading.textContent !== title) state.heading.textContent = title;
      if (state.copy.textContent !== copy) state.copy.textContent = copy;
      state.actions = actions;
      while (state.controls.children.length > actions.length) state.controls.lastElementChild.remove();
      actions.forEach((action, index) => {
        let button = state.controls.children[index];
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          bindWindowPress(button, () => state.actions[index]?.run());
          state.controls.append(button);
        }
        button.className = `act-btn ${action.primary ? 'act-btn-fire' : 'act-btn-ghost'}`;
        if (button.textContent !== action.label) button.textContent = action.label;
        button.disabled = !!action.disabled;
      });
      renderVisibility();
      if (changed) state.window.expand();
    }

    function reset() {
      for (const [kind, state] of Object.entries(states)) {
        state.placed = false;
        state.visibleKey = null;
        state.dismissed = false;
        state.window.reset();
        update(kind, {show:false});
      }
    }

    return {update, reset};
  }

  function bindWindowPress(node, action) {
    node.addEventListener('pointerup', event => {
      if (node.disabled || event.pointerType !== 'touch' || !event.isPrimary || document.elementFromPoint(event.clientX, event.clientY) !== node) return;
      // A touch tap immediately after dragging a window may produce no click.
      lastWindowTap = {x:event.clientX, y:event.clientY, at:performance.now()};
      action();
    });
    node.addEventListener('click', () => {
      if (node.disabled) return;
      action();
    });
  }

  function setupWindow(panel, close, visible, keepWhenHidden = false) {
    const header = panel.querySelector('.duel-window-bar');
    const controls = document.createElement('div');
    controls.className = 'duel-window-controls';
    const button = (label, glyph, action) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.title = label;
      node.setAttribute('aria-label', label);
      node.textContent = glyph;
      bindWindowPress(node, action);
      controls.append(node);
      return node;
    };
    const shrink = button('Minimize window', '−', () => {
      minimize(!panel.classList.contains('duel-window-minimized'));
      move(0, 0);
    });
    button('Close window', '×', close);
    header.append(controls);
    header.tabIndex = panel.id === 'tip' ? -1 : 0;
    header.setAttribute('aria-label', 'Move window with arrow keys');
    panel.classList.add('duel-window');
    let x = 0, y = 0, drag = null;

    function move(dx, dy) {
      const bounds = panel.getBoundingClientRect();
      x += Math.max(4 - bounds.left, Math.min(innerWidth - 4 - bounds.right, dx));
      y += Math.max(4 - bounds.top, Math.min(innerHeight - 4 - bounds.bottom, dy));
      panel.style.setProperty('--duel-window-x', `${x}px`);
      panel.style.setProperty('--duel-window-y', `${y}px`);
    }

    function minimize(value) {
      panel.classList.toggle('duel-window-minimized', value);
      const label = value ? 'Restore window' : 'Minimize window';
      shrink.title = label;
      shrink.setAttribute('aria-label', label);
      shrink.textContent = value ? '□' : '−';
    }
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || controls.contains(event.target)) return;
      drag = {x:event.clientX,y:event.clientY};
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      move(event.clientX - drag.x, event.clientY - drag.y);
      drag = {x:event.clientX,y:event.clientY};
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) {
      header.addEventListener(event, () => { drag = null; });
    }
    header.addEventListener('keydown', event => {
      const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if (!direction || event.target !== header) return;
      event.preventDefault();
      move(direction[0] * 16, direction[1] * 16);
    });
    window.addEventListener('resize', () => { if (visible(panel)) move(0, 0); });
    function reset() {
      if (panel.classList.contains('duel-window-minimized')) minimize(false);
      x = 0;
      y = 0;
      panel.style.removeProperty('--duel-window-x');
      panel.style.removeProperty('--duel-window-y');
    }
    if (!keepWhenHidden) {
      const closed = new MutationObserver(() => { if (!visible(panel)) reset(); });
      closed.observe(panel, {attributes:true,attributeFilter:['class','open','aria-hidden']});
      closed.observe(panel.parentElement, {attributes:true,attributeFilter:['class']});
    }
    return {reset, expand() { minimize(false); if (visible(panel)) move(0, 0); }};
  }
})();
