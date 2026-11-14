// "Train one yourself": a small neural network (2 → 12 → 12 → 1, tanh, sigmoid
// output) trained live with Adam on the points in the plot. Everything runs in
// the browser; nothing is precomputed.

const H = 12, GR = 44, STEPS = 1, LR = 0.012, MAX_POINTS = 400;
const O = { W1: 0, b1: 2 * H, W2: 3 * H, b2: 3 * H + H * H, W3: 4 * H + H * H, b3: 5 * H + H * H };
const P = 5 * H + H * H + 1;
const TAU = Math.PI * 2, R = Math.random;
const gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };

/* ---------- model ---------- */
function makeNet() {
  const p = new Float64Array(P);
  for (let i = 0; i < 2 * H; i++) p[O.W1 + i] = gauss() * 2.2;
  for (let i = 0; i < H; i++) p[O.b1 + i] = gauss() * 0.5;
  for (let i = 0; i < H * H; i++) p[O.W2 + i] = gauss() / Math.sqrt(H);
  for (let i = 0; i < H; i++) p[O.W3 + i] = gauss() / Math.sqrt(H);
  return { p, g: new Float64Array(P), m: new Float64Array(P), v: new Float64Array(P), t: 0 };
}
const a1 = new Float64Array(H), a2 = new Float64Array(H), d1 = new Float64Array(H), d2 = new Float64Array(H);
function forward(p, x, y) {
  for (let i = 0; i < H; i++) a1[i] = Math.tanh(p[O.W1 + i * 2] * x + p[O.W1 + i * 2 + 1] * y + p[O.b1 + i]);
  let z = p[O.b3];
  for (let j = 0; j < H; j++) {
    let s = p[O.b2 + j];
    const row = O.W2 + j * H;
    for (let i = 0; i < H; i++) s += p[row + i] * a1[i];
    a2[j] = Math.tanh(s);
    z += p[O.W3 + j] * a2[j];
  }
  return z;
}
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

// one full-batch step: forward, backpropagation, Adam update
function trainStep(net, pts) {
  const { p, g, m, v } = net, n = pts.length;
  g.fill(0);
  let loss = 0, correct = 0;
  for (const pt of pts) {
    const out = sigmoid(forward(p, pt.x, pt.y)), t = pt.c;
    loss -= t ? Math.log(out + 1e-9) : Math.log(1 - out + 1e-9);
    if ((out > 0.5) === (t === 1)) correct++;
    const dz = out - t;
    g[O.b3] += dz;
    for (let j = 0; j < H; j++) {
      g[O.W3 + j] += dz * a2[j];
      d2[j] = dz * p[O.W3 + j] * (1 - a2[j] * a2[j]);
      g[O.b2 + j] += d2[j];
    }
    for (let i = 0; i < H; i++) {
      let s = 0;
      for (let j = 0; j < H; j++) { g[O.W2 + j * H + i] += d2[j] * a1[i]; s += d2[j] * p[O.W2 + j * H + i]; }
      d1[i] = s * (1 - a1[i] * a1[i]);
      g[O.W1 + i * 2] += d1[i] * pt.x; g[O.W1 + i * 2 + 1] += d1[i] * pt.y; g[O.b1 + i] += d1[i];
    }
  }
  net.t++;
  const c1 = 1 - Math.pow(0.9, net.t), c2 = 1 - Math.pow(0.999, net.t);
  for (let k = 0; k < P; k++) {
    const gk = g[k] / n;
    m[k] = 0.9 * m[k] + 0.1 * gk;
    v[k] = 0.999 * v[k] + 0.001 * gk * gk;
    p[k] -= (LR * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + 1e-8);
  }
  return { loss: loss / n, acc: correct / n };
}

