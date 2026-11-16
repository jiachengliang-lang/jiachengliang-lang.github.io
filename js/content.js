// All site text lives here. The page (js/main.js) and the chat backend
// (worker/src/index.js) both read from this file, so edit facts in one place.

export const SITE = {
  name: "Jiacheng Liang",
  tagline: "ECE @ UC Berkeley · ML + systems engineer",

  hero: {
    headline: "Jiacheng Liang",
    keywords: ["Software Engineer", "Machine Learning"],
    // one line of proof under the name; {name} pieces become links
    proof: "Building real-time imaging software at Berkeley's VOILA lab and AI for VERA, a robotic face, at Berkeley AI Research.",
    shipped: [["Rewardsmith", "#rewardsmith"], ["Vault", "#vault"], ["Yellow Brawl", "#yellow-brawl"]],
  },
  intro:
    "I build machine-learning systems that have to work outside a notebook: models running next to real hardware, LLM agents that train robots, and the infrastructure that keeps them correct when things fail.",

  links: {
    email: "mailto:jiacheng_liang@berkeley.edu",
    emailText: "jiacheng_liang@berkeley.edu",
    github: "https://github.com/jiachengliang-lang",
    linkedin: "https://www.linkedin.com/in/jiacheng-liang-872982326/",
    cv: "#cv",                 // the CV is shared on request; clicking a CV link shows how to ask
  },

  // Set this to your deployed Cloudflare Worker URL to turn on live answers,
  // e.g. "https://ask-jiacheng.<your-subdomain>.workers.dev".
  // Left empty, the chat answers from this file without calling a model.
  chatEndpoint: "",

  aboutHead: {
    headline: "Trained at UC Berkeley.",
    subhead: "",
  },
  facts: [
    { kicker: "Major", big: "Electrical and Computer Engineering", label: "", count: false, wide: true },
    { kicker: "From", big: "Toronto, Canada", label: "", count: false, wide: true },
  ],
  // Used by the chat backend.
  modelCard: [
    ["school", "UC Berkeley, B.S. Electrical & Computer Engineering"],
    ["dates", "Aug. 2025 – May 2028 (expected)"],
    ["grades", "3.85 / 4.00 GPA · Dean's List"],
    ["coursework", "Data Structures & Algorithms, Machine Structures, Software Engineering"],
    ["languages", "English, Mandarin Chinese (bilingual)"],
    ["currently", "real-time imaging @ VOILA · teaching CS 61C"],
  ],
  about: [
    "I'm an Electrical and Computer Engineering student at UC Berkeley. I like the part of machine learning where models meet the real world: noisy sensors, live camera frames, robots that find loopholes in their reward functions, and hardware that only fails when it's plugged in.",
    "This past summer I built physics-based simulation and prediction models for a bioprocess team at TerraNova Bio. Now I write real-time imaging software for an eye scanner at Berkeley's VOILA lab and teach Machine Structures (CS 61C) to 100+ students.",
  ],

  experienceHead: {
    headline: "Where models meet hardware.",
    subhead: "Two internships and a teaching role, all at Berkeley.",
  },
  experience: [
    {
      org: "Visionary Optical Imaging Lab (VOILA) @ Berkeley",
      short: "VOILA @ Berkeley",
      role: "Software Engineer Intern",
      dates: "Aug. 2026 – Present",
      place: "Berkeley, CA",
      summary: "I build real-time C++/Qt imaging software for a low-cost eye scanner that tracks myopia.",
      metrics: [
        { big: "0.16%", label: "frame loss, measured on hardware" },
        { big: "74%", label: "sharper axial images, on simulated test data" },
      ],
      bullets: [
        "Developed real-time C++/Qt imaging software for a UC Berkeley optometry lab's low-cost eye scanner, which measures eye length to track myopia progression",
        "Built a multithreaded acquisition and processing pipeline (camera, DAQ, 4 worker threads) that processes and displays frames live, with 0.16% frame loss measured on hardware",
        "Automated image calibration with a Nelder-Mead optimizer, producing 74% sharper axial images on simulated test data with no manual tuning",
      ],
      tags: ["C++", "Qt", "multithreading", "Nelder-Mead", "DAQ"],
    },
    {
      org: "TerraNova Bio",
      short: "TerraNova Bio",
      role: "Software Engineer Intern",
      dates: "May 2026 – Aug. 2026",
      place: "Berkeley, CA",
      summary: "I built a physics-based simulator and models that predict lab measurements from cheap sensors.",
      metrics: [
        { big: "R² 0.86–0.99", label: "on batches held out from training" },
        { big: "5 from 7", label: "expensive lab measurements predicted from cheap sensors" },
      ],
      bullets: [
        "Replaced a random-noise data generator with a physics-based Python simulator (SciPy, 9 coupled ODEs), unblocking ML development",
        "Built a feature pipeline and models predicting 5 expensive lab measurements from 7 cheap sensors (R² 0.86–0.99, scikit-learn), tested on batches held out from training",
        "Built a fault-injection framework across 4 failure types and a labeled 40-run benchmark, exposing a class of sensor faults the models couldn't detect",
        "Deployed the control loop to an ATmega328P with live model inference over serial, surfacing a latent bug that only reproduced with hardware attached",
      ],
      tags: ["Python", "SciPy", "scikit-learn", "ATmega328P"],
    },
    {
      org: "UC Berkeley EECS – CS 61C (Machine Structures)",
      short: "CS 61C at Berkeley",
      role: "Academic Intern (Teaching)",
      dates: "Aug. 2026 – Present",
      place: "Berkeley, CA",
      summary: "I teach C, RISC-V and machine structures to 100+ students.",
      metrics: [{ big: "100+", label: "students in discussion sections and office hours" }],
      bullets: [
        "Host biweekly discussion sections and office hours for 100+ students, teaching topics like C, RISC-V, assembly, datapath, memory, and parallelism",
      ],
      tags: ["C", "RISC-V", "assembly", "parallelism"],
    },
  ],

  projects: [
    {
      name: "Rewardsmith",
      subtitle: "Text-to-robot-skill training with LLM agents",
      headline: "One sentence. New skill.",
      oneLine: "Teaches a simulated robot dog new skills from one sentence: LLM agents write the reward functions, PPO trains them.",
      show: [0, 1],
      subhead: "LLM agents write the reward functions that teach a simulated robot dog to move.",
      theme: "dark",
      repo: "https://github.com/yih0nk/rewardsmith",
      visual: { type: "diagram", id: "rewardsmith", caption: "The agent loop. One round takes about 5 minutes." },
      metrics: [
        { big: "~5 min", label: "per training round, 4 rewards trained in parallel" },
        { big: "3", label: "reward hacks caught across 20 candidates" },
        { big: "3.0 → 5.0", label: "best score over 20 candidates" },
        { big: "16K → 64K", label: "token budget, 4×, to stop truncated replies" },
      ],
      bullets: [
        "Built a system (team of 4) that trains a simulated Unitree Go1 from one sentence in ~5 min per round: Claude writes 4 candidate reward functions, trained in parallel with PPO on an RTX 4090",
        "Engineered the self-improving agent loop, where an editor revises top rewards from every past critique and a vision critic scores rollout videos; over 20 candidates it caught 3 reward hacks as the best score rose 3.0 to 5.0",
        "Hardened the LLM pipeline against truncated replies by streaming structured-output calls with a 4× token budget (16K to 64K); built a benchmark runner with 12 tests scoring behaviors against success checks fixed before training",
      ],
      tags: ["Python", "JAX", "MuJoCo", "PPO", "Claude API", "FastAPI"],
    },
    {
      name: "Vault",
      subtitle: "Fault-tolerant payments backend on AWS",
      headline: "Zero double charges.",
      oneLine: "Five Go services on AWS that never double-charge or lose an order, even through crashes and outages.",
      show: [0, 1],
      subhead: "A payments backend that stays correct through crashes, reboots and outages.",
      theme: "light",
      repo: "https://github.com/jiachengliang-lang/vault",
      visual: {
        type: "image", src: "assets/vault-dashboard.png", srcset: "assets/vault-dashboard-800.png 800w, assets/vault-dashboard.png 1400w", alt: "Grafana dashboard for Vault's checkout gateway showing request rate, a 0.00% 5xx error rate, checkout p99 latency, and an intact audit chain.", caption: "The Grafana dashboard during a local load test." },
      metrics: [
        { big: "0", label: "double charges and 0 lost orders across 100,000+ checkouts" },
        { big: "400/s", label: "checkouts at 166 ms p99, 0 errors, one 2-vCPU host" },
        { big: "48.5% → 0", label: "error rate, traced to an undersized connection pool" },
        { big: "11 of 11", label: "unfinished checkouts recovered by the reconciler" },
      ],
      bullets: [
        "Designed a distributed system of 5 Go services with 0 double charges and 0 lost orders across 100,000+ checkouts through crashes, database reboots, and Kafka outages, via idempotency keys and a transactional outbox",
        "Deployed it to AWS as infrastructure as code (CDK) with a CI/CD pipeline that tests every pull request, smoke-tests each release, and automatically rolls back bad ones",
        "Load-tested on AWS and traced a 48.5% error rate to an undersized database connection pool; after the fix it served 400 checkouts/s at 166 ms p99 with 0 errors on a single 2-vCPU host",
        "Owned operations end to end: CloudWatch monitoring and alarms, an on-call runbook, and a scheduled reconciler that recovered all 11 checkouts left unfinished by failure testing",
        "Protected customer data with per-user encryption keys (AWS KMS, DynamoDB), account deletion that makes every copy unreadable, and a tamper-evident audit log of every read",
      ],
      tags: ["Go", "AWS", "CDK", "PostgreSQL", "DynamoDB", "Kafka", "KMS"],
    },
    {
      name: "Yellow Brawl",
      subtitle: "Real-time multiplayer fighting game",
      headline: "Frame-perfect. From scratch.",
      oneLine: "Real-time multiplayer fighting game in vanilla JavaScript, with its own WebSocket server and netcode.",
      show: [0, 2],
      subhead: "A real-time multiplayer fighting game in vanilla JavaScript.",
      theme: "dark",
      repo: "https://github.com/jiachengliang-lang/yellow-brawl",
      live: "https://yellow-brawl.onrender.com",
      visual: {
        type: "image", src: "assets/yellow-brawl.jpg", srcset: "assets/yellow-brawl-960.jpg 960w, assets/yellow-brawl.jpg 1600w",
        alt: "Yellow Brawl title screen with three cartoon fighters under a spotlight.",
        caption: "",
      },
      metrics: [
        { big: "60 Hz", label: "fixed simulation loop, separate from frame rate" },
        { big: "45", label: "moves defined as tunable data instead of code" },
        { big: "~6,300", label: "lines, no frameworks, no build step" },
        { big: "~40 s → ~15 s", label: "disconnect detection after a 3 s heartbeat" },
      ],
      bullets: [
        "Built a real-time 2D fighting game from scratch in vanilla JavaScript (~6,300 lines, no frameworks, no build step) with 3 fighters, 3 stages, and 4 modes (Arcade, Versus, Online, Training), deployed to production on Render",
        "Engineered a fixed 60 Hz simulation loop whose timestep accumulator keeps gameplay separate from frame rate, and a frame-data combat system (startup/active/recovery, hitstun, blockstun, hitstop, combo scaling) that defines 45 moves as tunable data instead of code",
        "Wrote a zero-dependency WebSocket server (RFC 6455) in Node.js with host-authoritative netcode: clients send only a button bitmask when it changes, and the host streams ~1 KB snapshots at 60 Hz; room codes, invite links, quick match and rematch",
        "Diagnosed players lingering in rooms after leaving: the hosting proxy kept dead connections open; added a 3 s server heartbeat that drops silent clients, cutting disconnect detection from ~40 s to ~15 s",
        "Added a CPU opponent with 3 difficulty levels that plays through the same button inputs as a human, procedurally animated fallback fighters (two-bone IK), all sound effects and per-stage music synthesized with the Web Audio API, and a bilingual English/Chinese UI",
      ],
      tags: ["JavaScript", "Node.js", "WebSockets", "HTML5 Canvas", "Web Audio"],
    },
  ],

  workHead: {
    headline: "Things I've built.",
    subhead: "Experience, projects, research, and what I do for fun.",
  },

  research: [
    {
      title: "VERA: a robotic face that listens and speaks",
      lab: "BAIR · Berkeley Speech Group · Prof. Gopala Anumanchipalli",
      card: { meta: "Berkeley AI Research (BAIR)", line: "I'm on the AI team, designing the policies that let it hold a spoken conversation with real facial motion." },
      status: "New project",
      link: "https://people.eecs.berkeley.edu/~gopala/",
      summary: "We're starting a project at Berkeley AI Research (BAIR) to build a robotic face that holds spoken conversations, with real facial motion as it listens and talks.",
      role: "I'm on the AI team, designing the policies that drive it. We build on NVIDIA's PersonaPlex and add our own improvements.",
      tags: ["Speech AI", "Policy design", "NVIDIA PersonaPlex", "Robotics"],
      art: "face",
      image: { light: "assets/vera-light.png", alt: "VERA, a robotic head, printed as a halftone: one large head and three small ones showing listen, speak and yield.", caption: "Listen · speak · yield" },
    },
    {
      title: "Integrated circuits for health sensing",
      lab: "Chien Lab · UC Berkeley",
      card: { meta: "Chien Lab · UC Berkeley", line: "Chips for wearable and implantable health sensors. I work on the hardware: chip etching, PCB design and CAD." },
      status: "Hardware",
      link: "https://chienlab-bioic.github.io/",
      summary: "The lab builds integrated circuits for point-of-care diagnostics and continuous health monitoring, from wearables to implantables.",
      role: "I work on the hardware side: chip etching, PCB design and CAD.",
      tags: ["Chip etching", "PCB design", "CAD"],
      art: "chip",
      image: { src: "assets/chienlab-chip.jpg", alt: "Micrograph of a biosensor chip with bonding pads, electrodes, ADC and filter blocks.", caption: "Biosensor chip micrograph", photo: true },
    },
  ],

  hobbies: [
    {
      title: "Go",
      meta: "Amateur 4-dan · 10 years",
      blurb: "I've played Go for ten years and hold an amateur 4-dan rank.",
      art: "go",
      photo: { src: "assets/hobby-go.jpg", alt: "A 13 by 13 Go board mid-game, black and white stones.", by: "Dietmar Rabich", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Go_(13%C3%9713)_--_2021_--_6741.jpg" },
    },
    {
      title: "Basketball",
      meta: "8 years playing · Warriors fan since 2015",
      blurb: "I played basketball for eight years. I've been a die-hard Warriors fan since my first game: the 2015 Finals, Game 5.",
      art: "hoop",
      photo: { src: "assets/hobby-hoop.jpg", alt: "Chase Center, the Golden State Warriors' home court, from the upper deck during a game, under the Golden State Warriors scoreboard.", by: "Américo Toledano", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:San_Francisco_-_Chase_Center_001.jpg" },
    },
    {
      title: "Running",
      meta: "3 half marathons · a full is next",
      blurb: "Four years of cross country in high school and three half marathons. I'm working toward my first full marathon.",
      art: "run",
      photo: { src: "assets/hobby-run.jpg", alt: "Lanes of a covered running track under timber arches.", by: "Petewarrior", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Brillia_Running_Stadium_track.jpg" },
    },
    {
      title: "Lifeguarding",
      meta: "Certified lifeguard",
      blurb: "Certified in Bronze Cross, Bronze Medallion and National Lifeguard.",
      art: "swim",
      photo: { src: "assets/hobby-swim.jpg", alt: "The indoor pool hall of a community centre, with lap lanes and a teaching pool.", by: "Canmenwalker", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Aaniin_Community_Centre_Swimming_Pool_2025.jpg" },
    },
  ],

  // Small labels above each section headline; the page reads like a forward pass.
  layers: {
    about: ["About", "input layer"],
    experience: ["Experience", "hidden layer 1"],
    work: ["Work", "hidden layers"],
    code: "Commit log",
    lab: ["Train", "backpropagation"],
    skills: "Weights",
    ask: ["Ask", "inference"],
    contact: ["Contact", "output"],
  },

  codeHead: {
    headline: "Shipped in public.",
    subhead: "Live from GitHub: the code behind the projects above.",
  },
  github: {
    user: "jiachengliang-lang",
  },

  labHead: {
    headline: "Train one yourself.",
    subhead: "Add points and watch a small neural network learn to separate them, live in your browser.",
  },

  skillsHead: {
    headline: "The toolkit.",
    subhead: "What I reach for, from models to metal.",
  },
  skills: [
    { group: "Languages", items: ["Python", "Go", "C++", "Java", "C", "JavaScript (Node.js)", "TypeScript", "SQL"] },
    { group: "Cloud and tools", items: ["AWS (ECS, EC2, RDS, KMS, CDK)", "Docker", "GitHub Actions (CI/CD)", "Git", "Linux", "Grafana"] },
    { group: "Frameworks and data", items: ["FastAPI", "Qt", "PostgreSQL", "DynamoDB", "Kafka", "SQLite"] },
    { group: "Machine learning", items: ["JAX", "scikit-learn", "MuJoCo", "PPO", "SciPy", "Claude API"] },
    { group: "Coursework", items: ["Data Structures & Algorithms", "Machine Structures", "Software Engineering"] },
    { group: "Spoken languages", items: ["English (bilingual)", "Mandarin Chinese (bilingual)"] },
  ],

  chatHead: {
    headline: "Ask about my work.",
    subhead: "Answers come only from what's on this page.",
  },
  chatSuggestions: [
    "What ML work has he done?",
    "Tell me about Rewardsmith",
    "How did Vault avoid double charges?",
    "What is he doing right now?",
  ],

  contactHead: {
    headline: "Let's talk.",
    subhead: "Working on ML, robotics or systems? Email is the fastest way to reach me.",
  },
};
