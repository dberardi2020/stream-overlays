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
   identically whether it's fed live buttons or the demo lap.

   The two gear controls are INDEPENDENT sources, not two modes of one (ADR 0007).
   They report different things and are calibrated separately:

     H-shifter  -> POSITION. A gear is a held button, so `gear`/`lever` are read
                   directly, and direction falls out of diffing them. Absolute.
     Paddles    -> DIRECTION. A pull is an edge, nothing more. It yields
                   shiftDir/shiftCount/shiftLog/shiftTimes and NOTHING else.

   So `gear` is non-null if and only if an H-shifter is calibrated. Paddles never
   synthesise one — see the note where stepSequentialGear used to live. Both may
   be mapped at once (paddles live on the wheel, the H-shifter is a separate
   unit); each simply reports the motion that actually happened. */
import { mapPedal, mapWheel, resolveShifterGear } from "./calibration-math.js";
import { getPad, isButtonDown } from "./gamepad.js";
import { tel, shiftLog, shiftTimes, gateUse, clock, MODES } from "./draw-kit.js";

export const CALIBRATION_KEY = "g923.calibration.v2";
const FRAME_DT = 1 / 60;   // fallback when a caller doesn't pass a real delta
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/* The paddle throw duration, read LOCALLY rather than via draw-kit's global
   `mode()`/`setMode()`: that global belongs to the gallery's (demo-only) Mode
   control and is read by throw-timer, so the live path must not mutate it.
   Only the PADDLE mode is needed — a live H-shifter has no synthesised throw at
   all, because its position is measured (see applyGear). */
const PADDLE_MODE = MODES.find(m => m.id === "PADDLE");

/* Gear map shape (see ADR 0007):
     { shifter: { buttons: { R,1..6 -> index } },   // optional
       paddles: { up, down } }                      // optional
   Either half may be absent; both may be present. Upgrades the pre-ADR-0007
   single-slot shape (`{mode:"shifter"|"paddles", ...}`) in place on read, so a
   browser holding an old calibration keeps it instead of silently losing it. */
export function normalizeGearMap(gear) {
  if (!gear) return null;
  if (gear.shifter || gear.paddles) return gear;          // already current
  if (gear.mode === "paddles") return { paddles: { up: gear.up, down: gear.down } };
  if (gear.mode === "shifter") return { shifter: { buttons: gear.buttons } };
  return null;
}

export const hasShifter = gear => !!(gear && gear.shifter && gear.shifter.buttons);
export const hasPaddles = gear => !!(gear && gear.paddles &&
  (gear.paddles.up != null || gear.paddles.down != null));

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

/* The absolute gear the H-shifter is holding: a gear IS a held button, so this is
   a direct read, never an integration. `null` — not 0 — when no H-shifter is
   calibrated: 0 means "in neutral", which is a claim we have no basis to make. */
export function readGear(gearMap, pad) {
  if (!hasShifter(gearMap)) return null;
  return resolveShifterGear(gearMap.shifter.buttons, i => isButtonDown(pad, i));
}

/* Rising edges on the paddles this frame, edge-detected against `mem`. A held
   paddle is not a repeat shift, so only the 0->1 transition counts. */
export function readPaddleEdges(gearMap, pad, mem) {
  if (!hasPaddles(gearMap)) { mem.up = false; mem.down = false; return { up: false, down: false }; }
  const p = gearMap.paddles;
  const up   = p.up   != null && isButtonDown(pad, p.up);
  const down = p.down != null && isButtonDown(pad, p.down);
  const edges = { up: up && !mem.up, down: down && !mem.down };
  mem.up = up; mem.down = down;
  return edges;
}

/* Apply a resolved gear to the state + shared shifter singletons, exactly as
   demo-driver.js's tick does: log the change, age the shift, derive the throw
   (shiftProg) and the gate-animated lever, accumulate gate dwell. Exported so
   the bookkeeping is unit-testable without a live pad. */
function logShift(state, dir) {
  state.shiftDir = dir;
  state.shiftAge = 0;
  state.shiftCount++;
  shiftLog.push({ rpm: tel.rpm, dir });
  shiftTimes.push({ t: clock.t, dir });
  if (shiftLog.length > 60) shiftLog.shift();
  if (shiftTimes.length > 40) shiftTimes.shift();
}

