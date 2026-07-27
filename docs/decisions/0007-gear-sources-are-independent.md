# 0007 — The H-shifter and paddles are independent sources; paddles never yield a gear

**Status:** Accepted · **Date:** 2026-07-26

## Context

SO-0006 shipped gear support with a **single-slot** calibration: `S.map.gear` held exactly one of `{mode:"shifter", buttons}` or `{mode:"paddles", up, down}`. The Rig Setup page nonetheless showed both controls side by side, with no toggle and a Calibrate *and* Clear button each — so calibrating one silently destroyed the other, and either Clear wiped both. That was chosen to keep the live-read path and the existing gear tests unchanged, not because it matched the hardware.

It does not match the hardware. On a G923 the paddles are permanently on the wheel and the Driving Force Shifter is a separate unit people leave plugged in and use per-car. Both are just button indices on one gamepad. There was never a reason the map could not hold both, and the UI already promised that it did.

Underneath sat a second, worse problem. The paddle read path synthesised an absolute gear by integrating ±1 steps (`stepSequentialGear`), walking a counter from wherever it assumed you were. Its own test recorded the tell: `stepSequentialGear(0, -1) === 0`, commented *"no reverse via paddles"*.

## Decision

**Store both halves independently, and never infer a gear position from paddles.**

```js
S.map.gear = { shifter: { buttons: { R,1..6 -> index } },   // optional
               paddles: { up, down } }                      // optional
```

The two report different physical facts and are read separately:

| Source | Reports | Yields |
|---|---|---|
| H-shifter | **Position** — a gear is a held button | `gear`, `lever`, `gateUse`, and direction by diffing |
| Paddles | **Direction** — a pull is an edge | `shiftDir`, `shiftCount`, `shiftLog`, `shiftTimes`, and nothing else |

`state.gear` is non-null **if and only if** an H-shifter is calibrated. With no position source it is `null` — *unknown* — never `0`, because `0` means "in neutral" and that is a claim nothing observed. `stepSequentialGear` is deleted.

Each overlay declares which it reads via `uses` (`gear:absolute` / `gear:direction`, derived by `build/channels.py`, not hand-authored). Overlays whose *subject* is the gear position carry `requires: ["gear:absolute"]` and are stood down in Live mode without an H-shifter, with the reason shown.

## Rationale

- **An integrated gear cannot be resynced.** Start a session in 3rd, or drop one edge, and every gate overlay reads wrong for the rest of the stream. Nothing in the system can detect it, so nothing can correct it. A wrong gear on stream is worse than an absent one.
- **The asymmetry is real and one-directional.** An H-shifter can serve both overlay families honestly — 2→3 *is* an upshift, measured. Paddles cannot serve the position family at all. So this is not a symmetric "two modes" choice; it is a superset and a subset.
- **No arbitration is needed.** Because no overlay consumes both kinds as interchangeable, there is no "which source wins" rule and no runtime mode. The source is a static property of the overlay. This is *simpler* than the single-slot design it replaces, not more complex.
- Both may be mapped at once and each simply reports the motion that happened; a paddle pull is a real event even while the H-shifter holds a gear.

## Consequences

- **Unknown must be rendered, not hidden.** `gearName(null)` is `"–"`. Overlays where gear is incidental (`hud`, `dash-cluster`, `cockpit`, …) keep running and show `"–"`; the eight where it is the subject are gated out of Live mode instead, because an empty gate reads as broken rather than honest.
- **A pedals-only rig changes behaviour**: its gear digit was `"N"` and is now `"–"`. That is the same principle applied consistently — no shifter, no gear — and it is a visible change for users who added no hardware.
- Comparison-driven highlights (`g === s.lever`) degrade to nothing lit, which is correct and needed no change.
- Gating is now **load-bearing for correctness**, not cosmetics: `gate-map` and `gate-with-trail` print a `"NO SHIFTER"` callout as a backstop.
- Old single-slot calibrations are migrated on read by `normalizeGearMap`, so no one loses a calibration.
- **SO-0032 (dynamic gear count) gets slightly cheaper** — the hardcoded clamp to 6 lived in `stepSequentialGear` and is gone.

## Alternatives considered

- **Last-input-wins arbitration.** Whichever control moved most recently becomes authoritative. Rejected: it makes the shift mode runtime state rather than config, rippling into `lever`/`shiftProg` and every overlay reading them — and it solves a conflict that does not exist once overlays declare their source.
- **Keep the integration, mark it approximate.** Rejected under the stated principle: if it could be untrue, it is not supported.
- **Gate every overlay that shows a gear digit.** Rejected as too blunt — a paddles-only rig would lose `hud` and `dash-cluster`, where gear is a minor field beside pedals and rpm.
