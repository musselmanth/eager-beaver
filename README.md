# Eager Beaver

Election-night results watch for Albany County, Wyoming: a countdown to the polls
closing, a beaver who checks the Albany County Clerk's site every 2 minutes, and a
race-by-race board once the results are posted.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- `?demo=sample` shows the 2024 general election report right away.
- `?at=2026-11-03T19:59:45-07:00` pretends the page was opened at that time
  (handy for watching the 8:00 PM wake-up and the first checks).

## Build

```bash
npm run build
```

This makes a static site in `out/` that can be hosted anywhere.

## Results proxy

The county site doesn't allow cross-site requests, so a small Cloudflare Worker in
`workers/results-proxy/` fetches the clerk's page and report PDFs for everyone, at
most once every 2 minutes. Deploy it from that folder:

```bash
npm install && npx wrangler login && npx wrangler deploy
```

Then put its `*.workers.dev` URL in `PROXY_URL` at the top of `src/app/page.js`.
