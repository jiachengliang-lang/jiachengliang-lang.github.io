// Live GitHub stats for the Projects tab: a line in each project window and a
// weekly commit chart below them. Uses GitHub's public REST API (no token;
// 60 requests/hour per visitor IP). One page load costs 2 requests per repo plus
// 1 for the team repo's total. Results are cached in localStorage for an hour;
// if GitHub can't be reached, the last cached result is used, and with no cache
// the stats are simply left out.

const API = "https://api.github.com";
const WEEKS = 12;
const CACHE_KEY = "gh-cache-v2", CACHE_MS = 60 * 60 * 1000;

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`${r.status}`);
  return { data: await r.json(), link: r.headers.get("Link") };
}
const lastPage = (link) => +((link || "").match(/[?&]page=(\d+)>; rel="last"/)?.[1] || 0);

async function countCommits(repo, author) {
  const q = author ? `&author=${encodeURIComponent(author)}` : "";
  const { data, link } = await getJSON(`${API}/repos/${repo}/commits?per_page=1${q}`);
  return lastPage(link) || data.length;
}

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; } };

async function load(cfg) {
  const cached = readCache();
  if (cached && Date.now() - cached.t < CACHE_MS) return cached.v;
  try {
    const repos = await Promise.all(cfg.repos.map(async (r) => {
      const [{ data: meta }, mineRes, total] = await Promise.all([
        getJSON(`${API}/repos/${r.repo}`),
        // up to 100 of my commits: their count and dates feed both the window line and the chart
        getJSON(`${API}/repos/${r.repo}/commits?per_page=100&author=${encodeURIComponent(cfg.user)}`),
        r.team ? countCommits(r.repo) : Promise.resolve(null),
      ]);
      const dates = mineRes.data.map((x) => x.commit?.author?.date).filter(Boolean);
      const mine = dates.length < 100 ? dates.length : await countCommits(r.repo, cfg.user);
      return { repo: r.repo, mine, total, stars: meta.stargazers_count, pushed: meta.pushed_at, dates };
    }));
    const v = { repos };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v })); } catch {}
    return v;
  } catch (err) {
    if (cached) return cached.v;          // stale beats nothing
    throw err;
  }
}

function ago(iso) {
  const d = (Date.now() - new Date(iso)) / 864e5;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "a month ago" : `${m} months ago`;
}

// a quiet line of live stats inside each project window
function fillWindows(cfg, live) {
  for (const r of cfg.repos) {
    const el = document.querySelector(`.pw[data-repo="${r.repo}"] [data-gh]`);
    const st = live?.repos.find((x) => x.repo === r.repo);
    if (!el || !st) continue;
    const commits = r.team ? `${st.total.toLocaleString("en-US")} commits · team repo` : `${st.mine.toLocaleString("en-US")} commits`;
    el.innerHTML = `<i class="pw__dot" aria-hidden="true"></i>${commits}${st.stars ? ` · ★ ${st.stars}` : ""} · updated ${ago(st.pushed)}`;
    el.title = "Live from GitHub";
  }
}

function chart(live) {
  const weekMs = 7 * 864e5, now = Date.now(), counts = new Array(WEEKS).fill(0);
  for (const r of live.repos) for (const d of r.dates) {
    const i = WEEKS - 1 - Math.floor((now - new Date(d)) / weekMs);
    if (i >= 0 && i < WEEKS) counts[i]++;
  }
  const total = counts.reduce((a, b) => a + b, 0), max = Math.max(1, ...counts);
  const W = 640, H = 120, gap = 8, bw = (W - gap * (WEEKS - 1)) / WEEKS;
  let bars = "", labels = "";
  counts.forEach((c, i) => {
    const h = c ? Math.max(3, (c / max) * (H - 10)) : 1.5;
    const x = i * (bw + gap);
    const wkStart = new Date(now - (WEEKS - i) * weekMs);
    const tip = `${c} commit${c === 1 ? "" : "s"} · week of ${wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    bars += `<rect class="${c ? "gh__bar" : "gh__bar gh__bar--0"}" x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" style="--d:${i * 40}ms"><title>${tip}</title></rect>`;
    if (i % 3 === 0) labels += `<span style="left:${((x / W) * 100).toFixed(2)}%">${wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>`;
  });
  return { total, svg: `<svg class="gh__chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${total} commits in the last ${WEEKS} weeks">${bars}</svg><div class="gh__axis" aria-hidden="true">${labels}</div>` };
}

export async function startGitHub(cfg) {
  const box = document.getElementById("ghActivity");
  if (!box || !cfg) return;
  let live = null;
  try { live = await load(cfg); } catch { live = null; }
  if (!live) return;                       // stats are a bonus; leave them out quietly
  fillWindows(cfg, live);
  const { total, svg } = chart(live);
  box.innerHTML = `
    <div class="gh__head">
      <div><b class="gh__big">${total}</b><span class="gh__lbl">of my commits in the last ${WEEKS} weeks, across these repos</span></div>
      <div class="gh__side"><span class="gh__live"><i></i>live from GitHub</span><a class="more" href="https://github.com/${cfg.user}" target="_blank" rel="noopener">See everything</a></div>
    </div>${svg}`;
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add("is-drawn"));
}
