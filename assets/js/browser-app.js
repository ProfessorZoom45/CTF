(function () {
  const page=(location.pathname.split('/').pop()||'index').replace(/\.html$/,'');
  document.body.dataset.ctfPage=page;
  if(page==='rules')for(const table of document.querySelectorAll('.rule-table')){const scroll=document.createElement('div');scroll.className='ctf-table-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','Scrollable rules table');table.before(scroll);scroll.append(table);}
  const sidebar = document.querySelector('#game .sidebar');
  if (sidebar) {
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
})();
