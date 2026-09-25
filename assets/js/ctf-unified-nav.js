(function(){
  var nav = document.querySelector('nav.ctf-unified');
  if(!nav) return;
  var btn = nav.querySelector('.menu-toggle');
  var list = nav.querySelector('.nav-links');
  if(!btn || !list) return;
  function close(){
    list.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    document.body.classList.remove('ctf-nav-open');
  }
  function toggle(){
    var open = list.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('ctf-nav-open', open);
  }
  btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
  list.addEventListener('click', function(e){
    if(e.target.tagName === 'A') close();
  });
  document.addEventListener('click', function(e){
    if(!list.classList.contains('open')) return;
    if(nav.contains(e.target)) return;
    close();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') close();
  });
  window.addEventListener('resize', function(){
    if(window.innerWidth > 860) close();
  });
})();
