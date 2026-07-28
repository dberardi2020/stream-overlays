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
  resolveShifterGear, gearValue, GEAR_LABELS
} from "../overlays/sim-racing/engine/calibration-math.js";
import {
  readGear, readPaddleEdges, applyGear, normalizeGearMap, hasShifter, hasPaddles
} from "../overlays/sim-racing/engine/live-input.js";
import { createState } from "../overlays/sim-racing/engine/state.js";
import { shiftLog, shiftTimes, gateUse, clock, tel, mode, setMode, MODES } from "../overlays/sim-racing/engine/draw-kit.js";

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

/* ---------- gear map shape + migration (ADR 0007) ---------- */

test("normalizeGearMap upgrades the pre-ADR-0007 single-slot shape", () => {
  assert.deepEqual(normalizeGearMap({ mode: "shifter", buttons: { 1: 6 } }),
    { shifter: { buttons: { 1: 6 } } });
  assert.deepEqual(normalizeGearMap({ mode: "paddles", up: 4, down: 5 }),
    { paddles: { up: 4, down: 5 } });
  const current = { shifter: { buttons: { 1: 6 } }, paddles: { up: 4, down: 5 } };
  assert.equal(normalizeGearMap(current), current, "already-current maps pass through");
  assert.equal(normalizeGearMap(null), null);
});

test("both halves can be calibrated at once — neither displaces the other", () => {
  const both = { shifter: { buttons: { 1: 6 } }, paddles: { up: 4, down: 5 } };
  assert.ok(hasShifter(both) && hasPaddles(both));
  assert.ok(hasShifter({ shifter: { buttons: { 1: 6 } } }));
  assert.ok(!hasPaddles({ shifter: { buttons: { 1: 6 } } }));
  assert.ok(!hasShifter({ paddles: { up: 4, down: 5 } }));
});

/* ---------- live-input readGear ---------- */

test("readGear (H-shifter) reads the absolute held gear", () => {
  const gearMap = { shifter: { buttons: { R: 12, 1: 6, 2: 7, 3: 8 } } };
  assert.equal(readGear(gearMap, padWith([8])), 3);
  assert.equal(readGear(gearMap, padWith([])), 0);       // neutral IS observed here
  assert.equal(readGear(gearMap, padWith([12])), -1);    // reverse
});

test("readGear returns null — never 0 — when no H-shifter is calibrated", () => {
  // The core of ADR 0007: 0 asserts "in neutral", which paddles cannot observe.
  assert.equal(readGear({ paddles: { up: 4, down: 5 } }, padWith([4])), null);
  assert.equal(readGear(null, padWith([])), null);
});

test("readPaddleEdges fires once per pull, not once per frame held", () => {
  const gearMap = { paddles: { up: 4, down: 5 } };
  const mem = { up: false, down: false };

  assert.deepEqual(readPaddleEdges(gearMap, padWith([4]), mem), { up: true, down: false });
  assert.deepEqual(readPaddleEdges(gearMap, padWith([4]), mem), { up: false, down: false }, "held, not re-fired");
  readPaddleEdges(gearMap, padWith([]), mem);                       // release
  assert.deepEqual(readPaddleEdges(gearMap, padWith([4]), mem), { up: true, down: false }, "new pull, new edge");
  assert.deepEqual(readPaddleEdges(gearMap, padWith([5]), mem), { up: false, down: true });
});

/* ---------- live-input applyGear bookkeeping (mirrors demo-driver) ---------- */

test("applyGear logs the shift and places the lever immediately (H-pattern)", () => {
  resetSingletons();
  const gearMap = { shifter: { buttons: { 1: 6 } } };
  const s = createState();                 // gear 0, shiftCount 0, shiftAge 99
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);   // neutral -> 1st
  assert.equal(s.gear, 1);
  assert.equal(s.prevGear, 0);
  assert.equal(s.shiftDir, 1);
  assert.equal(s.shiftCount, 1);
  near(s.shiftAge, 0, "shiftAge resets on change — the flash overlays key off it");
  assert.equal(s.lever, 1, "the lever IS the measured gear; there is no throw to wait out");
  assert.ok(s.shiftProg < 1, "a leg is underway — the knob is travelling to the new position");
  assert.equal(shiftLog.length, 1);
  assert.equal(shiftLog[0].dir, 1);
  assert.equal(shiftTimes.length, 1);
});