/* ---------- datasets ---------- */
const clampPt = (v) => Math.max(-0.95, Math.min(0.95, v));
const DATA = {
  moons() {
    const pts = [];
    for (let i = 0; i < 70; i++) {
      const t = (Math.PI * i) / 69;
      pts.push({ x: (Math.cos(t) - 0.5) * 0.62 + gauss() * 0.045, y: -(Math.sin(t) - 0.25) * 0.62 + gauss() * 0.045, c: 1 });
      pts.push({ x: (1 - Math.cos(t) - 0.5) * 0.62 + gauss() * 0.045, y: -(0.5 - Math.sin(t) - 0.25) * 0.62 + gauss() * 0.045, c: 0 });
    }
    return pts;
  },
  rings() {
    const pts = [];
    for (let i = 0; i < 60; i++) {
      const a = R() * TAU, r = 0.26 * Math.sqrt(R());
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), c: 1 });
    }
    for (let i = 0; i < 90; i++) {
      const a = R() * TAU, r = 0.64 + gauss() * 0.05;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), c: 0 });
    }
    return pts;
  },
  xor() {
    const pts = [];
    for (const [sx, sy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]])
      for (let i = 0; i < 35; i++) pts.push({ x: sx * 0.45 + gauss() * 0.13, y: sy * 0.45 + gauss() * 0.13, c: sx * sy > 0 ? 1 : 0 });
    return pts;
  },
  spiral() {
    const pts = [];
    for (let c = 0; c < 2; c++)
      for (let i = 0; i < 75; i++) {
        const f = i / 74, r = 0.08 + 0.78 * f, a = 2.6 * Math.PI * f + c * Math.PI;
        pts.push({ x: r * Math.cos(a) + gauss() * 0.018, y: r * Math.sin(a) + gauss() * 0.018, c });
      }
    return pts;
  },
};

