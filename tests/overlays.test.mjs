/* Engine + overlay tests that need a JS runtime — run with `node --test`.
 *
 * Three things the Python suite can't reach:
 *   1. the pure calibration maths, exercised directly;
 *   2. the overlay module contract (id + draw export);
 *   3. the blank-tile guard — the failure that bit the prototype. Each overlay is
 *      drawn against a recording mock canvas and must actually paint. An overlay
 *      that throws, or silently paints nothing, fails here instead of on stream.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { mapPedal, mapWheel, clamp } from "../overlays/sim-racing/engine/calibration-math.js";
import { pushHistory } from "../overlays/sim-racing/engine/draw-kit.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SIM = join(HERE, "..", "overlays", "sim-racing");
const MANIFEST = JSON.parse(readFileSync(join(SIM, "catalogue.json"), "utf8"));
const PILOTS = ["bowtie", "dot-ladder", "comet"];

/* ---------- pure calibration maths ---------- */
test("clamp bounds a value", () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.3, 0, 1), 0.3);
});

test("mapPedal scales rest..full to 0..1", () => {
  assert.equal(mapPedal(0.1, 0.1, 0.9), 0);        // at rest
  assert.equal(mapPedal(0.9, 0.1, 0.9), 1);        // at full press
  assert.equal(mapPedal(0.5, 0.1, 0.9), 0.5);      // halfway
  assert.equal(mapPedal(1.5, 0.1, 0.9), 1);        // clamps past full
  assert.equal(mapPedal(0.05, 0.1, 0.9), 0);       // clamps below rest
  assert.equal(mapPedal(0.5, 0.5, 0.5), 0);        // zero span -> 0, no NaN
});

test("mapWheel scales to -1..+1 with independent sides", () => {
  assert.equal(mapWheel(0, 0, -1, 1), 0);          // centre
  assert.equal(mapWheel(1, 0, -1, 1), 1);          // full right
  assert.equal(mapWheel(-1, 0, -1, 1), -1);        // full left
  assert.equal(mapWheel(0.5, 0, -1, 1), 0.5);
  assert.equal(mapWheel(2, 0, -1, 1), 1);          // clamps
  // off-centre rest, asymmetric travel
  assert.equal(mapWheel(0.2, 0.2, -0.3, 0.7), 0);
  assert.equal(mapWheel(0.7, 0.2, -0.3, 0.7), 1);
  assert.equal(mapWheel(-0.3, 0.2, -0.3, 0.7), -1);
});

/* ---------- a recording mock 2D context ---------- */
function mockCtx() {
  const paints = { fill: 0, fillRect: 0, stroke: 0, fillText: 0 };
  const noop = () => {};
  const ctx = {
    beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, roundRect: noop,
    closePath: noop, clip: noop, save: noop, restore: noop, translate: noop,
    rotate: noop, scale: noop, clearRect: noop, setTransform: noop,
    fill: () => { paints.fill++; },
    fillRect: () => { paints.fillRect++; },
    stroke: () => { paints.stroke++; },
    fillText: () => { paints.fillText++; },
    measureText: () => ({ width: 0 })
  };
  // Absorb any property assignment (fillStyle, font, lineWidth, textAlign, ...).
  const proxy = new Proxy(ctx, { set: () => true, get: (t, k) => k in t ? t[k] : noop });
  return { ctx: proxy, paints, total: () => Object.values(paints).reduce((a, b) => a + b, 0) };
}

/* ---------- overlay module contract + blank-tile guard ---------- */
for (const id of PILOTS) {
  test(`overlay ${id}: exports id + draw, and paints something`, async () => {
    const entry = MANIFEST.find(e => e.id === id);
    assert.ok(entry, `${id} is in the manifest`);

    const mod = await import(`../overlays/sim-racing/overlays/${id}.js`);
    assert.equal(mod.id, id, "exported id matches");
    assert.equal(typeof mod.draw, "function", "exports a draw()");

    // Populate history so history-reading overlays (comet) have samples to draw.
    const state = { thr: 0.6, brk: 0.4, clu: 0.2, str: 0.3, real: true, lapTime: 0 };
    for (let i = 0; i < 80; i++) pushHistory(state);

    const m = mockCtx();
    const mem = {};
    assert.doesNotThrow(() => mod.draw(m.ctx, entry.size.w, entry.size.h, state, mem),
      `${id}.draw() threw`);
    assert.ok(m.total() > 0, `${id}.draw() painted nothing — blank tile`);
  });
}
