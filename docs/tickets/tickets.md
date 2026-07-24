# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

**What is *not* here:** the steps to *take the repo public* — secrets scan, private-content sweep, the flip. Those are a **pre-flight checklist run once when the project is ready**, kept as a separate release runbook, not backlog. This board tracks *building the product*.

Rows are pointers; anything needing more than a sentence has a block in **Details**, below the board.

## In progress

Lifting the overlay catalogue's quality — the bones are solid (pedals + shifter sets, live overlays), but the wheel primitive and several combos are half-baked.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0019](#so-0019) | P1 | Chore | Overlay quality pass — cull half-baked, upgrade the rough |

## On deck

The committed next few, in intended order. Remaining of the
[ADR 0006](../decisions/0006-setup-surface-pure-overlay.md) binding overhaul, then the configure page and hosting.
**Input binding is a v0 requirement** — including the H-shifter/gear (SO-0006), which is direct HID,
not telemetry. **Telemetry (SO-0007) is explicitly deferred** — a far-off goal — but the setup page
and overlay are designed to leave a slot for it.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0006](#so-0006) | P1 | Feature | Shifter / gear live calibration + input (v0 input binding) |
| [SO-0003](#so-0003) | P2 | Feature | Configure page → URL generator |
| [SO-0008](#so-0008) | P1 | Chore | Hosting + deploy pipeline |

## Blocked

*(none)*

## Backlog

### Road to a real hosted website

Pre-public candidates not yet committed to the On-deck sequence.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0004](#so-0004) | P2 | Feature | OBS gamepad fallback — interactive ladder (guidance already shipped) |

### Engine & overlays

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0007](#so-0007) | P2 | Feature | Telemetry data source (rpm / spd / gear-from-sim) — deferred |
| [SO-0005](#so-0005) | P3 | Chore | Collapse near-duplicate overlay families |
| [SO-0011](#so-0011) | P3 | Idea | The builder — compose overlays from sub-visuals |
| [SO-0014](#so-0014) | P3 | Feature | Real-session recorder + demo-data library |
| [SO-0020](#so-0020) | P3 | Chore | Interim believable-enough demo lap (clean loop; superseded by SO-0014) |
| [SO-0016](#so-0016) | P3 | Idea | Racer view — reverse the data into a virtual driver |

### After launch

Post-public — not part of getting the site live.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0010](#so-0010) | P3 | Feature | Wishlist / feedback form |

## Decisions to revisit (not tickets)

- **`excluded` → `archived` naming** — `excluded` means archived-not-deleted, but the word reads as *discard*. Rename the stage value?
- **Telemetry live behaviour** — how telemetry overlays behave with no sim feed (hide? placeholder? demo-only badge?). Tied to SO-0007.

## Done

*Entries describe what each item delivered at the time it closed, so figures in them
(overlay counts, test counts) are historical, not the current state — the living numbers
are in the docs.*

| ID | Title | Closed |
|---|---|---|
| SO-0022 | **Overlay & setup polish** — new `pedal-blocks` pedals overlay (the cockpit pedals broken out: diegetic light-up depressing blocks); `gate-with-trail` upgraded to carry gate-map's gear numbers + NEUTRAL/GEAR callout on top of its knob trail (stale golden retired); and the setup **calibration panel** restyled from a bolted-on widget into one cohesive, host-themed component (transparent, full-width, tokenised, live meters in-row). | 2026-07-23 |
| SO-0021 | **Data-driven hero + curation/admin tooling** — the landing hero is curated in data, not code: a `hero` flag on catalogue entries, toggled in admin via a **★ Hero** control (capped at 4, enforced by a pytest), auto-arranged onto the grid's diagonals; index reads the flag. Admin also gains **Save to file** (File System Access API — writes catalogue.json directly, re-baselines dirty state), and gallery/admin cards gain **Copy OBS link** + **Copy name**. A **local-only Admin link** shows in the nav on localhost. 79 node + 225 pytest green. | 2026-07-23 |
| SO-0018 | **Gallery Demo ⇄ Live toggle** ([ADR 0006](../decisions/0006-setup-surface-pure-overlay.md)) — an Input: Demo/Live control on the gallery. Demo keeps the synthetic lap; Live swaps in the real calibrated G923 (via the same `createInputReader` + `pushHistory` path the pure overlay uses) so the whole catalogue responds to one binding at once. Pedals + steering live; telemetry (SO-0007) and shifter (SO-0006) rest — no rig source yet. Demo-only controls dim in Live; a status line reports readiness with a Setup link. Live UI verified headless; the wheel-driven path needs a real G923 to confirm end-to-end. | 2026-07-23 |
| SO-0009 | **Discovery / landing front door** (`index.html`, served at `/`) — the streamer-facing entry: hero (what this is, in the README's terms), a **live teaser** of four hero overlays animating over the shared demo driver (one per set), and the **find → set up → use** path into gallery / setup / OBS. The "use" step is honest about the [ADR 0003](../decisions/0003-obs-gamepad-fallback.md) OBS gamepad-focus gotcha and links to the setup page's guided fallback (`setup.html#obs`). Also added a **slim shared site nav** (`.sitenav`: Home · Gallery · Setup) to index + gallery + setup + admin, stitching the loose pages into one navigable site. Verified in browser (teaser animates, nav + active states, links); 78 node + 221 pytest green. | 2026-07-23 |
| SO-0013 | **Overlay page → pure renderer** ([ADR 0006](../decisions/0006-setup-surface-pure-overlay.md)) — `pages/overlay.html` stripped of all setup chrome: it reads calibration from `localStorage` via the new DOM-free `engine/live-input.js` + live input, draws, and rests at zero uncalibrated. No panel, no "press c", no error UI on a live scene — the structural fix for the mid-stream-chrome risk. Config-time-only messages (bad `?style=`, `file://`) remain. Verified headless: pure (no `#setup`/`#calmount`), transparent, paints, unit-tested mapping. | 2026-07-23 |
| SO-0017 | **Dedicated setup page (`pages/setup.html`)** ([ADR 0006](../decisions/0006-setup-surface-pure-overlay.md)) — the calibration surface extracted from the overlay: mounts the (unchanged, known-good) `calibration.js` panel, adds a live thr/brk/clu/steering readout, the [ADR 0003](../decisions/0003-obs-gamepad-fallback.md) OBS fallback guidance, the per-browser-context flow, and design slots for the deferred shifter (SO-0006) + telemetry (SO-0007). Writes the same `localStorage` key the overlay/gallery read. *(Shifter wiring itself is SO-0006.)* | 2026-07-23 |
| SO-0015 | **Admin view (`pages/admin.html`)** — the write/curate view over `catalogue.json`, rebuilt on the repo's module architecture (the gallery's live-preview engine + an edit layer) rather than porting the prototype's duplicate engine. Per-overlay stage (live/draft/experimental/excluded), hidden toggle, and editable note; edits persist in localStorage and **Export** downloads a new `catalogue.json` to commit (static-first — no backend). Shows all 72 entries incl. the 4 module-less ones (as "no module"). Verified headless: 68/68 previews paint, edit→dirty→export→revert all correct, valid JSON out. Supersedes the prototype's `catalogue.html`. | 2026-07-23 |
| SO-0012 | **Bring the design-principles doc + parked prototype into the repo** — `overlays/sim-racing/design-principles.md` (+ HTML pair; renderer-contract section reconciled to ADR 0005), the parked correlation-demo prototype under `overlays/sim-racing/prototypes/`, and the early catalogue drafts under `overlays/sim-racing/archive/`, each with a framing README. Part of emptying `Home/`. | 2026-07-23 |
| SO-0002 | **Gallery page over demo data** (`pages/gallery.html`) — browse all 68 non-excluded overlays animated live over a shared demo driver, filter by set/stage, search, pause/speed/shift-mode. Required extracting the missing animated demo engine: `engine/demo-lap.js` rebuilt as the richer 30s lap (gears + rpm/spd), and a new Layer-2 `engine/demo-driver.js` (`tick(dt)`) ported byte-faithfully from the prototype's `catalogue.html` — it **reproduces `qa/fixture.json` exactly**. Verified: all 68 tiles paint live, no errors (headless). **Supersedes the prototype's `catalogue.html` + `Live/gallery.html`** (a delete-gate condition). | 2026-07-23 |
| SO-0001 | **Migrate all 68 non-excluded overlays to modules** — full engine port (helpers + shifter/telemetry state + settable-global-ctx), draw bodies byte-for-byte. Verified: unit blank-tile guard, manifest coherence (`REQUIRE_FULL_COVERAGE` on), and **68/68 pixel-faithful to the reference render** (qa golden-diff). The golden faithfulness harness (`qa/`) was built alongside. | 2026-07-23 |
| SO-0000 | Scaffold the repo: layered engine extracted from the prototype, manifest quality-gate, pytest + `node --test` suites, ADRs. | 2026-07-23 |

## Details

### SO-0003 — Configure page → URL generator {#so-0003}
**P2 · Feature · configure**

Pick style/scale/colours and emit the `?style=…&scale=…&bg=…` URL to paste into OBS. Realises [ADR 0001](../decisions/0001-config-in-the-url.md); no storage. **This is *not* input binding** (that's the setup page, SO-0017) — it only builds the URL. May share a surface with setup.

### SO-0004 — OBS gamepad fallback flow {#so-0004}
**P2 · Feature · setup**

The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. Per [ADR 0006](../decisions/0006-setup-surface-pure-overlay.md) this ladder lives on the **setup page (SO-0017)**, not the overlay — the overlay is pure render and can't show fallback UI on a live scene.

**Not a launch blocker.** The launch-critical piece — the *written* guidance (Interact → Window Capture) — already shipped on the setup page (SO-0017, the `#obs` card). What remains here is the **interactive** version: auto-detect "no device after N seconds" and surface the ladder dynamically. A UX enhancement, hence backlog, not On-deck. The **local bridge** is the Path B alternative if per-context calibration proves too clunky.

### SO-0005 — Collapse near-duplicate overlay families {#so-0005}
**P3 · Chore · catalogue**

The 3 `Wheel` variants and the `bars`/`history` clusters. Family metadata exists to support this.

### SO-0006 — Shifter / gear live calibration + input {#so-0006}
**P1 · Feature · input · v0**

The engine calibrates pedals + steering only; it does **not** capture the H-shifter (gear/lever). This is **direct HID input, not telemetry**, so it's part of the **v0 input-binding requirement** — the shifter overlays can't run live without it. Extend `gamepad.js` (read the shifter's gear buttons) + `calibration.js` (a "shift into each gear, capture the button" step) and add that step to the setup page (SO-0017). The pedals+steering flow is known-good (ported from the actively-used version); the shifter capture is new and **needs a real-G923 round-trip to verify** — build the framework, confirm button mapping on hardware.

### SO-0007 — Telemetry data source (rpm / spd / gear-from-sim) {#so-0007}
**P2 · Feature · telemetry · deferred (far-off)**

A G923 exposes no RPM/speed — those are **sim telemetry**, not wheel input. Tier 3 (7 overlays) and any telemetry channel need a source (a sim telemetry feed / local bridge). **Explicitly deferred — a far-off goal, not v0.** But the setup page and overlay should **leave a slot for it** (a disabled/"coming later" telemetry section, the `tel` object already separate from input) so adding it later is additive, not a redesign. Until then telemetry overlays are demo-only. Plugs into the setup page (SO-0017).

**Bug to fix here:** `split-panel` reads `s.rpm`, but rpm rides on the telemetry object, not the input state — so its rev arc renders empty (faithfully preserved from the reference). Fix it to read telemetry when this lands.

### SO-0008 — Hosting + deploy pipeline {#so-0008}
**P1 · Chore · hosting**

Get it live over HTTPS (which the Gamepad API requires) with a deploy from `main`.

**Decided sequence:** (1) **GitHub Pages** first — free, static, HTTPS; link the Pages URL from the README. (2) **Vercel** only when server routes are actually needed (the `/configure` generator, later telemetry) — the static export runs on both unchanged, so it's not a rewrite. (3) A **real domain**, pointed at whichever host is current.

Route everything through the domain from the moment there is one — **never hard-code a `*.github.io` / `*.vercel.app` URL**, because the domain outlives the host choice. The OBS URL contract (`?style=<id>`) rides on top of whatever host is current: **a host migration must not change a single `?style=` URL** — which is *why* ids are immutable and host-independent. See [ADR 0002](../decisions/0002-static-first-hosting.md).

### SO-0010 — Wishlist / feedback form {#so-0010}
**P3 · Feature · site**

A lightweight feedback channel (no auth, an email field). **Not needed before launch, and the shape needs more thought** — parked until the site is live and there's something to react to.

### SO-0011 — The builder: compose overlays from sub-visuals {#so-0011}
**P3 · Idea · builder**

Longer-term. Two observations from curating the set both point here: **combos should be composed, not fixed.** A combo is really a *layout* + a choice of pedal / wheel / shifter / gear sub-visual per region — the builder lets a user pick a layout and slot a different sub-visual into each. Its smaller cousin: **channel order as a preference** (`CLU→BRK→THR` vs reversed, throttle-on-left).

Config still lives in the URL, so a built overlay is just a richer query string — `?layout=corner&pedals=bars&wheel=ring&order=clu,brk,thr`; no accounts. The one-file split already decomposed each overlay into a `draw()` over shared, named sub-visual helpers (`pedalBars`, `wheel`, `drawGate`, …), so the builder is "expose those as swappable slots + a channel-order param" — an extension, not a rewrite. Keep sub-visuals as named, independently-callable units. Not scheduled.

### SO-0013 — Overlay page → pure renderer + polish {#so-0013}
**P1 · Feature · overlay**

Per [ADR 0006](../decisions/0006-setup-surface-pure-overlay.md), strip **all** setup chrome from `pages/overlay.html`: it reads calibration from `localStorage` + live input, draws, and rests at zero when uncalibrated — no panel, no "press c", no error UI ever. This is the **root fix** for the mid-stream-stability worry (a pure renderer structurally cannot pop setup onto a live scene).

Then a visual/QA pass: transparent-bg guard, bad-`?style=`, and dedicated browser QA (the golden-diff covers modules, not this page). Pairs with SO-0017 (where the setup it loses goes).

### SO-0014 — Real-session recorder + demo-data library {#so-0014}
**P3 · Feature · demo-data**

Replace the hand-authored synthetic lap with **recordings of real driving**. Build an in-repo tool that captures a real rig's input + telemetry while playing an actual sim, stores each session as a catalogued, replayable recording (same shape `demo-driver.js` consumes: input channels + `tel` + gear events over time), and lets the site manager **select which recording drives the gallery/preview** ("real fake data").

Depends on a capture source: pedals/steering exist today; gear needs SO-0006, rpm/spd/gear-from-sim need SO-0007. The current `demo-lap.js` + `demo-driver.js` are the placeholder this supersedes; keep the same consumer contract so overlays don't care whether the data is synthetic or recorded. Import/export of recordings is a nice-to-have on top.

### SO-0016 — Racer view: reverse the data into a virtual driver {#so-0016}
**P3 · Idea · research**

Research / later. The inverse of an overlay: take recorded input + telemetry and reconstruct a visualization of the driver/car virtually. Straightforward-ish on a **looping circuit**; the hard case is **non-looping / open-world** driving (e.g. Forza street driving) where position can't be inferred from a repeating lap. Unscheduled; builds on SO-0014's recordings.

### SO-0017 — Dedicated setup page (`setup.html`) {#so-0017}
**P1 · Feature · setup**

Per [ADR 0006](../decisions/0006-setup-surface-pure-overlay.md), the single home for connect + calibrate + the [ADR 0003](../decisions/0003-obs-gamepad-fallback.md) OBS fallback ladder — extracted from the overlay page (SO-0013). Reuses the existing calibration engine; writes calibration to `localStorage` for same-origin overlays to read.

Documents the per-context flow: calibrate once in each browser context (your desktop for the gallery; OBS's browser once via a temporary setup source). The place SO-0006 (shifter/gear) and SO-0007 (telemetry) plug in. Renders hand-in-hand with SO-0013.

### SO-0018 — Gallery live-input control surface {#so-0018}
**P1 · Feature · gallery**

Per [ADR 0006](../decisions/0006-setup-surface-pure-overlay.md), add a **Demo ⇄ Live** toggle to the gallery: Live swaps the demo driver for the real calibration engine so the **whole catalogue** responds to your actual wheel at once — bind once, judge every overlay against real input, without opening any single overlay. Same browser context, so the Gamepad API + calibration just work. Builds on the shared-driver architecture (SO-0002).

### SO-0019 — Overlay quality pass {#so-0019}
**P1 · Chore · catalogue**

A visual + code triage of the 44 draft/experimental overlays is done. The bones are solid — the **pedals** and **shifter** sets are strong and the live overlays read well — but two areas are half-baked:

- **The wheel primitive is crude.** Every literal wheel (`wheel`, `wheel-in-a-ring`, `yoke`) and every combo that draws one (cockpit, corner-card, input-cluster, dash-cluster…) uses the same thin blue line-art (circle + T-crossbar + dot). Redesign it once — real rim / spokes / grips — and every wheel + combo overlay upgrades together. Highest-leverage visual fix.
- **The combos are repetitive stat-panel recipes** — many are the same *gear + wheel + pedal-bars (+ rev arc)* layout; cull / merge them (ties to [SO-0005](#so-0005)).

Then fix the render bugs triage surfaced: `split-panel` / `lower-third` read rpm from the wrong source (empty rev display), `shift-counter` reads a non-existent `s.shiftCount`, `path-preview` has dead steering-arc math, `radial-hub` hides its gear under the wheel hub, `throw-timer` presents a per-mode constant as a measurement, `ghost-wheel`'s "recording" is a hardcoded sine. Finally, promote the strong candidates and curate the live / hero set. New ideas welcome where the current ones are weak.

### SO-0020 — Interim believable-enough demo lap {#so-0020}
**P3 · Chore · demo-data**

The current `demo-lap.js` reads robotic. The visible tells: a hard 30-second **seam** (it snaps from the last corner back to the full-throttle start), and **dead-centre steering on straights** so every steering / wheel overlay sits frozen at 0° in previews. Make the loop clean (state at t=30s flows into t=0) and give steering a touch of low-frequency noise so it's never perfectly dead — but keep it *simple*. Full throttle on straights is correct (the fast line), not a bug.

Deliberately minimal placeholder work: this data is superseded by real rig recordings ([SO-0014](#so-0014)), so it isn't worth a physics simulator. (A research pass explored quasi-steady-state lap synthesis — parked as overkill for interim needs.)

## Conventions

The house standard for this board's shape — lanes, schema, detail tiers, archiving — is
`.meta/ticket-board-standard.md` in the author's workspace. The essentials, so this file
stands alone:

- **Source of truth is this file.** Edit the tables directly, then regenerate the render:
  `python docs/render.py docs/tickets/tickets.md`. Commit both files together.
- **IDs** are `SO-NNNN`, one sequence, assigned in creation order (not priority), never
  renumbered and never reused.
- **Lanes**, in order: In progress · On deck · Blocked · Backlog · Done. An empty lane keeps
  its heading and reads `*(none)*`. Backlog is theme-split into *road to a hosted website*
  and *engine & overlays*.
- **Priority:** P1 (soon) → P2 (real, not next) → P3 (someday). **Type:** Bug · Feature ·
  Chore (housekeeping — tests, refactors, packaging, docs) · Idea (not yet scoped).
- **Rows are sorted by priority**, ties by ID — except **On deck**, which is in intended
  sequence, and **Done**, which is reverse-chronological.
- **Keep rows short — length is the signal.** A row is a pointer, one sentence. Anything
  longer gets a `### SO-NNNN` block under **Details** (ID-ordered), which is also the only
  place the ticket's *area* appears. `Done` rows are exempt — there the row *is* the record.
- **A literal `|` in a cell spawns a phantom column** — the renderer splits rows naively.
  Use `/` inside cells.
