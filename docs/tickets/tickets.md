# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

**What is *not* here:** the steps to *take the repo public* — secrets scan, private-content sweep, the flip. Those are a **pre-flight checklist run once when the project is ready**, kept as a separate release runbook, not backlog. This board tracks *building the product*.

## In progress

*(none — SO-0001 complete; next up is the site work, SO-0002/0003/0008/0009.)*

## Open — road to a real hosted website

The product work between this pilot and "a site streamers find, set up, and use."

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0002** | Gallery page over demo data | Browse every overlay rendered against `engine/demo-lap.js`, for choosing a style. Built on the module architecture. |
| **SO-0003** | Configure page → URL generator | Bind inputs, pick style/scale/colours, emit the `?style=…` URL to paste into OBS. Realises [ADR 0001](../decisions/0001-config-in-the-url.md); no storage. |
| **SO-0004** | OBS gamepad fallback flow | The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. |
| **SO-0008** | Hosting + deploy pipeline | Pick a static host (GitHub Pages / Netlify / Cloudflare Pages — all give the HTTPS the Gamepad API requires), wire a deploy from `main`, decide on a domain. See [ADR 0002](../decisions/0002-static-first-hosting.md). |
| **SO-0009** | Discovery / landing front door | The streamer-facing entry: what this is, the overlay gallery, and the path into configure. The "find it" half of "find, set up, use." |
| **SO-0010** | Wishlist / feedback form | Cheapest demand signal — no auth, an email field. Product only; any monetization sequencing is tracked privately, never in the repo. |

## Open — engine & overlays

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0005** | Collapse near-duplicate overlay families | The 3 `Wheel` variants and the `bars`/`history` clusters. Family metadata exists to support this. |
| **SO-0006** | Shifter / gear live calibration + input | The engine calibrates pedals + steering only; it does **not** capture the H-shifter (gear/lever). Tier 2 shifter overlays can render from demo/test state but can't run **live** without this. Extend `calibration.js` + `gamepad.js` to bind gear/lever. |
| **SO-0007** | Telemetry data source (rpm / spd / gear-from-sim) | A G923 exposes no RPM/speed — those are **sim telemetry**, not wheel input. Tier 3 (7 overlays) and any telemetry channel need a source (a sim telemetry feed / local bridge). Until then telemetry overlays are demo-only. Design the source before promoting them past `experimental`. **Bug to fix here:** `split-panel` reads `s.rpm`, but rpm rides on the telemetry object, not the input state — so its rev arc renders empty (faithfully preserved from the reference). Fix it to read telemetry when this lands. |
| **SO-0011** | The builder — compose overlays from sub-visuals | Longer-term: assemble combos from swappable named sub-visuals + channel reordering. The module contract and named `draw-kit` callables are the groundwork; not scheduled. |
| **SO-0012** | Bring the design-principles doc + parked prototype into the repo | Add `overlays/sim-racing/design-principles.md` (the overlay design rationale, as a prose pair) and the parked correlation-demo prototype into a prototypes area. |

## Decisions to revisit (not tickets)

- **`excluded` → `archived` naming** — `excluded` means archived-not-deleted, but the word reads as *discard*. Rename the stage value?
- **Telemetry live behaviour** — how telemetry overlays behave with no sim feed (hide? placeholder? demo-only badge?). Tied to SO-0007.

## Done

| ID | Title |
| --- | --- |
| **SO-0000** | Scaffold the repo: layered engine extracted from the prototype, manifest quality-gate, pytest + `node --test` suites, ADRs. |
| **SO-0001** | **Migrate all 68 non-excluded overlays to modules** — full engine port (helpers + shifter/telemetry state + settable-global-ctx), draw bodies byte-for-byte. Verified: unit blank-tile guard, manifest coherence (`REQUIRE_FULL_COVERAGE` on), and **68/68 pixel-faithful to the reference render** (qa golden-diff). The golden faithfulness harness (`qa/`) was built alongside. |
