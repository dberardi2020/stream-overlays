# Vendored QA fonts

The golden renders are pixel-diffed, so the fonts they draw with have to be **the
same everywhere, always**. These files make that true.

## Why they're here rather than fetched

`qa/render.html` used to pull IBM Plex Mono and Oxanium from Google Fonts. Two
problems, one of which was silently corrupting every golden:

1. **`await document.fonts.ready` did nothing.** Nothing on the page had requested
   either family at that point, so there were zero pending loads and it resolved
   immediately — then canvas painted with the OS fallback. Measured at draw time:
   `document.fonts.check("600 16px 'IBM Plex Mono'")` was `false`, and text through
   the declared stack measured identically to the pure fallback (52.78px vs
   57.60px once actually loaded — **9.1% narrower**). So each golden encoded
   whichever mono the *capturing machine* fell back to: Menlo on macOS, Consolas
   on Windows. `terminal`, the glyph-densest overlay, failed at 1.47% against a
   0.6% tolerance when the two machines swapped, with bar geometry shifting ~13px
   because it is derived from measured text width.

2. **It made QA need the network.** Offline or in CI, the fetch fails and the
   render silently falls back again — the same bug, harder to notice.

Vendoring fixes both, and `render.html` now *fails* rather than drawing if a face
isn't loaded. A golden can no longer be captured with the wrong font.

Tracked as SO-0034.

## What these are

Latin subsets only — the QA fixture text is ASCII, so the cyrillic/greek/vietnamese
subsets Google serves are dead weight.

| File | Family | Weight |
|---|---|---|
| `IBMPlexMono-400.woff2` | IBM Plex Mono | 400 |
| `IBMPlexMono-500.woff2` | IBM Plex Mono | 500 |
| `IBMPlexMono-600.woff2` | IBM Plex Mono | 600 |
| `Oxanium-400.woff2` | Oxanium | 400 |
| `Oxanium-600.woff2` | Oxanium | 600 |
| `Oxanium-800.woff2` | Oxanium | 800 |

~85 KB total. Fetched from Google Fonts (`fonts.gstatic.com`) 2026-07-27.

## Licence

Both are licensed under the **SIL Open Font License 1.1**, which permits
redistribution and bundling:

- **IBM Plex Mono** — © IBM Corp. <https://github.com/IBM/plex>
- **Oxanium** — © The Oxanium Project Authors.
  <https://github.com/sevmeyer/oxanium>

Full licence text: <https://openfontlicense.org/>

## Updating them

Only if the site's fonts change — and if they do, **every golden must be
recaptured in the same commit**, because a font change moves the pixels. Re-fetch
the latin subsets, drop them here, update `fonts.css`, then run
`node qa/capture-golden.mjs`.
