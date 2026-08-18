/**
 * Buntes Feuerwerk (Colorful Fireworks Animation)
 * für den UNO Spiel-beendet / Round Win Dialog.
 */
class FireworksManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.rockets = [];
    this.particles = [];
    this.isRunning = false;
    this.lastSpawnTime = 0;
    this.spawnInterval = 350; // Milliseconds between rocket launches

    this.colors = [
      '#ff3838', // UNO Red
      '#ffb142', // UNO Yellow
      '#32ff7e', // UNO Green
      '#18dcff', // UNO Blue
      '#ff793f', // Vibrant Orange
      '#c56cf0', // Neon Purple
      '#ff4d4d', // Hot Pink
      '#fff200'  // Gold
    ];

    this.onResize = this.onResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  init() {
    if (!this.canvas) {
      this.canvas = document.getElementById(this.canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
    }
    this.onResize();
  }

  onResize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.width = w;
    this.height = h;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  start() {
    this.init();
    if (!this.canvas || !this.ctx) return;

    window.removeEventListener('resize', this.onResize);
    window.addEventListener('resize', this.onResize);

    this.rockets = [];
    this.particles = [];
    this.isRunning = true;
    this.lastSpawnTime = 0;

    // Spawn initial rockets immediately for instant celebration
    for (let i = 0; i < 4; i++) {
      this.spawnRocket(this.width * (0.15 + i * 0.23));
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.loop(performance.now());
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.ctx && this.width && this.height) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    this.rockets = [];
    this.particles = [];
    window.removeEventListener('resize', this.onResize);
  }

  spawnRocket(targetX) {
    const startX = targetX || (Math.random() * (this.width * 0.8) + this.width * 0.1);
    const startY = this.height + 10;
    const targetY = Math.random() * (this.height * 0.45) + this.height * 0.12;
    const speed = Math.random() * 3 + 9;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.25;

    const color = this.colors[Math.floor(Math.random() * this.colors.length)];

    this.rockets.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetY: targetY,
      color: color,
      trail: []
    });
  }

  createExplosion(x, y, color) {
    const particleCount = Math.floor(Math.random() * 45) + 65;
    const secondaryColor = this.colors[Math.floor(Math.random() * this.colors.length)];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 1.5;
      const pColor = Math.random() < 0.7 ? color : secondaryColor;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: Math.random() * 0.016 + 0.014,
        gravity: 0.07,
        friction: 0.96,
        size: Math.random() * 2.8 + 1.6,
        color: pColor
      });
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    if (this.canvas && this.canvas.parentElement) {
      const pW = this.canvas.parentElement.clientWidth;
      const pH = this.canvas.parentElement.clientHeight;
      if (pW > 0 && pH > 0 && (this.width !== pW || this.height !== pH)) {
        this.onResize();
      }
    }

    // Clear background with soft trail fade
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Periodically launch rockets
    if (timestamp - this.lastSpawnTime > this.spawnInterval) {
      this.spawnRocket();
      this.lastSpawnTime = timestamp;
    }

    // Update & Render Rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx;
      r.y += r.vy;

      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 6) r.trail.shift();

      this.ctx.beginPath();
      this.ctx.strokeStyle = r.color;
      this.ctx.lineWidth = 2.5;
      for (let j = 0; j < r.trail.length; j++) {
        const pt = r.trail[j];
        if (j === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      }
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();

      if (r.vy >= 0 || r.y <= r.targetY) {
        this.createExplosion(r.x, r.y, r.color);
        this.rockets.splice(i, 1);
      }
    }

    // Update & Render Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}

window.fireworksManager = new FireworksManager('fireworks-canvas');
