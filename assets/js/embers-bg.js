// One shared ember renderer for every CTF page, including the home page.
(()=>{
  if(window.CTFEmbers)return;
  window.CTFEmbers=true;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const layers=[];
  let frameId=0,last=0,width=0,height=0;
  const style=document.createElement('style');
  style.textContent='.ctf-ember-layer{position:fixed;inset:0;width:100%;height:100%;pointer-events:none!important;z-index:-1;opacity:.8}.ctf-ember-layer.ctf-ember-front{z-index:2;opacity:.48}';
  document.head.append(style);
  function layer(id,foreground,count){
    const canvas=document.getElementById(id)||document.createElement('canvas');
    canvas.id=id;canvas.className='ctf-ember-layer'+(foreground?' ctf-ember-front':'');canvas.setAttribute('aria-hidden','true');
    if(!canvas.isConnected)document.body.prepend(canvas);
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const particles=Array.from({length:count},()=>({}));
    const reset=(p,initial=false)=>Object.assign(p,{x:Math.random()*width,y:initial?Math.random()*height:height+12,r:foreground?1.5+Math.random()*1.5:.5+Math.random()*1.5,speed:foreground?12+Math.random()*15:25+Math.random()*35,drift:(Math.random()-.5)*18,life:.4+Math.random()*.6});
    layers.push({canvas,ctx,particles,reset,foreground});
  }
  function resize(){
    width=innerWidth;height=innerHeight;const scale=Math.min(devicePixelRatio||1,2);
    for(const l of layers){l.canvas.width=Math.floor(width*scale);l.canvas.height=Math.floor(height*scale);l.ctx.setTransform(scale,0,0,scale,0,0);l.particles.forEach(p=>l.reset(p,true));}
    if(!frameId)paint(0);
  }
  function reduced(){
    if(media.matches||document.body.classList.contains('reduced-motion'))return true;
    try{return JSON.parse(localStorage.getItem('ctf:settings')||'{}').motion===true;}catch{return false;}
  }
  function paint(dt){
    for(const l of layers){
      const {ctx,particles}=l;ctx.clearRect(0,0,width,height);
      for(const p of particles){
        if(dt){p.y-=p.speed*dt;p.x+=p.drift*dt+Math.sin(p.y*.012)*.25;if(p.y< -15||p.x< -20||p.x>width+20)l.reset(p);}
        const alpha=Math.max(0,Math.min(1,p.y/(height*.25)))*p.life;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);ctx.fillStyle='rgba(255,106,0,'+(alpha*.06)+')';ctx.fill();
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(255,164,63,'+(alpha*.6)+')';ctx.fill();
      }
    }
  }
  function frame(now){
    frameId=0;if(document.hidden||reduced()){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;paint(dt);frameId=requestAnimationFrame(frame);
  }
  function sync(){
    cancelAnimationFrame(frameId);frameId=0;last=0;
    layers.forEach(l=>{l.canvas.hidden=reduced();});
    if(!document.hidden&&!reduced())frameId=requestAnimationFrame(frame);
  }
  function init(){
    // Reuse the homepage's existing two canvases; other pages receive the same layers.
    layer(document.getElementById('ember-canvas')?'ember-canvas':'ctf-embers-canvas',false,innerWidth<650?30:55);
    layer(document.getElementById('ember-canvas-foreground')?'ember-canvas-foreground':'ctf-embers-foreground',true,innerWidth<650?8:14);
    resize();sync();
    addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
