/* Live input reader — Layer 2 (DOM-free).

   The pure overlay's counterpart to the calibration panel. The setup page
   (calibration.js) writes the per-wheel calibration to localStorage; this reads
   it back and, each poll(), maps the live gamepad onto the channel state — with
   NO UI at all, so the OBS source stays a pure renderer (ADR 0006). Uncalibrated
   or unplugged, it rests every channel at zero (state.real = false), so a lost
   wheel can never show anything but the resting overlay.

   It reads the same map format and storeKey that calibration.js writes, so the
   two are the read/write sides of one localStorage contract. Telemetry (rpm/spd)
   is deliberately not handled here — it rides the separate `tel` object and has
   no rig source yet (SO-0007).

   Gear/shifter (SO-0006) IS handled here: the H-shifter and paddles report as
   buttons, so live-input reads them and reproduces the exact shift bookkeeping
   the demo driver does (demo-driver.js) — gear/lever/shiftAge/shiftDir plus the
   shared shiftLog/shiftTimes/gateUse singletons — so a shifter overlay animates
   identically whether it's fed live buttons or the demo lap. */
import { mapPedal, mapWheel, resolveShifterGear, stepSequentialGear } from "./calibration-math.js";
import { getPad, isButtonDown } from "./gamepad.js";
import { tel, shiftLog, shiftTimes, gateUse, clock, MODES } from "./draw-kit.js";

export const CALIBRATION_KEY = "g923.calibration.v2";
const FRAME_DT = 1 / 60;   // fallback when a caller doesn't pass a real delta
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/* The shift-behaviour params (throw duration, absolute vs. sequential) for a
   calibrated shifter type. Read LOCALLY here rather than via draw-kit's global
   `mode()`/`setMode()`: that global belongs to the gallery's (demo-only) Mode
   control and is read by throw-timer, so the live path must not mutate it — live
   and demo derive their shift animation independently. H-shifter → the absolute
   H-pattern throw; paddles → the sequential paddle throw. */
const H_MODE      = MODES.find(m => m.id === "H");
const PADDLE_MODE = MODES.find(m => m.id === "PADDLE");
const gearShiftMode = gearMap => (gearMap && gearMap.mode === "paddles") ? PADDLE_MODE : H_MODE;

/* The saved map is keyed by calibration.js's channel keys — the LONG names
   (`throttle`/`brake`/`clutch`/`steering`), not the short channel-state fields
   (`thr`/`brk`/`clu`/`str`). This pairs each stored key with the state field it
   feeds, so the read side matches what the write side (calibration.js) persists.
   (They diverged once — pedals were read under the short keys and so never
   applied from a real calibration; this table is the single source of that
   mapping now.) */
const PEDALS = [
  { key: "throttle", short: "thr" },
  { key: "brake",    short: "brk" },
  { key: "clutch",   short: "clu" }
];

/* Map a loaded calibration + a live pad onto the channel state. Mirrors
   calibration.js `applyLive` — the read side of the same contract. */
export function applyInput(state, map, pad) {
  for (const { key, short } of PEDALS) {
    const m = map[key]; if (!m) continue;
    const a = pad.axes[m.axis]; if (a == null) continue;
    state[short] = mapPedal(a, m.rest, m.full);
  }
  const s = map.steering;
  if (s && pad.axes[s.axis] != null) state.str = mapWheel(pad.axes[s.axis], s.rest, s.min, s.max);
  else state.str = 0;   // never freeze a stale wheel angle
}

/* Resolve the current gear from the live buttons. Absolute for the H-shifter
   (a gear IS a held button); a step for paddles (edge-detect up/down against
   `mem` and walk the sequence). Returns 0 (neutral) with no gear calibration. */
export function readGear(state, gearMap, pad, mem) {
  if (!gearMap) return 0;
  if (gearMap.mode === "paddles") {
    const up   = gearMap.up   != null && isButtonDown(pad, gearMap.up);
    const down = gearMap.down != null && isButtonDown(pad, gearMap.down);
    let g = state.gear;
    if (up && !mem.up)     g = stepSequentialGear(g, +1);   // rising edge only
    if (down && !mem.down) g = stepSequentialGear(g, -1);
    mem.up = up; mem.down = down;
    return g;
  }
  return resolveShifterGear(gearMap.buttons, i => isButtonDown(pad, i));
}

/* Apply a resolved gear to the state + shared shifter singletons, exactly as
   demo-driver.js's tick does: log the change, age the shift, derive the throw
   (shiftProg) and the gate-animated lever, accumulate gate dwell. Exported so
   the bookkeeping is unit-testable without a live pad. */
export function applyGear(state, gearMap, pad, dt, mem) {
  const gear = readGear(state, gearMap, pad, mem);

  if (gear !== state.gear) {
    state.prevGear = state.gear;
    state.shiftDir = gear > state.gear ? 1 : -1;
    state.gear = gear;
    state.shiftAge = 0;
    state.shiftCount++;
    shiftLog.push({ rpm: tel.rpm, dir: state.shiftDir });
    shiftTimes.push({ t: clock.t, dir: state.shiftDir });
    if (shiftLog.length > 60) shiftLog.shift();
    if (shiftTimes.length > 40) shiftTimes.shift();
  } else {
    state.shiftAge += dt;
  }

  const m = gearShiftMode(gearMap);
  state.shiftProg = clamp01(m.throw ? state.shiftAge / m.throw : 1);
  state.lever = (m.absolute && state.shiftProg < 1) ? 0 : state.gear;
  if (state.lever > 0) gateUse[state.lever] += dt;   // reverse (-1) never accrues gate dwell
}

/* Returns { poll, hasCalibration, hasGear, reload }. `poll(dt)` is called once
   per frame: applies live input when calibrated + a pad is present, else rests
   at zero. `dt` is the frame delta in seconds (used for shift timing); it
   defaults to one 60fps frame if a caller omits it. */
export function createInputReader(opts) {
  const state = opts.state;
  const storeKey = opts.storeKey || CALIBRATION_KEY;

  const load = () => {
    try { const s = JSON.parse(localStorage.getItem(storeKey) || "null"); return (s && typeof s === "object") ? s : {}; }
    catch { return {}; }
  };
  let map = load();
  let paddleMem = { up: false, down: false };   // paddle edge state across frames
  const hasCalibration = () => PEDALS.every(p => map[p.key]);
  const hasGear = () => !!map.gear;

  function restGear() {
    state.gear = 0; state.lever = 0; state.prevGear = 0;
    state.shiftDir = 0; state.shiftProg = 1;
    paddleMem.up = false; paddleMem.down = false;
  }

  return {
    hasCalibration,
    hasGear,
    reload() { map = load(); paddleMem = { up: false, down: false }; },
    poll(dt) {
      const d = dt > 0 ? dt : FRAME_DT;
      const pad = getPad();
      if (!pad) {
        state.real = false;
        state.thr = 0; state.brk = 0; state.clu = 0; state.str = 0;
        restGear();
        return false;
      }
      if (hasCalibration()) {
        state.real = true;
        applyInput(state, map, pad);
      } else {
        state.real = false;
        state.thr = 0; state.brk = 0; state.clu = 0; state.str = 0;
      }
      if (hasGear()) {
        applyGear(state, map.gear, pad, d, paddleMem);
        clock.t += d;   // wall-time for shiftTimes stamps — advanced last, as demo-driver does.
                        // Scoped to a calibrated shifter so a pedals-only live setup keeps the
                        // frozen clock it had before SO-0006 (no behaviour change without a shifter).
      } else {
        restGear();
      }
      return state.real;
    }
  };
}
