// Ambient swirl background — noise-driven flow field on canvas.
// Colors are pulled from the site's own CSS variables (--bg, --accent, --gold)
// so it stays in step with the "notebook" palette. Fade in/out on theme
// change is handled in style.css (#ambient-bg opacity rules) — this script
// just stops drawing while the canvas is hidden, to save CPU.

import { createNoise2D } from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js";

const canvas = document.getElementById("ambient-bg");
if (canvas) {
  const ctx = canvas.getContext("2d");
  const noise2D = createNoise2D();
  const root = document.documentElement;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width, height, dpr, raf, particles = [];
  let colors = readColors();

  const CONFIG = {
    particleCount: window.innerWidth < 700 ? 220 : 480,
    noiseScale: 0.0018,
    noiseSteps: 6,
    timeScale: 0.00012,
    speed: 1.3,
    fadeAlpha: 0.045,
    lineWidth: 1,
  };

  function readColors() {
    const s = getComputedStyle(root);
    return {
      bg: s.getPropertyValue("--bg").trim() || "#0F1512",
      accentStrong: s.getPropertyValue("--accent-strong").trim() || "#9FC7E3",
      gold: s.getPropertyValue("--gold").trim() || "#D9A94E",
    };
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = parseInt(full, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  function isDark() {
    return root.getAttribute("data-theme") !== "light";
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgb(${hexToRgb(colors.bg)})`;
    ctx.fillRect(0, 0, width, height);
  }

  function makeParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      life: Math.random() * 200 + 100,
      age: 0,
      // most particles trace the ink-blue accent, a few pick up the gold —
      // like a pen line next to the occasional chalk mark
      warm: Math.random() < 0.2,
    };
  }

  function initParticles() {
    particles = Array.from({ length: CONFIG.particleCount }, makeParticle);
  }

  function angleAt(x, y, t) {
    const n = noise2D(x * CONFIG.noiseScale, y * CONFIG.noiseScale + t);
    const banded = Math.floor(n * CONFIG.noiseSteps) / CONFIG.noiseSteps;
    return banded * Math.PI * 2;
  }

  function step(t) {
    ctx.fillStyle = `rgba(${hexToRgb(colors.bg)}, ${CONFIG.fadeAlpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.lineCap = "round";

    const accentRgb = hexToRgb(colors.accentStrong);
    const goldRgb = hexToRgb(colors.gold);

    for (const p of particles) {
      const angle = angleAt(p.x, p.y, t * CONFIG.timeScale);
      const nx = p.x + Math.cos(angle) * CONFIG.speed;
      const ny = p.y + Math.sin(angle) * CONFIG.speed;

      ctx.strokeStyle = `rgba(${p.warm ? goldRgb : accentRgb}, 0.45)`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      p.x = nx;
      p.y = ny;
      p.age++;

      if (p.age > p.life || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        Object.assign(p, makeParticle());
      }
    }
  }

  function loop(t) {
    if (isDark()) {
      step(t);
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    colors = readColors();
    resize();
    initParticles();
    if (!reduceMotion) {
      raf = requestAnimationFrame(loop);
    } else {
      step(0);
    }
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    resize();
    initParticles();
    if (!reduceMotion) raf = requestAnimationFrame(loop);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (!reduceMotion) {
      raf = requestAnimationFrame(loop);
    }
  });

  // Re-read colors and reset the canvas fill whenever the theme flips.
  new MutationObserver(() => {
    colors = readColors();
    ctx.fillStyle = `rgb(${hexToRgb(colors.bg)})`;
    ctx.fillRect(0, 0, width, height);
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  start();
}
