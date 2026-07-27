/* Pure calibration math — Layer 1.

   No DOM, no canvas, no Gamepad API, no browser globals. Every function here is
   a pure mapping from raw axis values + a captured calibration to a normalised
   channel value. This is the layer that runs unchanged under `node --test`.

   The maths is lifted verbatim from the original single-file prototype
   (calibration.js `applyLive`); it was extracted, not rewritten, so behaviour is
   identical — the point of the split is that it is now reachable by a test. */

export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

/* Pedals are a unipolar stroke: rest → full press maps to 0..1. Bars only reach
   100% at the real full-press extreme captured during calibration, so travel is
   scaled to the actual pedal, not the raw axis range. */
export function mapPedal(axisValue, rest, full) {
  const span = full - rest;
  return span ? clamp((axisValue - rest) / span, 0, 1) : 0;
}

/* Steering is bipolar: rest is centre, min/max are the swept extremes. Maps to
   -1..+1, scaling each side independently so an off-centre rest still reads 0. */
export function mapWheel(axisValue, rest, min, max) {
  let str = 0;
  if (axisValue >= rest) { const d = max - rest; str = d ? (axisValue - rest) / d : 0; }
  else { const d = rest - min; str = d ? -(rest - axisValue) / d : 0; }
  return clamp(str, -1, 1);
}

/* ---- gear / shifter (SO-0006) ----
   The engine's gear value: 0 = neutral, 1..6 = forward, -1 = reverse. The rest
   of the system (GATE, gateUse, gearName) was built for N + 1..6; reverse is the
   one value outside that, represented as -1 and rendered "R". */

// The capture order the H-shifter flow walks the user through.
export const GEAR_LABELS = ["R", "1", "2", "3", "4", "5", "6"];

// A stored gear-button label -> the numeric gear value overlays read.
export const gearValue = label => label === "R" ? -1 : Number(label);

/* Absolute H-shifter: which calibrated gear button is currently held? Returns
   that gear's value, or 0 (neutral) when none is. `isDown(index)` is a predicate
   so this stays pure — the caller supplies the live button read. If more than one
   is somehow held, the first captured wins (an H-shifter only engages one). */
export function resolveShifterGear(buttons, isDown) {
  if (!buttons) return 0;
  for (const label of Object.keys(buttons)) {
    if (isDown(buttons[label])) return gearValue(label);
  }
  return 0;
}

/* Paddles report DIRECTION, never position — there is deliberately no
   paddles->gear function here. Integrating a gear from ±1 steps requires knowing
   the gear you started in, and nothing reports that: begin a session in 3rd, or
   miss one edge, and every downstream gate reads wrong for the rest of the
   stream with no way to resync. An absolute gear comes from an H-shifter or it
   does not exist (`gear: null`). See ADR 0007. */
