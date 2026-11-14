import { SITE } from "./content.js";
import { startNet } from "./net.js";
import { startChat } from "./chat.js";
import { startAmbient } from "./ambient.js";
import { startTrainer } from "./train.js";
import { startGitHub } from "./github.js";
import { startLab } from "./lab.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const ext = 'target="_blank" rel="noopener"';
const TABS = ["projects", "research", "hobbies"];

/* ---------- small ML glyph: a 2-3-1 network that "fires" when shown ---------- */
function glyph(cls = "") {
  const L = [[4, [5, 13]], [15, [3, 9, 15]], [26, [9]]];
  let edges = "", nodes = "";
  for (let l = 0; l < L.length - 1; l++)
    for (const y1 of L[l][1]) for (const y2 of L[l + 1][1]) edges += `<path d="M${L[l][0]} ${y1}L${L[l + 1][0]} ${y2}"/>`;
  L.forEach(([x, ys], l) => ys.forEach((y) => { nodes += `<circle cx="${x}" cy="${y}" r="2.2" style="--l:${l}"${l === 2 ? ' class="out"' : ""}/>`; }));
  return `<svg class="glyph ${cls}" viewBox="0 0 30 18" aria-hidden="true"><g class="glyph__e">${edges}</g>${nodes}</svg>`;
}

/* ---------- buttons: an input neuron, an edge, an output neuron ---------- */
const NEURON = '<svg class="nb__g" viewBox="0 0 26 12" aria-hidden="true"><path class="nb__e" d="M4 6H21"/><circle class="nb__in" cx="4" cy="6" r="2.4"/><circle class="nb__out" cx="21" cy="6" r="3"/><circle class="nb__spark" cx="4" cy="6" r="1.6"/></svg>';
function mlButton(href, label, { ghost = false, ext: external = false, sm = false, copy = "" } = {}) {
  return `<a class="nb${ghost ? " nb--ghost" : ""}${sm ? " nb--sm" : ""}" href="${href}"${external ? ` ${ext}` : ""}${copy ? ` data-copy-email="${esc(copy)}"` : ""}>${NEURON}<span>${esc(label)}</span></a>`;
}

/* ---------- small toast ---------- */
let toastTimer = 0;
function toast(html) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.innerHTML = html;
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 4200);
}

/* ---------- email: copy the address as well as opening a mail app ---------- */
// mailto links do nothing when no mail app is set up (common in Chrome), so copying is the reliable path
function setupEmailCopy() {
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-copy-email]");
    if (!a) return;
    const email = a.dataset.copyEmail;
    let ok = false;
    try { await navigator.clipboard.writeText(email); ok = true; } catch {}
    toast(ok ? `<b>Email copied</b><span>${esc(email)}</span>` : `<b>Email</b><span>${esc(email)}</span>`);
  });
}

/* ---------- CV on request ---------- */
function setupCvRequest() {
  document.addEventListener("click", async (e) => {
    const a = e.target.closest('a[href="#cv"]');
    if (!a) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const email = SITE.links.emailText;
    let copied = false;
    try { await navigator.clipboard.writeText(email); copied = true; } catch {}
    toast(`<b>My CV is available on request.</b><span>Email me at ${esc(email)}${copied ? " (copied)" : ""}</span>`);
  }, true);
}

/* ---------- tactile feedback: a short buzz, a micro-shake and a firing ring ---------- */
const BUZZ = ".nb, .tabs__tab, .mswitch, .seg button, .chip, .lossbar, .hintpill__try, .labx__close, .lab__actions button, .fp__node, .nav__logo";
function setupHaptics() {
  if (reduceMotion) return;
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(BUZZ);
    if (!el || e.button > 0) return;
    if (e.pointerType !== "mouse") navigator.vibrate?.(12);     // real vibration on phones that support it
    el.classList.remove("is-buzz"); void el.offsetWidth; el.classList.add("is-buzz");
    el.addEventListener("animationend", () => el.classList.remove("is-buzz"), { once: true });
    const r = el.getBoundingClientRect();
    const ring = document.createElement("span");
    ring.className = "buzz-ring";
    ring.style.left = `${e.clientX}px`; ring.style.top = `${e.clientY}px`;
    ring.style.setProperty("--s", `${Math.max(r.width, r.height) * 1.6}px`);
    document.body.appendChild(ring);
    ring.addEventListener("animationend", () => ring.remove(), { once: true });
  }, { passive: true });
}

/* ---------- pieces ---------- */
const bigCard = (m) => `
  <div class="card card--metric${m.wide ? " card--wide" : ""}">
    ${glyph("glyph--corner")}
    ${m.kicker ? `<p class="card__kicker">${esc(m.kicker)}</p>` : ""}
    <div class="card__big" ${m.count === false ? "data-nocount" : ""}>${esc(m.big)}</div>
    <p class="card__label">${esc(m.label)}</p>
  </div>`;

