/* Gear bookkeeping — the single implementation, shared by the live rig and the
   demo lap.
 *
 * These two used to carry parallel copies, with comments apologising for it
 * ("MUST mirror demo-driver.js", "exactly as demo-driver.js's tick does"). They
 * drifted anyway, and the drift was invisible: the demo's scripted lap stepped
 * 4 -> 3 -> 2 with no intermediate, so it could not reproduce anything that only
 * happens when a lever crosses neutral — which is every real shift. Two bugs hid
 * there until a G923 found them (a phantom shift per neutral crossing, and a
 * transit replayed after it had finished).
 *
 * So the demo lap now passes through neutral like real hardware, and both paths
 * run this. The demo is a preview of the product, and a preview that cannot
 * reproduce a live failure is not one.
 *
 * ---- What this models ----
 *
 * An H-shifter reports POSITION and nothing else: R, 1..6, or neutral. From that:
 *
 *   - A SHIFT is a transition between two ENGAGED gears. Every H-pattern shift
 *     physically crosses neutral, so counting each position change would log two
 *     events per shift — a phantom downshift into neutral, a phantom upshift out.
 *     Direction is measured from the last gear actually held: 2 -> 3 is an
 *     upshift even though 2 -> N -> 3 is what happened.
 *
 *   - A LEG is one movement of the knob between two OBSERVED positions, along the
 *     route the gate physically constrains (out to the rail, across, in). Only its
 *     timing is estimated, inside a short window — this is rendering, not
 *     inference. `prevGear` is therefore the previous POSITION, not the gear the
 *     shift came from; those are different questions and both are asked.
 */
import { tel, shiftLog, shiftTimes, gateUse, clock } from "./draw-kit.js";

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/* How long the knob takes to travel one leg. Short, because it is catching the
   lever up rather than predicting it. */
export const LEG_SECONDS = 0.12;

/* Per-source scratch that has to survive between frames: which gear was last
   actually engaged, and how far through the current leg we are. */
export const createGearMemory = () => ({ engaged: null, legAge: null });

export function logShift(state, dir) {
  state.shiftDir = dir;
  state.shiftAge = 0;
  state.shiftCount++;
  shiftLog.push({ rpm: tel.rpm, dir });
  shiftTimes.push({ t: clock.t, dir });
  if (shiftLog.length > 60) shiftLog.shift();
  if (shiftTimes.length > 40) shiftTimes.shift();
}

/* Apply one frame of an absolute (position-reporting) gear source.
   `gear` is the measured position: -1 = R, 0 = neutral, 1..6. Returns true if a
   shift was logged this frame, so a caller can skip its own shiftAge ageing. */
export function applyAbsoluteGear(state, gear, dt, mem) {
  let shifted = false;

  if (state.gear === null || state.gear === undefined) {
    // First look: whatever it is holding, we did not watch it get there.
    // Sitting in 3rd at session start is not a shift into 3rd.
    state.gear = gear;
    state.prevGear = gear;
    mem.legAge = LEG_SECONDS;                 // already in place; no travel to draw
    if (gear !== 0) mem.engaged = gear;
  } else if (gear !== state.gear) {
    state.prevGear = state.gear;              // the leg starts where the knob was
    mem.legAge = 0;
    state.gear = gear;
    if (gear !== 0) {                         // engaged — the shift completes here
      const from = mem.engaged != null ? mem.engaged : 0;
      if (from !== gear) { logShift(state, gear > from ? 1 : -1); shifted = true; }
      mem.engaged = gear;
    }
  }

  if (!shifted) state.shiftAge += dt;

  mem.legAge = mem.legAge == null ? LEG_SECONDS : mem.legAge + dt;
  state.shiftProg = clamp01(mem.legAge / LEG_SECONDS);
  state.lever = state.gear;                   // the lever IS the measured position
  if (state.lever > 0) gateUse[state.lever] += dt;   // reverse (-1) never accrues dwell
  return shifted;
}
