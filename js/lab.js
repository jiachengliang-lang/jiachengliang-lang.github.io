// The training lab is a hidden feature, not a page section. It opens as a
// full-screen overlay from:
//   - a click on the hero network (a "click to train me" hint appears on hover)
//   - the T key, anywhere outside a text field
//   - the loss readout in the nav
//   - a #train link
// A one-time hint pill tells first-time visitors it exists.

const HINT_KEY = "lab-hint-seen";
const seen = () => { try { return localStorage.getItem(HINT_KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(HINT_KEY, "1"); } catch {} };
const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function startLab({ reduceMotion = false } = {}) {
  const box = document.getElementById("labx");
  if (!box) return;
  const panel = box.querySelector(".labx__panel");
  const closeBtn = document.getElementById("labxClose");
  const head = box.querySelector(".labx__head .headline");
  const pill = document.getElementById("labHintPill");
  const hero = document.getElementById("net");
  const heroHint = document.getElementById("heroHint");
  const lossBtn = document.getElementById("lossbar");
  const touch = matchMedia("(hover: none)").matches;
  let lastFocus = null, closing = 0;

  /* ----- open / close ----- */
  function open(from) {
    if (!box.hidden && !box.classList.contains("is-closing")) return;
    clearTimeout(closing);
    box.classList.remove("is-closing");
    lastFocus = document.activeElement;
    // start the panel's motion from where the user clicked
    if (from && from.x != null) {
      box.style.setProperty("--ox", `${from.x}px`);
      box.style.setProperty("--oy", `${from.y}px`);
    } else {
      box.style.setProperty("--ox", "50vw");
      box.style.setProperty("--oy", "60vh");
    }
    box.hidden = false;
    document.documentElement.classList.add("labx-open");
    // replay the label's forward pass and the "generate" headline each time it opens
    const replay = [...box.querySelectorAll(".reveal, .gen")];
    replay.forEach((el) => el.classList.remove("is-in"));
    void box.offsetWidth;
    box.classList.add("is-open");
    setTimeout(() => replay.forEach((el) => el.classList.add("is-in")), reduceMotion ? 0 : 180);
    closeBtn.focus({ preventScroll: true });
    hidePill(true);
    if (location.hash !== "#train") history.replaceState(null, "", "#train");
  }
  function close() {
    if (box.hidden) return;
    box.classList.remove("is-open");
    box.classList.add("is-closing");
    document.documentElement.classList.remove("labx-open");
    if (location.hash === "#train") history.replaceState(null, "", location.pathname + location.search);
    dispatchEvent(new Event("labclosed"));            // the hero network fires a burst
    const done = () => { box.hidden = true; box.classList.remove("is-closing"); };
    closing = setTimeout(done, reduceMotion ? 0 : 380);
    lastFocus?.focus?.({ preventScroll: true });
  }

  closeBtn.addEventListener("click", close);
  box.addEventListener("pointerdown", (e) => { if (e.target === box) close(); });
  addEventListener("keydown", (e) => {
    if (!box.hidden && e.key === "Escape") { e.preventDefault(); close(); return; }
    if (!box.hidden && e.key === "Tab") {                 // keep focus inside the dialog
      const f = [...panel.querySelectorAll("button, a[href], canvas, [tabindex]:not([tabindex='-1'])")].filter((x) => x.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (box.hidden && (e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(document.activeElement)) {
      e.preventDefault(); open();
    }
  });

  /* ----- triggers ----- */
  if (hero) {
    hero.addEventListener("click", (e) => open({ x: e.clientX, y: e.clientY }));
    hero.setAttribute("tabindex", "0");
    hero.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    // "click to train me" appears after hovering the network for a moment
    let t = 0;
    const show = (e) => {
      if (!heroHint) return;
      const r = hero.getBoundingClientRect();
      heroHint.style.left = `${e.clientX - r.left}px`;
      heroHint.style.top = `${e.clientY - r.top}px`;
      if (!t && !heroHint.classList.contains("is-on")) t = setTimeout(() => heroHint.classList.add("is-on"), 1400);
    };
    hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") show(e); });
    hero.addEventListener("pointerleave", () => { clearTimeout(t); t = 0; heroHint?.classList.remove("is-on"); });
    hero.addEventListener("focus", () => heroHint?.classList.add("is-on", "is-center"));
    hero.addEventListener("blur", () => heroHint?.classList.remove("is-on", "is-center"));
  }
  lossBtn?.addEventListener("click", () => {
    const r = lossBtn.getBoundingClientRect();
    open({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
  const fromHash = () => { if (location.hash === "#train") open(); };
  addEventListener("hashchange", fromHash);
  fromHash();

  /* ----- one-time hint pill ----- */
  function hidePill(save) {
    if (save) markSeen();
    if (!pill || pill.hidden) return;
    pill.classList.remove("is-on");
    setTimeout(() => { pill.hidden = true; }, 400);
  }
  if (pill && !seen()) {
    pill.querySelector(".hintpill__text").textContent = touch
      ? "There's a model hidden on this page. Tap the network at the top to train it."
      : "There's a model hidden on this page. Click the network at the top, or press T.";
    pill.querySelector("[data-try]").addEventListener("click", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      open({ x: r.left + r.width / 2, y: r.top });
    });
    pill.querySelector("[data-dismiss]").addEventListener("click", () => hidePill(true));
    setTimeout(() => {
      if (seen() || !box.hidden) return;
      pill.hidden = false;
      requestAnimationFrame(() => pill.classList.add("is-on"));
    }, 20000);
  }
}