test("a live H-shifter never replays the transit it already made", () => {
  /* The bug this pins: on engaging the new gear, shiftAge reset, shiftProg fell to
     0, and knobXY interpolated from prevGear — so the knob jumped BACK to the old
     gear and walked to the new one again, with the readout reading N throughout.
     Seen on the rig as "1st, N, back to 1st, finally 2nd" on a completed shift.
     Position is measured every frame, so there is nothing to animate. */
  resetSingletons();
  const gearMap = { shifter: { buttons: { 1: 6, 2: 7 } } };
  const s = createState();
  s.gear = null;
  const mem = { up: false, down: false, engaged: null };

  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);   // found in 1st
  assert.equal(s.lever, 1);
  near(s.shiftProg, 1, "already there on first sight — nothing to travel");

  applyGear(s, gearMap, padWith([]), 1 / 60, mem);    // 1 -> N, physically between gears
  assert.equal(s.lever, 0, "neutral is reported, because that is where the lever is");
  assert.equal(s.prevGear, 1, "leg one: gate 1 -> the neutral rail");
  assert.ok(s.shiftProg < 1, "and it is drawn travelling, not teleporting");

  applyGear(s, gearMap, padWith([7]), 1 / 60, mem);   // N -> 2nd, shift completes
  assert.equal(s.gear, 2);
  assert.equal(s.lever, 2, "lands on 2nd — never back on 1st, and never a mid-throw neutral");
  assert.equal(s.prevGear, 0,
    "leg two starts at NEUTRAL, not at 1st — the knob travels through the gate rather than " +
    "replaying a 1->2 transit that already happened");

  applyGear(s, gearMap, padWith([7]), 0.5, mem);      // hold past the leg
  assert.equal(s.lever, 2, "and it stays there");
  near(s.shiftProg, 1, "leg complete — the knob has arrived at gate 2");
});

test("gate dwell accrues while a gear is held, and shiftAge keeps timing", () => {
  resetSingletons();
  const gearMap = { shifter: { buttons: { 1: 6 } } };
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);   // -> 1st, shiftAge 0
  applyGear(s, gearMap, padWith([6]), 0.4, mem);      // hold

  assert.equal(s.shiftCount, 1, "no new shift while held");
  near(s.shiftAge, 0.4, "shiftAge accumulates dt — a real elapsed time, not a throw");
  assert.equal(s.lever, 1);
  near(gateUse[1], 0.4 + 1 / 60, "gate dwell accrues from the moment the gear is engaged");
});

test("applyGear (paddles) reports direction and NEVER invents a gear", () => {
  resetSingletons();
  const gearMap = { paddles: { up: 4, down: 5 } };
  const s = createState();
  s.gear = null; s.lever = null;          // as restGear leaves an uncalibrated rig
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([4]), 1 / 60, mem);   // upshift
  assert.equal(s.shiftDir, 1, "direction is the real measurement");
  assert.equal(s.shiftCount, 1);
  assert.equal(shiftLog[0].dir, 1);
  assert.equal(s.gear, null, "no position source — gear stays unknown, not 0/neutral");
  assert.equal(s.lever, null, "and there is no lever to place");

  applyGear(s, gearMap, padWith([5]), 1 / 60, mem);   // downshift (4 released, 5 pulled)
  assert.equal(s.shiftDir, -1);
  assert.equal(s.shiftCount, 2);
  assert.equal(s.gear, null);
});

test("paddles accrue no gate dwell — dwell is a position measurement", () => {
  resetSingletons();
  const s = createState();
  s.gear = null; s.lever = null;
  const mem = { up: false, down: false };

  applyGear(s, { paddles: { up: 4, down: 5 } }, padWith([4]), 0.5, mem);
  applyGear(s, { paddles: { up: 4, down: 5 } }, padWith([4]), 0.5, mem);
  for (const k of Object.keys(gateUse)) near(gateUse[k], 0, `gateUse.${k} stays 0 without an H-shifter`);
});

