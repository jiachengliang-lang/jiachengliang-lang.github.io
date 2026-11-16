// Ambient backgrounds: one small ML simulation behind each middle section.
// Each is a real algorithm running live, drawn in hairlines:
//   kmeans     Lloyd's algorithm clustering a point cloud
//   landscape  SGD, momentum and Adam descending a loss surface (contour map)
//   conv       3×3 Sobel kernels scanning a pixel grid and writing a feature map
//   field      a gradient vector field with forward and backward passes
//   attention  token rows with causal attention arcs
// The canvas is viewport-sized and sticky inside its section, so cost does not
// grow with section height. Scenes draw in section ("world") coordinates.

const FONT = '"Fragment Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const R = Math.random;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
const gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };

/* ================= k-means ================= */
function kmeans(env) {
  let w = 0, h = 0, K = 5, pts = [], cents = [], phase = "fit", timer = 0, iter = 0, lineA = 0, T = 0;

  function sampleHomes() {
    const blobs = Array.from({ length: K }, () => ({
      x: w * (0.1 + 0.8 * R()), y: h * (0.08 + 0.84 * R()), s: Math.min(w, 1000) * (0.06 + 0.05 * R()),
    }));
    for (const p of pts) {
      if (R() < 0.1) { p.hx = 12 + (w - 24) * R(); p.hy = 12 + (h - 24) * R(); continue; }
      const b = blobs[(R() * K) | 0];
      p.hx = clamp(b.x + gauss() * b.s, 12, w - 12);
      p.hy = clamp(b.y + gauss() * b.s * 1.15, 12, h - 12);
    }
  }
  function seed() {
    const used = new Set();
    for (const c of cents) {
      let p, guard = 0;
      do { p = pts[(R() * pts.length) | 0]; } while (used.has(p) && guard++ < 20);
      used.add(p);
      c.tx = c.x = p.hx; c.ty = c.y = p.hy; c.trail = [];
    }
    for (const p of pts) p.c = -1;
    iter = 0;
  }
  // one iteration of Lloyd's algorithm: assign, then move each centroid to its mean
  function iterate() {
    const sx = new Float64Array(K), sy = new Float64Array(K), n = new Uint16Array(K);
    for (const p of pts) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < K; i++) {
        const dx = p.hx - cents[i].tx, dy = p.hy - cents[i].ty, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      if (best !== p.c) { if (p.c !== -1) p.flash = 1; p.c = best; }
      sx[best] += p.hx; sy[best] += p.hy; n[best]++;
    }
    let moved = 0;
    cents.forEach((c, i) => {
      if (!n[i]) return;
      const nx = sx[i] / n[i], ny = sy[i] / n[i];
      moved = Math.max(moved, Math.hypot(nx - c.tx, ny - c.ty));
      c.trail.push([c.tx, c.ty]);
      c.tx = nx; c.ty = ny;
    });
    iter++;
    return moved;
  }

  return {
    init(W, H) {
      w = W; h = H; K = w < 735 ? 3 : 5; T = 0;
      const N = clamp(Math.round((w * h) / 8500), 50, 240);
      pts = Array.from({ length: N }, () => ({ x: 0, y: 0, hx: 0, hy: 0, ph: R() * TAU, sp: 0.3 + R() * 0.5, c: -1, flash: 0 }));
      cents = Array.from({ length: K }, () => ({ x: 0, y: 0, tx: 0, ty: 0, trail: [] }));
      sampleHomes();
      for (const p of pts) { p.x = p.hx; p.y = p.hy; }
      seed();
      phase = "fit"; timer = 0.5; lineA = 0;
    },
    step(dt) {
      T += dt; timer -= dt;
      if (phase === "fit" && timer <= 0) {
        const moved = iterate();
        if (moved < 1.5 || iter >= 14) { phase = "hold"; timer = 4.5; } else timer = 1.25;
      } else if (phase === "hold" && timer <= 0) {
        phase = "fade"; timer = 0.9;
      } else if (phase === "fade" && timer <= 0) {
        sampleHomes(); for (const p of pts) p.c = -1;
        phase = "shuffle"; timer = 2.4;
      } else if (phase === "shuffle" && timer <= 0) {
        seed(); phase = "fit"; timer = 0.7;
      }
      lineA += ((phase === "fit" || phase === "hold" ? 1 : 0) - lineA) * damp(dt, 3);
      const kp = damp(dt, 2.2), kc = damp(dt, 4.5), kf = Math.exp(-dt * 1.4);
      for (const p of pts) {
        const tx = p.hx + Math.cos(T * p.sp + p.ph) * 4, ty = p.hy + Math.sin(T * p.sp * 1.3 + p.ph) * 4;
        p.x += (tx - p.x) * kp; p.y += (ty - p.y) * kp; p.flash *= kf;
      }
      for (const c of cents) { c.x += (c.tx - c.x) * kc; c.y += (c.ty - c.y) * kc; }
    },
    draw(ctx, v) {
      const a0 = v.y0 - 60, a1 = v.y1 + 60;
      // assignment lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = env.ink(0.075 * lineA);
      ctx.beginPath();
      for (const p of pts) {
        if (p.c < 0 || p.y < a0 || p.y > a1 || p.flash > 0.05) continue;
        const c = cents[p.c];
        ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
      for (const p of pts) {
        if (p.c < 0 || p.flash <= 0.05 || p.y < a0 || p.y > a1) continue;
        const c = cents[p.c];
        ctx.strokeStyle = env.blue((0.1 + 0.4 * p.flash) * lineA);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      }
      // points
      ctx.fillStyle = env.ink(0.3);
      ctx.beginPath();
      for (const p of pts) { if (p.y < a0 || p.y > a1) continue; ctx.moveTo(p.x + 1.8, p.y); ctx.arc(p.x, p.y, 1.8, 0, TAU); }
      ctx.fill();
      for (const p of pts) {
        if (p.flash <= 0.05 || p.y < a0 || p.y > a1) continue;
        ctx.fillStyle = env.blue(p.flash);
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + p.flash * 1.4, 0, TAU); ctx.fill();
      }
      // centroids, with the path each one took to converge
      ctx.font = `10px ${FONT}`;
      cents.forEach((c, i) => {
        if (c.y < a0 - 200 || c.y > a1 + 200) return;
        if (c.trail.length) {
          ctx.strokeStyle = env.blue(0.28 * lineA);
          ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.moveTo(c.trail[0][0], c.trail[0][1]);
          for (let j = 1; j < c.trail.length; j++) ctx.lineTo(c.trail[j][0], c.trail[j][1]);
          ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = env.blue(0.35 * lineA);
          for (const t of c.trail) ctx.fillRect(t[0] - 1, t[1] - 1, 2, 2);
        }
        ctx.strokeStyle = env.blue(0.85 * lineA); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, TAU);
        ctx.moveTo(c.x - 10, c.y); ctx.lineTo(c.x - 3, c.y); ctx.moveTo(c.x + 3, c.y); ctx.lineTo(c.x + 10, c.y);
        ctx.moveTo(c.x, c.y - 10); ctx.lineTo(c.x, c.y - 3); ctx.moveTo(c.x, c.y + 3); ctx.lineTo(c.x, c.y + 10);
        ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = env.blue(0.75 * lineA);
        ctx.fillText(`μ${i + 1}`, c.x + 11, c.y - 9);
      });
      // pointer = a query point: link its 5 nearest neighbours
      if (v.mouse.on) {
        const near = [];
        for (const p of pts) {
          if (p.y < a0 || p.y > a1) continue;
          const d = (p.x - v.mouse.x) ** 2 + (p.y - v.mouse.y) ** 2;
          if (d < 260 * 260) near.push([d, p]);
        }
        near.sort((a, b) => a[0] - b[0]);
        for (const [d, p] of near.slice(0, 5)) {
          const a = 1 - Math.sqrt(d) / 260;
          ctx.strokeStyle = env.blue(0.15 + 0.4 * a);
          ctx.beginPath(); ctx.moveTo(v.mouse.x, v.mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.stroke();
        }
      }
    },
    caption: () => phase === "fit" ? `k-means clustering · k = ${K} · iteration ${Math.max(1, iter)}`
      : phase === "hold" ? `k-means clustering · k = ${K} · converged in ${iter} iterations`
      : `k-means clustering · sampling new data`,
  };
}

