/* ============================================================
   Portfolio background — subtle dot network.
   One small, dependency-free script (no CDN imports) that draws
   a calm, low-opacity network of dots inside whichever section
   holds one of its canvases. Colors come from the site's own
   CSS variables so it always matches the current theme.
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
      dot: (s.getPropertyValue("--accent-strong").trim() || "#9FC7E3"),
      line: (s.getPropertyValue("--accent").trim() || "#7FB3D5")
    };
  }

  function isDark() {
    return root.getAttribute("data-theme") !== "light";
  }

  function BgNetwork(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.section = canvas.parentElement;

    // tuned for a restrained, professional density — adjust here if needed
    this.opts = {
      density: 26000,      // px^2 per particle — higher = fewer, calmer dots
      maxParticles: 46,
      linkDistance: 120,
      speed: 0.10,
      dotRadius: 1.4,
      parallax: 10          // max px the layer shifts toward the cursor
    };

    this.particles = [];
    this.colors = readColors();
    this.mouse = { x: 0, y: 0, active: false };
    this.raf = null;
    this.offsetX = 0;
    this.offsetY = 0;

    this._onResize = this.resize.bind(this);
    this._onMove = this.onMouseMove.bind(this);
    this._onLeave = this.onMouseLeave.bind(this);
    this._onTheme = this.onThemeChange.bind(this);
    this._onVisibility = this.onVisibility.bind(this);

    this.init();
  }

  BgNetwork.prototype.init = function () {
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

  BgNetwork.prototype.resize = function () {
    var rect = this.section.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var area = this.width * this.height;
    var count = Math.min(this.opts.maxParticles, Math.max(12, Math.round(area / this.opts.density)));
    this.particles = [];
    for (var i = 0; i < count; i++) {
      this.particles.push(this.makeParticle());
    }
  };

  BgNetwork.prototype.makeParticle = function () {
    var angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: Math.cos(angle) * this.opts.speed,
      vy: Math.sin(angle) * this.opts.speed
    };
  };

  BgNetwork.prototype.onMouseMove = function (e) {
    var rect = this.section.getBoundingClientRect();
    var cx = e.clientX - rect.left;
    var cy = e.clientY - rect.top;
    // normalized -1..1 offset from section center, used only for a gentle parallax shift
    this.mouse.x = (cx / this.width) * 2 - 1;
    this.mouse.y = (cy / this.height) * 2 - 1;
    this.mouse.active = true;
  };

  BgNetwork.prototype.onMouseLeave = function () {
    this.mouse.active = false;
  };

  BgNetwork.prototype.onThemeChange = function () {
    this.colors = readColors();
  };

  BgNetwork.prototype.onVisibility = function () {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
    } else if (!reduceMotion) {
      this.raf = requestAnimationFrame(this.loop.bind(this));
    }
  };

  BgNetwork.prototype.step = function () {
    var w = this.width, h = this.height;

    // ease the whole layer toward a small parallax offset
    var targetX = this.mouse.active ? this.mouse.x * this.opts.parallax : 0;
    var targetY = this.mouse.active ? this.mouse.y * this.opts.parallax : 0;
    this.offsetX += (targetX - this.offsetX) * 0.06;
    this.offsetY += (targetY - this.offsetY) * 0.06;

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > w) { p.x = w; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > h) { p.y = h; p.vy *= -1; }
    }
  };

  BgNetwork.prototype.draw = function () {
    var ctx = this.ctx, w = this.width, h = this.height;
    ctx.clearRect(0, 0, w, h);

    if (!isDark()) return; // hidden on light theme via CSS; skip the draw work too

    var dotRgb = hexToRgb(this.colors.dot);
    var lineRgb = hexToRgb(this.colors.line);
    var linkDist = this.opts.linkDistance;

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    for (var i = 0; i < this.particles.length; i++) {
      for (var j = i + 1; j < this.particles.length; j++) {
        var a = this.particles[i], b = this.particles[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          var alpha = (1 - d / linkDist) * 0.22;
          ctx.strokeStyle = "rgba(" + lineRgb + ", " + alpha.toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = "rgba(" + dotRgb + ", 0.55)";
    for (var k = 0; k < this.particles.length; k++) {
      var p = this.particles[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.opts.dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  BgNetwork.prototype.loop = function () {
    this.step();
    this.draw();
    this.raf = requestAnimationFrame(this.loop.bind(this));
  };

  function boot() {
    ["heroBg", "projectsBg"].forEach(function (id) {
      var canvas = document.getElementById(id);
      if (canvas) new BgNetwork(canvas);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
