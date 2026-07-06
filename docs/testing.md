# Testing

Three layers, cheapest to most expensive. Run them in order when you're
about to ship anything meaningful.

## 1. Unit tests — `npm test` (~1 sec)

Vitest, lives alongside the code as `*.test.ts`. Only pure functions
right now (prose sanitiser, whitelist resolver). Fast, deterministic,
catches regressions in the AI-quality logic that most affects output.

Add a test whenever you touch:
- `src/lib/prose-style.ts`
- `src/lib/whitelist.ts`
- Anywhere else with pure, testable functions

```bash
npm test           # one-shot
npm run test:watch # for TDD
```

## 2. E2E smoke test — `npm run e2e` (~30 sec)

Playwright headless Chromium. Walks the CV Generator happy path:
form edits → preview reactivity → page break UI → PDF/DOCX downloads.
This is the layer that catches "the app looks like it works, but a
user action doesn't have the effect the user expects" — the class of
bug that's slipped through most.

```bash
npm run e2e          # headless, fast
npm run e2e:headed   # opens Chromium so you can watch it work
```

**How auth is handled**: the test process sets `TEST_AUTH_BYPASS=1`,
which the middleware honours **only when `NODE_ENV !== "production"`**.
That guard is deliberate — you literally cannot turn auth off in prod,
even if you try.

Add a test whenever a bug you shipped would have been caught by a
browser walking a specific flow. If someone else finds the bug first,
that's a test you owed the app.

## 3. Manual QA checklist — `docs/qa-checklist.md` (~10 min)

Structured browser walkthrough. Run before every meaningful merge.
Catches what the automated tests don't think to check (bad copy,
misaligned styling, missed edge cases).

Amend the checklist when a real regression makes it through. If it
happened once it'll happen again — capture it.

## When something fails

- **Unit test failure**: fix the code, or fix the test if the intent
  genuinely changed. Never `test.skip()`.
- **E2E test failure**: reproduce it in `npm run e2e:headed` so you
  can watch. Update selectors only if the UI *intentionally* changed.
- **QA checklist failure**: don't ship. Fix the finding.

## What we deliberately DON'T do

- Snapshot tests of React components (brittle, low signal)
- Visual regression (expensive, only pays off with a stable design system)
- 100% code coverage (metric goal — leads to bad tests)
- E2E tests for every page (diminishing returns until real usage patterns)

If we hit real regressions in areas not covered, add coverage there.
Don't pre-emptively test things nobody's broken yet.