/* ================= loss landscape + optimizers ================= */
function landscape(env) {
  const G = 22, LEVELS = [-0.95, -0.76, -0.58, -0.41, -0.26, -0.12, 0.13, 0.28, 0.44];
  const KINDS = ["sgd", "momentum", "adam"];
  let w = 0, h = 0, wells = [], active = [], parts = [], T = 0, cur = 0, cx = 0, cy = 0, vals = new Float32Array(0);
  const CUR_K = 1 / (2 * 140 * 140);

  const sideX = () => {
    const m = (w - 980) / 2;
    if (w > 1100 && R() < 0.72) return R() < 0.5 ? R() * m : w - R() * m;
    return R() * w;
  };
  function f(x, y) {
    let s = 0;
    for (const a of active) { const dx = x - a.x, dy = y - a.y; s += a.a * Math.exp(-(dx * dx + dy * dy) * a.k); }
    if (cur > 0.01) { const dx = x - cx, dy = y - cy; s -= 1.15 * cur * Math.exp(-(dx * dx + dy * dy) * CUR_K); }
    return s;
  }
  const g = [0, 0];
  function grad(x, y) {
    let gx = 0, gy = 0;
    for (const a of active) {
      const dx = x - a.x, dy = y - a.y, e = a.a * Math.exp(-(dx * dx + dy * dy) * a.k) * -2 * a.k;
      gx += e * dx; gy += e * dy;
    }
    if (cur > 0.01) {
      const dx = x - cx, dy = y - cy, e = -1.15 * cur * Math.exp(-(dx * dx + dy * dy) * CUR_K) * -2 * CUR_K;
      gx += e * dx; gy += e * dy;
    }
    g[0] = gx; g[1] = gy;
  }
  function spawn(p, v) {
    p.x = sideX(); p.y = clamp(v.y0 + R() * v.vh, 20, h - 20);
    p.vx = p.vy = p.mx = p.my = p.sx = p.sy = 0; p.t = 0;
    p.trail = [[p.x, p.y]]; p.age = 0; p.still = 0; p.life = 1; p.done = false; p.born = 0;
  }

  return {
    init(W, H) {
      w = W; h = H; T = R() * 100;
      const n = clamp(Math.round(h / 150), 5, 26);
      wells = Array.from({ length: n }, (_, i) => {
        const s = 100 + R() * 120;
        return {
          bx: sideX(), by: (h * (i + 0.5)) / n + (R() - 0.5) * 110,
          a: R() < 0.74 ? -(0.65 + R() * 0.55) : 0.35 + R() * 0.3, k: 1 / (2 * s * s), s,
          ax: 18 + R() * 34, ay: 14 + R() * 26, fx: 0.05 + R() * 0.07, fy: 0.04 + R() * 0.07, ph: R() * TAU, x: 0, y: 0,
        };
      });
      const m = w < 735 ? 3 : 6;
      parts = Array.from({ length: m }, (_, i) => ({ kind: KINDS[i % 3], life: 0, done: true, trail: [], needs: true }));
    },
    step(dt, v) {
      T += dt;
      for (const a of wells) { a.x = a.bx + a.ax * Math.sin(a.fx * T + a.ph); a.y = a.by + a.ay * Math.cos(a.fy * T + a.ph * 1.7); }
      active = wells.filter((a) => a.y > v.y0 - 3.4 * a.s && a.y < v.y1 + 3.4 * a.s);
      cur += ((v.mouse.on ? 1 : 0) - cur) * damp(dt, 3);
      if (v.mouse.on) { const k = damp(dt, 10); cx += (v.mouse.x - cx) * k; cy += (v.mouse.y - cy) * k; }
      const k = dt * 60;
      for (const p of parts) {
        if (p.needs) { spawn(p, v); p.needs = false; }
        p.born = Math.min(1, p.born + dt * 2);
        if (p.done) { p.life -= dt / 1.3; if (p.life <= 0) p.needs = true; continue; }
        grad(p.x, p.y);
        const ox = p.x, oy = p.y;
        if (p.kind === "sgd") {                       // plain stochastic gradient descent
          p.x -= 250 * (g[0] + gauss() * 0.0011) * k; p.y -= 250 * (g[1] + gauss() * 0.0011) * k;
        } else if (p.kind === "momentum") {           // heavy-ball momentum
          const b = Math.pow(0.93, k);
          p.vx = b * p.vx - 30 * g[0] * k; p.vy = b * p.vy - 30 * g[1] * k;
          p.x += p.vx * k; p.y += p.vy * k;
        } else {                                      // Adam
          p.t++;
          p.mx = 0.9 * p.mx + 0.1 * g[0]; p.my = 0.9 * p.my + 0.1 * g[1];
          p.sx = 0.99 * p.sx + 0.01 * g[0] * g[0]; p.sy = 0.99 * p.sy + 0.01 * g[1] * g[1];
          const c1 = 1 - Math.pow(0.9, p.t), c2 = 1 - Math.pow(0.99, p.t);
          p.x -= (1.5 * (p.mx / c1)) / (Math.sqrt(p.sx / c2) + 1e-5) * k;
          p.y -= (1.5 * (p.my / c1)) / (Math.sqrt(p.sy / c2) + 1e-5) * k;
        }
        const moved = Math.hypot(p.x - ox, p.y - oy);
        p.age += dt; p.still = moved < 0.14 * k ? p.still + dt : 0;
        const lastPt = p.trail[p.trail.length - 1];
        if (Math.hypot(p.x - lastPt[0], p.y - lastPt[1]) > 2) { p.trail.push([p.x, p.y]); if (p.trail.length > 110) p.trail.shift(); }
        if (p.still > 0.9 || p.age > 18 || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) p.done = true;
        if (p.y < v.y0 - 260 || p.y > v.y1 + 260) p.needs = true;
      }
    },
    draw(ctx, v) {
      // contour map by marching squares, on a grid aligned to the page so it does not shimmer on scroll
      const gy0 = Math.floor(v.y0 / G) * G, cols = Math.ceil(w / G) + 1, rows = Math.ceil((v.y1 - gy0) / G) + 1, C1 = cols + 1;
      if (vals.length < C1 * (rows + 1)) vals = new Float32Array(C1 * (rows + 1));
      for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) vals[r * C1 + c] = f(c * G, gy0 + r * G);
      ctx.lineWidth = 1;
      for (const L of LEVELS) {
        ctx.strokeStyle = env.ink(L < 0 ? 0.1 : 0.085);
        ctx.setLineDash(L < 0 ? [] : [3, 4]);
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const y = gy0 + r * G;
          for (let c = 0; c < cols; c++) {
            const i = r * C1 + c, a = vals[i], b = vals[i + 1], d = vals[i + C1], e = vals[i + C1 + 1];
            const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (e > L ? 2 : 0) | (d > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x = c * G;
            const tx = x + (G * (L - a)) / (b - a), ry = y + (G * (L - b)) / (e - b);
            const bx = x + (G * (L - d)) / (e - d), ly = y + (G * (L - a)) / (d - a);
            switch (idx) {
              case 1: case 14: ctx.moveTo(x, ly); ctx.lineTo(bx, y + G); break;
              case 2: case 13: ctx.moveTo(bx, y + G); ctx.lineTo(x + G, ry); break;
              case 3: case 12: ctx.moveTo(x, ly); ctx.lineTo(x + G, ry); break;
              case 4: case 11: ctx.moveTo(tx, y); ctx.lineTo(x + G, ry); break;
              case 6: case 9: ctx.moveTo(tx, y); ctx.lineTo(bx, y + G); break;
              case 7: case 8: ctx.moveTo(x, ly); ctx.lineTo(tx, y); break;
              case 5: ctx.moveTo(x, ly); ctx.lineTo(tx, y); ctx.moveTo(bx, y + G); ctx.lineTo(x + G, ry); break;
              case 10: ctx.moveTo(tx, y); ctx.lineTo(x + G, ry); ctx.moveTo(x, ly); ctx.lineTo(bx, y + G); break;
            }
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // optimizers
      ctx.font = `10px ${FONT}`;
      for (const p of parts) {
        if (p.needs || p.trail.length < 1) continue;
        const life = Math.max(0, p.life) * p.born, n = p.trail.length;
        ctx.setLineDash(p.kind === "sgd" ? [1.5, 3] : p.kind === "adam" ? [6, 3] : []);
        ctx.lineWidth = 1.3;
        const chunks = 5;
        for (let q = 0; q < chunks; q++) {
          const i0 = Math.floor((n * q) / chunks), i1 = Math.min(n - 1, Math.floor((n * (q + 1)) / chunks));
          if (i1 <= i0) continue;
          ctx.strokeStyle = env.blue((0.06 + 0.5 * ((q + 1) / chunks)) * life);
          ctx.beginPath(); ctx.moveTo(p.trail[i0][0], p.trail[i0][1]);
          for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(p.trail[i][0], p.trail[i][1]);
          if (q === chunks - 1) ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        ctx.setLineDash([]); ctx.lineWidth = 1;
        ctx.fillStyle = env.blue(0.95 * life);
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
        if (p.done) {
          ctx.strokeStyle = env.blue(0.5 * life);
          ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - p.life) * 16, 0, TAU); ctx.stroke();
        }
        ctx.fillStyle = env.blue(0.7 * life);
        ctx.fillText(p.kind, p.x + 8, p.y - 7);
      }
    },
    caption: () => "loss surface · SGD, momentum and Adam · searching for minima",
  };
}

/* ================= convolution over a pixel grid ================= */
function conv(env) {
  const G = 26, SOBEL = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  let w = 0, h = 0, ox = 0, cols = 0, kernels = [], act = new Map();
  // the hidden "image" being convolved
  const img = (c, r) => 0.5 + 0.5 * Math.sin(c * 0.31 + Math.sin(r * 0.17) * 2) * Math.cos(r * 0.27 + c * 0.05);
  function spawn(k, v) {
    k.r = Math.floor((v.y0 + 40 + R() * Math.max(40, v.vh - 80)) / G);
    k.c = -2; k.last = -99; k.rows = 2 + ((R() * 2) | 0); k.speed = 10 + R() * 7; k.needs = false;
  }
  return {
    init(W, H) {
      w = W; h = H; cols = Math.floor(w / G); ox = (w - cols * G) / 2 + G / 2;
      kernels = Array.from({ length: w < 735 ? 2 : 3 }, () => ({ needs: true }));
      act = new Map();
    },
    resize(W, H) { if (W !== w) return false; h = H; return true; },
    step(dt, v) {
      for (const k of kernels) {
        if (k.needs) spawn(k, v);
        k.c += k.speed * dt;
        const ci = Math.floor(k.c);
        if (ci !== k.last && ci >= 0 && ci < cols) {
          k.last = ci;
          let s = 0;
          for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) s += SOBEL[j][i] * img(ci + i - 1, k.r + j - 1);
          act.set(`${ci},${k.r}`, { c: ci, r: k.r, a: Math.min(1, Math.abs(s) / 1.6), t: 1 });
        }
        if (k.c > cols + 1) { k.r += 1; k.c = -2; k.last = -99; if (--k.rows < 0) k.needs = true; }
        const y = k.r * G;
        if (y < v.y0 - 90 || y > v.y1 + 90 || y > h - 20) k.needs = true;
      }
      for (const [key, a] of act) { a.t -= dt / 5.5; if (a.t <= 0) act.delete(key); }
    },
    draw(ctx, v) {
      const r0 = Math.max(0, Math.floor(v.y0 / G)), r1 = Math.ceil(v.y1 / G);
      // pixel grid
      ctx.fillStyle = env.ink(0.17);
      for (let r = r0; r <= r1; r++) {
        const y = r * G + G / 2;
        for (let c = 0; c < cols; c++) ctx.fillRect(ox + c * G - 0.75, y - 0.75, 1.5, 1.5);
      }
      // feature map written so far
      for (const a of act.values()) {
        if (a.r < r0 - 1 || a.r > r1 + 1) continue;
        ctx.fillStyle = env.blue((0.05 + 0.33 * a.a) * a.t);
        const s = G - 10;
        ctx.fillRect(ox + a.c * G - s / 2, a.r * G + G / 2 - s / 2, s, s);
      }
      // sliding kernels
      ctx.font = `10px ${FONT}`;
      for (const k of kernels) {
        if (k.needs) continue;
        const ci = Math.floor(k.c), x = ox + (k.c - 1.5) * G, y = (k.r - 1) * G;
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
          const wt = SOBEL[j][i];
          if (!wt) continue;
          ctx.fillStyle = wt > 0 ? env.blue(0.13 * wt) : env.ink(0.07 * -wt);
          ctx.fillRect(ox + (ci + i - 1) * G - G / 2 + 2, (k.r + j - 1) * G + 2, G - 4, G - 4);
        }
        ctx.strokeStyle = env.blue(0.6); ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, 3 * G - 1, 3 * G - 1);
        ctx.fillStyle = env.blue(0.7);
        ctx.fillText("3×3 Sobel", x + 1, y - 6);
      }
      // pointer: the receptive field under the cursor
      if (v.mouse.on) {
        const pc = Math.round((v.mouse.x - ox) / G), pr = Math.round((v.mouse.y - G / 2) / G);
        ctx.strokeStyle = env.blue(0.45);
        ctx.strokeRect(ox + (pc - 2.5) * G + 0.5, (pr - 2) * G + 0.5, 5 * G - 1, 5 * G - 1);
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
          const wgt = Math.exp(-(i * i + j * j) / 3);
          ctx.fillStyle = env.blue(0.15 + 0.6 * wgt);
          ctx.beginPath(); ctx.arc(ox + (pc + i) * G, (pr + j) * G + G / 2, 1 + 2 * wgt, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = env.blue(0.7);
        ctx.fillText("receptive field 5×5", ox + (pc - 2.5) * G + 1, (pr - 2) * G - 6);
      }
    },
    caption: () => "convolution · 3×3 Sobel kernels · writing a feature map",
  };
}

