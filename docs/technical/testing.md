# Testing

How the project is tested, what each layer covers, and where the gaps are. The short version and the run commands are in the README's [Testing](../../README.md#testing) section; this is the full approach.

## Three layers

### 1 · Unit — `tests/` (the CI gate)

Fast, in-process, no browser. Two runners:

- **`node --test tests/*.test.mjs`** — the pure calibration maths (`mapPedal`/`mapWheel`, exercised directly) and the **blank-tile guard**: every overlay module is imported and drawn against a recording mock canvas, and must paint something. Catches a throw, a missing import, or an overlay that silently renders nothing.
- **`pytest tests/`** — the manifest is the source of truth, so its integrity is asserted on the JSON alone: unique kebab ids, valid `stage`/`set` enums, `size` sanity, and the load-bearing check that each overlay's `set` agrees with the channels its `uses` implies. Plus module↔manifest coherence: every overlay module maps to a real entry, its exported `id` matches its filename, and (now that migration is complete) **every non-excluded entry has a module**.

### 2 · Acceptance — `qa/acceptance.mjs` (the un-mockable surface)

Overlays are canvas pixels, so the acceptance layer renders them for real: headless Chromium, real fonts, real ES-module imports, at a fixed deterministic state (`qa/fixture.json`). It checks two things per overlay:

1. **Non-blank** — the real-pixel successor to the unit blank-tile guard (a real canvas surfaces failures a mock can't).
2. **Faithfulness** — a **pixel-diff against a golden** (`qa/golden/<id>.png`). The goldens were captured from the reference implementation through *its own* renderer at the same state (`qa/capture-golden.mjs`). Because every overlay's draw body is a byte-for-byte copy of the reference's, a diff can only come from a mis-ported shared *helper* — so the diff pinpoints exactly that.

Tolerance is 0.6% of pixels with an AA-aware threshold: canvas **text** has subpixel rendering variance between page contexts (a glyph-dense overlay differs ~0.5% while looking identical), whereas a real regression is a wrong shape at many percent. One command, non-zero exit on failure, skips cleanly when Playwright/chromium is absent (`npm i && npx playwright install chromium` to enable).

### 3 · Agentic browser pass (dev-only)

For what a harness can't assert — interactions, and whether it *looks right* live. Driven by a coding agent against the running app per `qa/product-map.md`. Not every change needs it; reserve the expensive fresh-eyes persona for milestones.

## Coverage

- **69 / 69** non-excluded overlays: unit blank-tile guard ✔, manifest coherence ✔, acceptance non-blank ✔. **Pixel-faithful to golden on 40 of 69** — SO-0038 deliberately redesigned 29 overlays (their baked backing moved to the plate), retiring goldens whose purpose was fidelity to the prototype; they want recapturing on a machine that can re-baseline. The 4 `excluded` overlays are archived-in-manifest and intentionally module-less.
- Pure calibration maths: unit-tested across rest/full/clamp and off-centre-rest cases.
- Manifest: every invariant above, on all 73 entries.

## Gaps (tracked)

- **Live behaviour isn't rendered by the acceptance layer** — it renders from a frozen fixture, not a live wheel. Shifter and telemetry inputs have no live source yet ([SO-0006](../tickets/tickets.md), [SO-0007](../tickets/tickets.md)); the overlays render faithfully from demo state but can't be driven live.
- **A latent reference bug is faithfully preserved:** `split-panel` reads `s.rpm`, but rpm rides on the separate telemetry object, not the input state — so its rev arc renders empty (as it did in the reference). Migration replicated it byte-for-byte; the fix (read telemetry, not input) belongs with the telemetry work ([SO-0007](../tickets/tickets.md)).
- **No live-page acceptance** for `pages/overlay.html` end-to-end in OBS — that needs a real device and is manual QA.

## CI

`.github/workflows/tests.yml` runs the two deterministic layers on every push/PR: `node --test` then `pytest`. The acceptance layer is runnable in CI once a chromium install step is added; until then it is a local/pre-flight gate (and part of the go-public checklist).
