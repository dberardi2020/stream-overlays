# Overlay design principles

The rules that produced the current designs. Read this before adding a new visual so the next one belongs with the others.

---

## 1. Data honesty is the first rule

Every visual declares where its data comes from, and there are only two answers.

- **Direct** - read off the rig over HID. Pedal axes, wheel axis, shifter buttons, paddle presses. Works with no game integration.
- **Telemetry** - only the game knows it. RPM, speed, fuel, tyre temp, the gear the gearbox is actually in.

There is no third category. **Never infer one signal from another.** Do not estimate rpm from throttle. Do not count paddle presses to produce a gear number - counting a position drifts, and a gear readout that is quietly wrong is worse than no gear readout.

Counting *events* is fine. A shift counter cannot drift because it never claims to know a position.

**Test:** if the value can disagree with reality and the overlay would not notice, it does not go on screen.

---

## 2. The renderer contract

Every overlay is one module exporting `draw(ctx, w, h, s, mem)` — the tiny contract in [ADR 0005](../../docs/decisions/0005-overlay-module-contract.md):

- `s` holds direct rig values: `thr brk clu str gear lever shiftAge shiftDir shiftProg`
- telemetry (`rpm spd`) lives on a **separate `tel` object**, imported explicitly from the engine — it is never a field on `s`

A visual that never imports `tel` is *provably* rig-only. That is not documentation, it is enforcement — reading `s.rpm` yields `undefined` by design, so a telemetry value can't sneak in through the input state.

Every visual is a pure function of state plus its own `mem` object for accumulators. No visual reads another visual's state. Adding a design means adding one file.

---

## 3. Draw the mechanism, not a symbol

Where a real physical thing exists, honour how it moves.

- The H-gate knob travels **out to the neutral rail, along the rail, then into the gear.** Never diagonally. That is how the lever actually moves.
- Mid-throw the lever really is in neutral, so the gate reads **N** and so does every gear numeral. This is not a nicety - it is what the buttons report.
- Pedals **travel** as they are pressed. Prefer translation over rotation: `Pedal Box` renders a
  literal side-on hinge "like the real G923" and reads worse than the top-down treatment in
  `Cockpit`, which slides the pedal a few px and deepens its fill. Honouring the mechanism does not
  mean reproducing the geometry — at overlay scale a hinge reads as a wobble.
- The wheel is a flat-bottomed rim with spokes and a hub, not a circle with a cross through it.

Skeuomorphism for its own sake is noise. Skeuomorphism that encodes real behaviour is information.

---

## 4. Colour is a fixed vocabulary

| Channel | Colour | |
|---|---|---|
| Throttle | `#34d97a` | green |
| Brake | `#f2453d` | red |
| Clutch | `#ffb020` | amber |
| Steering | `#64b5ff` | blue |
| Gear / neutral text | `#e7e3da` | bone |

These never change meaning between visuals. A viewer learns the vocabulary once. Neutral and inactive states use the same hue at reduced alpha, never a different hue.

Amber doubles as the interface accent. Purple (`#c77dff`) marks telemetry in the catalogue chrome only - it never appears in an overlay.

---

## 5. The overlay sits on pixels you do not control

- Assume the backdrop can be bright sky, dark tunnel, or a busy crowd. Test against light, dark, and checker. (The gallery's Backdrop builder exists for exactly this.)
- Use the glass treatment (`rgba(8,9,12,0.55)` fill, `rgba(255,255,255,0.14)` hairline border) when a visual needs a readable ground. Skip it when the shape is self-evident.
- No pure white, no pure black. Both vibrate against video.
- Text gets weight or a plate behind it, never a drop shadow as a crutch.

---

## 6. Glance versus study

Decide which one a visual is for, and commit.

- **Glance** - bars, numerals, gate position, shift pulses. Legible in under half a second, no history.
- **Study** - traces, histograms, timelines, scatter. Reward a viewer who is paying attention.

A design that tries to be both is usually worse at both. Combined layouts should pair one of each rather than stacking three studies.

---

## 7. Motion means something or it does not happen

Every animation maps to a real event: a pulse on shift, a flash on countersteer, a decaying peak marker. Nothing loops, breathes, or drifts for atmosphere. If the rig is still, the overlay is still.

The one exception is a decay envelope, which is legitimate because it encodes recency.

---

## 8. Silence is a valid state

The best visuals say nothing when nothing has happened. Countersteer flash is invisible until you catch a slide. Shift pulse is dim between shifts. An overlay that is always shouting stops carrying information.

---

## 9. Accumulate when it is free

Session-long state costs almost nothing and adds a story arc: gate heatmaps, gear donuts, angle histograms, shift counts. Prefer designs that get more interesting the longer the stream runs.

Anything accumulating needs an obvious reset.

---

## 10. Name what can be wrong

A shifter button reports where the **lever** is, not where the **gearbox** is. Miss a shift and they disagree. Label the thing you are actually showing (`LEVER`, not `GEAR`, where the distinction matters) rather than papering over it. The disagreement is interesting content, not a bug to hide.

---

## 11. Fixed pixel sizes

Each visual has a native size and is designed at it. Never scale a browser source in OBS - it resamples and goes soft. If you need it bigger, add a scale parameter that redraws at the larger size.

Design for a real slot: corner card, lower third, tall column. "Whatever size it ends up" produces designs that fit nowhere.

---

## 12. Typography

- **Oxanium** for numerals and titles - technical, motorsport-adjacent, strong digits.
- **IBM Plex Mono** for labels and data - tabular figures so numbers do not jitter as they change.
- Labels are uppercase, ~9-10px, letter-spaced, at ~66% white.
- Values are the loudest thing in any visual. Labels are the quietest.

---

## Checklist for a new visual

1. What does it read? List the channels. Any of them from `tel`?
2. Is anything inferred? If yes, cut it or reduce it to an event.
3. Glance or study?
4. Does it use the standard colour vocabulary?
5. Is it readable on a bright backdrop and a dark one?
6. Is it still when the rig is still?
7. Does it have a native size and a slot it is designed for?
8. If it accumulates, can it be reset?
9. Is anything on screen capable of being wrong without saying so?

---

These principles describe how a visual should behave. The overlay modules under [`overlays/`](overlays/) are the current designs, the [gallery](pages/gallery.html) shows them in motion, and the early drafts under [`archive/`](archive/) are where they were worked out.