test("both sources mapped: each reports its own motion, neither suppresses the other", () => {
  resetSingletons();
  const gearMap = { shifter: { buttons: { 1: 6, 2: 7 } }, paddles: { up: 4, down: 5 } };
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);        // H-shifter into 1st
  assert.equal(s.gear, 1);
  assert.equal(s.shiftCount, 1);

  applyGear(s, gearMap, padWith([6, 4]), 1 / 60, mem);     // still in 1st, paddle pulled
  assert.equal(s.gear, 1, "the held gear is unchanged — the paddle did not move the lever");
  assert.equal(s.shiftDir, 1);
  assert.equal(s.shiftCount, 2, "but the paddle pull is its own logged event");
});

test("applyGear never mutates the global draw-kit mode (live must not clobber the demo control)", () => {
  resetSingletons();
  setMode(MODES.findIndex(m => m.id === "SEQ"));   // stand in for the gallery's demo-only Mode control
  const before = mode().id;
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, { paddles: { up: 4, down: 5 } }, padWith([4]), 1 / 60, mem);

  assert.equal(mode().id, before, "live gear read left the global mode untouched");
  near(s.shiftProg, 0, "yet it still timed the shift from its own local mode lookup");
});

test("crossing neutral is ONE shift, not two — the real H-pattern path", () => {
  resetSingletons();
  const gearMap = { shifter: { buttons: { 1: 6, 2: 7, 3: 8 } } };
  const s = createState();
  s.gear = null;                                      // as restGear leaves it before the first poll
  const mem = { up: false, down: false, engaged: null };

  applyGear(s, gearMap, padWith([7]), 1 / 60, mem);   // already sitting in 2nd when we first look
  assert.equal(s.shiftCount, 0, "finding the rig already in gear is not a shift");

  applyGear(s, gearMap, padWith([]),  1 / 60, mem);   // 2 -> N, mid-shift
  assert.equal(s.gear, 0, "position still reports neutral — the gate must show it");
  assert.equal(s.shiftCount, 0, "leaving a gear is not itself a shift");

  applyGear(s, gearMap, padWith([8]), 1 / 60, mem);   // N -> 3, shift completes
  assert.equal(s.gear, 3);
  assert.equal(s.shiftCount, 1, "one physical shift, one event");
  assert.equal(s.shiftDir, 1, "direction measured from the last ENGAGED gear: 2->3, not N->3");
  assert.equal(s.prevGear, 0,
    "prevGear is the previous POSITION (the neutral just left), which is what the knob " +
    "animates from — distinct from the engaged gear the direction came from");
  assert.equal(shiftLog.length, 1, "no phantom entries");

  applyGear(s, gearMap, padWith([]),  1 / 60, mem);   // 3 -> N
  applyGear(s, gearMap, padWith([6]), 1 / 60, mem);   // N -> 1st
  assert.equal(s.shiftCount, 2);
  assert.equal(s.shiftDir, -1, "3 -> 1 is a downshift");
});

test("re-engaging the SAME gear after neutral logs nothing", () => {
  resetSingletons();
  const gearMap = { shifter: { buttons: { 2: 7 } } };
  const s = createState();
  s.gear = null;
  const mem = { up: false, down: false, engaged: null };

  applyGear(s, gearMap, padWith([7]), 1 / 60, mem);   // found already in 2nd
  applyGear(s, gearMap, padWith([]),  1 / 60, mem);   // slip to neutral
  applyGear(s, gearMap, padWith([7]), 1 / 60, mem);   // back into 2nd
  assert.equal(s.shiftCount, 0, "you never changed gear");
  assert.equal(shiftLog.length, 0);
});

test("applyGear puts reverse at -1 and never accrues gate dwell for it", () => {
  resetSingletons();
  const gearMap = { shifter: { buttons: { R: 12 } } };
  const s = createState();
  const mem = { up: false, down: false };

  applyGear(s, gearMap, padWith([12]), 1 / 60, mem);  // -> reverse
  applyGear(s, gearMap, padWith([12]), 0.4, mem);     // hold past the throw
  assert.equal(s.gear, -1);
  assert.equal(s.lever, -1, "reverse settles like any gear");
  for (const k of Object.keys(gateUse)) near(gateUse[k], 0, `gateUse.${k} stays 0 for reverse`);
});
