/* Gear / shifter input layer (SO-0006) — run with `node --test`.
 *
 * The H-shifter and paddles report as gamepad BUTTONS, so the gear path is read
 * by live-input.js rather than the axis calibration maths. This locks down the
 * three pure/near-pure pieces the browser can't cheaply exercise:
 *   - gamepad.js button reads (object / analog / bare-number pads),
 *   - the pure gear maths in calibration-math.js,
 *   - live-input.js readGear (absolute vs. sequential) + applyGear bookkeeping,
 *     which MUST mirror demo-driver.js so a shifter overlay animates the same
 *     whether it's fed live buttons or the demo lap.
 * poll() itself needs the Gamepad API, so it stays in the browser QA (as with
 * live-input.test.mjs). Each test resets the shared draw-kit singletons first.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { isButtonDown, pressedButtons } from "../overlays/sim-racing/engine/gamepad.js";
import {
  resolveShifterGear, stepSequentialGear, gearValue, GEAR_LABELS
} from "../overlays/sim-racing/engine/calibration-math.js";
import { readGear, applyGear } from "../overlays/sim-racing/engine/live-input.js";
import { createState } from "../overlays/sim-racing/engine/state.js";
import { shiftLog, shiftTimes, gateUse, clock, tel, mode } from "../overlays/sim-racing/engine/draw-kit.js";

const EPS = 1e-9;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= EPS, `${msg}: ${a} vs ${b}`);

/* Reset the shared shifter singletons (as demo-driver.reset does) so bookkeeping
   assertions start from a clean slate. */
function resetSingletons() {
  shiftLog.length = 0;
  shiftTimes.length = 0;
  for (const k of Object.keys(gateUse)) gateUse[k] = 0;
  clock.t = 0;
  tel.rpm = 0; tel.spd = 0;
}

/* A pad whose given button indices are held. `analog` renders them as analog
   GamepadButtons (value, no `pressed`) instead of `{pressed:true}`. */
function padWith(indices, len = 16, analog = false) {
  const buttons = [];
  for (let i = 0; i < len; i++) {
    const down = indices.includes(i);
    buttons.push(analog ? { value: down ? 1 : 0 } : { pressed: down, value: down ? 1 : 0 });
  }
  return { buttons, axes: [] };
}

/* ---------- gamepad.js button reads ---------- */

test("isButtonDown handles GamepadButton objects, analog value, and bare numbers", () => {
  assert.equal(isButtonDown({ buttons: [{ pressed: true, value: 1 }] }, 0), true);
  assert.equal(isButtonDown({ buttons: [{ pressed: false, value: 0 }] }, 0), false);
  assert.equal(isButtonDown({ buttons: [{ value: 0.9 }] }, 0), true);   // analog, no `pressed`
  assert.equal(isButtonDown({ buttons: [{ value: 0.2 }] }, 0), false);  // below 0.5 threshold
  assert.equal(isButtonDown({ buttons: [1] }, 0), true);                // bare-number mock
  assert.equal(isButtonDown({ buttons: [0] }, 0), false);
  assert.equal(isButtonDown({ buttons: [] }, 5), false);                // out of range
  assert.equal(isButtonDown(null, 0), false);                          // no pad
});

test("pressedButtons lists every held index", () => {
  assert.deepEqual(pressedButtons(padWith([2, 7, 9])), [2, 7, 9]);
  assert.deepEqual(pressedButtons(padWith([])), []);
  assert.deepEqual(pressedButtons(null), []);
});

/* ---------- pure gear maths ---------- */

test("gearValue maps R to -1 and forward labels to their number", () => {
  assert.equal(gearValue("R"), -1);
  assert.equal(gearValue("1"), 1);
  assert.equal(gearValue("6"), 6);
  assert.deepEqual(GEAR_LABELS, ["R", "1", "2", "3", "4", "5", "6"]);
});

test("resolveShifterGear returns the held gear, 0 for neutral", () => {
  const buttons = { R: 12, 1: 6, 2: 7, 3: 8, 4: 9, 5: 10, 6: 11 };
  const held = idx => new Set([7]).has(idx);           // only button 7 down -> 2nd gear
  assert.equal(resolveShifterGear(buttons, held), 2);
  assert.equal(resolveShifterGear(buttons, () => false), 0);            // neutral
  assert.equal(resolveShifterGear(buttons, idx => idx === 12), -1);     // reverse
  assert.equal(resolveShifterGear(null, () => true), 0);               // uncalibrated -> neutral
});

