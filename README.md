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
- `?reported=7` pretends 7 of the 11 vote centers have reported.

## Try it

Live at https://albanyballotbeaver.com. Times are Mountain Time; the clock keeps
running from the `?at=` time. From 8:00 PM on, the page checks the real county
site, so only the demo shows actual results.

- [Demo with the 2024 report](https://albanyballotbeaver.com/?demo=sample)
- [Early voting, before Election Day](https://albanyballotbeaver.com/?at=2026-11-02T12:00:00-07:00)
- [Election Day, polls close countdown](https://albanyballotbeaver.com/?at=2026-11-03T12:00:00-07:00)
- [10 seconds before polls close](https://albanyballotbeaver.com/?at=2026-11-03T18:59:50-07:00)
- [Polls closed, countdown to the first check](https://albanyballotbeaver.com/?at=2026-11-03T19:30:00-07:00)
- [15 seconds before the 8:00 PM wake-up](https://albanyballotbeaver.com/?at=2026-11-03T19:59:45-07:00)
- [After the first check, still waiting](https://albanyballotbeaver.com/?at=2026-11-03T20:05:00-07:00)
- [Still waiting, 7 of 11 vote centers reported](https://albanyballotbeaver.com/?at=2026-11-03T20:05:00-07:00&reported=7)
  (`?reported=` fakes the count, since the clerk's table isn't reset until election night)

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