export function applyGear(state, gearMap, pad, dt, mem) {
  const absolute = hasShifter(gearMap);
  const gear = readGear(gearMap, pad);              // null unless an H-shifter is mapped
  const edges = readPaddleEdges(gearMap, pad, mem);
  let shifted = false;

  /* Position source. A shift is a transition between two ENGAGED gears: on a real
     H-pattern every shift physically crosses neutral (2 -> N -> 3), so counting
     each change of `gear` would log two events per shift — a phantom downshift
     into neutral and a phantom upshift out of it. That is real jitter: doubled
     shiftCount, flapping shiftDir, a shiftLog full of noise.

     So `gear` still tracks the live position every frame (the gate correctly
     reads NEUTRAL mid-shift), but the EVENT is logged only on engagement, with
     its direction measured from the last gear actually engaged.

     demo-driver.js keeps the simpler form deliberately: its scripted lap steps
     gear-to-gear and never passes through neutral, so the two cannot diverge. */
  if (gear !== null) {
    if (state.gear === null) {
      // First look at the rig: whatever it is holding, we did not watch it get
      // there. Sitting in 3rd at session start is not a shift into 3rd.
      state.gear = gear;
      if (gear !== 0) mem.engaged = gear;
    } else if (gear !== state.gear) {
      state.gear = gear;
      if (gear !== 0) {                             // engaged — the shift completes here
        // From the last gear actually engaged; falling back to 0 because if we
        // never held one, the neutral we were sitting in WAS observed.
        const from = mem.engaged != null ? mem.engaged : 0;
        if (from !== gear) {
          state.prevGear = from;
          logShift(state, gear > from ? 1 : -1);
          shifted = true;
        }
        mem.engaged = gear;
      }
    }
  }
  // Direction source: independent of the above — a paddle pull is its own event.
  if (edges.up)   { logShift(state, +1); shifted = true; }
  if (edges.down) { logShift(state, -1); shifted = true; }

  if (!shifted) state.shiftAge += dt;

  if (absolute) {
    /* A real H-shifter reports POSITION every frame, so nothing here is animated.
       The throw animation exists for the demo driver, whose scripted gear jumps
       1 -> 2 with no intermediate: the transit has to be invented there. Yours is
       measured — you physically moved 1 -> N -> 2 and each step was reported as it
       happened.

       Re-deriving `lever` from a throw timer replays that journey a second time:
       on engaging 2nd, shiftAge resets, shiftProg drops to 0, and `knobXY`
       interpolates from prevGear — drawing the knob back at 1st before walking it
       to 2nd, with the readout showing N throughout. Hence "1, N, back to 1, then
       2" on a shift that had already finished.

       So the lever IS the gear, and shiftProg is pinned at 1 (settled) which makes
       knobXY take its early return and plot the true position. `shiftAge` keeps
       counting for the shift-flash overlays, which is a real elapsed time. */
    state.shiftProg = 1;
    state.lever = state.gear;
    if (state.lever > 0) gateUse[state.lever] += dt;   // reverse (-1) never accrues gate dwell
  } else {
    // Paddles report an event, not a position — here the animation is all there is.
    state.shiftProg = clamp01(PADDLE_MODE.throw ? state.shiftAge / PADDLE_MODE.throw : 1);
    // No position source. Clear the gear outright rather than leaving whatever
    // it last held (createState seeds 0, and a stale 0 reads as "in neutral").
    state.gear = null; state.prevGear = null; state.lever = null;
  }
}

/* Returns { poll, hasCalibration, hasGear, reload }. `poll(dt)` is called once
   per frame: applies live input when calibrated + a pad is present, else rests
   at zero. `dt` is the frame delta in seconds (used for shift timing); it
   defaults to one 60fps frame if a caller omits it. */
export function createInputReader(opts) {
  const state = opts.state;
  const storeKey = opts.storeKey || CALIBRATION_KEY;

  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (!s || typeof s !== "object") return {};
      if (s.gear) s.gear = normalizeGearMap(s.gear);   // upgrade the pre-ADR-0007 shape
      return s;
    } catch { return {}; }
  };
  let map = load();
  let paddleMem = { up: false, down: false, engaged: null };   // paddle edges + last engaged gear, across frames
  const hasCalibration = () => PEDALS.every(p => map[p.key]);
  const hasGear = () => hasShifter(map.gear) || hasPaddles(map.gear);

  /* No live gear source: every gear field goes UNKNOWN, not neutral. `gear: 0`
     would assert the car is in neutral, which nothing here observed. */
  function restGear() {
    state.gear = null; state.lever = null; state.prevGear = null;
    state.shiftDir = 0; state.shiftProg = 1;
    paddleMem.up = false; paddleMem.down = false; paddleMem.engaged = null;
  }

  return {
    hasCalibration,
    hasGear,
    // Which gear source is live — the gallery gates absolute-gear overlays on
    // hasShifter(), since paddles can never stand in for a position read.
    hasShifter: () => hasShifter(map.gear),
    hasPaddles: () => hasPaddles(map.gear),
    reload() { map = load(); paddleMem = { up: false, down: false, engaged: null }; },
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