/* ---------- UI ---------- */
export function startTrainer({ reduceMotion = false } = {}) {
  const canvas = document.getElementById("labCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const plot = canvas.parentElement, hint = document.getElementById("labHint");
  const lossEl = document.getElementById("labLoss"), accEl = document.getElementById("labAcc"), stepEl = document.getElementById("labSteps");
  const spark = document.getElementById("labSpark"), netSvg = document.getElementById("labNet");
  const classBtns = [...document.querySelectorAll("[data-class]")], dataBtns = [...document.querySelectorAll("[data-set]")];

  let net = makeNet(), pts = [], cls = 1, S = 0, dpr = 1;
  let visible = false, running = false, frameN = 0, last = { loss: Math.LN2, acc: 0.5 }, history = [];
  const vals = new Float32Array((GR + 1) * (GR + 1));
  const off = document.createElement("canvas"); off.width = off.height = GR + 1;
  const octx = off.getContext("2d"), img = octx.createImageData(GR + 1, GR + 1);
  const theme = { ink: "29, 29, 31", blue: [0, 113, 227], bg: "#f5f5f7" };

  function syncTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    theme.ink = dark ? "245, 245, 247" : "29, 29, 31";
    theme.blue = dark ? [41, 151, 255] : [0, 113, 227];
    theme.bg = getComputedStyle(plot).backgroundColor;
  }
  const blue = (a) => `rgba(${theme.blue.join(", ")}, ${a})`;
  const ink = (a) => `rgba(${theme.ink}, ${a})`;

  function resize() {
    const w = plot.clientWidth;
    if (!w) return;
    S = w; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(S * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  /* ----- drawing ----- */
  const px = (v) => ((v + 1) / 2) * S;
  function contour(level) {
    const g = S / GR, C1 = GR + 1;
    ctx.beginPath();
    for (let r = 0; r < GR; r++) for (let c = 0; c < GR; c++) {
      const i = r * C1 + c, a = vals[i], b = vals[i + 1], d = vals[i + C1], e = vals[i + C1 + 1];
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (e > level ? 2 : 0) | (d > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = c * g, y = r * g;
      const tx = x + (g * (level - a)) / (b - a), ry = y + (g * (level - b)) / (e - b);
      const bx = x + (g * (level - d)) / (e - d), ly = y + (g * (level - a)) / (d - a);
      switch (idx) {
        case 1: case 14: ctx.moveTo(x, ly); ctx.lineTo(bx, y + g); break;
        case 2: case 13: ctx.moveTo(bx, y + g); ctx.lineTo(x + g, ry); break;
        case 3: case 12: ctx.moveTo(x, ly); ctx.lineTo(x + g, ry); break;
        case 4: case 11: ctx.moveTo(tx, y); ctx.lineTo(x + g, ry); break;
        case 6: case 9: ctx.moveTo(tx, y); ctx.lineTo(bx, y + g); break;
        case 7: case 8: ctx.moveTo(x, ly); ctx.lineTo(tx, y); break;
        case 5: ctx.moveTo(x, ly); ctx.lineTo(tx, y); ctx.moveTo(bx, y + g); ctx.lineTo(x + g, ry); break;
        case 10: ctx.moveTo(tx, y); ctx.lineTo(x + g, ry); ctx.moveTo(x, ly); ctx.lineTo(bx, y + g); break;
      }
    }
    ctx.stroke();
  }

  function draw() {
    if (!S) return;
    ctx.clearRect(0, 0, S, S);
    // the model's output over the whole plane
    const C1 = GR + 1, d = img.data, [br, bg, bb] = theme.blue;
    for (let r = 0; r <= GR; r++) for (let c = 0; c <= GR; c++) {
      const out = sigmoid(forward(net.p, -1 + (2 * c) / GR, -1 + (2 * r) / GR)), i = r * C1 + c;
      vals[i] = out;
      d[i * 4] = br; d[i * 4 + 1] = bg; d[i * 4 + 2] = bb;
      d[i * 4 + 3] = out > 0.5 ? Math.pow((out - 0.5) * 2, 0.9) * 62 : 0;
    }
    octx.putImageData(img, 0, 0);
    const cell = S / GR;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, -cell / 2, -cell / 2, S + cell, S + cell);
    // axes
    ctx.lineWidth = 1; ctx.strokeStyle = ink(0.08);
    ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
    // confidence contours, then the decision boundary itself
    ctx.setLineDash([3, 5]); ctx.strokeStyle = ink(0.16);
    contour(0.2); contour(0.8);
    ctx.setLineDash([]); ctx.lineWidth = 1.8; ctx.strokeStyle = blue(0.95); ctx.lineJoin = "round";
    contour(0.5);
    // points
    ctx.lineWidth = 1.5;
    for (const pt of pts) {
      pt.born = Math.min(1, (pt.born ?? 1) + 0.12);
      const r = 4.2 * (0.4 + 0.6 * pt.born), x = px(pt.x), y = px(pt.y);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      if (pt.c) { ctx.fillStyle = blue(1); ctx.fill(); ctx.strokeStyle = theme.bg; ctx.stroke(); }
      else { ctx.fillStyle = theme.bg; ctx.fill(); ctx.strokeStyle = ink(0.72); ctx.stroke(); }
    }
  }

  /* ----- readouts ----- */
  function buildNetSvg() {
    const L = [2, 6, 6, 1], X = [14, 71, 129, 186], Hh = 96;
    const ys = (n) => Array.from({ length: n }, (_, i) => (n === 1 ? Hh / 2 : 10 + ((Hh - 20) * i) / (n - 1)));
    let edges = "", nodes = "";
    for (let l = 0; l < 3; l++) ys(L[l]).forEach((y1, i) => ys(L[l + 1]).forEach((y2, j) => {
      edges += `<line data-l="${l}" data-i="${i}" data-j="${j}" x1="${X[l]}" y1="${y1}" x2="${X[l + 1]}" y2="${y2}"/>`;
    }));
    L.forEach((n, l) => ys(n).forEach((y) => { nodes += `<circle cx="${X[l]}" cy="${y}" r="3.2"/>`; }));
    netSvg.innerHTML = `<g class="lab__edges">${edges}</g><g class="lab__nodes">${nodes}</g>`;
  }
  function updateNet() {
    const p = net.p, w = (l, i, j) => (l === 0 ? p[O.W1 + j * 2 + i] : l === 1 ? p[O.W2 + j * H + i] : p[O.W3 + i]);
    const lines = netSvg.querySelectorAll("line"), max = [1e-6, 1e-6, 1e-6];
    for (const ln of lines) { const l = +ln.dataset.l; max[l] = Math.max(max[l], Math.abs(w(l, +ln.dataset.i, +ln.dataset.j))); }
    for (const ln of lines) {
      const l = +ln.dataset.l, wt = w(l, +ln.dataset.i, +ln.dataset.j);
      ln.setAttribute("class", wt >= 0 ? "pos" : "neg");
      ln.style.opacity = (0.06 + 0.85 * (Math.abs(wt) / max[l])).toFixed(3);
    }
  }
  function updateStats() {
    const empty = !pts.length;
    lossEl.textContent = empty ? "–" : last.loss < 0.01 ? last.loss.toFixed(4) : last.loss.toFixed(3);
    accEl.textContent = empty ? "–" : `${Math.round(last.acc * 100)}%`;
    stepEl.textContent = net.t.toLocaleString("en-US");
    if (history.length > 1) {
      const lo = Math.log10(0.004), hi = Math.log10(1.2);
      const d = history.map((v, i) => {
        const x = (200 * i) / (history.length - 1), y = 4 + 88 * (1 - (Math.log10(Math.max(0.004, Math.min(1.2, v))) - lo) / (hi - lo));
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join("");
      spark.querySelector(".lab__sparkline").setAttribute("d", d);
    } else spark.querySelector(".lab__sparkline").setAttribute("d", "");
  }

  /* ----- loop ----- */
  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    if (pts.length) for (let s = 0; s < STEPS; s++) last = trainStep(net, pts);
    frameN++;
    if (!reduceMotion || frameN % 12 === 0) draw();
    if (frameN % 4 === 0 && pts.length) { history.push(last.loss); if (history.length > 160) history.shift(); }
    if (frameN % 6 === 0) updateStats();
    if (frameN % 12 === 0) updateNet();
    requestAnimationFrame(frame);
  }
  const kick = () => { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } };

  /* ----- controls ----- */
  function resetWeights() { net = makeNet(); history = []; last = { loss: Math.LN2, acc: 0.5 }; updateStats(); updateNet(); }
  function setData(name) {
    pts = DATA[name]().map((p) => ({ x: clampPt(p.x), y: clampPt(p.y), c: p.c, born: 0 }));
    dataBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === name)));
    hint.hidden = false;
    resetWeights();
  }
  function setClass(c) {
    cls = c;
    classBtns.forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.class === c)));
  }
  classBtns.forEach((b) => b.addEventListener("click", () => setClass(+b.dataset.class)));
  dataBtns.forEach((b) => b.addEventListener("click", () => setData(b.dataset.set)));
  document.getElementById("labReset").addEventListener("click", resetWeights);
  document.getElementById("labClear").addEventListener("click", () => {
    pts = []; dataBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
    resetWeights(); draw();
  });

  let down = false, lastAdd = null;
  function addAt(e, force) {
    const r = canvas.getBoundingClientRect();
    const x = clampPt(((e.clientX - r.left) / r.width) * 2 - 1), y = clampPt(((e.clientY - r.top) / r.height) * 2 - 1);
    if (!force && lastAdd && Math.hypot(x - lastAdd.x, y - lastAdd.y) < 0.075) return;
    if (pts.length >= MAX_POINTS) pts.shift();
    const c = e.shiftKey ? 1 - cls : cls;       // Shift adds the other class
    pts.push({ x, y, c, born: 0 });
    lastAdd = { x, y };
    dataBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
    hint.hidden = true;
    if (reduceMotion) draw();
  }
  canvas.addEventListener("pointerdown", (e) => { down = true; canvas.setPointerCapture?.(e.pointerId); addAt(e, true); e.preventDefault(); });
  canvas.addEventListener("pointermove", (e) => { if (down) addAt(e, false); });
  const up = () => { down = false; lastAdd = null; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  /* ----- boot ----- */
  syncTheme(); buildNetSvg(); setClass(1); setData("moons");
  resize(); updateNet();
  addEventListener("themechange", () => { syncTheme(); draw(); });
  new ResizeObserver(resize).observe(plot);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { rootMargin: "100px 0px" }).observe(plot);
  document.addEventListener("visibilitychange", kick);
}
