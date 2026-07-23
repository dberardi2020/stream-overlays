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
   no rig source yet (SO-0007). */
import { mapPedal, mapWheel } from "./calibration-math.js";
import { getPad } from "./gamepad.js";

export const CALIBRATION_KEY = "g923.calibration.v2";
const PEDALS = ["thr", "brk", "clu"];

/* Map a loaded calibration + a live pad onto the channel state. Mirrors
   calibration.js `applyLive` — the read side of the same contract. */
export function applyInput(state, map, pad) {
  for (const k of PEDALS) {
    const m = map[k]; if (!m) continue;
    const a = pad.axes[m.axis]; if (a == null) continue;
    state[k] = mapPedal(a, m.rest, m.full);
  }
  const s = map.steering;
  if (s && pad.axes[s.axis] != null) state.str = mapWheel(pad.axes[s.axis], s.rest, s.min, s.max);
  else state.str = 0;   // never freeze a stale wheel angle
}

/* Returns { poll, hasCalibration, reload }. `poll()` is called once per frame:
   applies live input when calibrated + a pad is present, else rests at zero. */
export function createInputReader(opts) {
  const state = opts.state;
  const storeKey = opts.storeKey || CALIBRATION_KEY;

  const load = () => {
    try { const s = JSON.parse(localStorage.getItem(storeKey) || "null"); return (s && typeof s === "object") ? s : {}; }
    catch { return {}; }
  };
  let map = load();
  const hasCalibration = () => PEDALS.every(k => map[k]);

  return {
    hasCalibration,
    reload() { map = load(); },
    poll() {
      const pad = getPad();
      if (!pad || !hasCalibration()) {
        state.real = false;
        state.thr = 0; state.brk = 0; state.clu = 0; state.str = 0;
        return false;
      }
      state.real = true;
      applyInput(state, map, pad);
      return true;
    }
  };
}
