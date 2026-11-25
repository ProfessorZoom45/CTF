(function () {
  const page=document.getElementById('friend-duel') ? 'play' : (location.pathname.split('/').pop()||'index').replace(/\.html$/,'');
  document.body.dataset.ctfPage=page;
  if (page === 'play') setupDuelDisplay();
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
      else delete document.body.dataset.ctfDuel;
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
          button.matches('[data-local-mode], #create-btn, #join-btn, .tpb-primary')) {
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

  function setupWindow(panel, close, visible) {
    const header = panel.querySelector('.duel-window-bar');
    const controls = document.createElement('div');
    controls.className = 'duel-window-controls';
    const button = (label, glyph, action) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.title = label;
      node.setAttribute('aria-label', label);
      node.textContent = glyph;
      let lastTouch = -Infinity;
      node.addEventListener('pointerup', event => {
        if (event.pointerType !== 'touch' || !event.isPrimary || document.elementFromPoint(event.clientX, event.clientY) !== node) return;
        // A touch tap immediately after dragging a window may produce no click.
        lastTouch = performance.now();
        action();
      });
      node.addEventListener('click', event => {
        if (event.detail && event.pointerType !== 'mouse' && performance.now() - lastTouch < 500) return;
        action();
      });
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
    const reset = new MutationObserver(() => {
      if (visible(panel)) return;
      if (panel.classList.contains('duel-window-minimized')) minimize(false);
      x = 0;
      y = 0;
      panel.style.removeProperty('--duel-window-x');
      panel.style.removeProperty('--duel-window-y');
    });
    reset.observe(panel, {attributes:true,attributeFilter:['class','open','aria-hidden']});
    reset.observe(panel.parentElement, {attributes:true,attributeFilter:['class']});
  }
})();
