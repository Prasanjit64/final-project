/* ============================================================
   Particle-network section background.
   Dots drift slowly inside their section; nearby dots are joined
   by a line whose opacity fades with distance; the cursor gently
   pushes nearby dots aside. Colors are read from the site's own
   CSS variables. Runs once per canvas passed to init().
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var num = parseInt(h, 16);
    return (num >> 16 & 255) + ", " + (num >> 8 & 255) + ", " + (num & 255);
  }

  function readColors() {
    var s = getComputedStyle(root);
    return {
      accent: (s.getPropertyValue("--accent-strong").trim() || "#9FC7E3"),
      gold: (s.getPropertyValue("--gold").trim() || "#D9A94E")
    };
  }

  function isDark() {
    return root.getAttribute("data-theme") !== "light";
  }

  // weighted so the same marks already drifting in your hero (∫ Σ π √ ∞)
  // show up most often, with a few rarer ones mixed in
  var SYMBOLS = ["∫", "∫", "Σ", "Σ", "π", "π", "√", "∞", "Δ", "∂", "θ", "λ"];

  function pickSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function NetworkBackground(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.section = canvas.parentElement;
    this.opts = Object.assign({
      density: 20000,   // px^2 per particle — lower = more particles
      maxParticles: 55,
      linkDistance: 140,
      speed: 0.16,
      minFontSize: 13,
      maxFontSize: 24,
      mouseRadius: 130
    }, opts || {});

    this.particles = [];
    this.colors = readColors();
    this.mouse = { x: -9999, y: -9999, active: false };
    this.raf = null;

    this._onResize = this.resize.bind(this);
    this._onMove = this.onMouseMove.bind(this);
    this._onLeave = this.onMouseLeave.bind(this);
    this._onTheme = this.onThemeChange.bind(this);
    this._onVisibility = this.onVisibility.bind(this);

    this.init();
  }

  NetworkBackground.prototype.init = function () {
    window.addEventListener("resize", this._onResize);
    this.section.addEventListener("mousemove", this._onMove);
    this.section.addEventListener("mouseleave", this._onLeave);
    document.addEventListener("visibilitychange", this._onVisibility);
    new MutationObserver(this._onTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    this.resize();
    if (!reduceMotion) {
      this.raf = requestAnimationFrame(this.loop.bind(this));
    } else {
      this.draw();
    }
  };

  NetworkBackground.prototype.resize = function () {
    var rect = this.section.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var area = this.width * this.height;
    var count = Math.min(this.opts.maxParticles, Math.round(area / this.opts.density));
    this.particles = [];
    for (var i = 0; i < count; i++) {
      this.particles.push(this.makeParticle());
    }
  };

  NetworkBackground.prototype.makeParticle = function () {
    var angle = Math.random() * Math.PI * 2;
    var t = Math.random();
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * this.opts.speed,
      vy: Math.sin(angle) * this.opts.speed,
      symbol: pickSymbol(),
      size: this.opts.minFontSize + t * (this.opts.maxFontSize - this.opts.minFontSize),
      gold: Math.random() < 0.18
    };
  };

  NetworkBackground.prototype.onMouseMove = function (e) {
    var rect = this.section.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.active = true;
  };

  NetworkBackground.prototype.onMouseLeave = function () {
    this.mouse.active = false;
  };

  NetworkBackground.prototype.onThemeChange = function () {
    this.colors = readColors();
  };

  NetworkBackground.prototype.onVisibility = function () {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
    } else if (!reduceMotion) {
      this.raf = requestAnimationFrame(this.loop.bind(this));
    }
  };

  NetworkBackground.prototype.step = function () {
    var w = this.width, h = this.height, mr = this.opts.mouseRadius;
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];

      if (this.mouse.active) {
        var dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mr && dist > 0.01) {
          var force = (1 - dist / mr) * 0.06;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // gentle drag so mouse pushes don't accumulate into chaos
      p.vx *= 0.98;
      p.vy *= 0.98;

      // keep a slow baseline drift
      var minSpeed = this.opts.speed * 0.4;
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp < minSpeed) {
        var a = Math.atan2(p.vy, p.vx) || Math.random() * Math.PI * 2;
        p.vx += Math.cos(a) * 0.003;
        p.vy += Math.sin(a) * 0.003;
      }

      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > w) { p.x = w; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > h) { p.y = h; p.vy *= -1; }
    }
  };

  NetworkBackground.prototype.draw = function () {
    var ctx = this.ctx, w = this.width, h = this.height;
    var dotRgb = hexToRgb(this.colors.accent);
    var lineRgb = hexToRgb(this.colors.accent);
    var goldRgb = hexToRgb(this.colors.gold);
    var linkDist = this.opts.linkDistance;

    ctx.clearRect(0, 0, w, h);

    if (!isDark()) return; // hidden on light theme via CSS; skip the draw work too

    // links
    for (var i = 0; i < this.particles.length; i++) {
      for (var j = i + 1; j < this.particles.length; j++) {
        var a = this.particles[i], b = this.particles[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          var alpha = (1 - d / linkDist) * 0.35;
          ctx.strokeStyle = "rgba(" + lineRgb + ", " + alpha.toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // glyphs — small drifting math marks, a handful in gold, most in ink blue
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var k = 0; k < this.particles.length; k++) {
      var p = this.particles[k];
      var rgb = p.gold ? goldRgb : dotRgb;
      ctx.font = "italic " + p.size.toFixed(1) + "px 'Spectral', Georgia, serif";
      ctx.fillStyle = "rgba(" + rgb + ", 0.55)";
      ctx.fillText(p.symbol, p.x, p.y);
    }
  };

  NetworkBackground.prototype.loop = function () {
    this.step();
    this.draw();
    this.raf = requestAnimationFrame(this.loop.bind(this));
  };

  function boot() {
    ["heroNetwork", "projectsNetwork"].forEach(function (id) {
      var canvas = document.getElementById(id);
      if (canvas) new NetworkBackground(canvas);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
