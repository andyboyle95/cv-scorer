# Red Letter: brand notes

Built with the Impeccable design rules (github.com/pbakaus/impeccable): product UI is precise and quiet; personality lives in a few chosen moments.

## Name

**Red Letter** (recommended). Three meanings that all fit:
- Medieval scribes wrote the first letter of a passage in red ink, the *rubric*. A cathedral school, an English department and a marking tool all share that history.
- Teachers mark in red.
- A "red-letter day" is a day worth celebrating: results day.

Other options considered:
| Name | Idea | Why not first choice |
|---|---|---|
| Marginalia | Notes in the margins of manuscripts; what teachers write | Long; harder to say aloud |
| Gargoyle | The cathedral's watcher, keeps an eye on every script | Fun mascot, but reads as grotesque for a student-facing sheet |
| Spire | Aspiration; points upward | Generic; used by many products |

The name lives in `src/lib/brand.ts` and the URL folder in `BASE_PATH`, so changing it is a two-line edit.

## Visual system
- **Wordmark:** the "R" is a rubricated blackletter initial (UnifrakturMaguntia) in rubric red; the rest is Schibsted Grotesk extra-bold. The blackletter is used only for the initial and for big numerals, never for text.
- **Type:** Schibsted Grotesk for everything (a sturdy newspaper grotesque; not on Impeccable's over-used list). Tabular figures for marks.
- **Colour (OKLCH):** "restrained" strategy. Near-white paper with a trace of the red hue; ink is a warm near-black; one accent, rubric red `oklch(0.53 0.19 29)`. Status colours: green on target, amber 1 grade below, red 2+ below (the red pen marks what needs attention). Dark mode follows the system.
- **Layout:** tables and rules, not card grids. No gradients, glows, side-stripe borders or icon tiles.

## Voice
Plain, direct, British. Verb + object buttons ("Upload scans", "Build tutor pack"). Errors say what happened and how to fix it. No jokes in errors.

## Delight
One moment: after marking, the overview says how many hours of marking were handed back to the department. Specific to this product, true, and pleasant on the hundredth use.