/* ================= gradient field with forward / backward passes ================= */
function field(env) {
  const G = 34, SPEED = 640;
  let w = 0, h = 0, ox = 0, T = 0, waves = [], next = 1.2, pass = "forward";
  return {
    init(W, H) { w = W; h = H; ox = ((w % G) + G) / 2; waves = []; next = 1.2; },
    resize(W, H) { if (W !== w) return false; h = H; return true; },
    step(dt) {
      T += dt; next -= dt;
      for (const wv of waves) wv.x += wv.dir * SPEED * dt;
      waves = waves.filter((wv) => wv.x > -500 && wv.x < w + 500);
      if (next <= 0) {
        // a forward pass sweeps left to right, then the gradients flow back
        if (pass === "forward") { waves.push({ x: -80, dir: 1 }); pass = "backward"; next = (w + 160) / SPEED + 0.25; }
        else { waves.push({ x: w + 80, dir: -1 }); pass = "forward"; next = (w + 160) / SPEED + 3.2; }
      }
    },
    draw(ctx, v) {
      const r0 = Math.floor(v.y0 / G), r1 = Math.ceil(v.y1 / G), cols = Math.ceil(w / G);
      const base = new Path2D(), fwd = new Path2D(), back = new Path2D(), dBase = new Path2D(), dFwd = new Path2D(), dBack = new Path2D();
      const m = v.mouse;
      for (let r = r0; r <= r1; r++) {
        const y = r * G + G / 2;
        for (let c = 0; c < cols; c++) {
          const x = ox + c * G;
          const dx = Math.cos(x / 190 + T * 0.12) / 190 + Math.cos((x + y) / 240 + T * 0.07) / 240;
          const dy = -Math.sin(y / 160 - T * 0.09) / 160 + Math.cos((x + y) / 240 + T * 0.07) / 240;
          let th = Math.atan2(dy, dx), f = 0, b = 0;
          for (const wv of waves) {
            const d = x - wv.x, e = Math.exp(-(d * d) / 4900);
            if (wv.dir > 0) f = Math.max(f, e);
            else { b = Math.max(b, e); if (d > 0) th += 0.9 * Math.exp(-d / 240); }   // weights nudged after the pass
          }
          let boost = 0;
          if (m.on) {
            const ddx = m.x - x, ddy = m.y - y, d = Math.hypot(ddx, ddy);
            if (d < 180) {
              boost = (1 - d / 180) ** 2;
              let dt2 = Math.atan2(ddy, ddx) - th;
              dt2 = Math.atan2(Math.sin(dt2), Math.cos(dt2));
              th += dt2 * boost;
            }
          }
          const hot = Math.max(f, b, boost), len = 4.5 * (1 + 0.9 * hot), cs = Math.cos(th) * len, sn = Math.sin(th) * len;
          const path = b > 0.22 || boost > 0.22 ? back : f > 0.22 ? fwd : base;
          const dots = path === back ? dBack : path === fwd ? dFwd : dBase;
          path.moveTo(x - cs, y - sn); path.lineTo(x + cs, y + sn);
          dots.rect(x + cs - 1, y + sn - 1, 2, 2);
        }
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = env.ink(0.15); ctx.stroke(base); ctx.fillStyle = env.ink(0.26); ctx.fill(dBase);
      ctx.strokeStyle = env.ink(0.42); ctx.stroke(fwd); ctx.fillStyle = env.ink(0.6); ctx.fill(dFwd);
      ctx.strokeStyle = env.blue(0.6); ctx.stroke(back); ctx.fillStyle = env.blue(0.9); ctx.fill(dBack);
    },
    caption: () => waves.some((x) => x.dir < 0) ? "gradient field · backward pass, weights updating"
      : waves.some((x) => x.dir > 0) ? "gradient field · forward pass" : "gradient field",
  };
}

/* ================= tokens + attention ================= */
function attention(env) {
  const ROW = 54, TH = 13;
  let w = 0, h = 0, rows = [], events = [], next = 0.4, hover = null;
  const hash = (n) => { let x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const tokX = (row, tk) => ((((tk.o + row.shift) % row.L) + row.L) % row.L) - 220;
  function context(row, q, seed) {
    // causal attention: a token attends to a few tokens before it
    const n = 3 + Math.floor(hash(seed) * 3), targets = [], used = new Set();
    for (let j = 0; j < n; j++) {
      const back = 1 + Math.floor(hash(seed + j * 7.3 + 1) * 9);
      const i = (((q - back) % row.toks.length) + row.toks.length) % row.toks.length;
      if (used.has(i)) continue;
      used.add(i); targets.push({ i, w: 0.2 + hash(seed + j * 3.1 + 2) });
    }
    const sum = targets.reduce((s, t) => s + t.w, 0);
    for (const t of targets) t.w /= sum;
    return targets;
  }
  function drawEvent(ctx, row, q, targets, k, showWeight) {
    const tq = row.toks[q], xq = tokX(row, tq), y = row.y;
    const maxW = Math.max(...targets.map((t) => t.w));
    ctx.fillStyle = env.blue(0.6 * k);
    rr(ctx, xq, y, tq.w, TH); ctx.fill();
    let top = null;
    for (const t of targets) {
      const tk = row.toks[t.i], xt = tokX(row, tk);
      if (xt > xq) continue;                       // wrapped around the row; skip this frame
      const wn = t.w / maxW, x0 = xq + tq.w / 2, x1 = xt + tk.w / 2, lift = Math.min(50, 12 + (x0 - x1) * 0.2);
      ctx.fillStyle = env.blue(0.42 * wn * k); rr(ctx, xt, y, tk.w, TH); ctx.fill();
      ctx.strokeStyle = env.blue((0.18 + 0.7 * wn) * k); ctx.lineWidth = 0.8 + wn;
      ctx.beginPath(); ctx.moveTo(x0, y - 1); ctx.quadraticCurveTo((x0 + x1) / 2, y - lift * 2, x1, y - 1); ctx.stroke();
      if (t.w === maxW) top = { x: (x0 + x1) / 2, y: y - lift - 5, w: t.w };
    }
    ctx.lineWidth = 1;
    if (top && showWeight) {
      ctx.fillStyle = env.blue(0.8 * k); ctx.textAlign = "center";
      ctx.fillText(top.w.toFixed(2), top.x, top.y); ctx.textAlign = "left";
    }
  }
  function rr(ctx, x, y, bw, bh) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 4); else ctx.rect(x, y, bw, bh);
  }
  return {
    init(W, H) {
      w = W; h = H; events = []; hover = null;
      const n = Math.max(1, Math.floor((h - 36) / ROW));
      rows = Array.from({ length: n }, (_, i) => {
        const toks = []; let o = 0;
        while (o < w + 520) { const tw = R() < 0.25 ? 10 + R() * 10 : 20 + R() * 44; toks.push({ o, w: tw }); o += tw + 7; }
        return { y: 26 + i * ROW, dir: i % 2 ? 1 : -1, speed: 6 + R() * 9, shift: R() * 1000, toks, L: o };
      });
    },
    step(dt, v) {
      for (const row of rows) row.shift += row.dir * row.speed * dt;
      for (const e of events) e.t += dt;
      events = events.filter((e) => e.t < e.life);
      next -= dt;
      if (next <= 0) {
        next = 0.55 + R() * 0.5;
        const vis = rows.filter((r) => r.y > v.y0 + 20 && r.y < v.y1 - 10);
        if (vis.length) {
          const row = vis[(R() * vis.length) | 0];
          const cands = row.toks.map((_, i) => i).filter((i) => { const x = tokX(row, row.toks[i]); return x > w * 0.12 && x < w - 20; });
          if (cands.length) {
            const q = cands[(R() * cands.length) | 0];
            events.push({ row, q, targets: context(row, q, R() * 1000), t: 0, life: 2.4 });
          }
        }
      }
      hover = null;
      if (v.mouse.on) {
        const row = rows.find((r) => Math.abs(r.y + TH / 2 - v.mouse.y) < ROW / 2);
        if (row) {
          let best = -1, bd = 60;
          row.toks.forEach((tk, i) => { const x = tokX(row, tk), d = Math.abs(x + tk.w / 2 - v.mouse.x) - tk.w / 2; if (d < bd) { bd = d; best = i; } });
          if (best >= 0) hover = { row, q: best, targets: context(row, best, rows.indexOf(row) * 100 + best) };
        }
      }
    },
    draw(ctx, v) {
      ctx.lineWidth = 1; ctx.strokeStyle = env.ink(0.17); ctx.font = `10px ${FONT}`;
      for (const row of rows) {
        if (row.y < v.y0 - 60 || row.y > v.y1 + 20) continue;
        ctx.beginPath();
        for (const tk of row.toks) {
          const x = tokX(row, tk);
          if (x > w || x + tk.w < 0) continue;
          if (ctx.roundRect) ctx.roundRect(x + 0.5, row.y + 0.5, tk.w - 1, TH - 1, 4); else ctx.rect(x + 0.5, row.y + 0.5, tk.w - 1, TH - 1);
        }
        ctx.stroke();
      }
      for (const e of events) drawEvent(ctx, e.row, e.q, e.targets, Math.sin((Math.PI * e.t) / e.life) ** 0.8, true);
      if (hover) drawEvent(ctx, hover.row, hover.q, hover.targets, 1, true);
    },
    caption: () => "self-attention · each token weighs the tokens before it",
  };
}

