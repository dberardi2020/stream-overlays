# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

**Going public** was previously kept off this board as a separate release runbook. It is now on it, as
[SO-0039](#so-0039), because it stopped being a one-shot checklist: the repo needs real work to meet the
standards, and that work wants tracking like anything else. The *mechanical* pre-flight (final secrets scan,
the flip itself) still runs once, at the end, and lives inside that ticket.

Rows are pointers; anything needing more than a sentence has a block in **Details**, below the board.

## In progress

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0039](#so-0039) | P1 | Chore | Take the repo public — standards pass, sweep, and the flip |

**Input binding is done.** **SO-0006** closed on hardware (2026-07-28), which was the last
v0 input-binding requirement — pedals, wheel, H-shifter and paddles all bind live off a real G923.

## On deck

The committed next few, in intended order: the quality pass, then hosting. The
[ADR 0006](../decisions/0006-setup-surface-pure-overlay.md) binding overhaul and the URL generator
(SO-0003) are both **complete**, so nothing functional stands between here and go-live —
what remains is polish and deployment. **Telemetry (SO-0007) is explicitly deferred** — a far-off
goal — but the setup page and overlay are designed to leave a slot for it.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0019](#so-0019) | P1 | Chore | Overlay quality pass — cull half-baked, upgrade the rough |
| [SO-0008](#so-0008) | P1 | Chore | Hosting + deploy pipeline |

## Blocked

*(none)*

## Backlog

### Road to a real hosted website

Pre-public candidates not yet committed to the On-deck sequence.

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0004](#so-0004) | P2 | Feature | OBS gamepad fallback — interactive ladder (guidance already shipped) |
| [SO-0033](#so-0033) | P3 | Feature | Bulk overlay import — merge into an existing OBS scene collection |
| [SO-0036](#so-0036) | P3 | Idea | Calibration import/export — can a browser export import into OBS's Web View? |
| [SO-0037](#so-0037) | P3 | Feature | Plate padding — breathing room around an overlay, and the size contract it moves |
| [SO-0025](#so-0025) | P2 | Chore | Site style kit — encode design tokens, point every page at it |
| [SO-0028](#so-0028) | P3 | Idea | Light vs dark mode support |

### Engine & overlays

| ID | Pri | Type | Title |
|---|---|---|---|
| [SO-0007](#so-0007) | P2 | Feature | Telemetry data source (rpm / spd / gear-from-sim) — deferred |
| [SO-0034](#so-0034) | P2 | Bug | `terminal` golden fails cross-machine on text antialiasing (font loading fixed) |
| [SO-0035](#so-0035) | P3 | Chore | Gallery Mode button does nothing in Live — relabel or hide |
| [SO-0027](#so-0027) | P2 | Chore | Ensure integration test coverage is sufficient across the repo |
| [SO-0026](#so-0026) | P2 | Chore | Integration + browser test coverage for the live input path |
| [SO-0030](#so-0030) | P3 | Chore | Sequential shifter input — confirm HID model + where it groups |
| [SO-0031](#so-0031) | P3 | Idea | Live overlay previews on setup — shelved, revisit post-launch |
| [SO-0032](#so-0032) | P3 | Feature | Extra forward gears (up to 8) — dynamic gear count across model + overlays |
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
| SO-0038 | **29 overlays baked their own backing — moved it to the plate.** Each drew a full-canvas `glass(.5,.5,w-1,h-1,r)` inside its own `draw()`, so it stacked on the [SO-0003](#so-0003) plate instead of replacing it: set a plate and those 29 came out darker than the other 40, and no setting could make them genuinely transparent over a scene. Long predated the plate work — the plate only made it visible. Found by rendering every module to a bare canvas against the demo lap and measuring coverage (29 of 69), then confirmed exactly against the source: 29 full-canvas `glass()` calls, and 5 others that are internal sub-panels and were left alone. Removed the 29 calls (and their now-unused imports) and moved each overlay's backing to a **`plate` field on its catalogue entry** — `{bg: "08090c", bga: 0.55, radius: <its own>, edge: 0.14}`, the exact values `glass()` used. `glass()` was a fill *and* a 1px `rgba(255,255,255,0.14)` rim, so the plate gained an **`edge` URL param** (default 0, applied as an *inset* ring so it cannot change the Browser Source box) — without it those 29 would have quietly lost their border. The gallery's global plate gained an **"As Designed"** default meaning *no global value*: each overlay uses its own. That is the default because no single value is right for all 69 — forcing one would either strip the 29 built with a backing or impose one on the 40 built without (`hairline` is deliberately the least intrusive thing on the page). Each card then names its plate's source explicitly — **As Designed / Global / Custom** — rather than having one inferred from whether a global happened to be set. The three are genuinely different answers: "As Designed" *survives* someone setting a global, which the inferred two-state version could not express. Default is Global, so the one control still reaches everything at once; and because the global itself defaults to "As Designed", an untouched gallery shows every overlay exactly as built. "As Designed" is disabled with a reason on the 40 overlays that have no designed plate, and entering Custom seeds from whatever is currently showing so the first drag never jumps. Verified end to end: `?bg=08090c&bga=0.55&radius=7&edge=0.14` renders `rgba(8,9,12,0.55)`, 7px corners and a 1px inset rim at the unchanged 500×240 — pixel-identical to what `glass()` drew. **27 goldens retired** (`gate-with-trail` and `pedal-blocks` already had none): deliberate redesign invalidates a golden whose purpose was fidelity to the prototype, per the SO-0022 precedent. 115 node + 227 pytest green; qa 69/69 painted, 40 pixel-faithful. | 2026-07-28 |
| SO-0003 | **Configure → URL generator**, realising [ADR 0001](../decisions/0001-config-in-the-url.md) (config in the URL, never in storage). Closed a gap open since the renderer was written: `overlay.html` had always accepted a plate it paints itself (`?bg=&bga=&radius=`), and **nothing in the product could produce those params** — while the gallery's BACKDROP control, which looked like it configured exactly that, was a preview-only contrast test that never reached OBS. So a setting that appeared to change your stream silently didn't. Resolved by making them **one setting**: BACKDROP became **Plate**, the gallery-wide default that drives both the preview *and* the copied link, with a **per-overlay override** (colour, opacity, radius) behind a `▾` on each card. It lives in its own box, separate from the filter/demo rows above it — those steer the gallery, this changes what the overlays *are*, and mixing them is what let the old control read as another preview toggle. **Save as default** persists the global plate to `localStorage` so the gallery opens with it, and **Reset** returns to that saved default (or to no plate when none is saved); the stored value is a *gallery preference*, not overlay config, so [ADR 0001](../decisions/0001-config-in-the-url.md) still holds — the copied link carries every value explicitly. Radius is **hidden, not disabled**, when opacity is 0: it has nothing to round, and a greyed control invites clicking while explaining nothing. Default is **None/transparent** — an opaque default would have baked a plate into every link copied without touching a control — so an untouched card emits the same minimal `?style=…&scale=…` it always did. Plate params are omitted entirely at alpha 0, matching `overlay.html`'s own rule that it paints nothing below that. **Scale was deliberately not made a lever** (export stays 2×, revisit if it bites) and **padding is deferred to [SO-0037](#so-0037)**. The preview draws checker → plate → overlay into the canvas rather than styling it: that puts the plate at the overlay's exact rectangle, makes the transparency checker mean one thing only (the surround is flat matting, since checkering it too made the same pattern mean opposite things in one picture), and is immune to browser extensions that force canvas backgrounds transparent — which was observed on the dev machine and would otherwise have desynced preview from URL. 115 node + 227 pytest green; verified in-browser that global changes and per-card overrides move the pixels and the link together. | 2026-07-28 |
| SO-0006 | **Shifter / gear live calibration + input** — the last v0 input-binding requirement, closed on real hardware. `gamepad.js` + `calibration.js` extended to capture gear buttons; a Shifter box on the setup page calibrates an **H-shifter** (one button per position) and **paddles / sequential** (an up/down pair) as **independent sources** ([ADR 0007](../decisions/0007-gear-sources-are-independent.md)) — each calibrated and cleared without touching the other, old single-source maps migrated on read. G923 + Driving Force Shifter mapped: **R,1–6 → buttons 11–17**, **paddles → 4 (up) / 5 (down)**. Driving it found four things no headless test could: both controls couldn't coexist (fixed by the split); every shift logged twice (a real H-pattern crosses neutral, so 2→N→3 counted a phantom down- then upshift — a shift is now a transition between two *engaged* gears); the knob replayed finished shifts (`prevGear` is now the previous *position*, and a leg starts when movement is observed); and the demo couldn't have caught any of it (its lap stepped gear-to-gear with no neutral — it now crosses neutral, and both paths run one shared `engine/gear-motion.js`). `stepSequentialGear` **deleted**: paddles report direction only, and `state.gear` is `null` rather than `0` without an H-shifter, because `0` claims "in neutral". **Hardware round-trip confirmed 2026-07-28** — a 60 Hz trace over 1–6 up, 6–1 down, R and neutral showed every engagement lighting its gate cell and tracking the readout, neutral genuinely present between every pair of gears, and the paddles returning to N rather than inventing a position. | 2026-07-28 |
| SO-0024 | **Dev/debug input inspector page** (`pages/debug.html`, localhost-only) — the diagnostic for the hardware seam: live raw **axes** + **buttons** (indices + values), the loaded calibration map, and the resolved channel state. Made wheel/shifter issues visible instead of guessed, and was the tool that de-risked SO-0006's central unknown (how the G923 shifter actually reports gears) and carried the PC-side hardware handoff. | 2026-07-28 |
| SO-0023 | **Overlay capability requirements** — `gear` split into **`gear:absolute`** (which gear you're in — needs an H-shifter) and **`gear:direction`** (shift events — paddles suffice), the distinction [ADR 0007](../decisions/0007-gear-sources-are-independent.md) makes load-bearing. Overlays declare what they consume via `uses`; the **8** whose subject *is* gear position carry `requires` in `catalogue.json`, and the gallery stands them down in Live mode with the reason shown and a link to calibrate (`gallery.html`, `calibration-math.js`) rather than letting someone pick an overlay that can't run for them. *Surfacing the same fit on the configure page folds into SO-0003, which owns that surface.* | 2026-07-28 |
| SO-0029 | **Setup surface v2** — the calibration surface split from one monolithic panel into **per-component boxes** (Pedals · Wheel · Shifter · Telemetry, each its own card). `createCalibration` became a multi-mount engine (`mounts:{pedals,wheel,shifter,status}`) with the shared axis state machine unchanged — only the DOM re-homed, routed to the active box. Functional grouping (steering→Wheel, H-shifter+paddles→Shifter). Each box embeds its **real overlay as a live preview** (Pedals→pedal-blocks, Wheel→wheel, Shifter→its H-gate), driven by the same state the engine updates — resting at zero until a channel is calibrated + a wheel is connected. Live application decoupled per-channel (meters/previews react as soon as their own channel binds, not on all-pedals). Verified in-browser; 95 node tests green. Per-capability needed/optional tracked in SO-0023; sequential-shifter grouping in SO-0030. **Update (2026-07-24): the live overlay previews were shelved for go-live** — the minimal per-box calibration UI (rows/meters) is enough for now, and the double-duty visuals added noise. The box split + multi-mount engine + per-channel live meters all stayed; only the embedded overlay canvases were removed from `setup.html`. Full implementation preserved on branch `shelf/so-0029-live-overlay-setup`; re-introduction tracked as SO-0031. | 2026-07-24 |
| SO-0022 | **Overlay & setup polish** — new `pedal-blocks` pedals overlay (the cockpit pedals broken out: diegetic light-up depressing blocks); `gate-with-trail` upgraded to carry gate-map's gear numbers + NEUTRAL/GEAR callout on top of its knob trail (stale golden retired); and the setup **calibration panel** restyled from a bolted-on widget into one cohesive, host-themed component (transparent, full-width, tokenised, live meters in-row). | 2026-07-23 |
| SO-0021 | **Data-driven hero + curation/admin tooling** — the landing hero is curated in data, not code: a `hero` flag on catalogue entries, toggled in admin via a **★ Hero** control (capped at 4, enforced by a pytest), auto-arranged onto the grid's diagonals; index reads the flag. Admin also gains **Save to file** (File System Access API — writes catalogue.json directly, re-baselines dirty state), and gallery/admin cards gain **Copy OBS link** + **Copy name**. A **local-only Admin link** shows in the nav on localhost. 79 node + 225 pytest green. | 2026-07-23 |
| SO-0018 | **Gallery Demo ⇄ Live toggle** ([ADR 0006](../decisions/0006-setup-surface-pure-overlay.md)) — an Input: Demo/Live control on the gallery. Demo keeps the synthetic lap; Live swaps in the real calibrated G923 (via the same `createInputReader` + `pushHistory` path the pure overlay uses) so the whole catalogue responds to one binding at once. Pedals + steering live; telemetry (SO-0007) and shifter (SO-0006) rest — no rig source yet. Demo-only controls dim in Live; a status line reports readiness with a Setup link. Live UI verified headless; the wheel-driven path needs a real G923 to confirm end-to-end. | 2026-07-23 |
| SO-0009 | **Discovery / landing front door** (`index.html`, served at `/`) — the streamer-facing entry: hero (what this is, in the README's terms), a **live teaser** of four hero overlays animating over the shared demo driver (one per set), and the **find → set up → use** path into gallery / setup / OBS. The "use" step is honest about the [ADR 0003](../decisions/0003-obs-gamepad-fallback.md) OBS gamepad-focus gotcha and links to the setup page's guided fallback (`setup.html#obs`). Also added a **slim shared site nav** (`.sitenav`: Home · Gallery · Setup) to index + gallery + setup + admin, stitching the loose pages into one navigable site. Verified in browser (teaser animates, nav + active states, links); 78 node + 221 pytest green. | 2026-07-23 |
| SO-0013 | **Overlay page → pure renderer** ([ADR 0006](../decisions/0006-setup-surface-pure-overlay.md)) — `pages/overlay.html` stripped of all setup chrome: it reads calibration from `localStorage` via the new DOM-free `engine/live-input.js` + live input, draws, and rests at zero uncalibrated. No panel, no "press c", no error UI on a live scene — the structural fix for the mid-stream-chrome risk. Config-time-only messages (bad `?style=`, `file://`) remain. Verified headless: pure (no `#setup`/`#calmount`), transparent, paints, unit-tested mapping. | 2026-07-23 |
| SO-0017 | **Dedicated setup page (`pages/setup.html`)** ([ADR 0006](../decisions/0006-setup-surface-pure-overlay.md)) — the calibration surface extracted from the overlay: mounts the (unchanged, known-good) `calibration.js` panel, adds a live thr/brk/clu/steering readout, the [ADR 0003](../decisions/0003-obs-gamepad-fallback.md) OBS fallback guidance, the per-browser-context flow, and design slots for the deferred shifter (SO-0006) + telemetry (SO-0007). Writes the same `localStorage` key the overlay/gallery read. *(Shifter wiring itself is SO-0006.)* | 2026-07-23 |
| SO-0015 | **Admin view (`pages/admin.html`)** — the write/curate view over `catalogue.json`, rebuilt on the repo's module architecture (the gallery's live-preview engine + an edit layer) rather than porting the prototype's duplicate engine. Per-overlay stage (live/draft/experimental/excluded), hidden toggle, and editable note; edits persist in localStorage and **Export** downloads a new `catalogue.json` to commit (static-first — no backend). Shows all 72 entries incl. the 4 module-less ones (as "no module"). Verified headless: 68/68 previews paint, edit→dirty→export→revert all correct, valid JSON out. Supersedes the prototype's `catalogue.html`. | 2026-07-23 |
| SO-0012 | **Bring the design-principles doc + parked prototype into the repo** — `overlays/sim-racing/design-principles.md` (+ HTML pair; renderer-contract section reconciled to ADR 0005), the parked correlation-demo prototype under `overlays/sim-racing/prototypes/`, and the early catalogue drafts under `overlays/sim-racing/archive/`, each with a framing README. Part of consolidating the scattered design material into the repo. | 2026-07-23 |
| SO-0002 | **Gallery page over demo data** (`pages/gallery.html`) — browse all 68 non-excluded overlays animated live over a shared demo driver, filter by set/stage, search, pause/speed/shift-mode. Required extracting the missing animated demo engine: `engine/demo-lap.js` rebuilt as the richer 30s lap (gears + rpm/spd), and a new Layer-2 `engine/demo-driver.js` (`tick(dt)`) ported byte-faithfully from the prototype's `catalogue.html` — it **reproduces `qa/fixture.json` exactly**. Verified: all 68 tiles paint live, no errors (headless). **Supersedes the prototype's `catalogue.html` + `Live/gallery.html`** (a delete-gate condition). | 2026-07-23 |
| SO-0001 | **Migrate all 68 non-excluded overlays to modules** — full engine port (helpers + shifter/telemetry state + settable-global-ctx), draw bodies byte-for-byte. Verified: unit blank-tile guard, manifest coherence (`REQUIRE_FULL_COVERAGE` on), and **68/68 pixel-faithful to the reference render** (qa golden-diff). The golden faithfulness harness (`qa/`) was built alongside. | 2026-07-23 |
| SO-0000 | Scaffold the repo: layered engine extracted from the prototype, manifest quality-gate, pytest + `node --test` suites, ADRs. | 2026-07-23 |

## Details

### SO-0039 — Take the repo public {#so-0039}
**P1 · Chore · release**

Run the house repo standard and the go-public runbook in full, then flip. Going public
is a one-way door — every check happens *before* the flip. Audited 2026-07-28; findings below.

**Blockers — history. DONE 2026-07-28.**

1. ~~**Personal email in 21 of 72 commits**~~ — the GitHub noreply on the oldest 51, a personal Gmail on the
   newest 21, as *both* author and committer. Cause: `user.email` was only ever set globally on this machine,
   never `--local` in this clone, so commits made here inherited it. **Fixed** by `git filter-repo --mailmap`,
   preserving all 73 commits rather than squashing — the build record is worth keeping. `--local` identity is
   now set in this clone so it cannot recur.
2. ~~**Commit messages name private paths**~~ — five, not the three found on the first pass. **Fixed** by
   `--replace-message`. The two stragglers used the bare directory name while the first sweep searched for the
   longer path, and one of them was *this ticket's own commit message*, which named the path in the sentence
   about removing it. Worth remembering: scan the whole history for the shortest form of the term, not the
   spots you think you touched.
3. ~~**The working tree named one too**~~ — the SO-0012 row in this file. **Fixed.** Keep this file clean of
   such references, *including in this ticket*: its first draft named the paths it was warning about.

Verified after the rewrite: one identity across all 73 commits, no private path or out-of-scope framing in
any message, content byte-identical (210 tracked files), 115 node + 227 pytest green, `qa` passing. `main`
force-pushed; the three merged branches (`so-0006`, `so-0038`, `wip/demo-honest-gear`) deleted from the
remote because they still pointed at pre-rewrite commits and would have kept the old history reachable.
Deleting the branch is not a hard GC — GitHub can serve those commits by direct SHA for a while. Accepted:
what leaked was an email address, not a credential.

**Clean — verified, no action**

- No secrets in tree or history: no `.env`, `*.pem`, `*.key`, `id_rsa`, `.netrc`, `.npmrc`, `.pypirc`,
  `credentials`, `.p12` ever committed; zero `AKIA` / `BEGIN … PRIVATE KEY` / `ghp_` / `sk-` matches across
  `git log -p --all`. (`gitleaks`/`trufflehog` are not installed — this is the runbook's documented floor,
  and running one of the real scanners before the flip is still worth doing.)
- No hardcoded local paths (`C:\Users\…`, `/Users/…`, `/home/…`) anywhere in the tree.
- LICENSE present and MIT, `© Dimitri Berardi`. Repo already kebab-case. CI exists and is green.
  `qa/acceptance.mjs` is standalone and passes; `qa/product-map.md` present. All four `docs/` folders
  scaffolded with landing files, `docs/README.md` declares the MD+HTML pairing.

**Structural gaps**

4. ~~**GitHub description is empty**~~ — **done.** Description set, plus ten topics. Homepage stays empty
   until there is a host (SO-0008).
5. ~~**README has no visual**~~ — **this finding was wrong.** The README already carried an inline SVG
   data-flow diagram with a proper `aria-label`; the audit grepped for Markdown `![` and missed it.
   The README *was* rewritten to the house shape (badges, `## Model, in five words`, `## Requirements`),
   and its Status block and Roadmap were badly stale — claiming a configure page and landing page still
   to come when both had shipped.
6. ~~**`llms.txt` is materially stale**~~ — **done.** — it still says "three overlays are migrated, the rest of the
   72-overlay catalogue is pending". All 69 non-excluded overlays have been migrated since SO-0001. This is
   the file pointed at coding agents, so it is wrong in the worst possible place.
7. ~~**Stale counts elsewhere**~~ — **done.**: `docs/technical/testing.md` and `tickets.md` say "72 entries";
   `index.html` says "68 overlays". Current is 73 catalogue entries / 69 non-excluded.
8. ~~**`.pytest_cache/` is not in `.gitignore`**~~ — **done.**

**Judgement calls to make before flipping**

9. ~~**Does `docs/tickets/` go public?**~~ — **decided: yes.** The board ships, frank narrative included.
10. ~~**QA coverage regressed by design**~~ — **resolved, but not the way the audit assumed.** The
    prototype is not on this machine, and recapturing from it would have been *wrong* anyway: those 29
    overlays deliberately no longer match it. They were re-baselined from the modules instead, which makes
    them a regression baseline rather than a fidelity one — a real difference, now documented in
    `acceptance.mjs`, `testing.md` and `product-map.md` rather than left implicit. Back to **69/69**.
    Also removed 4 orphan goldens for `excluded` overlays that no module can ever render.
11. ~~**Debris sweep**~~ — **done.** No `TODO`/`FIXME`/`XXX`/`HACK` in tracked source, no stray debug
    prints, no unreferenced files, no untracked junk. The three merged branches were deleted as part of
    the history rewrite.
12. **Post-flip**: update this repo's row in the cross-repo manifest (it still reads private), then load the
    public URL logged out and confirm README, badges and links render for a stranger.

### SO-0004 — OBS gamepad fallback flow {#so-0004}
**P2 · Feature · setup**

The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. Per [ADR 0006](../decisions/0006-setup-surface-pure-overlay.md) this ladder lives on the **setup page (SO-0017)**, not the overlay — the overlay is pure render and can't show fallback UI on a live scene.

**Not a launch blocker.** The launch-critical piece — the *written* guidance (Interact → Window Capture) — already shipped on the setup page (SO-0017, the `#obs` card). What remains here is the **interactive** version: auto-detect "no device after N seconds" and surface the ladder dynamically. A UX enhancement, hence backlog, not On-deck. The **local bridge** is the Path B alternative if per-context calibration proves too clunky.

### SO-0005 — Collapse near-duplicate overlay families {#so-0005}
**P3 · Chore · catalogue**

The 3 `Wheel` variants and the `bars`/`history` clusters. Family metadata exists to support this.

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

### SO-0025 — Site style kit — encode design tokens, point every page at it {#so-0025}
**P2 · Chore · site**

Every page (`index`/`gallery`/`setup`/`admin`) re-declares the same `:root` palette (`--asphalt`, `--ink`, channel colours…), `.sitenav`, buttons, and cards inline. Define the design tokens + shared components **once** (single source — CSS custom properties / a shared stylesheet), encode it, and repoint every page at it, so a colour or nav tweak is one edit, not five. Best done **before** more UI proliferates (the debug page, configure) so they inherit the kit instead of copying more chrome. The overlay draw palette (`draw-kit.js` `C`) is a separate canvas-side concern — decide whether the two share a source of truth.

### SO-0026 — Integration + browser test coverage for the live input path {#so-0026}
**P2 · Chore · qa**

Deepen coverage past today's layers. Node integration now mocks `navigator.getGamepads` + `localStorage` to run `poll()` end-to-end (`tests/live-reader.integration.test.mjs`), but two seams remain uncovered: (1) a **browser** pass that injects a **synthetic gamepad** (Playwright/CDP) to drive `overlay.html` / gallery Live and assert real paint — the closest automatable proxy for the real-wheel round-trip; (2) **DOM tests for the gear capture UI** once it exists (SO-0006). The real-G923 round-trip stays a manual hardware check. Fold the browser layer into the `qa/` acceptance harness. Sits under the [SO-0027](#so-0027) coverage audit.

### SO-0027 — Ensure integration test coverage is sufficient across the repo {#so-0027}
**P2 · Chore · qa**

The standing audit that integration coverage is sufficient across **every** surface, not just the live-input path — the gap between "units pass" and "the wired-together thing works." Walk each surface in the QA product map: the reader path (done — `tests/live-reader.integration.test.mjs`), the calibration **write→read round-trip**, the gallery/admin page flows, the demo-driver↔overlay contract, and the configure/URL path once it exists. [SO-0026](#so-0026) is the first concrete instance under this; this ticket keeps the question honest as new surfaces land. Output is a coverage map + the missing tests, not a one-off.

### SO-0028 — Light vs dark mode support {#so-0028}
**P3 · Idea · site**

The site is dark-only today — each page hardcodes the `--asphalt`/`--ink` dark palette. Investigate a light theme + a toggle (or honour `prefers-color-scheme`). Rides directly on [SO-0025](#so-0025): once the palette is design tokens in one place, a theme is a second token set rather than a per-page rewrite — so the style kit comes first. Note the overlays render on a transparent canvas for OBS and are their own visual system (`draw-kit.js` `C`); light/dark is a **site-chrome** concern, most likely not the overlays themselves.

### SO-0030 — Sequential shifter input: confirm HID model + grouping {#so-0030}
**P3 · Chore · input**

A sequential shifter (an aftermarket lever, or a wheel's sequential mode) — does it register as two momentary **up/down buttons** (the same HID model as paddles) or as an axis/rocker? Best guess: **up/down buttons**, i.e. identical to the paddle model, so it would ride SO-0006's existing "Paddles" (sequential) capture path and group with the **Shifter**, not the wheel — an absolute H-shifter is the odd one out (one button per position). Confirm on real hardware (none on hand — untestable now), then finalise the label (likely "Paddles / sequential") and the grouping (SO-0029, done). Blocks nothing; a correctness + labelling check on SO-0006's sequential path. **Update (2026-07-24):** the setup UI now ships this assumption — the Shifter box treats **paddles / sequential as one control** (labelled "Paddles / sequential", captured as a single up/down pair), separate from the absolute H-shifter. What remains is the hardware confirmation that a real sequential lever reports as those two momentary buttons (not an axis/rocker); if it doesn't, the capture path — not the grouping — is what changes.

**Update (2026-07-27) — half-confirmed.** The G923's **paddles** capture cleanly as two distinct momentary
buttons (4 = up, 5 = down) through the existing pair path, so the model and grouping hold for paddles. A real
**sequential lever** is still untested — none on hand — so whether one reports as the same two momentary
buttons remains open. That is now the only thing left in this ticket.

### SO-0031 — Live overlay previews on setup: shelved, revisit post-launch {#so-0031}
**P3 · Idea · setup/UX**

SO-0029 embedded each calibration box's real overlay as a live preview (Pedals→pedal-blocks, Wheel→wheel, Shifter→H-gate). Shelved on 2026-07-24 for go-live: the minimal per-box calibration UI (rows/meters) is enough, and the box's calibration widget + overlay preview visualised the same channel twice (double duty). Removed only the embedded canvases from `setup.html`; the box split, multi-mount engine, and per-channel live meters stayed. **Full working implementation preserved on branch `shelf/so-0029-live-overlay-setup`** — restore from there rather than rebuilding. If revisited, the handoff's "overlay-only" direction (overlay as the single hero visual per box, stripping the rows/meters) is the design to weigh against just re-adding the previews alongside. Blocks nothing; pure polish.

### SO-0032 — Extra forward gears (up to 8): dynamic gear count {#so-0032}
**P3 · Feature · engine/overlays**

Rigs vary — 6, 7, or 8 forward gears; the model hardcodes six. The fix is **not** "add a 7th" but a **dynamic gear count** (a rig has N forward gears, default 6, up to 8) threaded from calibration into the draw path, with overlays rendering to the actual max rather than a constant. That's an overhaul: `calibration-math.js` `GEAR_LABELS` is `["R","1".."6"]`; the calibration gate UI lays out a fixed 3×2 + R (7–8 need an extra column / re-flowed gate); and **~8 overlays loop `g<=6` with layout math baked to six** — `gate-heatmap`, `gate-map`, `gate-with-trail`, `gear-donut`, `gear-ladder`, `gear-timeline`, `sequential-column`, plus `engineer-view`'s `v/6` gear normalization (which becomes `v/max`). Also re-baselines the `qa/` golden pixel diffs for every gear overlay touched. The read side (`resolveShifterGear`, the button map) is already gear-count-agnostic — it captures whatever you bind — so the work is UI/layout + rendering, not input logic. Sequence after the SO-0006 hardware round-trip so a real 7-/8-speed can verify it.

### SO-0033 — Bulk overlay import: merge into an existing scene collection {#so-0033}
**P3 · Feature · OBS onboarding**

Adding overlays to OBS is one-at-a-time: Copy OBS link → new Browser Source → paste → set the size. Fine for
two, tedious for ten. A generator that emitted a whole scene collection was **built and then pulled** (see the
history around `2ced888`), because the delivery model was wrong: **OBS cannot copy or paste sources or scenes
between scene collections.** It is a long-requested missing feature, so "switch to the StreamOverlays
collection and copy what you want into yours" cannot work at all. The generator itself was sound — correct
render sizes, `shutdown: true`, hidden-and-centred so nothing loaded until unhidden, and it imported cleanly.

The delivery has to invert: **merge into the user's own collection** rather than ship a separate one. They
export theirs (Scene Collection → Export), drop the `.json` on the gallery, the page injects the overlay
sources plus a scene per set into *their* collection, and they re-import. Everything then lives in one
collection, where normal copy/paste works. Fully client-side, so it stays static-first (ADR 0002) and the URLs
keep pointing at whatever origin serves the page.

Needs handling: source/scene **name collisions** with whatever they already have (suffix, don't clobber);
preserving their `current_scene`, `scene_order` and collection `name`; fresh UUIDs; and a clear "this rewrites
your collection, keep the original" warning, since the input is the user's real setup.

**Alternative worth noting:** the [Source Copy](https://obsproject.com/forum/resources/source-copy.1261/)
plugin by Exeldro *does* copy scenes between collections. If a user has it, the pulled standalone-collection
approach works as originally intended — so this could ship as "install Source Copy, then import our
collection" instead of, or alongside, the merge. That trades a plugin dependency for much less code.

Reference: the setup-only collection that survives (`engine/obs-collection.js`) is the working example of the
format — the source/scene/item builders there are directly reusable.

### SO-0034 — `terminal` fails cross-machine on text antialiasing {#so-0034}
**P2 · Bug · qa**

**Partly fixed (2026-07-27); reopened narrower.** The font-loading half is done — faces are now requested by
name and verified, and vendored into `qa/fonts/` so QA needs no network. See the commit and
`qa/fonts/README.md`.

> **The symptom is currently masked, not fixed (2026-07-28).** `terminal` was one of the 29 overlays whose
> backing moved to the plate in SO-0038, so **its golden was retired along with the other 26** and `npm run qa`
> now reports PASS. Nothing about the antialiasing difference was addressed — the comparison simply no longer
> happens. When `terminal`'s golden is recaptured, expect the ~1.47% delta to return, and do not read the
> current green as evidence this is done.

**The original diagnosis below was wrong about the symptom.** `terminal`'s 1.47% failure is *not* font
substitution: it persists with the real font loaded (1348px / 1.465% with, vs 2499px / 2.716% in a fallback).
What the font bug actually caused was **order-dependence** — `acceptance.mjs` reuses one page across all 69
navigations, so the first overlay to draw text triggered the lazy load too late for itself while caching the
face for every overlay after it. Whichever overlays sorted early rendered in a fallback. Real bug, now fixed,
but not this one.

What remains: `terminal` is the glyph-densest overlay and differs ~1.47% between machines **with identical
fonts** — cross-platform subpixel antialiasing and hinting against a golden captured elsewhere. Options are to
raise the tolerance for glyph-dense overlays (the harness already comments that they "legitimately differ
~0.5%"), diff with a text-insensitive metric, or accept per-machine baselines. Note that **recapturing is not
possible from an arbitrary machine**: `capture-golden.mjs` renders through the *prototype* `catalogue.html`,
passed as a runtime arg and deliberately absent from this repo.

<details><summary>Original (superseded) diagnosis</summary>

`qa/render.html` does `await document.fonts.ready` before drawing, commented *"render with the real font, not
a fallback"*. It does the opposite. Nothing on the page has requested IBM Plex Mono at that point, so there
are zero pending font loads, `ready` resolves immediately, and the canvas paints with the OS fallback.
Measured at draw time: `document.fonts.check("600 16px 'IBM Plex Mono'")` is `false`, and text through the
declared stack measures identically to the pure fallback (52.78px); after an explicit `document.fonts.load()`
the same string measures 57.60px — **9.1% wider**.

So every golden encodes whichever mono the *capturing machine* falls back to — Menlo on the Mac, Consolas on
Windows. The visible symptom is `terminal` (the glyph-densest overlay) failing at **1.47%** against a 0.6%
tolerance on the PC while passing on the Mac, with bar geometry shifting ~13px because it is derived from
measured text width. The harness already half-knows: `acceptance.mjs` comments that glyph-dense overlays
"legitimately differ ~0.5%".

Fix is `document.fonts.load(...)` per family/weight before the draw — but that changes all 69 renders and
needs a **full golden recapture**, agreed across both machines, and it makes QA depend on reaching Google
Fonts (silently re-falling-back offline and in CI). Vendoring the fonts into `qa/` would close that hole and
is probably the right shape. Not urgent — it is a QA-fidelity bug, not a product one — but the goldens are
currently only meaningful on the machine that captured them, which quietly halves their value.

</details>

### SO-0035 — The gallery's Mode button does nothing in Live {#so-0035}
**P3 · Chore · gallery**

`Mode: H / SEQ / PADDLE` sets a draw-kit global controlling shift *animation* only — throw duration and the
synthetic clutch dip (`MODES`, `draw-kit.js`). It is demo storytelling: `demo-driver.js` reads it, and exactly
one overlay (`throw-timer`) reads it directly. The live path deliberately ignores it, deriving H vs paddle
timing from the actual calibration instead (`live-input.js`), so live can never clobber the demo control.

After [ADR 0007](../decisions/0007-gear-sources-are-independent.md) the live shift mode is fully derived from
what you calibrated, which leaves a control that in Live mode changes nothing except `throw-timer`'s display.
It sits in a `.grp.demo-only` group so it dims, but dimmed-yet-does-something-to-one-overlay is a worse story
than either honest option: **relabel it** ("Demo shift feel") or **hide it outright in Live**. Small, but it
is the kind of thing that makes a UI feel untrustworthy.

### SO-0036 — Calibration import/export {#so-0036}
**P3 · Idea · setup · obs**

Consider adding import/export of calibration. Determine whether an export taken in a normal browser can be
**imported into OBS's Web View**, so setup can be *almost* fully done in one place instead of calibrated twice.

Today calibration is per-browser-context by design ([ADR 0001](../decisions/0001-config-in-the-url.md) keeps
*config* in the URL precisely because `localStorage` doesn't cross contexts) — and the setup page's "Using it
in OBS" card tells people to redo it there. That's the friction this would remove: the rig is the same physical
hardware either way, so recalibrating it in a second browser is busywork, not a real second measurement.

Open questions, in the order they'd sink it:
1. **Can OBS's Web View receive an import at all?** It has no visible file picker in the Interact window, so a
   file-based `<input type=file>` may be unreachable. Paste-a-blob into a textarea is the fallback that most
   likely works, and would set the format (a small JSON payload, hand-pasteable).
2. **Does the button map even transfer?** Gamepad indices are per-browser-context. If OBS's Chromium enumerates
   the G923's axes/buttons identically to desktop Chrome, the map is portable; if the indices shift, an import
   is worse than useless because it would look calibrated while reading the wrong buttons. **Verify on hardware
   before building anything** — this is the load-bearing unknown, and it is cheap to test with the debug page
   (`pages/debug.html`, SO-0024) open in both contexts.
3. Only then: the UI, and whether export is also useful for backup / moving to a new PC (probably yes,
   independent of whether the OBS path works).

Pairs with [SO-0004](#so-0004) (the OBS fallback ladder) and [SO-0033](#so-0033) (bulk overlay import) — all
three are "make the OBS side less manual". Sequence after those only if the index question in (2) comes back
favourable.

### SO-0037 — Plate padding {#so-0037}
**P3 · Feature · configure**

Several overlays sit tight against the plate's edge and want breathing room. Add a **padding** lever
alongside the plate's colour / opacity / radius from SO-0003 (done) — bounded, not free-form.

Deferred from SO-0003 because, unlike radius, **this is not just a lever the renderer already supports**.
`url-config.js` has no `padding`, so it needs a new param, a new default, and `overlay.html` has to inset the
drawing within a larger stage. The consequence is the part to think about rather than the CSS:

- **It moves the size contract.** The plate grows by `2 × padding`, so the Browser Source dimensions change.
  The gallery card's advertised size, its `title`, and the copy confirmation all derive from
  `size × scale` and would each need to account for it — the exact drift the size badge was written to
  prevent. Someone who already placed a source in OBS would need to resize it.
- **Bound it.** An unbounded padding is a way to make a 5000px source by accident; a small capped range
  (say 0–40px, mirroring radius) keeps it a finishing touch rather than a layout tool.
- Decide whether it is **global-only** (like radius) or **per-overlay** (like colour/opacity). Per-overlay is
  the more useful answer — padding need is a property of the individual drawing, not of the set — but it is
  also the one that makes the size badge vary per card.

Worth doing after [SO-0008](#so-0008); it is polish, and it touches the renderer's public URL contract, which
is a thing to change deliberately rather than late in a session.

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
