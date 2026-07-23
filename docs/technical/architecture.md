# Architecture

How the code is layered, and the rules that keep it maintainable as the catalogue grows. The overlays began as single-file prototypes; this is the shape they were extracted into so the logic is testable, reusable, and safe to build a platform on.

## Three layers, dependencies flow one way

```
Layer 1 — pure logic          calibration-math.js · demo-lap.js
   (no DOM, no canvas)            ↑ imported by
Layer 2 — browser runtime     gamepad.js · state.js · calibration.js · draw-kit.js · url-config.js
   (Gamepad API, canvas)          ↑ imported by
Layer 3 — overlays            overlays/<id>.js  — one module each, draw only
   (draw to a canvas)             ↑ imported by
Layer 4 — pages               pages/overlay.html — thin: wire it together
```

The rule: **dependencies only ever point up this list.** An overlay never touches the Gamepad API or the DOM; the pure maths never imports the runtime. This is what makes Layer 1 runnable under `node --test` with no browser, and what lets an overlay be reasoned about as just `draw(channels) → pixels`.

### Layer 1 — pure logic

- **`calibration-math.js`** — `mapPedal(a, rest, full)` and `mapWheel(a, rest, min, max)`: raw axis value + captured calibration → normalised channel. Pure functions, unit-tested directly. This is the logic that used to be trapped inside a closure in the prototype.
- **`demo-lap.js`** — the synthetic lap used as preview data by the (future) gallery. Pure array generation.

### Layer 2 — browser runtime

- **`gamepad.js`** — the single hardware seam: `getPad()` is the only reader of `navigator.getGamepads()`. Everything downstream takes a plain `{ axes: [...] }`, so it is mockable.
- **`calibration.js`** — the calibration state machine and status panel. Writes the shared `state`. Imports its maths from Layer 1 and its wheel read from `gamepad.js`.
- **`draw-kit.js`** — the shared sub-visuals every overlay draws with: palette (`C`), channel table (`CH`), `glass`/`mono`/`pct`, and the rolling input `hist`. These are named callables on purpose — the future builder composes overlays from them.
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

## The manifest stays honest

`catalogue.json` is the source of truth, so its integrity is enforced rather than trusted:

- **`set`/`uses` are derived, not authored.** `build/channels.py` reads what an overlay's draw body actually references and derives its channels; the tests assert the manifest agrees. This is the check that originally caught overlays labelled with the wrong set.
- **Module ↔ manifest coherence.** Every overlay module maps to a real manifest entry, and its exported `id` matches its filename. Full coverage (every entry has a module) flips on when the [SO-0001](../tickets/tickets.md) migration completes.
- **The blank-tile guard.** Each overlay is drawn against a recording mock canvas and must paint — the dynamic successor to the prototype's static identifier check, which is what caught four would-be-blank tiles.

## What is not here yet

The gallery and configure pages, and the remaining ~69 overlay modules. The migration is mechanical and guarded: each overlay's draw body is copied byte-for-byte into a module, and the manifest-sync + blank-tile tests verify it. See [SO-0001](../tickets/tickets.md).
