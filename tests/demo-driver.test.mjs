/* Demo-driver faithfulness — run with `node --test`.
 *
 * The gallery's animated preview state (engine/demo-driver.js, built on the pure
 * engine/demo-lap.js) began as a byte-faithful port of the prototype's
 * catalogue.html `tick()`. Driven with the SAME deterministic step schedule the
 * golden capture used (DT = 1/60, STEPS = 480 → lapTime = 8.0s) it reproduced
 * qa/fixture.json exactly, which caught accidental drift during the port.
 *
 * The GEAR fields deliberately no longer match, and that is the point. The
 * prototype's scripted lap stepped 4 -> 3 -> 2 with no intermediate, so it could
 * not produce — or test — anything that happens when a lever crosses neutral,
 * which is every real shift. Two bugs lived in that blind spot until a G923 found
 * them. The demo now crosses neutral and runs the same gear-motion.js the live
 * rig does, so it previews the product honestly.
 *
 * So this file now asserts two different things:
 *   - the NON-gear channels still reproduce the prototype exactly (the port
 *     guard, still valuable: pedals, steering, telemetry, clock, their history),
 *   - the gear behaviour matches the CURRENT contract, not the prototype's.
 *
 * qa/fixture.json stays the prototype's frozen state — it is the goldens' input,
 * captured through the prototype engine, and nothing here regenerates it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createDemoDriver } from "../overlays/sim-racing/engine/demo-driver.js";
import { createDemoLap } from "../overlays/sim-racing/engine/demo-lap.js";
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

/* Gear-derived fields intentionally diverge from the prototype (see the header).
   `clu` is in here because the demo's synthetic clutch dip is driven by shiftAge. */
const GEAR_FIELDS = new Set(["gear", "lever", "prevGear", "shiftAge", "shiftDir", "shiftProg", "shiftCount", "clu"]);

test("driver reproduces the frozen input state (non-gear channels)", () => {
  const d = runToFixture();
  for (const k of Object.keys(FIXTURE.input)) {
    if (GEAR_FIELDS.has(k)) continue;
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

test("driver reproduces the rolling history (non-gear channels)", () => {
  runToFixture();
  for (const k of Object.keys(FIXTURE.hist)) {
    if (GEAR_FIELDS.has(k)) continue;
    assert.equal(hist[k].length, FIXTURE.hist[k].length, `hist.${k}.length`);
    for (let i = 0; i < FIXTURE.hist[k].length; i++) {
      assert.ok(Math.abs(hist[k][i] - FIXTURE.hist[k][i]) <= EPS, `hist.${k}[${i}]`);
    }
  }
});

test("telemetry is unaffected by the neutrals in the schedule", () => {
  /* Neutral has no gear ratio, and RATIO[0] is 0 — read naively that is infinite
     drive, and the car would accelerate HARDER mid-shift. demo-lap holds the last
     engaged gear for telemetry, so the speed/rpm curve is bit-identical to the
     prototype's despite the schedule having changed underneath it. */
  runToFixture();
  assert.ok(Math.abs(tel.rpm - FIXTURE.tel.rpm) <= EPS, "tel.rpm");
  assert.ok(Math.abs(tel.spd - FIXTURE.tel.spd) <= EPS, "tel.spd");
});

test("the demo lap crosses neutral between gears, like real hardware", () => {
  const { gearEvents } = createDemoLap();
  const gears = gearEvents.map(e => e.gear);
  assert.ok(gears.includes(0), "a lap with no neutral cannot exercise the crossing path");

  // Every change between two gears must have a neutral between them.
  for (let i = 1; i < gears.length; i++) {
    if (gears[i] !== 0 && gears[i - 1] !== 0) {
      assert.fail(`gear ${gears[i - 1]} -> ${gears[i]} teleports; no neutral between`);
    }
  }
  // And the schedule stays ordered after the neutrals are woven in.
  for (let i = 1; i < gearEvents.length; i++) {
    assert.ok(gearEvents[i].t >= gearEvents[i - 1].t, "gear schedule out of order");
  }
});

test("one shift per gear change, despite every change crossing neutral", () => {
  /* The bug this guards: counting each POSITION change logs two events per shift
     — a phantom downshift into neutral, a phantom upshift out. Invisible in the
     old demo because it never entered neutral. */
  const d = runToFixture();
  const { gearEvents } = createDemoLap();
  const engaged = gearEvents.filter(e => e.gear !== 0);
  const expected = engaged.filter((e, i) => i > 0 && e.t <= 8.0 && e.gear !== engaged[i - 1].gear).length;

  assert.equal(d.state.shiftCount, expected,
    `${d.state.shiftCount} shifts logged for ${expected} gear changes in the first 8s`);
  assert.equal(shiftLog.length, d.state.shiftCount, "shiftLog agrees with the counter");
  assert.ok(shiftLog.every(e => e.dir === 1 || e.dir === -1), "every logged shift has a real direction");
});

test("the lever tracks the measured gear, including neutral", () => {
  const d = runToFixture();
  assert.equal(d.state.lever, d.state.gear,
    "no synthesised throw: the demo places the lever exactly where the live rig does");
});
