# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

**What is *not* here:** the steps to *take the repo public* — secrets scan, private-content sweep, the flip. Those are a **pre-flight checklist run once when the project is ready**, kept as a separate release runbook, not backlog. This board tracks *building the product*.

Rows are pointers; anything needing more than a sentence has a block in **Details**, below the board.

## In progress

*(none — the ADR 0006 structural split is done: overlay is a pure renderer (SO-0013) and calibration lives on the new setup page (SO-0017). Remaining binding work: gallery Live mode (SO-0018) and the shifter capture (SO-0006, needs a real-G923 round-trip), then hosting.)*

## On deck

The committed next few, in intended order. Remaining of the
[ADR 0006](../decisions/0006-setup-surface-pure-overlay.md) binding overhaul, then hosting.
**Input binding is a v0 requirement** — including the H-shifter/gear (SO-0006), which is direct HID,
not telemetry. **Telemetry (SO-0007) is explicitly deferred** — a **Input binding is a v0 requirement** — including the H-shifter/gear
(SO-0006), which is direct HID, not telemetry. **Telemetry (SO-0007) is explicitly deferred** — a
far-off goal — but the setup page and overlay are designed to leave a slot for it.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0018](#so-0018) | P1 | Feature | Gallery live-input control surface (Demo ⇄ Live) |
| [SO-0006](#so-0006) | P1 | Feature | Shifter / gear live calibration + input (v0 input binding) |
| [SO-0008](#so-0008) | P1 | Chore | Hosting + deploy pipeline |

## Blocked

*(none)*

## Backlog

### Road to a real hosted website

The product work between this pilot and "a site streamers find, set up, and use."

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0003](#so-0003) | P2 | Feature | Configure page → URL generator |
| [SO-0004](#so-0004) | P2 | Feature | OBS gamepad fallback flow |
| [SO-0009](#so-0009) | P2 | Feature | Discovery / landing front door |
| [SO-0010](#so-0010) | P3 | Feature | Wishlist / feedback form |

### Engine & overlays

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0007](#so-0007) | P2 | Feature | Telemetry data source (rpm / spd / gear-from-sim) — deferred |
| [SO-0005](#so-0005) | P3 | Chore | Collapse near-duplicate overlay families |
| [SO-0011](#so-0011) | P3 | Idea | The builder — compose overlays from sub-visuals |
| [SO-0014](#so-0014) | P3 | Feature | Real-session recorder + demo-data library |
| [SO-0016](#so-0016) | P3 | Idea | Racer view — reverse the data into a virtual driver |

## Decisions to revisit (not tickets)

- **`excluded` → `archived` naming** — `excluded` means archived-not-deleted, but the word reads as *discard*. Rename the stage value?
- **Telemetry live behaviour** — how telemetry overlays behave with no sim feed (hide? placeholder? demo-only badge?). Tied to SO-0007.

## Done

*Entries describe what each item delivered at the time it closed, so figures in them
(overlay counts, test counts) are historical, not the current state — the living numbers
are in the docs.*

| ID | Title | Closed |
|---|---|---|
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

The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. Per [ADR 0006](../decisions/0006-setup-surface-pure-overlay.md) this ladder now lives on the **setup page (SO-0017)**, not the overlay — the overlay is pure render and can't show fallback UI on a live scene. The **local bridge** is the Path B alternative if per-context calibration proves too clunky.

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

### SO-0009 — Discovery / landing front door {#so-0009}
**P2 · Feature · site**

The streamer-facing entry: what this is, the overlay gallery, and the path into configure. The "find it" half of "find, set up, use."

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
