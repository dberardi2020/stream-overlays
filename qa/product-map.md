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
| Pure calibration + gear maths | `engine/calibration-math.js` | No — unit-tested in node |
| Live input reader (calibration read side + gear/shifter) | `engine/live-input.js` + `engine/gamepad.js` | **Mixed** — mapping + shift bookkeeping unit-tested in node; `poll()` + real buttons need a wheel |
| Overlay modules (canvas draw) | `overlays/sim-racing/overlays/*.js` | **Yes — real canvas pixels** |
| Live overlay page | `pages/overlay.html?style=<id>` | **Yes — needs a real wheel + OBS** |
| Demo driver (animated preview state) | `engine/demo-lap.js` + `engine/demo-driver.js` | No — pure, node-testable; reproduces `qa/fixture.json` |
| Gallery page | `pages/gallery.html` | **Yes — 69 live canvases in a real browser** |
| Admin page (curate + export catalogue.json) | `pages/admin.html` | **Yes — edit/persist/export in a real browser** |
| Landing page | `index.html` | **Yes — hero teaser animates in a real browser** |
| Setup / calibration | `pages/setup.html` | **Yes — needs a real wheel** |
| Debug inspector | `pages/debug.html` (localhost only) | **Yes — raw axes/buttons from a real wheel** |

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

# Regenerate the golden baseline FROM THE PROTOTYPE (path is a runtime arg, never committed).
# CAUTION: this rewrites ALL goldens + the fixture. 29 overlays deliberately no longer match the
# prototype (SO-0038 moved their baked backing to the plate), so a blanket recapture would
# reintroduce a baseline the product intends to differ from. Re-baseline those from the modules:
#   node qa/acceptance.mjs --keep   then copy qa/renders/<id>.png -> qa/golden/<id>.png
node qa/capture-golden.mjs <path-to-prototype-catalogue.html>   # writes qa/golden/*.png + qa/fixture.json

