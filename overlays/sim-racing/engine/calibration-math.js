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
