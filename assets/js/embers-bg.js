(() => {
  const styleId = 'ctf-embers-style';
  const bgCanvasId = 'ctf-embers-canvas';
  const fgCanvasId = 'ctf-embers-foreground';

  function injectStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #${bgCanvasId}{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;opacity:.9;}
      #${fgCanvasId}{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;opacity:.95;}
    `;
    document.head.appendChild(style);
  }

  function makeCanvas(id, prepend = true) {
    let canvas = document.getElementById(id);
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = id;
    if (prepend) document.body.prepend(canvas);
    else document.body.appendChild(canvas);
    return canvas;
  }

  function initBackgroundLayer(canvas) {
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
    resize();
    class Ember {
      constructor() { this.reset(true); }
      reset(initial = false) {
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
    window.addEventListener('resize', resize, { passive: true });
    loop();
  }

  function initForegroundLayer(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, spawnMinY = 0;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const embers = [];
    const count = prefersReduced ? 10 : 35;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      spawnMinY = h * 0.85; // embers SPAWN in the bottom 15%…
    }
    resize();
    class ForegroundEmber {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random() * w;
        this.y = initial ? spawnMinY + Math.random() * (h - spawnMinY) : h - Math.random() * (h * 0.08);
        this.r = Math.random() * 3.2 + 1.4;
        this.vx = (Math.random() - 0.5) * 0.7;
        this.vy = -(Math.random() * 0.18 + 0.04);
        this.life = Math.random() * 260 + 140;
        this.maxLife = this.life;
        this.hue = Math.random() * 18 + 18;
      }
      update() {
        this.x += this.vx + Math.sin(this.life * 0.018 + this.x * 0.01) * 0.35;
        this.y += this.vy;
        this.life--;
        // Locked to bottom 15% — resets as soon as it drifts above the zone
        if (this.life <= 0 || this.y < spawnMinY - 10 || this.x < -20 || this.x > w + 20) this.reset();
      }
      draw() {
        const a = this.life / this.maxLife;
        const radius = this.r * (0.55 + 0.45 * a);
        const halo = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 4.6);
        halo.addColorStop(0, `hsla(${this.hue},100%,72%,${a * 0.34})`);
        halo.addColorStop(0.38, `hsla(${this.hue},100%,58%,${a * 0.15})`);
        halo.addColorStop(1, `hsla(${this.hue},100%,40%,0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 4.6, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},100%,64%,${a * 0.78})`;
        ctx.fill();
      }
    }
    for (let i = 0; i < count; i++) embers.push(new ForegroundEmber());
    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (const e of embers) { e.update(); e.draw(); }
      requestAnimationFrame(loop);
    }
    window.addEventListener('resize', resize, { passive: true });
    loop();
  }

  function init() {
    if (!document.body) return;
    injectStyle();
    const hasIndexCanvas = !!document.getElementById('ember-canvas');
    if (!hasIndexCanvas && !document.getElementById(bgCanvasId)) {
      initBackgroundLayer(makeCanvas(bgCanvasId, true));
    }
    if (!document.getElementById(fgCanvasId)) {
      initForegroundLayer(makeCanvas(fgCanvasId, false));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
