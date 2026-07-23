# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

**What is *not* here:** the steps to *take the repo public* — secrets scan, private-content sweep, the flip. Those are a **pre-flight checklist run once when the project is ready**, kept as a separate release runbook, not backlog. This board tracks *building the product*.

## In progress

*(none — SO-0001 and SO-0002 complete; next up is the site work, SO-0003/0008/0009.)*

## Open — road to a real hosted website

The product work between this pilot and "a site streamers find, set up, and use."

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0003** | Configure page → URL generator | Bind inputs, pick style/scale/colours, emit the `?style=…` URL to paste into OBS. Realises [ADR 0001](../decisions/0001-config-in-the-url.md); no storage. |
| **SO-0004** | OBS gamepad fallback flow | The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. |
| **SO-0013** | Overlay ("Open in OBS") page — UI polish + QA | `pages/overlay.html` is functional but rough: the setup UI (caption + calibration panel) needs a proper visual pass, and the page has **no dedicated QA coverage** (the golden-diff covers modules, not this page). Add a browser QA pass (renders, calibration states, transparent-bg guard, bad-`?style=`). Overlaps SO-0003/0004 — the configure flow may absorb parts of the setup UI. |
| **SO-0015** | Admin / backend manager (the catalogue as an Admin view) | Turn the prototype's `catalogue.html` into a repo **Admin view** over `catalogue.json`: the same data source of truth, rendered for *management* (stage assignments, hidden flags, family/set curation, export) rather than the public gallery's *browse* view. `catalogue.json` stays the single source both views read; the public gallery (SO-0002) is the read view, this is the write/curate view. Was previously slated for deletion (see PKB migration tracker) — this preserves its function instead of dropping it. |
| **SO-0008** | Hosting + deploy pipeline | Pick a static host (GitHub Pages / Netlify / Cloudflare Pages — all give the HTTPS the Gamepad API requires), wire a deploy from `main`, decide on a domain. See [ADR 0002](../decisions/0002-static-first-hosting.md). |
| **SO-0009** | Discovery / landing front door | The streamer-facing entry: what this is, the overlay gallery, and the path into configure. The "find it" half of "find, set up, use." |
| **SO-0010** | Wishlist / feedback form | A lightweight feedback channel (no auth, an email field). **Not needed before launch, and the shape needs more thought** — parked until the site is live and there's something to react to. |

## Open — engine & overlays

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0005** | Collapse near-duplicate overlay families | The 3 `Wheel` variants and the `bars`/`history` clusters. Family metadata exists to support this. |
| **SO-0006** | Shifter / gear live calibration + input | The engine calibrates pedals + steering only; it does **not** capture the H-shifter (gear/lever). Tier 2 shifter overlays can render from demo/test state but can't run **live** without this. Extend `calibration.js` + `gamepad.js` to bind gear/lever. |
| **SO-0007** | Telemetry data source (rpm / spd / gear-from-sim) | A G923 exposes no RPM/speed — those are **sim telemetry**, not wheel input. Tier 3 (7 overlays) and any telemetry channel need a source (a sim telemetry feed / local bridge). Until then telemetry overlays are demo-only. Design the source before promoting them past `experimental`. **Bug to fix here:** `split-panel` reads `s.rpm`, but rpm rides on the telemetry object, not the input state — so its rev arc renders empty (faithfully preserved from the reference). Fix it to read telemetry when this lands. |
| **SO-0011** | The builder — compose overlays from sub-visuals | Longer-term: assemble combos from swappable named sub-visuals + channel reordering. The module contract and named `draw-kit` callables are the groundwork; not scheduled. |
| **SO-0014** | Real-session recorder + demo-data library | Replace the hand-authored synthetic lap with **recordings of real driving**. Build an in-repo tool that captures a real rig's input + telemetry while playing an actual sim, stores each session as a catalogued, replayable recording (same shape `demo-driver.js` consumes: input channels + `tel` + gear events over time), and lets the site manager **select which recording drives the gallery/preview** ("real fake data"). Depends on a capture source: pedals/steering exist today; gear needs SO-0006, rpm/spd/gear-from-sim need SO-0007. The current `demo-lap.js` + `demo-driver.js` are the placeholder this supersedes; keep the same consumer contract so overlays don't care whether the data is synthetic or recorded. Import/export of recordings is a nice-to-have on top. |
| **SO-0016** | Racer view — reverse the data into a virtual driver | Research / later. The inverse of an overlay: take recorded input + telemetry and reconstruct a visualization of the driver/car virtually. Straightforward-ish on a **looping circuit**; the hard case is **non-looping / open-world** driving (e.g. Forza street driving) where position can't be inferred from a repeating lap. Unscheduled; builds on SO-0014's recordings. |

## Decisions to revisit (not tickets)

- **`excluded` → `archived` naming** — `excluded` means archived-not-deleted, but the word reads as *discard*. Rename the stage value?
- **Telemetry live behaviour** — how telemetry overlays behave with no sim feed (hide? placeholder? demo-only badge?). Tied to SO-0007.

## Done

| ID | Title |
| --- | --- |
| **SO-0000** | Scaffold the repo: layered engine extracted from the prototype, manifest quality-gate, pytest + `node --test` suites, ADRs. |
| **SO-0001** | **Migrate all 68 non-excluded overlays to modules** — full engine port (helpers + shifter/telemetry state + settable-global-ctx), draw bodies byte-for-byte. Verified: unit blank-tile guard, manifest coherence (`REQUIRE_FULL_COVERAGE` on), and **68/68 pixel-faithful to the reference render** (qa golden-diff). The golden faithfulness harness (`qa/`) was built alongside. |
| **SO-0002** | **Gallery page over demo data** (`pages/gallery.html`) — browse all 68 non-excluded overlays animated live over a shared demo driver, filter by set/stage, search, pause/speed/shift-mode. Required extracting the missing animated demo engine: `engine/demo-lap.js` rebuilt as the richer 30s lap (gears + rpm/spd), and a new Layer-2 `engine/demo-driver.js` (`tick(dt)`) ported byte-faithfully from the prototype's `catalogue.html` — it **reproduces `qa/fixture.json` exactly**. Verified: all 68 tiles paint live, no errors (headless). **Supersedes the prototype's `catalogue.html` + `Live/gallery.html`** (a delete-gate condition). |
| **SO-0012** | **Bring the design-principles doc + parked prototype into the repo** — `overlays/sim-racing/design-principles.md` (+ HTML pair; renderer-contract section reconciled to ADR 0005), the parked correlation-demo prototype under `overlays/sim-racing/prototypes/`, and the early catalogue drafts under `overlays/sim-racing/archive/`, each with a framing README. Part of emptying `Home/`. |
