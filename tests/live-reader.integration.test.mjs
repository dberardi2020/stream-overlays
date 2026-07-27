/* Live input reader — integration, run with `node --test`.
 *
 * The unit tests exercise the pure helpers (applyInput / readGear / applyGear)
 * by handing them a pad directly. They CANNOT reach createInputReader.poll(),
 * which is where the two un-mockable seams live: navigator.getGamepads() and
 * localStorage. This file mocks BOTH — a spec-shaped Gamepad
 * (https://www.w3.org/TR/gamepad/ : { axes:number[], buttons:[{pressed,value}] })
 * and a Map-backed localStorage — so the FULL read path runs headless:
 * localStorage calibration -> getPad() -> applyInput/applyGear -> channel state.
 *
 * This is the layer that catches a contract break end-to-end (a mis-keyed map
 * makes poll() rest at zero here, exactly as it would on hardware) — not just a
 * drift in an isolated helper. poll() over a REAL wheel is still owed on
 * hardware; this proves everything up to the driver boundary.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

/* ---- mock the two browser seams BEFORE importing the module under test ----
   Node 26 ships a built-in read-only `navigator`, so both globals are installed
   via defineProperty rather than plain assignment. */
let PAD = null;                                   // the "connected" gamepad, or null
const fakeStorage = (() => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear()
  };
})();
Object.defineProperty(globalThis, "navigator", { value: { getGamepads: () => [PAD] }, configurable: true, writable: true });
Object.defineProperty(globalThis, "localStorage", { value: fakeStorage, configurable: true, writable: true });

const { createInputReader, CALIBRATION_KEY } = await import("../overlays/sim-racing/engine/live-input.js");
const { createState } = await import("../overlays/sim-racing/engine/state.js");
const { mapPedal } = await import("../overlays/sim-racing/engine/calibration-math.js");
const { shiftLog, shiftTimes, gateUse, clock, tel } =
  await import("../overlays/sim-racing/engine/draw-kit.js");

/* A calibration exactly as calibration.js persists it — long channel keys, mode
   tags — optionally with a gear map. This is the contract the reader must read. */
function calibration(extra = {}) {
  return {
    throttle: { axis: 0, rest: -1, full: 1, mode: "pedal" },
    brake:    { axis: 1, rest: -1, full: 1, mode: "pedal" },
    clutch:   { axis: 2, rest: -1, full: 1, mode: "pedal" },
    steering: { axis: 3, rest: 0, min: -1, max: 1, mode: "wheel" },
    ...extra
  };
}
function pad(axes, pressed = [], nButtons = 16) {
  const buttons = Array.from({ length: nButtons }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }));
  return { id: "Mock G923", axes, buttons };
}
function store(map) { localStorage.setItem(CALIBRATION_KEY, JSON.stringify(map)); }
function resetSingletons() {
  shiftLog.length = 0; shiftTimes.length = 0;
  for (const k of Object.keys(gateUse)) gateUse[k] = 0;
  clock.t = 0; tel.rpm = 0; tel.spd = 0;
}

test("poll() maps a real calibration.js-shaped map end-to-end (the contract, through the reader)", () => {
  resetSingletons();
  store(calibration());
  const state = createState();
  const reader = createInputReader({ state });   // loads the calibration at construct time

  PAD = pad([1, -1, 0, 0.5]);                    // thr full, brk rest, clu mid, steering +half
  const live = reader.poll(1 / 60);

  assert.equal(live, true, "reports live");
  assert.equal(state.real, true);
  assert.equal(state.thr, mapPedal(1, -1, 1));   // == 1 — the value that stayed 0 under the old mis-key
  assert.equal(state.brk, mapPedal(-1, -1, 1));  // == 0
  assert.ok(state.str > 0.4 && state.str <= 0.5, `steering mapped: ${state.str}`);
});

test("poll() rests every channel at zero with no wheel connected", () => {
  resetSingletons();
  store(calibration());
  const state = createState();
  const reader = createInputReader({ state });

  PAD = null;
  const live = reader.poll(1 / 60);

  assert.equal(live, false);
  assert.equal(state.real, false);
  assert.equal(state.thr, 0); assert.equal(state.brk, 0);
  assert.equal(state.clu, 0); assert.equal(state.str, 0);
  assert.equal(state.gear, null, "gear rests UNKNOWN, not neutral — nothing observed a gear (ADR 0007)");
  assert.equal(state.lever, null, "and there is no lever position to report");
});

test("poll() drives gear from the shifter buttons and advances the shift clock", () => {
  resetSingletons();
  store(calibration({ gear: { mode: "shifter", buttons: { R: 12, 1: 6, 2: 7, 3: 8 } } }));
  const state = createState();
  const reader = createInputReader({ state });

  PAD = pad([-1, -1, -1, 0], [7]);               // in 2nd gear (button 7 held)
  reader.poll(1 / 60);
  assert.equal(state.gear, 2, "reads the held gear");
  assert.equal(shiftLog.length, 1, "logged the shift into gear");
  assert.ok(clock.t > 0, "shift clock advances when a shifter is calibrated");
});

test("poll() reads BOTH gear sources from one stored map (ADR 0007)", () => {
  resetSingletons();
  store(calibration({ gear: { shifter: { buttons: { 1: 6, 2: 7 } }, paddles: { up: 4, down: 5 } } }));
  const state = createState();
  const reader = createInputReader({ state });

  assert.ok(reader.hasShifter() && reader.hasPaddles(), "both halves survive the round-trip");

  PAD = pad([-1, -1, -1, 0], [7]);               // H-shifter in 2nd
  reader.poll(1 / 60);
  assert.equal(state.gear, 2);
  assert.equal(state.shiftCount, 1);

  PAD = pad([-1, -1, -1, 0], [7, 4]);            // still in 2nd, paddle pulled
  reader.poll(1 / 60);
  assert.equal(state.gear, 2, "the paddle did not move the physical lever");
  assert.equal(state.shiftCount, 2, "but it is its own shift event");
});

test("poll() with paddles only reports direction and never a gear", () => {
  resetSingletons();
  store(calibration({ gear: { paddles: { up: 4, down: 5 } } }));
  const state = createState();
  const reader = createInputReader({ state });

  PAD = pad([-1, -1, -1, 0], [4]);
  reader.poll(1 / 60);

  assert.equal(state.shiftDir, 1, "the pull is measured");
  assert.equal(state.gear, null, "the gear is not invented");
  assert.equal(state.lever, null);
  assert.equal(reader.hasShifter(), false);
});

test("poll() with pedals-only calibration leaves gear UNKNOWN AND keeps the clock frozen", () => {
  resetSingletons();
  store(calibration());                          // no gear map
  const state = createState();
  const reader = createInputReader({ state });

  PAD = pad([-1, -1, -1, 0], [7]);               // a button is held, but no gear is calibrated
  reader.poll(1 / 60);

  assert.equal(state.gear, null, "no gear map -> unknown regardless of buttons");
  assert.equal(clock.t, 0, "no shifter -> clock stays frozen (pre-SO-0006 behaviour preserved)");
  assert.equal(reader.hasGear(), false);
});
