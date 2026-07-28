/* Demo driver — Layer 2 (drives the shared render state from the synthetic lap).

   Turns the pure lap (engine/demo-lap.js) into the animated, whole-engine state
   the overlays read: input channels, the separate telemetry object, rolling
   history, and the shifter accumulators (shift log / times / gate dwell). This
   is the preview engine behind the gallery and configure pages — the piece that
   used to live inline in the prototype's catalogue.html, now extracted so any
   page can `createDemoDriver()` and call `tick(dt)` once per frame.

   It mutates the SAME draw-kit singletons the overlay modules import (`tel`,
   `hist`, `shiftLog`, `shiftTimes`, `gateUse`, `clock`), so a shifter/telemetry
   overlay animates without any per-module wiring. The live overlay page does
   NOT use this — it feeds real calibrated input instead (pages/overlay.html).

   Faithful to catalogue.html's `tick()`: same gear-change bookkeeping, same
   clutch/lever derivation from the active MODE, same history + accumulator caps.
   The one reorg is that `clock.t` (wall-time, which shiftTimes stamps against)
   advances at the END of tick — matching the prototype, where the loop did
   `clock.t += dt` immediately after `tick(dt)`. */

import { createDemoLap, idx, scriptedGearAt } from "./demo-lap.js";
import { tel, hist, shiftLog, shiftTimes, gateUse, clock, mode, HIST_MAX } from "./draw-kit.js";
import { applyAbsoluteGear, createGearMemory } from "./gear-motion.js";

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/* One driver per page. Returns the shared `state` object the gallery binds into
   each overlay's draw(), plus `tick(dt)` to advance one frame, and `reset()` to
   clear the shared accumulators before a fresh run. `speed`/`playing` are
   knobs a gallery can expose (pause / slow-mo). */
export function createDemoDriver() {
  const lap = createDemoLap();
  const { A, T, gearEvents, LAP_SECONDS } = lap;

  // Mirrors the prototype's `input` — the live channel state, minus rpm/spd
  // (those ride on `tel`). `real:true` so overlays that gate on a connected
  // wheel show the demo data as if live.
  const state = {
    thr: 0, brk: 0, clu: 0, str: 0,
    gear: 4, lever: 4, prevGear: 4,
    shiftAge: 99, shiftDir: 0, shiftProg: 1, shiftCount: 0,
    real: true
  };

  let gearMem = createGearMemory();
  const driver = { state, speed: 1, playing: true, tick, reset };

  function reset() {
    for (const k of Object.keys(hist)) hist[k].length = 0;
    shiftLog.length = 0;
    shiftTimes.length = 0;
    for (const k of Object.keys(gateUse)) gateUse[k] = 0;
    clock.t = 0; clock.lapTime = 0;
    gearMem = createGearMemory();
    tel.rpm = 0; tel.spd = 0;
  }

  function tick(dt) {
    if (driver.playing) clock.lapTime = (clock.lapTime + dt * driver.speed) % LAP_SECONDS;
    const i = idx(clock.lapTime);

    state.thr = A.thr[i];
    state.brk = A.brk[i];
    state.str = A.str[i];
    tel.rpm = T.rpm[i];
    tel.spd = T.spd[i];

    /* Exactly the bookkeeping the live rig runs — same function, not a copy of it
       (gear-motion.js). The scripted lap crosses neutral between gears like real
       hardware does, so the demo exercises the same paths and previews honestly;
       it used to step 4 -> 3 -> 2 with no intermediate, which quietly made every
       gear overlay look smoother in the gallery than it could ever look live. */
    applyAbsoluteGear(state, scriptedGearAt(gearEvents, clock.lapTime), dt, gearMem);

    /* The synthetic clutch dip stays demo-only: a G923's clutch is a real pedal
       read on the live path, so there is nothing to fake there. */
    const m = mode();
    state.clu = (m.cluDur && state.shiftAge < m.cluDur)
      ? Math.sin(Math.PI * (state.shiftAge / m.cluDur)) * m.cluPeak
      : 0;

    hist.thr.push(state.thr);
    hist.brk.push(state.brk);
    hist.clu.push(state.clu);
    hist.str.push(state.str);
    hist.gear.push(state.gear);
    for (const k in hist) if (hist[k].length > HIST_MAX) hist[k].shift();

    clock.t += dt;   // wall-time, stamped onto shiftTimes above — advanced last, as the prototype's loop did
  }

  return driver;
}
