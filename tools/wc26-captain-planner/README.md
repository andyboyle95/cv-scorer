# World Cup 2026 — Captain Planner

A hidden, single-page tool (HTML/CSS/vanilla JS) for the FIFA World Cup 2026
Fantasy (Aramco) game. A captain's points lock the moment their match kicks
off, and you can move the armband mid-round — so the winning move is to
**captain the player who plays soonest, and if they blank, shift the armband to
a team whose match hasn't started yet.** This tool makes that order obvious.

It is served by (and depends on) the CV-scoring Next.js app — it is **not** a
fully offline file: fixtures are fetched live and team import uses a backend
endpoint. Not affiliated with FIFA or EA.

## Where it lives
Hidden, unlinked, `noindex` path on the app:

```
/tools/wc26-d25bb010b528
```

Served assets (in `public/tools/`):
- `wc26-d25bb010b528.html` — the page (CSS + JS inlined)
- `wc26-d25bb010b528.fixtures.json` — fixtures, fetched at runtime
- backend: `POST /api/wc26-import` — resolves a pasted team / link to countries

A `rewrite` in `next.config.ts` maps the clean path to the `.html` file.

## Files
| File | Purpose |
|------|---------|
| `index.html` | Markup / shell |
| `styles.css` | Dark, responsive theme |
| `app.js` | Logic (picker, matchday derivation, timeline, captain order, import) |
| `fixtures.json` | Group-stage data (generated) |
| `build-fixtures.js` | Source schedule → `fixtures.json` (computes UTC kickoffs) |
| `validate.js` | Checks 12 groups × 4, 72 matches, valid UTC, name consistency |
| `build.js` | Validates + builds the served `.html` + live `.fixtures.json` |

The team-import API lives in the app at `src/app/api/wc26-import/route.ts`.

## Run locally
Serve over http (so `fetch` works) and run it inside the Next app so the import
API and live fixtures resolve:
```bash
npm run dev            # from the repo root → http://localhost:3000/tools/wc26-d25bb010b528
```
The raw tool files can also be served standalone (`python3 -m http.server` in
this folder), but the import endpoint only works when running under the app.

## Build / validate
```bash
node build-fixtures.js   # regenerate fixtures.json from the source table
node validate.js         # structural integrity checks
node build.js            # validate + emit public/tools/wc26-d25bb010b528.{html,fixtures.json}
```

## Features
- **Team picker** grouped A–L, persisted to `localStorage`.
- **Import my team** — paste your countries (or a public link). The backend
  matches names with aliases (e.g. USA, Türkiye, Czechia, Cabo Verde). Note: the
  official FIFA Fantasy team loads privately in your browser (SPA + login), so
  there's no reliable way to auto-fetch your exact squad — pasting your
  countries is the dependable route.
- **Round filter** (All / MD1 / MD2 / MD3). Matchday is derived in code: a
  team's Nth chronological match = MD N; a fixture's MD = max of its two teams'
  counts. Defaults to the current/next round by today's date.
- **Fixtures timeline** for your teams, in kick-off order, grouped by your local
  day, times in your own zone (`toLocaleString`). Next not-yet-started match is
  flagged **"Captain next"**; kicked-off matches are greyed.
- **Captain order panel** — your teams soonest-first for the selected round.
- **Hide already kicked-off matches** toggle.
- Shows your detected local time zone; uses real current time for played vs
  upcoming. Mobile-friendly dark theme.

## Updating fixtures (and adding knockouts later)
Kick-offs are stored as venue **local time + UTC offset** in `build-fixtures.js`
and converted to UTC there, so the maths is auditable across ET/CT/MT/PT and
Mexico.

1. Edit `GROUPS` / `SOURCE` in `build-fixtures.js`.
2. `node build-fixtures.js && node validate.js && node build.js`.

To add **knockout rounds** later, append those matches to `SOURCE` with a
non-group tag (e.g. `"R16"`) and relax `validate.js`'s group-stage assertions.

Always sanity-check kick-off times against an official source before relying on
them for a captaincy decision.
