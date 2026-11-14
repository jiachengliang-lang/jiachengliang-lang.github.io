// Hero image: a feed-forward network drawn in ink on white. Activations
// travel forward as blue pulses; the pointer excites nearby neurons.

let INK = "29, 29, 31", BLUE = "0, 113, 227", BG = "#fff";
const syncTheme = () => {
  const dark = document.documentElement.dataset.theme === "dark";
  INK = dark ? "245, 245, 247" : "29, 29, 31";
  BLUE = dark ? "41, 151, 255" : "0, 113, 227";
  BG = dark ? "#000" : "#fff";
};
syncTheme();
addEventListener("themechange", syncTheme);

export function startNet(canvas, {
  reduceMotion = false,
  layers: layersWide = [6, 10, 12, 10, 6, 3],
  layersNarrow = [4, 7, 7, 5, 2],
  pad = [0.14, 0.86],
  rate = 1,
  burst = false,
} = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, layers = [];
  let nodes = [], edges = [], out = [], pulses = [];
  const mouse = { x: -1e4, y: -1e4, active: false };
  let running = false, visible = true, last = 0, raf = 0;

  function build() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = W < 735;
    layers = narrow ? layersNarrow : layersWide;
    const x0 = W * (narrow ? 0.1 : pad[0]), x1 = W * (narrow ? 0.9 : pad[1]);
    const y0 = H * 0.08, y1 = H * 0.92, maxN = Math.max(...layers);

    nodes = []; edges = [];
    layers.forEach((n, li) => {
      const x = x0 + (x1 - x0) * (li / (layers.length - 1));
      const span = (y1 - y0) * ((n - 1) / (maxN - 1));
      for (let i = 0; i < n; i++) {
        const y = (y0 + y1) / 2 - span / 2 + (n === 1 ? 0 : (span * i) / (n - 1));
        nodes.push({ x, y, layer: li, a: 0, cool: 0 });
      }
    });
    nodes.forEach((n, i) => { n.id = i; });
    out = nodes.map(() => []);
    for (const a of nodes) for (const b of nodes) {
      if (b.layer === a.layer + 1) { const e = { a, b, w: Math.random() * 2 - 1 }; edges.push(e); out[a.id].push(e); }
    }
    pulses = [];
  }

  function fire(n) {
    if (n.cool > 0) return;
    n.cool = 22;
    for (const e of out[n.id]) {
      if (e.w > 0 && Math.random() < 0.25 + e.w * 0.45) pulses.push({ e, t: 0, v: 0.016 + Math.random() * 0.01 });
    }
  }

  function step(k) {
    for (const n of nodes) {
      if (n.layer === 0) {
        const near = mouse.active ? Math.max(0, 1 - Math.abs(mouse.y - n.y) / 120) : 0;
        if (Math.random() < (0.01 * rate + near * 0.06) * k) n.a = Math.min(1, n.a + 0.85);
      }
      if (mouse.active) {
        const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        if (d < 90) n.a = Math.min(1, n.a + (1 - d / 90) * 0.07 * k);
      }
      if (n.a > 0.55) fire(n);
      n.a *= Math.pow(0.955, k);
      n.cool = Math.max(0, n.cool - k);
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.v * k;
      if (p.t >= 1) { p.e.b.a = Math.min(1, p.e.b.a + 0.3 + p.e.w * 0.5); pulses.splice(i, 1); }
    }
    if (pulses.length > 220) pulses.splice(0, pulses.length - 220);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const e of edges) {
      const act = Math.min(e.a.a, e.b.a);
      ctx.strokeStyle = act > 0.15 ? `rgba(${BLUE}, ${0.08 + act * 0.25})` : `rgba(${INK}, ${0.05 + Math.abs(e.w) * 0.04})`;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const p of pulses) {
      const { a, b } = p.e;
      const t0 = Math.max(0, p.t - 0.1);
      const g = ctx.createLinearGradient(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t);
      g.addColorStop(0, `rgba(${BLUE}, 0)`); g.addColorStop(1, `rgba(${BLUE}, 0.9)`);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
      ctx.lineTo(a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t);
      ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    for (const n of nodes) {
      const r = 6 + n.a * 2;
      if (n.a > 0.05) {
        ctx.fillStyle = `rgba(${BLUE}, ${0.12 * n.a})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 10 * n.a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = BG;
      ctx.strokeStyle = `rgba(${INK}, 0.85)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (n.a > 0.05) {
        ctx.fillStyle = `rgba(${BLUE}, ${n.a})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, r - 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function loop(now) {
    const k = last ? Math.min(3, (now - last) / 16.67) : 1;
    last = now;
    if (!document.documentElement.classList.contains("labx-open")) { step(k); draw(); }
    raf = requestAnimationFrame(loop);
  }
  const play = () => { if (!running && visible && !reduceMotion && !document.hidden) { running = true; last = 0; raf = requestAnimationFrame(loop); } };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  build();
  addEventListener("themechange", () => { if (reduceMotion || !running) draw(); });
  // when the training lab closes, every input neuron fires at once
  if (burst) addEventListener("labclosed", () => {
    for (const n of nodes) if (n.layer === 0) { n.a = 1; n.cool = 0; }
    if (reduceMotion) draw();
  });
  if (reduceMotion) {
    nodes.forEach((n) => { n.a = Math.random() < 0.2 ? 0.7 : 0; });
    draw();
  } else {
    for (let i = 0; i < 200; i++) step(1);
    play();
  }

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  canvas.addEventListener("pointerleave", () => { mouse.active = false; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? play() : pause(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduceMotion) draw(); }, 150); });
}
