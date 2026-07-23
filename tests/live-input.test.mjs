/* Live input reader — run with `node --test`.
 *
 * The pure overlay reads calibration via engine/live-input.js `applyInput`, which
 * must map a saved calibration + a live pad onto the channel state EXACTLY as the
 * calibration engine's own `applyLive` does — they're the read/write sides of one
 * localStorage contract. This asserts the mapping stays consistent with the shared
 * calibration maths, so the two can't drift. (poll() itself needs the Gamepad API,
 * so it's exercised in the browser QA, not here.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyInput } from "../overlays/sim-racing/engine/live-input.js";
import { mapPedal, mapWheel } from "../overlays/sim-racing/engine/calibration-math.js";

const MAP = {
  thr: { axis: 0, rest: -1, full: 1 },
  brk: { axis: 1, rest: -1, full: 1 },
  clu: { axis: 2, rest: -1, full: 1 },
  steering: { axis: 3, rest: 0, min: -1, max: 1 }
};

test("applyInput maps pedals + steering exactly via the shared calibration maths", () => {
  const pad = { axes: [1, -1, 0, 0.5] };
  const s = { thr: 0, brk: 0, clu: 0, str: 0 };
  applyInput(s, MAP, pad);
  assert.equal(s.thr, mapPedal(1, -1, 1));
  assert.equal(s.brk, mapPedal(-1, -1, 1));
  assert.equal(s.clu, mapPedal(0, -1, 1));
  assert.equal(s.str, mapWheel(0.5, 0, -1, 1));
});

test("applyInput rests steering at zero when uncalibrated for it", () => {
  const s = { thr: 0, brk: 0, clu: 0, str: 0.9 };
  applyInput(s, { thr: MAP.thr }, { axes: [0.2, 0, 0, 0.7] }); // no steering entry
  assert.equal(s.str, 0);
});

test("applyInput skips a channel whose axis is absent on the pad", () => {
  const s = { thr: 0, brk: 5, clu: 0, str: 0 };
  applyInput(s, { thr: MAP.thr, brk: { axis: 9, rest: -1, full: 1 } }, { axes: [1] });
  assert.equal(s.thr, mapPedal(1, -1, 1));
  assert.equal(s.brk, 5); // axis 9 missing → left untouched
});
