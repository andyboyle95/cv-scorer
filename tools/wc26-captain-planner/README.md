# World Cup 2026 — Captain Planner

A hidden, single-page static tool (HTML/CSS/vanilla JS, no framework, no
backend) for the FIFA World Cup 2026 Fantasy (Aramco) game. In that game a
captain's points lock the moment their match kicks off, and you can move the
armband mid-round — so the winning move is to **captain the player who plays
soonest, and if they blank, shift the armband to a team whose match hasn't
started yet.** This tool makes that chronological order obvious.

Not affiliated with FIFA or EA.

## Where it lives
It's served by the CV-scoring Next.js app as a hidden, unlinked page:

```
/tools/wc26-d25bb010b528
```

The served file is the inlined single-file build at
`public/tools/wc26-d25bb010b528.html` (a `rewrite` in `next.config.ts` maps the
clean path to it). It isn't linked from any nav and is `noindex`.

## Files
| File | Purpose |
|------|---------|
| `index.html` | Markup / shell |
| `styles.css` | Dark, responsive theme |
| `app.js` | All logic (picker, matchday derivation, timeline, captain order) |
| `fixtures.json` | Group-stage data (generated) |
| `build-fixtures.js` | Source schedule → `fixtures.json` (computes UTC kickoffs) |
| `validate.js` | Checks 12 groups × 4, 72 matches, valid UTC, name consistency |
| `build.js` | Validates + inlines everything into one distributable HTML |
| `dist/worldcup-captain-planner.html` | Portable single-file build (git-ignored) |

## Run locally
Open `index.html` over http (not `file://`, so `fetch` works):
```bash
cd tools/wc26-captain-planner
python3 -m http.server 8000   # then open http://localhost:8000/
```
Or just open the built single file `dist/worldcup-captain-planner.html` directly
(it has fixtures inlined, so it works offline and from `file://`).

## Build / validate
```bash
node build-fixtures.js   # regenerate fixtures.json from the source table
node validate.js         # structural integrity checks
node build.js            # validate + inline -> dist/ and public/tools/...html
```

## Features
- **Team picker** grouped A–L, persisted to `localStorage`. Plus a "paste your
  team" box (auto-import from a FIFA Fantasy URL/screenshot isn't possible in a
  pure offline static app — CORS + no OCR — so manual pick/paste is provided).
- **Round filter** (All / MD1 / MD2 / MD3). Matchday is derived in code: a
  team's Nth chronological match = MD N; a fixture's MD = max of its two teams'
  counts. Defaults to the current/next round based on today's date.
- **Fixtures timeline** for your teams, in kick-off order, grouped by your local
  day, times in your own time zone (`toLocaleString`). Next not-yet-started match
  is flagged **"Captain next"**; kicked-off matches are greyed.
- **Captain order panel** — your teams soonest-first for the selected round.
- **Hide already kicked-off matches** toggle.
- Shows your detected local time zone.
- Uses the real current time to split played vs upcoming. Works offline once
  loaded; mobile-friendly; dark theme.

## Updating fixtures (and adding knockouts later)
All kick-offs are stored as venue **local time + UTC offset** in
`build-fixtures.js` and converted to UTC there, so the maths is auditable across
ET/CT/MT/PT and Mexico.

1. Edit `GROUPS` / `SOURCE` in `build-fixtures.js` (e.g. correct a time, or add
   rows).
2. `node build-fixtures.js && node validate.js && node build.js`.

To add **knockout rounds** later, the simplest path is to append those matches
to the `SOURCE` table with a non-group tag (e.g. group `"R16"`, `"QF"`, …) and
relax `validate.js`'s "12 groups / 72 matches / 3-per-team" assertions (which
are group-stage-specific). The app's timeline/captain logic is matchday-driven
for the group stage; for knockouts you'd display them as their own rounds.

Always sanity-check kick-off times against an official source before relying on
them for a captaincy decision.
