# QA product map — Stream Overlays

The QA *lens* on the product: what's testable, how to run it, what must stay true. Read this first so a
run acts like it already knows the product; update it last. It deliberately does **not** restate the
product — those live in the repo docs and this links to them:

- **What it is / who it's for / vocabulary** → [`docs/product/`](../docs/product/README.md)
- **Architecture, layers, the overlay contract + calling conventions** → [`docs/technical/architecture.md`](../docs/technical/architecture.md) and [ADR 0005](../docs/decisions/0005-overlay-module-contract.md)
- **Migration tiers & remaining work** → [`docs/tickets/tickets.md`](../docs/tickets/tickets.md) (SO-0001)

## Surfaces (the testability lens)

| Surface | Where | Un-mockable? |
| --- | --- | --- |
| Manifest (`catalogue.json`) | `overlays/sim-racing/catalogue.json` | No — pure JSON, unit-tested |
| Pure calibration maths | `engine/calibration-math.js` | No — unit-tested in node |
| Overlay modules (canvas draw) | `overlays/sim-racing/overlays/*.js` | **Yes — real canvas pixels** |
| Live overlay page | `pages/overlay.html?style=<id>` | **Yes — needs a real wheel + OBS** |
| Demo driver (animated preview state) | `engine/demo-lap.js` + `engine/demo-driver.js` | No — pure, node-testable; reproduces `qa/fixture.json` |
| Gallery page | `pages/gallery.html` | **Yes — 68 live canvases in a real browser** |
| Configure / landing | *not built yet* (SO-0003/9/10) | Yes, when they exist |

## How to run

```sh
# Layer 1 — unit (the CI gate)
node --test tests/*.test.mjs        # calibration maths + blank-tile guard (mock canvas)
python -m pytest tests/ -q          # manifest schema/invariants + module↔manifest coherence

# Layer 2 — deterministic acceptance (real headless Chromium)
node qa/acceptance.mjs              # render each migrated overlay; assert non-blank AND pixel-faithful
node qa/acceptance.mjs --keep       # + PNGs and .diff.png in qa/renders/
node qa/acceptance.mjs --open       # headed + slowed, for eyeballing
#   Skips cleanly (exit 0) if Playwright/chromium absent. Enable: npm i && npx playwright install chromium

# Regenerate the golden baseline FROM THE PROTOTYPE (path is a runtime arg, never committed):
node qa/capture-golden.mjs <path-to-prototype-catalogue.html>   # writes qa/golden/*.png + qa/fixture.json

# Layer 3 — agentic browser pass (Claude for Chrome)
npm run serve                       # static server on overlays/sim-racing
#   open pages/overlay.html?style=bowtie ; drive per the checklist below
```

## Regression checklist

Run the layers a change touches; these must stay true.

- [ ] `node --test` green — maths + every migrated overlay paints (mock) + **the demo driver reproduces `qa/fixture.json` exactly** (`tests/demo-driver.test.mjs`).
- [ ] `pytest` green — manifest valid; `set` agrees with `uses`; no orphan modules.
- [ ] `node qa/acceptance.mjs` green — every migrated overlay paints in **real** Chromium **and** is pixel-faithful to its prototype golden (any new overlay whose helper is mis-ported fails here).
- [ ] `overlay.html?style=bowtie` served over **http** (never `file://`).
- [ ] Overlay page background stays **transparent** (OBS composites over it).
- [ ] A bad `?style=` shows an honest "unknown overlay", not a silent default.
- [ ] Adding an overlay = module + manifest entry, and both test layers still pass.
- [ ] `pages/gallery.html` (over http) — all 68 non-excluded tiles paint and animate; set/stage filters, search, and pause/speed/shift controls work; `excluded` overlays are absent; each "Open in OBS →" points at `overlay.html?style=<id>`.

## Gotchas (QA-side)

- **http required** everywhere — `file://` blocks `fetch` + ES modules (and the Gamepad API needs a secure context). See [ADR 0002](../docs/decisions/0002-static-first-hosting.md).
- **Fonts** (Oxanium, IBM Plex Mono) load from Google Fonts; the harness `await document.fonts.ready` before drawing, and polls `painted>0` because the first navigation can race first-paint.
- **Telemetry/shifter overlays render but can't run *live*** yet (no rpm/gear source — SO-0006/0007). Not a bug.
- The 4 `excluded` overlays are archived-in-manifest, intentionally module-less — expect no module for them.
- **Canvas text has subpixel rendering variance** across page contexts, so glyph-dense overlays (e.g. `terminal`) diff ~0.5% while looking identical. Tolerance is 0.6% with an AA-aware pixelmatch threshold; a real mis-port is a wrong shape at many percent. Don't tighten to chase glyph noise; do investigate any diff whose `.diff.png` shows a *structural* change (missing element, wrong position/colour), not edge scatter.
- **Golden faithfulness needs the fixture + goldens to agree.** `qa/render.html` and the goldens both read `qa/fixture.json`; if you re-capture goldens, the fixture is rewritten in lockstep.
- **The demo driver is pinned to the fixture too.** `engine/demo-driver.js` is a byte-faithful port of the prototype's `catalogue.html` `tick()`; `tests/demo-driver.test.mjs` drives it with the capture's exact schedule (DT 1/60, 480 steps) and asserts it reproduces `qa/fixture.json`. So a re-baseline touches three things in lockstep: goldens, fixture, and this test. The gallery shares **one** driver + clock across all tiles (as the prototype did) — a tile that reads stale state is a per-module bug, not a driver bug.
- **State is two objects, like the reference:** `s` (input — pedals/steering/gear/shift) and a separate `tel` (rpm/spd). `s` has **no** rpm/spd. Telemetry bodies (signature `(w,h,s,t)`) get `t = tel` via the module wrapper. An overlay that reads `s.rpm` gets `undefined` — that's a real reference bug (`split-panel`), faithfully preserved; fixing it is SO-0007. If a golden-diff shows a *structural* change on a telemetry overlay, suspect the s/tel split first.

## QA roadmap (this system is self-improving)

- **Done: faithfulness golden-diff, full coverage.** All 72 goldens captured from the prototype and
  committed (`qa/golden/`), `qa/fixture.json` is the frozen state, `qa/acceptance.mjs` pixel-diffs each
  overlay against its golden. **68/68 non-excluded overlays pixel-faithful.** The baseline is frozen —
  the prototype can be deleted without losing it. Re-capture only to intentionally re-baseline
  (`qa/capture-golden.mjs <prototype-path>`).
- Layer 3 fresh-eyes persona pass at the first hosted-site milestone (expensive; milestones only).
