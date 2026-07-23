/* Demo-driver faithfulness — run with `node --test`.
 *
 * The gallery's animated preview state (engine/demo-driver.js, built on the pure
 * engine/demo-lap.js) is a byte-faithful port of the prototype's catalogue.html
 * `tick()`. The proof: driven with the SAME deterministic step schedule the
 * golden capture used (DT = 1/60, STEPS = 480 → lapTime = 8.0s), it must
 * reproduce qa/fixture.json EXACTLY — the frozen state the goldens were rendered
 * at. If a future edit drifts the driver, this fails long before the gallery
 * looks wrong on screen. Pure (no browser), so it lives in the CI gate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createDemoDriver } from "../overlays/sim-racing/engine/demo-driver.js";
import { tel, hist, shiftLog, shiftTimes, gateUse, clock } from "../overlays/sim-racing/engine/draw-kit.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(HERE, "..", "qa", "fixture.json"), "utf8"));

const DT = 1 / 60, STEPS = 480;   // must match qa/capture-golden.mjs
const EPS = 1e-9;

function runToFixture() {
  const d = createDemoDriver();
  d.reset();
  for (let i = 0; i < STEPS; i++) d.tick(DT);
  return d;
}

test("driver reproduces the frozen input state", () => {
  const d = runToFixture();
  for (const k of Object.keys(FIXTURE.input)) {
    assert.ok(Math.abs(d.state[k] - FIXTURE.input[k]) <= EPS, `input.${k}: ${d.state[k]} vs ${FIXTURE.input[k]}`);
  }
});

test("driver reproduces telemetry + clock", () => {
  runToFixture();
  assert.ok(Math.abs(tel.rpm - FIXTURE.tel.rpm) <= EPS, "tel.rpm");
  assert.ok(Math.abs(tel.spd - FIXTURE.tel.spd) <= EPS, "tel.spd");
  assert.ok(Math.abs(clock.t - FIXTURE.clock.t) <= EPS, "clock.t");
  assert.ok(Math.abs(clock.lapTime - FIXTURE.clock.lapTime) <= EPS, "clock.lapTime");
});

test("driver reproduces the rolling history", () => {
  runToFixture();
  for (const k of Object.keys(FIXTURE.hist)) {
    assert.equal(hist[k].length, FIXTURE.hist[k].length, `hist.${k}.length`);
    for (let i = 0; i < FIXTURE.hist[k].length; i++) {
      assert.ok(Math.abs(hist[k][i] - FIXTURE.hist[k][i]) <= EPS, `hist.${k}[${i}]`);
    }
  }
});

test("driver reproduces the shifter accumulators", () => {
  runToFixture();
  assert.equal(shiftLog.length, FIXTURE.shiftLog.length, "shiftLog.length");
  FIXTURE.shiftLog.forEach((e, i) => {
    assert.ok(Math.abs(shiftLog[i].rpm - e.rpm) <= EPS, `shiftLog[${i}].rpm`);
    assert.equal(shiftLog[i].dir, e.dir, `shiftLog[${i}].dir`);
  });
  assert.equal(shiftTimes.length, FIXTURE.shiftTimes.length, "shiftTimes.length");
  FIXTURE.shiftTimes.forEach((e, i) => {
    assert.ok(Math.abs(shiftTimes[i].t - e.t) <= EPS, `shiftTimes[${i}].t`);
    assert.equal(shiftTimes[i].dir, e.dir, `shiftTimes[${i}].dir`);
  });
  for (const k of Object.keys(FIXTURE.gateUse)) {
    assert.ok(Math.abs(gateUse[k] - FIXTURE.gateUse[k]) <= EPS, `gateUse.${k}`);
  }
});