# Layer 3 — agentic browser pass (Claude for Chrome)
npm run serve                       # static server on overlays/sim-racing
#   open pages/overlay.html?style=bowtie ; drive per the checklist below
```

## Regression checklist

Run the layers a change touches; these must stay true.

- [ ] `node --test` green — maths + every migrated overlay paints (mock) + **the demo driver reproduces `qa/fixture.json` exactly** (`tests/demo-driver.test.mjs`) + **the live-input contract** (pedals keyed exactly as `calibration.js` persists them — `tests/live-input.test.mjs`) + **the gear/shifter layer** (button reads, gear maths, and `readGear`/`applyGear` bookkeeping that mirrors the demo driver — `tests/gear-input.test.mjs`).
- [ ] `pytest` green — manifest valid; `set` agrees with `uses`; no orphan modules.
- [ ] `node qa/acceptance.mjs` green — every overlay paints in **real** Chromium **and** matches its golden. Two provenances: **40** goldens come from the prototype (a mis-ported helper fails here), **29** were re-baselined from the modules after SO-0038 moved their baked backing to the plate — those catch unintended change but cannot prove the original port was right.
- [ ] `overlay.html?style=bowtie` served over **http** (never `file://`).
- [ ] Overlay page background stays **transparent** (OBS composites over it).
- [ ] A bad `?style=` shows an honest "unknown overlay", not a silent default.
- [ ] Adding an overlay = module + manifest entry, and both test layers still pass.
- [ ] `pages/gallery.html` (over http) — all 69 non-excluded tiles paint and animate; set/stage filters, search, and pause/speed/shift controls work; `excluded` overlays are absent; each "Open in OBS →" points at `overlay.html?style=<id>`.
- [ ] `pages/admin.html` (over http) — all **73** entries show (incl. the 4 module-less as "no module"); editing stage/hidden/note marks the card dirty and bumps the count; edits persist across reload (localStorage); **Export** downloads valid `catalogue.json` (2-space, entries in original order) with edits applied; **Revert all** returns to the committed state. It reads `catalogue.json` and never writes it — the export→commit loop is the only way a change reaches the repo.
- [ ] **Gallery visual pass (a real browser, human or agentic eye — not just "did it paint")** — the deterministic layers prove pixels exist; they do **not** judge layout or chrome. Screenshot the gallery at a **narrow** width (~760px) and a **wide** one, and check: the grid is multi-column (cards aren't full-width with a small overlay marooned in them); control buttons are cohesive with a clear active state; **capitalization is consistent** (Title-Case filter labels, capitalized placeholder). The **Plate** box (its own panel, below the filter bar) sets the background an overlay paints *itself* and exports: presets are **As Designed / None / Black / Dark / Light / White**, where As Designed is the default and means each overlay uses its catalogue plate. Changing it must move **both** the preview pixels and the copied OBS link — a change that moves only one is the exact bug SO-0003 existed to kill. Each card's `▾` names its own source (As Designed / Global / Custom); Radius hides rather than greys when there is no plate to round. Skipping this is how button/caps/layout regressions ship green — it's a required layer for any UI page, not optional polish.

## Gotchas (QA-side)

- **http required** everywhere — `file://` blocks `fetch` + ES modules (and the Gamepad API needs a secure context). See [ADR 0002](../docs/decisions/0002-static-first-hosting.md).
- **Fonts** (Oxanium, IBM Plex Mono) load from Google Fonts; the harness `await document.fonts.ready` before drawing, and polls `painted>0` because the first navigation can race first-paint.
- **Telemetry overlays render but can't run *live*** yet (no rpm/spd source — SO-0007). Not a bug.
- **The shifter live path is hardware-verified (SO-0006).** Once an H-shifter or paddles is calibrated on the setup page, `live-input.js` reads the gear buttons each frame and reproduces the demo driver's shift bookkeeping. Confirmed on a real G923 + Driving Force Shifter (R,1–6 → buttons 11–17; paddles 4/5). **The H-pattern crosses neutral on every change** — a real shift is 2 → N → 3, not 2 → 3 — which is why a shift counts only as a transition between two *engaged* gears, and why the demo lap crosses neutral too. Still un-verified: the same loop inside **OBS's own browser** (separate storage, needs its own calibration) and a real **sequential lever** (SO-0030).
- **The calibration read/write contract is keyed by the LONG channel names** (`throttle`/`brake`/`clutch`/`steering`) — what `calibration.js` persists; `live-input.js` reads the same keys. `tests/live-input.test.mjs` loads a calibration-shaped map so the two can't drift. They did once: pedals were read under `thr`/`brk`/`clu`, so a real calibration never satisfied Live and it rested silently — invisible headless (no gamepad short-circuits `poll()`), only biting on hardware.
- The 4 `excluded` overlays are archived-in-manifest, intentionally module-less — expect no module for them.
- **Canvas text has subpixel rendering variance** across page contexts, so glyph-dense overlays (e.g. `terminal`) diff ~0.5% while looking identical. Tolerance is 0.6% with an AA-aware pixelmatch threshold; a real mis-port is a wrong shape at many percent. Don't tighten to chase glyph noise; do investigate any diff whose `.diff.png` shows a *structural* change (missing element, wrong position/colour), not edge scatter.
- **Golden faithfulness needs the fixture + goldens to agree.** `qa/render.html` and the goldens both read `qa/fixture.json`; if you re-capture goldens, the fixture is rewritten in lockstep.
- **The demo driver is pinned to the fixture too.** `engine/demo-driver.js` is a byte-faithful port of the prototype's `catalogue.html` `tick()`; `tests/demo-driver.test.mjs` drives it with the capture's exact schedule (DT 1/60, 480 steps) and asserts it reproduces `qa/fixture.json`. So a re-baseline touches three things in lockstep: goldens, fixture, and this test. The gallery shares **one** driver + clock across all tiles (as the prototype did) — a tile that reads stale state is a per-module bug, not a driver bug.
- **State is two objects, like the reference:** `s` (input — pedals/steering/gear/shift) and a separate `tel` (rpm/spd). `s` has **no** rpm/spd. Telemetry bodies (signature `(w,h,s,t)`) get `t = tel` via the module wrapper. An overlay that reads `s.rpm` gets `undefined` — that's a real reference bug (`split-panel`), faithfully preserved; fixing it is SO-0007. If a golden-diff shows a *structural* change on a telemetry overlay, suspect the s/tel split first.

## QA roadmap (this system is self-improving)

- **Done: faithfulness golden-diff, full coverage.** Goldens are committed (`qa/golden/`) with
  `qa/fixture.json` as the frozen state, and `qa/acceptance.mjs` pixel-diffs every overlay against
  its golden: **69/69 passing**. The baseline no longer depends on the prototype existing.
  **Provenance is now split (SO-0038):** 40 goldens still come from the prototype; 29 were
  re-baselined from the modules, because those overlays deliberately no longer match the prototype
  after their baked backing moved out to the plate. Recapturing those 29 with
  `qa/capture-golden.mjs` would *reintroduce* a baseline the product intends to differ from — don't.
  The remaining 40 are the stronger check and should still be recaptured from the prototype if ever
  re-baselined.
- **Done (SO-0006): the live shifter round-trip, on real hardware (2026-07-28).** A 60 Hz trace over
  1–6 up, 6–1 down, R and neutral confirmed each engaged gear lights its gate cell, the readout
  tracks, neutral is genuinely present between every pair of gears, and the paddles return to N
  rather than inventing a position. What is still un-verified is the same loop inside **OBS's own
  browser** (it has separate storage, so it needs its own calibration) and a real **sequential
  lever** (SO-0030) — no such hardware on hand.
- Layer 3 fresh-eyes persona pass at the first hosted-site milestone (expensive; milestones only).