test("stepSequentialGear clamps to N(0)..6", () => {
  assert.equal(stepSequentialGear(0, +1), 1);
  assert.equal(stepSequentialGear(6, +1), 6);   // no 7th
  assert.equal(stepSequentialGear(0, -1), 0);   // no reverse via paddles
  assert.equal(stepSequentialGear(3, -1), 2);
});

/* ---------- live-input readGear ---------- */

test("readGear (H-shifter) reads the absolute held gear", () => {
  const gearMap = { mode: "shifter", buttons: { R: 12, 1: 6, 2: 7, 3: 8 } };
  const s = createState();
  const mem = { up: false, down: false };
  assert.equal(readGear(s, gearMap, padWith([8]), mem), 3);
  assert.equal(readGear(s, gearMap, padWith([]), mem), 0);       // neutral
  assert.equal(readGear(s, gearMap, padWith([12]), mem), -1);    // reverse
});

test("readGear (paddles) steps once per rising edge, and clamps", () => {
  const gearMap = { mode: "paddles", up: 4, down: 5 };
  const s = createState();     // gear 0
  const mem = { up: false, down: false };

  s.gear = readGear(s, gearMap, padWith([4]), mem);   // up: 0 -> 1
  assert.equal(s.gear, 1);
  s.gear = readGear(s, gearMap, padWith([4]), mem);   // still held, no new edge -> stays 1
  assert.equal(s.gear, 1);
  s.gear = readGear(s, gearMap, padWith([]),  mem);   // release
  s.gear = readGear(s, gearMap, padWith([4]), mem);   // new edge -> 2
  assert.equal(s.gear, 2);
  s.gear = readGear(s, gearMap, padWith([5]), mem);   // down edge -> 1
  assert.equal(s.gear, 1);
});

/* ---------- live-input applyGear bookkeeping (mirrors demo-driver) ---------- */

test("applyGear logs a shift and sets the throw on gear change (H-pattern)", () => {
  resetSingletons();
  const gearMap = { mode: "shifter", buttons: { 1: 6 } };
  const s = createState();                 // gear 0, shiftCount 0, shiftAge 99
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);   // neutral -> 1st
  assert.equal(s.gear, 1);
  assert.equal(s.prevGear, 0);
  assert.equal(s.shiftDir, 1);
  assert.equal(s.shiftCount, 1);
  near(s.shiftAge, 0, "shiftAge resets on change");
  assert.equal(mode().id, "H");            // shifter map selects the H-pattern mode
  near(s.shiftProg, 0, "throw starts at 0");
  assert.equal(s.lever, 0, "lever is mid-throw (neutral) in H-pattern until the throw completes");
  assert.equal(shiftLog.length, 1);
  assert.equal(shiftLog[0].dir, 1);
  assert.equal(shiftTimes.length, 1);
});

test("applyGear ages the throw and settles the lever while the gear is held", () => {
  resetSingletons();
  const gearMap = { mode: "shifter", buttons: { 1: 6 } };
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);   // -> 1st, shiftAge 0
  applyGear(s, gearMap, padWith([6]), 0.4, mem);      // hold; 0.4s > H throw (0.34)

  assert.equal(s.shiftCount, 1, "no new shift while held");
  near(s.shiftAge, 0.4, "shiftAge accumulates dt");
  near(s.shiftProg, 1, "throw completes");
  assert.equal(s.lever, 1, "lever settles onto the gear once the throw finishes");
  near(gateUse[1], 0.4, "gate dwell accrues for the settled lever");
});

test("applyGear (paddles) settles the lever immediately — no absolute throw", () => {
  resetSingletons();
  const gearMap = { mode: "paddles", up: 4, down: 5 };
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([4]), 1 / 60, mem);   // upshift 0 -> 1
  assert.equal(s.gear, 1);
  assert.equal(mode().id, "PADDLE");
  assert.equal(s.lever, 1, "sequential lever is never held at neutral mid-throw");
});

test("applyGear puts reverse at -1 and never accrues gate dwell for it", () => {
  resetSingletons();
  const gearMap = { mode: "shifter", buttons: { R: 12 } };
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([12]), 1 / 60, mem);  // -> reverse
  applyGear(s, gearMap, padWith([12]), 0.4, mem);     // hold past the throw
  assert.equal(s.gear, -1);
  assert.equal(s.lever, -1, "reverse settles like any gear");
  for (const k of Object.keys(gateUse)) near(gateUse[k], 0, `gateUse.${k} stays 0 for reverse`);
});