const SCENES = { kmeans, landscape, conv, field, attention };

/* ================= engine ================= */
function softErase(ctx, x, y, w, h, f, s) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const full = `rgba(0,0,0,${s})`;
  ctx.fillStyle = full; ctx.fillRect(x, y, w, h);
  const lin = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, full); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
  };
  lin(x, 0, x - f, 0, x - f, y, f, h); lin(x + w, 0, x + w + f, 0, x + w, y, f, h);
  lin(0, y, 0, y - f, x, y - f, w, f); lin(0, y + h, 0, y + h + f, x, y + h, w, f);
  for (const [cx, cy, rx, ry] of [[x, y, x - f, y - f], [x + w, y, x + w, y - f], [x, y + h, x - f, y + h], [x + w, y + h, x + w, y + h]]) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, f);
    g.addColorStop(0, full); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(rx, ry, f, f);
  }
  ctx.restore();
}

function makeLayer(section, index) {
  const make = SCENES[section.dataset.ambient];
  if (!make) return null;
  const forcedDark = section.hasAttribute("data-dark");
  let dark = forcedDark || document.documentElement.dataset.theme === "dark";
  addEventListener("themechange", () => { dark = forcedDark || document.documentElement.dataset.theme === "dark"; });
  const wrap = document.createElement("div");
  wrap.className = "ambient"; wrap.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas); section.prepend(wrap);
  const ctx = canvas.getContext("2d");
  const env = {
    get dark() { return dark; },
    ink: (a) => `rgba(${dark ? "245, 245, 247" : "29, 29, 31"}, ${a})`,
    blue: (a) => `rgba(${dark ? "41, 151, 255" : "0, 113, 227"}, ${a})`,
  };
  const quiet = section.dataset.ambientQuiet ? [...section.querySelectorAll(section.dataset.ambientQuiet)] : [];
  const scene = make(env);
  const L = { section, visible: false, w: 0, h: 0, vh: 0, dpr: 1, gutter: 0, ready: false };
  const FADE = 110;

  L.resize = () => {
    const w = section.clientWidth, h = section.offsetHeight;
    if (!w || !h) return;
    const vh = Math.min(window.innerHeight, h);
    const dpr = Math.min(window.devicePixelRatio || 1, w > 1700 ? 1.5 : 2);
    const sizeChanged = w !== L.w || vh !== L.vh || dpr !== L.dpr;
    if (sizeChanged) {
      canvas.style.height = `${vh}px`;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(vh * dpr);
    }
    if (!L.ready || w !== L.w || Math.abs(h - L.h) > 4) {
      if (!L.ready || !scene.resize || !scene.resize(w, h)) scene.init(w, h);
    }
    L.w = w; L.h = h; L.vh = vh; L.dpr = dpr; L.ready = true;
    const left = section.getBoundingClientRect().left;
    let gutter = w;
    for (const el of section.querySelectorAll(".grid, .roles, .panel, .chat, .prose")) {
      if (el.offsetParent) gutter = Math.min(gutter, el.getBoundingClientRect().left - left);
    }
    L.gutter = gutter === w ? 0 : gutter;
  };

  // advance the simulation without drawing (used for a settled still frame)
  L.warm = (steps) => {
    if (!L.ready) return;
    const rect = section.getBoundingClientRect();
    const y0 = clamp(-rect.top, 0, Math.max(0, L.h - L.vh));
    const view = { y0, y1: y0 + L.vh, w: L.w, h: L.h, vh: L.vh, mouse: { x: -1e4, y: -1e4, on: false } };
    for (let i = 0; i < steps; i++) scene.step(1 / 30, view);
  };

  L.frame = (dt, ptr, animate) => {
    if (!L.ready) return;
    const rect = section.getBoundingClientRect();
    const y0 = clamp(-rect.top, 0, Math.max(0, L.h - L.vh));
    const mx = ptr.x - rect.left, my = ptr.y - rect.top;
    const view = { y0, y1: y0 + L.vh, w: L.w, h: L.h, vh: L.vh, mouse: { x: mx, y: my, on: ptr.on && my > -40 && my < L.h + 40 } };
    if (animate) scene.step(dt, view);
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, -y0 * L.dpr);
    ctx.clearRect(0, y0, L.w, L.vh);
    scene.draw(ctx, view);
    for (const el of quiet) {
      if (!el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      softErase(ctx, r.left - rect.left - 20, r.top - rect.top - 10, r.width + 40, r.height + 20, 70, 0.92);
    }
    // soft edges where the section meets its neighbours
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    if (y0 < FADE) {
      const g = ctx.createLinearGradient(0, 0, 0, FADE); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.w, FADE);
    }
    if (view.y1 > L.h - FADE) {
      const g = ctx.createLinearGradient(0, L.h - FADE, 0, L.h); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = g; ctx.fillRect(0, L.h - FADE, L.w, FADE);
    }
    ctx.restore();
    // figure caption in the left gutter, like a plate in a paper; wraps to the space beside the content
    const avail = L.gutter - 40;
    if (false && avail >= 110 && scene.caption) {   // figure captions retired: plain page, no jargon
      const base = view.y1 - 22;
      if (base < L.h - 40 && base > 200) {
        ctx.font = `11px ${FONT}`;
        const lines = [`Fig. ${index + 1}`];
        for (const part of scene.caption().split(" · ")) {
          let line = "";
          for (const word of part.split(" ")) {
            const next = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(next).width > avail) { lines.push(line); line = word; } else line = next;
          }
          if (line) lines.push(line);
        }
        lines.forEach((text, i) => {
          ctx.fillStyle = i === 0 ? env.blue(0.75) : env.ink(dark ? 0.5 : 0.42);
          ctx.fillText(text, 24, base - (lines.length - 1 - i) * 15);
        });
      }
    }
  };
  return L;
}

