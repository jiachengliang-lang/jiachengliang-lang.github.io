# ask-jiacheng Worker

Answers questions from the site's chat box. It builds its system prompt from `../js/content.js`, so it only knows
what the site says, and calls the Claude API (`claude-opus-5-5`, low effort, server-side refusal fallback enabled).

Protections: only origins in `ALLOWED_ORIGINS` may call it, at most 20 requests per IP per 10 minutes (per Worker
instance), 500 characters per question, last 10 messages kept.

## Deploy

You need a free Cloudflare account and an Anthropic API key. In the Anthropic Console, put the key in its own
workspace with a monthly spend limit so a burst of traffic can't run up a bill.

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

`deploy` prints a URL like `https://ask-jiacheng.<subdomain>.workers.dev`. Put it in `chatEndpoint` in
`../js/content.js`, then push the site.

If the site moves to another domain, add it to `ALLOWED_ORIGINS` in `wrangler.toml` and deploy again.

## Local testing

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars
npx wrangler dev --port 8787
```

Then set `chatEndpoint` to `http://localhost:8787` while serving the site on port 4321.

## Cost

Each question sends the profile (a few thousand tokens) plus the conversation. To cut cost, change `MODEL` in
`src/index.js` to `claude-haiku-5-5` (roughly 40× cheaper per token) and remove the `betas` and `fallbacks` lines,
which Haiku doesn't support.
