# jiacheng.liang

Personal site. Plain HTML, CSS and JavaScript modules: no framework, no build step.

```
index.html          page skeleton
css/style.css       all styles; color tokens at the top
js/content.js       every piece of text on the site (edit this to update content)
js/main.js          renders content into full-width sections, nav, scroll fade-ins, Rewardsmith diagram
js/net.js           hero neural-network animation (canvas)
js/ambient.js       animated section backgrounds: k-means, loss-surface optimizers, convolution,
                    gradient field, attention (each a small live simulation on a sticky canvas)
js/train.js         "Train one yourself" lab: a 2-12-12-1 network trained live with Adam
js/lab.js           opens the lab as a hidden overlay: hero network click, T key, nav loss readout, #train
js/github.js        "Shipped in public": live repo stats and weekly commit chart from GitHub's public API
js/chat.js          "Ask about me" chat (live via the Worker, or offline keyword search)
assets/             project, research and hobby images
worker/             Cloudflare Worker that answers chat questions with Claude
```

Live at https://jiachengliang.pages.dev (Cloudflare Pages) and https://jiachengliang-lang.github.io (GitHub Pages). Both update on every push to `main`.

## Run locally

```bash
python3 serve.py
```

It serves this folder at http://localhost:4321 and turns off browser caching, so edits show up on a normal reload.

Then open http://localhost:4321.

## Deploy the site (GitHub Pages)

1. Create a repo named `jiachengliang-lang.github.io` and push this folder to `main`.
2. In the repo's Settings → Pages, set the source to "Deploy from a branch", `main`, `/ (root)`.
3. The site goes live at https://jiachengliang-lang.github.io a minute later.

## Turn on live chat answers

The chat works without a backend: it searches `js/content.js` for the best-matching section. To answer with Claude
instead, deploy the Worker (see `worker/README.md`) and put its URL in `chatEndpoint` in `js/content.js`.

## Image credits

The hobby photos are openly licensed images from Wikimedia Commons, cropped and lightly color-graded:

- Go board: [Dietmar Rabich](https://commons.wikimedia.org/wiki/File:Go_(13%C3%9713)_--_2021_--_6741.jpg), CC BY-SA 4.0. The cropped version (`assets/hobby-go.jpg`) is shared under the same license.
- Chase Center, home of the Golden State Warriors: [Américo Toledano](https://commons.wikimedia.org/wiki/File:San_Francisco_-_Chase_Center_001.jpg), CC BY-SA 4.0. The cropped version (`assets/hobby-hoop.jpg`) is shared under the same license.
- Running track: [Petewarrior](https://commons.wikimedia.org/wiki/File:Brillia_Running_Stadium_track.jpg), CC BY 4.0.
- Community centre pool: [Canmenwalker](https://commons.wikimedia.org/wiki/File:Aaniin_Community_Centre_Swimming_Pool_2025.jpg), CC BY 4.0.

The biosensor chip micrograph is cropped from a figure on the [Chien Lab website](https://chienlab-bioic.github.io/).
