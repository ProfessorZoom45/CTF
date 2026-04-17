(() => {
  const styleId = 'ctf-embers-style';
  const canvasId = 'ctf-embers-canvas';
  function injectStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #${canvasId}{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;opacity:.9;}
    `;
    document.head.appendChild(style);
  }
  function init() {
    if (!document.body || document.getElementById(canvasId)) return;
    injectStyle();
    document.body.classList.add('ctf-embers-enabled');
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const embers = [];
    const count = prefersReduced ? 24 : 70;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize, { passive:true });
    resize();
    class Ember {
      constructor() { this.reset(true); }
      reset(initial=false) {
        this.x = Math.random() * w;
        this.y = initial ? Math.random() * h : h + 10;
        this.r = Math.random() * 2.2 + 0.6;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = -(Math.random() * 1.2 + 0.35);
        this.life = Math.random() * 180 + 90;
        this.maxLife = this.life;
        this.hue = Math.random() * 26 + 12;
      }
      update() {
        this.x += this.vx + Math.sin(this.life * 0.02) * 0.25;
        this.y += this.vy;
        this.life--;
        if (this.life <= 0 || this.y < -12) this.reset();
      }
      draw() {
        const a = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * a, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},100%,58%,${a * 0.42})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * a * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},100%,55%,${a * 0.05})`;
        ctx.fill();
      }
    }
    for (let i = 0; i < count; i++) embers.push(new Ember());
    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (const e of embers) { e.update(); e.draw(); }
      requestAnimationFrame(loop);
    }
    loop();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