// key numbers inside bullets get an underline that draws itself in
const HL = /(?<![A-Za-z\d.\-])(?<!RTX )(?<!RFC )~?\d[\d,]*(?:\.\d+)?\+?(?:\s?(?:%|×|ms|s|Hz|KB|K|\/s|min))?(?:\s?(?:–|→|to)\s?~?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|ms|s|K))?)?(?![A-Za-z\d])/g;
function hlText(raw) {
  let out = "", last = 0, k = 0;
  for (const m of raw.matchAll(HL)) {
    if (/^\d$/.test(m[0])) continue;              // lone digits stay plain
    out += esc(raw.slice(last, m.index)) + `<span class="hl" style="--k:${k++}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(raw.slice(last));
}
const details = (bullets) => `<ul class="details">${bullets.map((b) => `<li>${hlText(b)}</li>`).join("")}</ul>`;

// Rewardsmith agent loop, drawn for a dark panel. Structure only, no invented data.
function rewardsmithDiagram() {
  const box = (x, y, w, h, t, s, hot = false) => `
    <rect class="dg-box ${hot ? "dg-box--hot" : ""}" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>
    <text class="dg-t" x="${x + w / 2}" y="${y + h / 2 - (s ? 3 : -5)}" text-anchor="middle" ${hot ? 'style="fill:#fff"' : ""}>${t}</text>
    ${s ? `<text class="dg-s" x="${x + w / 2}" y="${y + h / 2 + 16}" text-anchor="middle" ${hot ? 'style="fill:rgba(255,255,255,.8)"' : ""}>${s}</text>` : ""}`;
  const ppo = [0, 1, 2, 3].map((i) => 207.5 + i * 135);
  const label = "Rewardsmith agent loop. A one-sentence skill request goes to Claude, which writes 4 candidate reward functions. They train in parallel with PPO in MuJoCo. A vision critic scores the rollout videos, and an editor revises the top rewards from every past critique for the next round.";
  const narrow = `
  <svg class="diagram--narrow" viewBox="0 0 360 520" role="img" aria-label="${label}">
    ${box(80, 0, 200, 58, "Skill request", "one sentence of text")}
    ${box(80, 92, 200, 58, "Claude", "writes 4 reward functions", true)}
    ${[[32, 196], [188, 196], [32, 262], [188, 262]].map(([x, y], i) => box(x, y, 140, 56, `PPO ${i + 1}`, "MuJoCo · JAX")).join("")}
    ${box(80, 362, 200, 58, "Vision critic", "scores rollout videos")}
    ${box(80, 454, 200, 58, "Editor", "revises from every critique")}
    <path class="dg-e" d="M180 58 V92 M180 150 V176 M102 176 H258 M102 176 V196 M258 176 V196 M102 318 V340 M258 318 V340 M102 340 H258 M180 340 V362 M180 420 V454"/>
    <path class="dg-loop" d="M80 483 H14 V121 H72"/>
    <path class="dg-head" d="M72 115 L80 121 L72 127 Z"/>
  </svg>`;
  return narrow + `
  <svg class="diagram--wide" viewBox="0 0 820 470" role="img" aria-label="${label}">
    ${box(310, 0, 200, 58, "Skill request", "one sentence of text")}
    ${box(310, 98, 200, 58, "Claude", "writes 4 reward functions", true)}
    ${ppo.map((x, i) => box(x - 58, 206, 116, 58, `PPO ${i + 1}`, "MuJoCo · JAX")).join("")}
    ${box(310, 314, 200, 58, "Vision critic", "scores rollout videos")}
    ${box(310, 412, 200, 58, "Editor", "revises from every critique")}
    <path class="dg-e" d="M410 58 V98"/>
    ${ppo.map((x) => `<path class="dg-e" d="M410 156 C410 182 ${x} 180 ${x} 206"/><path class="dg-e" d="M${x} 264 C${x} 290 410 288 410 314"/>`).join("")}
    <path class="dg-e" d="M410 372 V412"/>
    <path class="dg-loop" d="M310 441 H40 V127 H300"/>
    <path class="dg-head" d="M300 121 L310 127 L300 133 Z"/>
    <text class="dg-s" x="52" y="290" style="fill:#86868b">next round</text>
  </svg>`;
}

function visual(p) {
  const v = p.visual;
  if (v.type === "diagram") {
    return `<figure class="visual reveal">
      <div class="diagram">${rewardsmithDiagram()}</div>
      ${v.caption ? `<figcaption class="caption">${esc(v.caption)}</figcaption>` : ""}
    </figure>`;
  }
  return `<figure class="visual reveal">
    <img class="visual__img" src="${v.src}" srcset="${v.srcset}" sizes="(max-width: 1224px) calc(100vw - 80px), 1080px" alt="${esc(v.alt)}" loading="lazy" decoding="async" />
    ${v.caption ? `<figcaption class="caption">${esc(v.caption)}</figcaption>` : ""}
  </figure>`;
}

const THEME = { dark: "tile--black", light: "tile--white", white: "tile--white" };

function projectPanel(p, i) {
  const links = [
    p.live ? `<a class="pill" href="${p.live}" ${ext}>Play now</a>` : "",
    `<a class="more" href="${p.repo}" ${ext}>View source</a>`,
  ].join("");
  return `
  <article class="panel ${THEME[p.theme]}" id="${slug(p.name)}" ${p.theme === "dark" ? "data-dark" : ""}>
    <div class="tile__text">
      <p class="layer reveal">${glyph()}<span>Model ${String(i + 1).padStart(2, "0")} · ${esc(p.name)}</span></p>
      <h3 class="headline reveal">${esc(p.headline)}</h3>
      <p class="subhead reveal">${esc(p.subhead)}</p>
      <div class="ctas reveal">${links}</div>
    </div>
    ${visual(p)}
    <div class="grid grid--2 reveal">${p.metrics.map(bigCard).join("")}</div>
    <div class="project__details reveal">
      <h4>${esc(p.subtitle)}.</h4>
      ${details(p.bullets)}
      <p class="tools">Built with ${esc(p.tags.join(", "))}.</p>
    </div>
  </article>`;
}

function roleCard(e) {
  return `
  <article class="role reveal">
    ${glyph("glyph--corner")}
    <div class="role__head">
      <h3 class="role__name">${esc(e.org)}</h3>
      <span class="role__when">${esc(e.dates)}</span>
    </div>
    <p class="role__role">${esc(e.role)} · ${esc(e.place)}</p>
    <p class="role__summary">${esc(e.summary)}</p>
    <div class="role__metrics">
      ${e.metrics.map((m) => `<div class="metric"><div class="card__big">${esc(m.big)}</div><p class="card__label">${esc(m.label)}</p></div>`).join("")}
    </div>
    ${details(e.bullets)}
    <p class="tools">Built with ${esc(e.tags.join(", "))}.</p>
  </article>`;
}

const RESEARCH_ART = {
  // a face in profile-free outline: eyes, a mouth mid-word, sound arcs, motion ticks
  face: () => `<g transform="translate(128 84) scale(.78) translate(-128 -90)">
    <path class="ra__line" d="M128 30C98 30 84 56 84 88C84 124 104 150 128 150C152 150 172 124 172 88C172 56 158 30 128 30Z"/>
    <path class="ra__soft" d="M110 76Q114 72 118 76M138 76Q142 72 146 76"/>
    <circle cx="114" cy="84" r="3" class="ra__ink"/><circle cx="142" cy="84" r="3" class="ra__ink"/>
    <path class="ra__hot" d="M114 118Q128 128 142 118Q128 122 114 118Z"/>
    <path class="ra__wave" d="M190 76Q198 88 190 100M202 68Q214 88 202 108M214 60Q230 88 214 116"/>
    <path class="ra__wave ra__wave--in" d="M66 76Q58 88 66 100M54 68Q42 88 54 108"/>
    <path class="ra__tick" d="M104 60l-6-6M152 60l6-6M128 22v-8"/></g>
    <text x="128" y="168" class="ra__lbl" text-anchor="middle">listen · speak · move</text>`,
  // a die with bond pads and traces running out to a board edge
  chip: () => {
    let pads = "", traces = "";
    for (let i = 0; i < 6; i++) {
      const o = 104 + i * 10;
      pads += `<rect x="${o - 2.5}" y="56" width="5" height="5" class="ra__pad"/><rect x="${o - 2.5}" y="119" width="5" height="5" class="ra__pad"/>`;
      traces += `<path class="ra__trace" d="M${o} 56V${40 - i * 3}H${30 + i * 8}M${o} 124V${140 + i * 3}H${226 - i * 8}"/>`;
    }
    return `${traces}<rect x="94" y="56" width="68" height="68" rx="4" class="ra__die"/>
      <rect x="110" y="72" width="36" height="36" rx="2" class="ra__core"/>
      <path class="ra__grid" d="M110 84H146M110 96H146M122 72V108M134 72V108"/>${pads}
      <circle cx="30" cy="25" r="3" class="ra__via"/><circle cx="226" cy="155" r="3" class="ra__via"/>`;
  },
};

function researchMedia(r) {
  const im = r.image;
  if (!im) return `<div class="hobby__art"><svg viewBox="0 0 256 180" aria-hidden="true">${RESEARCH_ART[r.art]?.() || ""}</svg></div>`;
  const pics = im.photo
    ? `<img class="rs__photo" src="${im.src}" alt="${esc(im.alt)}" loading="lazy" decoding="async" />`
    : `<img class="rs__print" src="${im.light}" alt="${esc(im.alt)}" loading="lazy" decoding="async" />`;
  return `<figure class="rs__media${im.photo ? " rs__media--photo" : ""}">${pics}<figcaption>${esc(im.caption)}</figcaption></figure>`;
}

function researchCard(r) {
  return `
  <article class="card rs reveal">
    <div class="rs__text">
      <p class="hobby__meta">${esc(r.card.meta)}</p>
      <h3 class="card__title">${esc(r.title)}</h3>
      <p class="rs__sum">${esc(r.card.line)}</p>
      <a class="more rs__link" href="${r.link}" target="_blank" rel="noopener">Lab website</a>
    </div>
    ${researchMedia(r)}
  </article>`;
}

/* ---------- concise experience list ---------- */
function roleRow(e, i) {
  return `
  <li class="xp__row">
    <div class="xp__meta">
      <span class="xp__when">${esc(e.dates)}</span>
    </div>
    <div class="xp__main">
      <h3 class="xp__org">${esc(e.org)}</h3>
      <p class="xp__role">${esc(e.role)}, ${esc(e.place.replace(", CA", ""))}</p>
      <p class="xp__sum">${esc(e.summary)}</p>
    </div>
  </li>`;
}

/* ---------- project "windows": a small preview, a line, two numbers ---------- */
function miniLoop() {
  // Rewardsmith in one glance: ink outlines on paper, Claude in blue
  const box = (x, y, t, hot = false) => `
    <rect x="${x - 34}" y="${y - 13}" width="68" height="26" rx="6" class="${hot ? "mp__hot" : "mp__box"}"/>
    <text x="${x}" y="${y + 4}" text-anchor="middle" class="${hot ? "mp__thot" : "mp__t"}">${t}</text>`;
  return `<svg class="pw__art" viewBox="0 0 320 180" role="img" aria-label="Rewardsmith loop: a sentence goes to Claude, which writes reward functions; four PPO runs train in parallel; a vision critic scores them and the loop repeats.">
    <path class="mp__e" d="M76 60H112M180 60H214M248 73V126H194"/>
    <rect x="226" y="35" width="68" height="26" rx="6" class="mp__box mp__ghost"/><rect x="220" y="41" width="68" height="26" rx="6" class="mp__box mp__ghost"/>
    ${box(42, 60, "sentence")}${box(146, 60, "Claude", true)}${box(248, 60, "PPO ×4")}${box(160, 126, "critic")}
    <path class="mp__loop" d="M126 126H42V82"/><path class="mp__head" d="M38 82L42 74L46 82Z"/>
  </svg>`;
}

function projectWindow(p) {
  const picks = (p.show || [0, 1]).map((i) => p.metrics[i]).filter(Boolean);
  const v = p.visual;
  const media = v.type === "image"
    ? `<img src="${v.src}" srcset="${v.srcset}" sizes="(max-width: 734px) 100vw, 380px" alt="${esc(v.alt)}" loading="lazy" decoding="async" />`
    : miniLoop();
  const links = [
    p.live ? mlButton(p.live, "Play now", { ext: true, sm: true }) : "",
    `<a class="more" href="${p.repo}" ${ext}>Source</a>`,
  ].join("");
  return `
  <article class="pw reveal" id="${slug(p.name)}" data-repo="${p.repo.replace("https://github.com/", "")}">
    <div class="pw__bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(p.repo.split("/").pop())}</span></div>
    <div class="pw__media${v.type === "image" ? "" : " pw__media--print"}">${media}</div>
    <div class="pw__body">
      <h3 class="pw__name">${esc(p.name)}</h3>
      <p class="pw__line">${esc(p.oneLine)}</p>
      <div class="pw__nums">${picks.map((m) => `<div class="card--metric pw__num"><div class="card__big">${esc(m.big)}</div><p class="card__label">${esc(m.label)}</p></div>`).join("")}</div>
      <p class="pw__tags">${esc(p.tags.slice(0, 4).join(" · "))}</p>
      <div class="pw__links">${links}</div>
    </div>
  </article>`;
}

/* ---------- hobbies: a line drawing for each ---------- */
const HOBBY_ART = {
  // a corner of a Go board, the last move ringed in blue
  go: () => {
    let g = "";
    for (let i = 0; i < 9; i++) g += `<path d="M${70 + i * 20} 10V170M70 ${10 + i * 20}H230"/>`;
    const st = [[2, 2, 1], [3, 2, 0], [3, 3, 1], [4, 2, 1], [2, 4, 0], [4, 4, 0], [5, 3, 1], [3, 5, 0], [4, 3, 0], [6, 4, 1], [5, 5, 0]];
    const stones = st.map(([c, r, b]) => `<circle cx="${70 + c * 20}" cy="${10 + r * 20}" r="8.5" class="${b ? "ha__b" : "ha__w"}"/>`).join("");
    return `<g class="ha__grid">${g}</g><circle cx="190" cy="70" r="2.5" class="ha__star"/><circle cx="110" cy="70" r="2.5" class="ha__star"/>${stones}<circle cx="190" cy="90" r="8.5" class="ha__b"/><circle cx="190" cy="90" r="13" class="ha__ring"/>`;
  },
  // a jump shot's arc dropping through the rim
  hoop: () => `
    <path class="ha__arc" d="M40 150Q140 -10 236 74"/>
    ${[0.12, 0.28, 0.44, 0.6, 0.76].map((t) => { const x = (1 - t) ** 2 * 40 + 2 * (1 - t) * t * 140 + t * t * 236, y = (1 - t) ** 2 * 150 + 2 * (1 - t) * t * -10 + t * t * 74; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" class="ha__dot"/>`; }).join("")}
    <circle cx="40" cy="150" r="13" class="ha__ball"/><path class="ha__seam" d="M27 150H53M40 137V163M31 140Q40 150 31 160M49 140Q40 150 49 160"/>
    <path class="ha__line" d="M262 40V110M262 58H256"/><rect x="250" y="44" width="12" height="40" class="ha__board"/>
    <ellipse cx="236" cy="78" rx="20" ry="4" class="ha__rim"/><path class="ha__net" d="M216 78L222 100M226 79L229 102M236 80V103M246 79L243 102M256 78L250 100M222 100H250"/>
    <text x="64" y="164" class="ha__lbl">2015 Finals · Game 5</text>`,
  // a race profile: three halves done, the full marathon dashed ahead
  run: () => {
    const pts = []; for (let i = 0; i <= 60; i++) { const x = 20 + i * 4.67, y = 112 - 26 * Math.sin(i / 7) * Math.cos(i / 17) - (i > 30 ? 6 : 0); pts.push([x, y]); }
    const half = pts.slice(0, 31).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    const full = pts.slice(30).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    const mk = (i, t, hot) => `<path class="ha__line" d="M${pts[i][0]} ${pts[i][1] - 6}V${pts[i][1] - 34}"/><path class="${hot ? "ha__flaghot" : "ha__flag"}" d="M${pts[i][0]} ${pts[i][1] - 34}h16l-4 5 4 5h-16z"/><text x="${pts[i][0] - 4}" y="${pts[i][1] - 40}" class="ha__lbl">${t}</text>`;
    return `<path class="ha__base" d="M20 150H300"/><path class="ha__run" d="${half}"/><path class="ha__next" d="${full}"/>
      ${[10, 20].map((i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="2.2" class="ha__dot"/>`).join("")}
      ${mk(30, "13.1 × 3")}${mk(60, "26.2 next", true)}<circle cx="${pts[30][0]}" cy="${pts[30][1]}" r="4" class="ha__ball2"/>`;
  },
  // waves and a rescue ring
  swim: () => {
    const wave = (y, a, ph) => { let d = ""; for (let x = 10; x <= 310; x += 5) d += `${x === 10 ? "M" : "L"}${x} ${(y + a * Math.sin(x / 18 + ph)).toFixed(1)}`; return d; };
    return `<path class="ha__wave" d="${wave(118, 5, 0)}"/><path class="ha__wave ha__wave--2" d="${wave(138, 4, 1.8)}"/><path class="ha__wave ha__wave--3" d="${wave(156, 3, 3.1)}"/>
      <g transform="translate(160 76)"><circle r="30" class="ha__ring2"/><circle r="17" class="ha__ring2"/>
      ${[45, 135, 225, 315].map((a) => { const r = (a * Math.PI) / 180; return `<path class="ha__band" d="M${(17 * Math.cos(r - 0.28)).toFixed(1)} ${(17 * Math.sin(r - 0.28)).toFixed(1)}L${(30 * Math.cos(r - 0.18)).toFixed(1)} ${(30 * Math.sin(r - 0.18)).toFixed(1)}A30 30 0 0 1 ${(30 * Math.cos(r + 0.18)).toFixed(1)} ${(30 * Math.sin(r + 0.18)).toFixed(1)}L${(17 * Math.cos(r + 0.28)).toFixed(1)} ${(17 * Math.sin(r + 0.28)).toFixed(1)}A17 17 0 0 0 ${(17 * Math.cos(r - 0.28)).toFixed(1)} ${(17 * Math.sin(r - 0.28)).toFixed(1)}Z"/>`; }).join("")}</g>`;
  },
};
function hobbyTile(h) {
  return `
  <article class="card hobby reveal">
    <div class="hobby__text">
      <p class="hobby__meta">${esc(h.meta)}</p>
      <h3 class="card__title">${esc(h.title)}</h3>
      <p class="card__label">${esc(h.blurb)}</p>
    </div>
    ${h.photo ? `
    <figure class="rs__media hobby__photo">
      <img class="rs__photo" src="${h.photo.src}" alt="${esc(h.photo.alt)}" loading="lazy" decoding="async" />
    </figure>` : `<div class="hobby__art"><svg viewBox="0 0 320 180" aria-hidden="true">${HOBBY_ART[h.art]?.() || ""}</svg></div>`}
  </article>`;
}

/* ---------- render ---------- */
function render() {
  const L = SITE.links;
  $("#heroHeadline").textContent = SITE.hero.headline;
  // keywords under the name, joined by tiny "edges" instead of dots
  $("#heroKeys").innerHTML = SITE.hero.keywords.map((k) => `<span>${esc(k)}</span>`).join('<i class="hero__edge" aria-hidden="true"></i>');
  $("#heroCtas").innerHTML = mlButton("#contact", "Get in touch") + mlButton(L.cv, "Request CV", { ghost: true });

  $$("[data-copy]").forEach((el) => { const [k, f] = el.dataset.copy.split("."); el.textContent = SITE[k][f]; });
  $$("[data-layer]").forEach((el) => { el.innerHTML = `${glyph()}<span>${esc(SITE.layers[el.dataset.layer])}</span>`; });

  $("#facts").innerHTML = SITE.facts.map(bigCard).join("");
  $("#aboutText").innerHTML = SITE.about.map((p) => `<p>${esc(p)}</p>`).join("");
  $("#roles").innerHTML = `<ol class="card xp reveal">${SITE.experience.map((e, i) => roleRow(e, i)).join("")}</ol><div class="ctas xp__cta reveal"><a class="more" href="${SITE.links.cv}">Ask for my full CV</a></div>`;
  $("#panel-projects").innerHTML = `<div class="pws">${SITE.projects.map(projectWindow).join("")}</div>
    <div class="gh reveal" id="ghBody"><div class="card gh__activity" id="ghActivity" hidden></div><p class="gh__note" id="ghNote"></p></div>`;
  $("#panel-research").innerHTML = `<div class="grid grid--2 grid--wide">${SITE.research.map(researchCard).join("")}</div>`;
  $("#panel-hobbies").innerHTML = `<div class="grid grid--2 grid--wide">${SITE.hobbies.map(hobbyTile).join("")}</div>`;
  $("#contactCtas").innerHTML = mlButton(L.email, "Email me", { copy: L.emailText }) + mlButton(L.linkedin, "LinkedIn", { ghost: true, ext: true });

  const col = (title, links) => `<div class="footer__col"><h4>${title}</h4>${links.join("")}</div>`;
  $("#footerCols").innerHTML = [
    col("Experience", SITE.experience.map((e) => `<a href="#experience">${esc(e.short)}</a>`)),
    col("Work", [...SITE.projects.map((p) => `<a href="#${slug(p.name)}">${esc(p.name)}</a>`), `<a href="#research">Research</a>`, `<a href="#hobbies">Hobbies</a>`]),
    col("This site", [`<a href="#about">About</a>`, `<a href="#ask">Ask about my work</a>`, `<a href="#train">Train a model</a>`]),
    col("Elsewhere", [
      `<a href="${L.email}">Email</a>`,
      `<a href="${L.linkedin}" ${ext}>LinkedIn</a>`,
      `<a href="${L.github}" ${ext}>GitHub</a>`,
      `<a href="${L.cv}">CV on request</a>`,
    ]),
  ].join("");
  $("#year").textContent = new Date().getFullYear();
}

/* ---------- theme: light / dark "model switch" ---------- */
function setupTheme() {
  const btn = $("#themeSwitch"), root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (t, save) => {
    root.dataset.theme = t;
    btn.setAttribute("aria-checked", String(t === "dark"));
    meta?.setAttribute("content", t === "dark" ? "#000000" : "#ffffff");
    if (save) { try { localStorage.setItem("theme", t); } catch {} }
    dispatchEvent(new Event("themechange"));
  };
  apply(root.dataset.theme === "dark" ? "dark" : "light", false);
  btn.addEventListener("click", () => apply(root.dataset.theme === "dark" ? "light" : "dark", true));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch {}
    if (!saved) apply(e.matches ? "dark" : "light", false);
  });
}

/* ---------- nav loss readout: reading progress as a training run ---------- */
function setupLossbar() {
  const bar = $("#lossbar"), line = $("#lossLine"), track = $("#lossTrack"), dot = $("#lossDot"), val = $("#lossVal");
  if (!bar) return;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = 60;
  const L = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    return Math.max(0.012, 0.03 + 2.45 * Math.exp(-5 * t) + (rnd() - 0.5) * 0.3 * Math.exp(-2.6 * t));
  });
  const max = Math.max(...L), lo = Math.log(0.01), hi = Math.log(max);
  const pt = (i) => [(38 * i) / (N - 1), 1 + 12 * (1 - (Math.log(L[i]) - lo) / (hi - lo))];
  const path = (n) => Array.from({ length: n }, (_, i) => { const [x, y] = pt(i); return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`; }).join("");
  track.setAttribute("d", path(N));
  let lastI = -1;
  const update = () => {
    const maxY = document.documentElement.scrollHeight - innerHeight;
    const p = maxY > 0 ? Math.min(1, Math.max(0, scrollY / maxY)) : 0;
    const i = Math.round(p * (N - 1));
    if (i === lastI) return;
    lastI = i;
    line.setAttribute("d", path(i + 1));
    const [x, y] = pt(i);
    dot.setAttribute("cx", x); dot.setAttribute("cy", y);
    const done = p > 0.985;
    bar.classList.toggle("is-done", done);
    val.textContent = done ? "converged" : L[i].toFixed(3);
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", () => { lastI = -1; update(); });
  update();
}

/* ---------- hovering a number lights its mention in the bullets ---------- */
function setupHover() {
  const firstNum = (el) => (el.getAttribute("aria-label") || el.textContent).match(/\d[\d,]*(?:\.\d+)?/)?.[0];
  for (const tile of $$(".card--metric, .metric")) {
    const big = $(".card__big", tile);
    const scope = tile.closest(".panel, .role");
    if (!big || !scope) continue;
    const lit = () => {
      const n = firstNum(big);
      if (!n) return [];
      return $$(".hl", scope).filter((h) => h.textContent.replace(/,/g, "").includes(n.replace(/,/g, "")));
    };
    tile.addEventListener("mouseenter", () => lit().forEach((h) => h.classList.add("is-lit")));
    tile.addEventListener("mouseleave", () => $$(".hl.is-lit", scope).forEach((h) => h.classList.remove("is-lit")));
  }
}

/* ---------- headlines that "generate" word by word ---------- */
function setupGenerate() {
  for (const el of $$(".hero__headline, .headline")) {
    const text = el.textContent.trim();
    if (!text) continue;
    el.setAttribute("aria-label", text);
    el.classList.add("gen");
    const words = text.split(/\s+/), accent = !el.classList.contains("hero__headline");   // section headlines end on an italic word
    el.innerHTML = words.map((wd, i) => {
      const w = accent && i === words.length - 1 && words.length > 1 ? `<em>${esc(wd)}</em>` : esc(wd);
      return `<span class="gen__w" aria-hidden="true" style="--i:${i}">${w}</span>`;
    }).join(" ");
  }
}

/* ---------- count-up numbers ---------- */
const NUM = /\d[\d,]*(?:\.\d+)?/g;
const fmtNum = (v, dec, comma) => {
  const s = v.toFixed(dec);
  if (!comma) return s;
  const [i, d] = s.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? `.${d}` : "");
};

function prepCount(el) {
  if (el.hasAttribute("data-nocount") || el.dataset.prepped) return false;
  const text = el.textContent;
  let html = "", last = 0, any = false;
  for (const m of text.matchAll(NUM)) {
    const raw = m[0], dec = (raw.split(".")[1] || "").length, comma = raw.includes(",");
    const to = parseFloat(raw.replace(/,/g, ""));
    html += esc(text.slice(last, m.index)) + `<span class="num" data-to="${to}" data-dec="${dec}" data-comma="${comma ? 1 : 0}">${fmtNum(0, dec, comma)}</span>`;
    last = m.index + raw.length; any = true;
  }
  if (!any) return false;
  el.setAttribute("aria-label", text);
  el.innerHTML = html + esc(text.slice(last));
  el.dataset.prepped = "1";
  return true;
}

function runCount(el) {
  const nums = $$(".num", el);
  const card = el.closest(".card, .role");
  const dur = 1400, t0 = performance.now();
  const ease = (p) => 1 - Math.pow(1 - p, 4);
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur), e = ease(p);
    for (const n of nums) n.textContent = fmtNum(parseFloat(n.dataset.to) * e, +n.dataset.dec, n.dataset.comma === "1");
    if (p < 1) requestAnimationFrame(tick);
    else card?.classList.add("is-done");
  };
  requestAnimationFrame(tick);
}

function setupCounts() {
  const els = $$(".card__big");
  if (reduceMotion) { els.forEach((el) => el.closest(".card, .role")?.classList.add("is-done")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      if (en.target.dataset.prepped) runCount(en.target);
      else en.target.closest(".card, .role")?.classList.add("is-done");
    }
  }, { threshold: 0.6 });
  els.forEach((el) => { prepCount(el); io.observe(el); });
}

/* ---------- tabs ---------- */
function selectTab(name, { focus = false } = {}) {
  if (!TABS.includes(name)) return;
  for (const t of TABS) {
    const tab = $(`#tab-${t}`), panel = $(`#panel-${t}`), on = t === name;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
    if (on && focus) tab.focus();
  }
  movePill();
}
function movePill() {
  const tab = $(".tabs__tab[aria-selected='true']"), pill = $(".tabs__pill");
  if (!tab || !tab.offsetWidth) return;
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
}
function setupTabs() {
  const tabs = $$(".tabs__tab");
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => { selectTab(t.dataset.tab); history.replaceState(null, "", `#${t.dataset.tab}`); });
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, { focus: true }); }
    });
  });
  addEventListener("resize", movePill);
  document.fonts?.ready.then(movePill);
  movePill();
}

