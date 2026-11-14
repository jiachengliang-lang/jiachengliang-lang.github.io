// "Ask about me" chat. With SITE.chatEndpoint set, questions go to the
// Cloudflare Worker in worker/, which asks Claude. Without it (or if the
// call fails) answers come from a small keyword search over content.js.

const STOP = new Set("a an and are about at be by can did do does for from has have he him his how i in is it me of on or that the this to was what when where which who why with you your tell".split(" "));
const words = (s) => s.toLowerCase().match(/[a-z0-9+#.²]+/g)?.map((w) => w.replace(/\.$/, "")).filter((w) => w.length > 1 && !STOP.has(w)) ?? [];

function buildDocs(SITE) {
  const docs = [];
  SITE.experience.forEach((e) => docs.push({
    title: e.org, keys: `${e.org} ${e.role} ${e.kind} ${e.tags.join(" ")} work job intern experience`,
    text: `${e.org}, ${e.role} (${e.dates}). ${e.summary}`, bullets: e.bullets,
  }));
  SITE.projects.forEach((p) => docs.push({
    title: p.name, keys: `${p.name} ${p.subtitle} ${p.kind} ${p.tags.join(" ")} project built`,
    text: `${p.name}: ${p.subtitle}.`, bullets: p.bullets,
  }));
  (SITE.research || []).forEach((r) => docs.push({
    title: r.title, keys: `research lab ${r.lab} ${r.title} ${r.tags.join(" ")}`,
    text: `Research: ${r.title} (${r.lab}). ${r.summary} ${r.role}`, bullets: [],
  }));
  docs.push({
    title: "Hobbies", keys: "hobbies hobby fun free time sports go basketball warriors running marathon lifeguard swim",
    text: (SITE.hobbies || []).map((h) => `${h.title}: ${h.blurb}`).join("\n"), bullets: [],
  });
  docs.push({
    title: "About", keys: "about who background study school berkeley education gpa major degree graduate graduation year student",
    text: SITE.modelCard.map(([k, v]) => `${k}: ${v}`).join("\n"), bullets: [],
  });
  docs.push({
    title: "Now", keys: "now currently current right present today doing",
    text: "Right now he writes real-time C++/Qt imaging software at Berkeley's VOILA lab and is an academic intern for CS 61C (Machine Structures), teaching 100+ students.", bullets: [],
  });
  docs.push({
    title: "ML", keys: "ml machine learning ai model models reinforcement rl llm agent agents neural",
    text: "His ML work: at TerraNova Bio he built models predicting 5 expensive lab measurements from 7 cheap sensors (R² 0.86–0.99 on held-out batches) and ran live inference on an ATmega328P. With Rewardsmith he built an LLM agent loop where Claude writes reward functions and PPO trains a simulated Unitree Go1. At VOILA he automated image calibration with a Nelder-Mead optimizer.", bullets: [],
  });
  docs.push({
    title: "Skills", keys: "skills languages stack tools technologies know language programming",
    text: SITE.skills.map((s) => `${s.group}: ${s.items.join(", ")}`).join("\n"), bullets: [],
  });
  docs.push({
    title: "Contact", keys: "contact email reach hire linkedin github touch",
    text: `Email ${SITE.links.emailText}, or find him on LinkedIn and GitHub (links at the top of the page).`, bullets: [],
  });
  docs.forEach((d) => { d.tokens = new Set(words(`${d.keys} ${d.text} ${d.bullets.join(" ")}`)); d.keyTokens = new Set(words(`${d.title} ${d.keys}`)); });
  return docs;
}

function localAnswer(docs, q) {
  const qs = words(q);
  let best = null, bestScore = 0;
  for (const d of docs) {
    let s = 0;
    for (const w of qs) {
      if (d.keyTokens.has(w)) s += 3;
      else if (d.tokens.has(w)) s += 1;
      else if ([...d.keyTokens].some((k) => k.length > 3 && (k.startsWith(w) || w.startsWith(k)))) s += 1.5;
    }
    if (s > bestScore) { bestScore = s; best = d; }
  }
  if (!best || bestScore < 1.5) {
    return "I'm not sure about that one. Try asking about his experience (VOILA, TerraNova Bio, CS 61C), his projects (Rewardsmith, Vault, Yellow Brawl), his skills, or how to contact him.";
  }
  const extra = best.bullets.slice(0, 3).map((b) => `• ${b}`).join("\n");
  return extra ? `${best.text}\n\n${extra}` : best.text;
}

export function startChat(SITE) {
  const log = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const send = document.getElementById("chatSend");
  const chips = document.getElementById("chatChips");
  const mode = document.getElementById("chatMode");
  const docs = buildDocs(SITE);
  const live = Boolean(SITE.chatEndpoint);
  const history = [];
  let busy = false;

  mode.textContent = live ? "Answers by Claude, from this page only." : "Offline mode: answers are matched from this page.";

  const add = (role, text = "") => {
    const el = document.createElement("div");
    el.className = `msg msg--${role}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const typeOut = (el, text) => new Promise((resolve) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = text; return resolve(); }
    el.classList.add("msg--typing");
    let i = 0;
    const tick = () => {
      i = Math.min(text.length, i + Math.max(2, Math.round(text.length / 90)));
      el.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      if (i < text.length) setTimeout(tick, 14);
      else { el.classList.remove("msg--typing"); resolve(); }
    };
    tick();
  });

  async function ask(q) {
    q = q.trim().slice(0, 500);
    if (!q || busy) return;
    busy = true; send.disabled = true;
    add("me", q);
    const el = add("bot");
    // "thinking" indicator: three neurons firing in sequence, like a forward pass
    el.innerHTML = '<span class="fwd" role="img" aria-label="Thinking"><i></i><b></b><i></i><b></b><i></i></span>';
    let reply;
    if (live) {
      try {
        history.push({ role: "user", content: q });
        const res = await fetch(SITE.chatEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-10) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.reply) throw new Error(data.error || `HTTP ${res.status}`);
        reply = data.reply;
        history.push({ role: "assistant", content: reply });
      } catch (err) {
        history.pop();
        reply = `${localAnswer(docs, q)}\n\n(The live model is unavailable right now, so this answer comes straight from the page.)`;
      }
    } else {
      await new Promise((r) => setTimeout(r, 700));
      reply = localAnswer(docs, q);
    }
    await typeOut(el, reply);
    busy = false; send.disabled = false;
  }

  add("bot", `Hi! I can answer questions about ${SITE.name.split(" ")[0]}'s work, projects and skills. What would you like to know?`);
  chips.innerHTML = SITE.chatSuggestions.map((s) => `<button type="button" class="chip">${s.replace(/</g, "&lt;")}</button>`).join("");
  chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) ask(b.textContent); });
  form.addEventListener("submit", (e) => { e.preventDefault(); const q = input.value; input.value = ""; ask(q); });
}
