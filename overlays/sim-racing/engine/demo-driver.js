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

  const driver = { state, speed: 1, playing: true, tick, reset };

  function reset() {
    for (const k of Object.keys(hist)) hist[k].length = 0;
    shiftLog.length = 0;
    shiftTimes.length = 0;
    for (const k of Object.keys(gateUse)) gateUse[k] = 0;
    clock.t = 0; clock.lapTime = 0;
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

    const g = scriptedGearAt(gearEvents, clock.lapTime);
    if (g !== state.gear) {
      state.prevGear = state.gear;
      state.shiftDir = g > state.gear ? 1 : -1;
      state.gear = g;
      state.shiftAge = 0;
      state.shiftCount++;
      shiftLog.push({ rpm: tel.rpm, dir: state.shiftDir });
      shiftTimes.push({ t: clock.t, dir: state.shiftDir });
      if (shiftLog.length > 60) shiftLog.shift();
      if (shiftTimes.length > 40) shiftTimes.shift();
    } else {
      state.shiftAge += dt;
    }

    const m = mode();
    state.shiftProg = clamp01(m.throw ? state.shiftAge / m.throw : 1);
    state.lever = (m.absolute && state.shiftProg < 1) ? 0 : state.gear;
    state.clu = (m.cluDur && state.shiftAge < m.cluDur)
      ? Math.sin(Math.PI * (state.shiftAge / m.cluDur)) * m.cluPeak
      : 0;

    if (state.lever > 0) gateUse[state.lever] += dt;

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
