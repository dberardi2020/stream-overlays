# Architecture

How the code is layered, and the rules that keep it maintainable as the catalogue grows. The overlays began as single-file prototypes; this is the shape they were extracted into so the logic is testable, reusable, and safe to build a platform on.

## Repository layout — a vertical per domain

The product is an overlay *platform*, and sim racing is its first **vertical** — "read a device in the browser, draw it, composite in OBS" generalises beyond wheels. So the overlays live under a per-vertical folder rather than at the root:

```
overlays/
  sim-racing/          ← the first (and, today, only) vertical — Logitech G923
    catalogue.json       the manifest: source of truth for the vertical's overlays
    engine/              this vertical's engine (Layers 1–2)
    overlays/<id>.js     one module per overlay (Layer 3)
    pages/               overlay.html · gallery.html (Layer 4)
    build/channels.py    the manifest quality-gate
docs/ · qa/ · tests/   ← repo-wide, span every vertical
```

A second vertical would be a **sibling** — `overlays/<other>/` with the same internal shape — while `docs/`, `qa/`, and `tests/` stay repo-wide. Nothing outside `overlays/sim-racing/` is sim-specific; the engine, manifest convention, module contract, and QA harness are the reusable spine. Everything below describes one vertical's internals, which every vertical shares.

## Three layers, dependencies flow one way

```
Layer 1 — pure logic          calibration-math.js · demo-lap.js
   (no DOM, no canvas)            ↑ imported by
Layer 2 — browser runtime     gamepad.js · state.js · calibration.js · draw-kit.js · demo-driver.js · url-config.js
   (Gamepad API, canvas)          ↑ imported by
Layer 3 — overlays            overlays/<id>.js  — one module each, draw only
   (draw to a canvas)             ↑ imported by
Layer 4 — pages               pages/overlay.html · pages/gallery.html — thin: wire it together
```

The rule: **dependencies only ever point up this list.** An overlay never touches the Gamepad API or the DOM; the pure maths never imports the runtime. This is what makes Layer 1 runnable under `node --test` with no browser, and what lets an overlay be reasoned about as just `draw(channels) → pixels`.

### Layer 1 — pure logic

- **`calibration-math.js`** — `mapPedal(a, rest, full)` and `mapWheel(a, rest, min, max)`: raw axis value + captured calibration → normalised channel. Pure functions, unit-tested directly. This is the logic that used to be trapped inside a closure in the prototype.
- **`demo-lap.js`** — the synthetic lap that backs the gallery preview: pedals + steering shaped like a real lap, a scripted gear-change schedule, and derived rpm/speed telemetry, so shifter and telemetry overlays animate too. Pure array generation, no browser deps (`demo-driver.js` and its tests import it under node).

### Layer 2 — browser runtime

- **`gamepad.js`** — the single hardware seam: `getPad()` is the only reader of `navigator.getGamepads()`. Everything downstream takes a plain `{ axes: [...] }`, so it is mockable.
- **`calibration.js`** — the calibration state machine and status panel. Writes the shared `state`. Imports its maths from Layer 1 and its wheel read from `gamepad.js`.
- **`draw-kit.js`** — the shared sub-visuals every overlay draws with: palette (`C`), channel table (`CH`), `glass`/`mono`/`pct`, and the rolling input `hist`. These are named callables on purpose — the future builder composes overlays from them. It also owns the render-state singletons (`tel`, `hist`, `shiftLog`, `shiftTimes`, `gateUse`, `clock`, `MODES`) that both the live page and the demo driver feed.
- **`demo-driver.js`** — turns the pure lap into the animated whole-engine state the gallery reads: it advances a clock and, each `tick(dt)`, writes the input channels, telemetry, history, and shifter accumulators onto the `draw-kit` singletons. This is the piece that used to live inline in the prototype's `catalogue.html`; ported faithfully (it reproduces the QA fixture exactly). The live overlay page does **not** use it — real calibrated input drives that.
- **`state.js`** — the channel state object shape.
- **`url-config.js`** — parse `?style=/scale=/bg=` and resolve a `?style=<id>` to a manifest entry.

### Layer 3 — overlays

One module per overlay. The contract is deliberately tiny — see [ADR 0005](../decisions/0005-overlay-module-contract.md):

```js
export const id = "bowtie";
export function draw(ctx, w, h, state, mem) { /* byte-for-byte from the prototype */ }
```

The module owns only its id and its drawing. Everything else (name, size, set, stage, note) lives in the manifest.

### Layer 4 — pages

`pages/overlay.html` is a thin orchestrator: read the URL, fetch the manifest, resolve the entry, `import()` the overlay module, size the canvas from the manifest, wire calibration, and run the draw loop. Because it uses native ES modules and dynamic `import()`, there is **no build step** — the page runs as static files ([ADR 0002](../decisions/0002-static-first-hosting.md)).

`pages/gallery.html` is the same shape at N-up: it fetches the manifest, builds a card per non-excluded overlay, and runs **one** `requestAnimationFrame` loop with **one** `demo-driver` — each frame ticks the driver once, then every on-screen tile lazily `import()`s its module and draws over the shared state. An `IntersectionObserver` keeps only visible tiles painting, so 68 live canvases stay cheap. It supersedes the prototype's `catalogue.html` + `Live/gallery.html`.

## The manifest stays honest

`catalogue.json` is the source of truth, so its integrity is enforced rather than trusted:

- **`set`/`uses` are derived, not authored.** `build/channels.py` reads what an overlay's draw body actually references and derives its channels; the tests assert the manifest agrees. This is the check that originally caught overlays labelled with the wrong set.
- **Module ↔ manifest coherence.** Every overlay module maps to a real manifest entry, and its exported `id` matches its filename. Full coverage (every entry has a module) flips on when the [SO-0001](../tickets/tickets.md) migration completes.
- **The blank-tile guard.** Each overlay is drawn against a recording mock canvas and must paint — the dynamic successor to the prototype's static identifier check, which is what caught four would-be-blank tiles.

## What is not here yet

The configure page (bind inputs → emit the `?style=…` URL, [SO-0003](../tickets/tickets.md)) and the landing front door ([SO-0009](../tickets/tickets.md)). The overlay migration ([SO-0001](../tickets/tickets.md)) and the gallery ([SO-0002](../tickets/tickets.md)) are done — all 68 non-excluded overlays are modules, each draw body copied byte-for-byte and verified by the manifest-sync + blank-tile tests and the golden pixel-diff.