export function startAmbient({ reduceMotion = false } = {}) {
  const layers = [...document.querySelectorAll("[data-ambient]")].map(makeLayer).filter(Boolean);
  if (!layers.length) return;
  const ptr = { x: -1e4, y: -1e4, on: false };
  const off = { x: -1e4, y: -1e4, on: false };
  const track = (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; };
  addEventListener("pointermove", track, { passive: true });
  addEventListener("pointerdown", track, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") ptr.on = false; }, { passive: true });
  addEventListener("pointercancel", () => { ptr.on = false; }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { ptr.on = false; });

  let last = 0, running = false;
  const tick = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    let any = false;
    const paused = document.documentElement.classList.contains("labx-open");   // the lab overlay covers the page
    for (const L of layers) if (L.visible) { if (!paused) L.frame(dt, ptr, true); any = true; }
    if (any && !document.hidden) requestAnimationFrame(tick); else running = false;
  };
  const kick = () => { if (!running && !reduceMotion && !document.hidden) { running = true; last = 0; requestAnimationFrame(tick); } };
  const still = () => { for (const L of layers) if (L.visible) L.frame(0, off, false); };

  let rt = 0;
  const relayout = () => { clearTimeout(rt); rt = setTimeout(() => { for (const L of layers) L.resize(); reduceMotion ? still() : kick(); }, 180); };
  for (const L of layers) L.resize();
  addEventListener("resize", relayout);
  if ("ResizeObserver" in window) { const ro = new ResizeObserver(relayout); for (const L of layers) ro.observe(L.section); }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) { const L = layers.find((l) => l.section === en.target); if (L) L.visible = en.isIntersecting; }
    reduceMotion ? still() : kick();
  }, { rootMargin: "80px 0px" });
  for (const L of layers) io.observe(L.section);
  document.addEventListener("visibilitychange", kick);
  addEventListener("themechange", () => { if (reduceMotion) still(); });

  if (reduceMotion) {
    // settle each simulation into a representative state, then only redraw on scroll
    for (const L of layers) L.warm(300);
    addEventListener("scroll", still, { passive: true });
    still();
  }
}
