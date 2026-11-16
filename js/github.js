// Contribution graph for the Projects tab: the same daily contribution calendar
// GitHub shows on the profile page, drawn in the site's blue.
// Data comes from github-contributions-api.jogruber.de, a public service that
// reads the calendar from the GitHub profile (no token, CORS enabled). Results
// are cached in localStorage for an hour; if the service can't be reached, the
// last cached result is used, and with no cache the graph is left out.

const CACHE_KEY = "gh-calendar-v2", CACHE_MS = 30 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fetch the current and previous calendar years and keep the last 371 days.
// (Per-year requests are cached separately by the service from its "last year"
// view, and they reflect profile changes such as private contributions sooner.)
async function fetchYear(user, y) {
  const r = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=${y}`);
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).contributions;
}

async function load(user) {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch {}
  if (cached && cached.user === user && Date.now() - cached.t < CACHE_MS) return cached.v;
  try {
    const now = new Date(), y = now.getFullYear();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = iso(now);
    const yearAgo = new Date(now); yearAgo.setFullYear(y - 1);
    const from = new Date(now); from.setDate(from.getDate() - 370);
    const [prev, cur] = await Promise.all([fetchYear(user, y - 1), fetchYear(user, y)]);
    const all = prev.concat(cur).filter((c) => c.date >= iso(from) && c.date <= today);
    const v = {
      days: all.map((c) => [c.date, c.count, c.level]),
      total: all.filter((c) => c.date > iso(yearAgo)).reduce((n, c) => n + c.count, 0),
    };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ user, t: Date.now(), v })); } catch {}
    return v;
  } catch (err) {
    if (cached && cached.user === user) return cached.v;     // stale beats nothing
    throw err;
  }
}

const fullMonth = (m) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m];
const fmtDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// Weeks run Sunday to Saturday, like GitHub. `weeks` limits how much history is drawn.
function calendar(days, weeks) {
  const start = new Date(days[0][0] + "T00:00:00Z");
  const lead = start.getUTCDay();                             // pad so the first column starts on Sunday
  const cells = Array(lead).fill(null).concat(days);
  let cols = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  cols = cols.slice(-weeks);

  const C = 11, G = 3, S = C + G, left = 28, top = 18;
  const W = left + cols.length * S - G, H = top + 7 * S - G;
  let rects = "", months = "", lastMonth = -1;
  cols.forEach((col, x) => {
    const first = col.find(Boolean);
    if (first) {
      const m = Number(first[0].slice(5, 7)) - 1;
      if (m !== lastMonth) {
        if (x < cols.length - 2) months += `<text class="gc__lbl" x="${left + x * S}" y="10">${MONTHS[m]}</text>`;
        lastMonth = m;
      }
    }
    col.forEach((day, y) => {
      if (!day) return;
      const [date, count, level] = day;
      const tip = `${count === 0 ? "No" : count} contribution${count === 1 ? "" : "s"} on ${fmtDay(date)}`;
      rects += `<rect class="gc__c gc__c--${level}" x="${left + x * S}" y="${top + y * S}" width="${C}" height="${C}" rx="2.5" style="--d:${x * 14}ms"><title>${tip}</title></rect>`;
    });
  });
  const dayLabels = [[1, "Mon"], [3, "Wed"], [5, "Fri"]].map(([r, t]) => `<text class="gc__lbl" x="0" y="${top + r * S + 9}">${t}</text>`).join("");
  // a short span draws larger squares, but never more than about 1.8x GitHub's size
  return `<svg class="gc__svg" viewBox="0 0 ${W} ${H}" style="max-width:${Math.round(W * 1.8)}px" role="img" aria-label="Contribution calendar for the last ${cols.length} weeks">${months}${dayLabels}${rects}</svg>`;
}

export async function startGitHub(cfg) {
  const box = document.getElementById("ghActivity");
  if (!box || !cfg) return;
  let data = null;
  try { data = await load(cfg.user); } catch { data = null; }
  if (!data) return;                                          // the graph is a bonus; leave it out quietly

  // start the grid at the week of the first contribution, so a young account
  // doesn't show months of empty squares; fall back to the full year otherwise
  const firstIdx = data.days.findIndex((d) => d[1] > 0);
  let sinceWeeks = 53, sinceLabel = "in the last year";
  if (firstIdx > 0) {
    const first = new Date(data.days[firstIdx][0] + "T00:00:00Z");
    const last = new Date(data.days[data.days.length - 1][0] + "T00:00:00Z");
    const span = Math.ceil(((last - first) / 864e5 + first.getUTCDay() + 1) / 7);
    if (span < 48) { sinceWeeks = span; sinceLabel = `since ${fullMonth(first.getUTCMonth())}`; }
  }
  const narrow = matchMedia("(max-width: 734px)");
  const render = () => {
    const weeks = Math.min(sinceWeeks, narrow.matches ? 22 : 53);
    box.innerHTML = `
      <div class="gh__head">
        <div><b class="gh__big">${data.total}</b><span class="gh__lbl">contributions on GitHub ${sinceLabel}</span></div>
        <div class="gh__side"><span class="gh__live"><i></i>live from GitHub</span><a class="more" href="https://github.com/${cfg.user}" target="_blank" rel="noopener">See profile</a></div>
      </div>
      <div class="gc">${calendar(data.days, weeks)}</div>
      <div class="gc__legend" aria-hidden="true">Less ${[0, 1, 2, 3, 4].map((l) => `<i class="gc__c--${l}"></i>`).join("")} More</div>`;
    box.hidden = false;
    box.classList.remove("is-drawn");
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("is-drawn")));
  };
  render();
  narrow.addEventListener("change", render);
}