/* ---------- in-page links (aware of tabs) ---------- */
function goTo(id, smooth = true) {
  const behavior = smooth && !reduceMotion ? "smooth" : "auto";
  if (TABS.includes(id)) { selectTab(id); $("#work").scrollIntoView({ behavior }); return true; }
  const el = document.getElementById(id);
  if (!el) return false;
  const panel = el.closest(".tabpanel");
  if (panel?.hidden) selectTab(panel.id.replace("panel-", ""));
  el.scrollIntoView({ behavior });
  return true;
}
function setupLinks() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    if (goTo(id)) { e.preventDefault(); history.replaceState(null, "", `#${id}`); }
  });
  if (location.hash) requestAnimationFrame(() => goTo(location.hash.slice(1), false));
}

/* ---------- nav ---------- */
function setupNav() {
  const toggle = $("#navToggle"), links = $("#navLinks");
  const set = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => set(!links.classList.contains("is-open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => set(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  matchMedia("(min-width: 735px)").addEventListener("change", (e) => { if (e.matches) set(false); });
}

/* ---------- section indicator: a column of neurons ---------- */
function setupIndicator() {
  const fp = $("#fp");
  const sections = $$("main > section[data-fp]");
  fp.innerHTML = `<span class="fp__line" aria-hidden="true"><span class="fp__fill"></span></span>` +
    sections.map((s) => `<a class="fp__node" href="#${s.id}" aria-label="${s.dataset.fp}"><span class="fp__label">${s.dataset.fp}</span></a>`).join("");
  const nodes = $$(".fp__node", fp), fill = $(".fp__fill", fp);
  let current = -1;
  const navLinks = $$(".nav__links a[href^='#']");
  const markNav = (id) => {
    const tab = $(".tabs__tab[aria-selected='true']")?.dataset.tab;
    const want = id;
    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${want}`));
  };
  $$(".tabs__tab").forEach((t) => t.addEventListener("click", () => current >= 0 && markNav(sections[current].id)));
  const setActive = (i) => {
    if (i === current) return;
    current = i;
    markNav(sections[i].id);
    nodes.forEach((n, j) => { n.classList.toggle("is-active", j === i); n.classList.toggle("is-past", j < i); });
    fill.style.height = `${(i / (nodes.length - 1)) * 100}%`;
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) setActive(sections.indexOf(en.target));
  }, { rootMargin: "-50% 0px -50% 0px" });
  sections.forEach((s) => io.observe(s));

  // switch to light-on-dark colors when a dark area sits behind the indicator
  const darkAreas = $$("[data-dark]");
  const checkDark = () => {
    const r = fp.getBoundingClientRect(), y = r.top + r.height / 2, x = r.left + r.width / 2;
    fp.classList.toggle("on-dark", darkAreas.some((d) => {
      if (d.closest("[hidden]")) return false;
      const b = d.getBoundingClientRect();
      return b.top < y && b.bottom > y && b.left < x && b.right > x;
    }));
  };
  addEventListener("scroll", checkDark, { passive: true });
  checkDark();
}

/* ---------- reveal on scroll ---------- */
function setupReveal() {
  const els = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
    }
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  els.forEach((el) => io.observe(el));
}

render();
setupNav();
setupTabs();
setupLinks();
setupTheme();
setupEmailCopy();
setupCvRequest();
setupHaptics();
setupGenerate();
setupReveal();
setupCounts();
setupIndicator();
startNet($("#net"), { reduceMotion, burst: true });
startNet($("#netOut"), { reduceMotion, layers: [9, 7, 5, 3, 1], layersNarrow: [6, 5, 3, 2, 1], pad: [0.08, 0.92], rate: 0.6 });
startChat(SITE);
startAmbient({ reduceMotion });
startTrainer({ reduceMotion });
startLab({ reduceMotion });
startGitHub(SITE.github);
setupLossbar();
setupHover();
