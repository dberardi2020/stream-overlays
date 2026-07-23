# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

**What is *not* here:** the steps to *take the repo public* — secrets scan, private-content sweep, the flip. Those are a **pre-flight checklist run once when the project is ready**, kept as a separate release runbook, not backlog. This board tracks *building the product*.

## In progress

*(none — migration into the repo is complete (SO-0001/0002/0012/0015); next up is the road to a hosted site: validate local G923 binding, then SO-0008 → SO-0003/0009.)*

## Open — road to a real hosted website

The product work between this pilot and "a site streamers find, set up, and use."

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0003** | Configure page → URL generator | Bind inputs, pick style/scale/colours, emit the `?style=…` URL to paste into OBS. Realises [ADR 0001](../decisions/0001-config-in-the-url.md); no storage. |
| **SO-0004** | OBS gamepad fallback flow | The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. Relatedly, mid-stream a device drop must **not** dump the streamer back into this fallback UI on screen — the graceful-degradation behaviour is tracked in SO-0013. |
| **SO-0013** | Overlay ("Open in OBS") page — UI polish + QA | `pages/overlay.html` is functional but rough: the setup UI (caption + calibration panel) needs a proper visual pass, and the page has **no dedicated QA coverage** (the golden-diff covers modules, not this page). Add a browser QA pass (renders, calibration states, transparent-bg guard, bad-`?style=`). Overlaps SO-0003/0004 — the configure flow may absorb parts of the setup UI. **Includes the mid-stream-stability requirement:** once a streamer is live, the overlay must never regress to setup chrome (e.g. a wheel disconnect popping the calibration panel back on screen) — decide the right graceful behaviour so it can't mess up a live scene (also see SO-0004). |
| **SO-0008** | Hosting + deploy pipeline | Get it live over HTTPS (which the Gamepad API requires) with a deploy from `main`. **Decided sequence:** (1) **GitHub Pages** first — free, static, HTTPS; link the Pages URL from the README. (2) **Vercel** only when server routes are actually needed (the `/configure` generator, later telemetry) — the static export runs on both unchanged, so it's not a rewrite. (3) A **real domain**, pointed at whichever host is current. Route everything through the domain from the moment there is one — **never hard-code a `*.github.io` / `*.vercel.app` URL**, because the domain outlives the host choice. The OBS URL contract (`?style=<id>`) rides on top of whatever host is current: **a host migration must not change a single `?style=` URL** — which is *why* ids are immutable and host-independent. See [ADR 0002](../decisions/0002-static-first-hosting.md). |
| **SO-0009** | Discovery / landing front door | The streamer-facing entry: what this is, the overlay gallery, and the path into configure. The "find it" half of "find, set up, use." |
| **SO-0010** | Wishlist / feedback form | A lightweight feedback channel (no auth, an email field). **Not needed before launch, and the shape needs more thought** — parked until the site is live and there's something to react to. |

## Open — engine & overlays

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0005** | Collapse near-duplicate overlay families | The 3 `Wheel` variants and the `bars`/`history` clusters. Family metadata exists to support this. |
| **SO-0006** | Shifter / gear live calibration + input | The engine calibrates pedals + steering only; it does **not** capture the H-shifter (gear/lever). Tier 2 shifter overlays can render from demo/test state but can't run **live** without this. Extend `calibration.js` + `gamepad.js` to bind gear/lever. |
| **SO-0007** | Telemetry data source (rpm / spd / gear-from-sim) | A G923 exposes no RPM/speed — those are **sim telemetry**, not wheel input. Tier 3 (7 overlays) and any telemetry channel need a source (a sim telemetry feed / local bridge). Until then telemetry overlays are demo-only. Design the source before promoting them past `experimental`. **Bug to fix here:** `split-panel` reads `s.rpm`, but rpm rides on the telemetry object, not the input state — so its rev arc renders empty (faithfully preserved from the reference). Fix it to read telemetry when this lands. |
| **SO-0011** | The builder — compose overlays from sub-visuals | Longer-term. Two observations from curating the set both point here: **combos should be composed, not fixed.** A combo is really a *layout* + a choice of pedal / wheel / shifter / gear sub-visual per region — the builder lets a user pick a layout and slot a different sub-visual into each. Its smaller cousin: **channel order as a preference** (`CLU→BRK→THR` vs reversed, throttle-on-left). Config still lives in the URL, so a built overlay is just a richer query string — `?layout=corner&pedals=bars&wheel=ring&order=clu,brk,thr`; no accounts. The one-file split already decomposed each overlay into a `draw()` over shared, named sub-visual helpers (`pedalBars`, `wheel`, `drawGate`, …), so the builder is "expose those as swappable slots + a channel-order param" — an extension, not a rewrite. Keep sub-visuals as named, independently-callable units. Not scheduled. |
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
| **SO-0015** | **Admin view (`pages/admin.html`)** — the write/curate view over `catalogue.json`, rebuilt on the repo's module architecture (the gallery's live-preview engine + an edit layer) rather than porting the prototype's duplicate engine. Per-overlay stage (live/draft/experimental/excluded), hidden toggle, and editable note; edits persist in localStorage and **Export** downloads a new `catalogue.json` to commit (static-first — no backend). Shows all 72 entries incl. the 4 module-less ones (as "no module"). Verified headless: 68/68 previews paint, edit→dirty→export→revert all correct, valid JSON out. Supersedes the prototype's `catalogue.html`. |
