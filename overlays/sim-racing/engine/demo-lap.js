/* Synthetic lap — Layer 1 (pure).

   A hand-authored lap of throttle/brake/steering traces, scripted gear-change
   events, and derived rpm/speed telemetry — the preview data the gallery and
   (future) configure page render against, so an overlay can be judged before a
   wheel is ever connected. The live overlay never uses this: it rests at zero
   until a real wheel is calibrated (see pages/overlay.html).

   Ported byte-for-byte from the prototype's `catalogue.html` demo block — the
   richer 30-second lap that also drives gear/telemetry, so the shifter and
   telemetry overlays animate too (the older 26s `Live/gallery.html` lap only
   moved pedals/steering and is retired). `LAP_SECONDS` here MUST match
   draw-kit's `LAP_SECONDS` (30) — some overlays phase against `clock.lapTime`.

   Pedals and steering are shaped like a real lap. Gear changes are scripted
   lever events — not derived. RPM and speed live in a separate object so no
   overlay can borrow them off the input state. No browser deps: builds under
   node, so `engine/demo-driver.js` and its tests can import it directly. */

export const HZ = 100, LAP_SECONDS = 30, N = HZ * LAP_SECONDS;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/** Sample index for a lap time in seconds (clamped into the lap). */
export const idx = t => Math.max(0, Math.min(N - 1, Math.round(t * HZ)));

function smooth(arr, r) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) {
      const j = i + k;
      if (j >= 0 && j < arr.length) { s += arr[j]; c++; }
    }
    out[i] = s / c;
  }
  arr.set(out);
}

/** The lever gear scripted for lap time `t`, from the built gear-event schedule. */
export function scriptedGearAt(gearEvents, t) {
  let g = 4;
  for (const e of gearEvents) { if (e.t <= t) g = e.gear; else break; }
  return g;
}

/* Seconds the lever spends crossing neutral between two gears. A real H-pattern
   shift is roughly this; what matters is that it is non-zero. */
export const NEUTRAL_SECONDS = 0.16;

/* Put the neutral back into the schedule. Every real H-pattern shift crosses
   neutral, so a lap that steps 4 -> 3 -> 2 with nothing in between describes a
   gearbox that does not exist — and, worse, made the demo unable to reproduce
   anything that only happens on a crossing. Two bugs lived in that gap until a
   real G923 found them. The demo is the gallery's preview of the product, so it
   has to produce the shape of data the product actually receives.

   Mutates in place, assumes `events` is sorted. Never places a neutral before
   the preceding event, so gears closer together than NEUTRAL_SECONDS just get a
   shorter crossing rather than an out-of-order schedule. */
export function insertNeutrals(events) {
  const out = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (i > 0) {
      const prev = events[i - 1];
      const t = Math.max(prev.t + 0.01, e.t - NEUTRAL_SECONDS);
      if (t < e.t) out.push({ t, gear: 0 });
    }
    out.push(e);
  }
  events.length = 0;
  events.push(...out);
  return events;
}

/* Returns the filled arrays + gear schedule. `A` is input (thr/brk/str), `T` is
   telemetry (rpm/spd) — kept apart exactly as the prototype has it. */
export function createDemoLap() {
  const A = { thr: new Float32Array(N), brk: new Float32Array(N), str: new Float32Array(N) };
  const T = { rpm: new Float32Array(N), spd: new Float32Array(N) };
  const gearEvents = [];

  A.thr.fill(1);
  const corners = [
    { t: 2.6,  peak: 0.98, dur: 1.6, rot: -0.85, apex: 2.0, exit: 2.2, down: [3, 2] },
    { t: 7.6,  peak: 0.62, dur: 0.9, rot:  0.45, apex: 1.1, exit: 1.3, down: [4]    },
    { t: 11.4, peak: 0.90, dur: 1.3, rot:  0.78, apex: 1.7, exit: 1.9, down: [4, 3] },
    { t: 16.4, peak: 0.45, dur: 0.6, rot: -0.35, apex: 0.8, exit: 1.0, down: [4]    },
    { t: 20.0, peak: 1.00, dur: 1.9, rot: -0.92, apex: 2.4, exit: 2.6, down: [4, 3, 2] },
    { t: 25.6, peak: 0.55, dur: 0.8, rot:  0.40, apex: 1.0, exit: 1.2, down: [3]    }
  ];

  for (const c of corners) {
    const b0 = idx(c.t), b1 = idx(c.t + c.dur), lift = idx(c.t - 0.12);
    for (let i = lift; i < b0; i++) A.thr[i] = 1 - (i - lift) / Math.max(1, b0 - lift);
    for (let i = b0; i < b1; i++) {
      const p = (i - b0) / (b1 - b0);
      const rise = Math.min(1, p / 0.14);
      const trail = 1 - Math.pow(Math.max(0, (p - 0.25) / 0.75), 1.35);
      A.brk[i] = c.peak * rise * Math.max(0, trail);
      A.thr[i] = 0;
    }
    const a1 = idx(c.t + c.apex);
    for (let i = b1; i < a1; i++) A.thr[i] = 0.05;
    const e1 = idx(c.t + c.apex + c.exit);
    for (let i = a1; i < e1; i++) {
      A.thr[i] = Math.min(1, 0.05 + Math.pow((i - a1) / Math.max(1, e1 - a1), 0.72));
    }
    const s0 = idx(c.t + 0.15), sa = idx(c.t + c.apex), s1 = idx(c.t + c.apex + c.exit * 0.9);
    for (let i = s0; i < sa; i++) A.str[i] = c.rot * Math.pow((i - s0) / Math.max(1, sa - s0), 0.8);
    for (let i = sa; i < s1; i++) A.str[i] = c.rot * (1 - Math.pow((i - sa) / Math.max(1, s1 - sa), 1.2));

    c.down.forEach((g, k) => gearEvents.push({ t: c.t + 0.35 + k * 0.55, gear: g }));
    const lowest = c.down.length ? c.down[c.down.length - 1] : 3;
    for (let g = lowest + 1; g <= Math.min(6, lowest + 3); g++) {
      gearEvents.push({ t: c.t + c.apex + 0.5 + (g - lowest - 1) * 1.15, gear: g });
    }
  }
  gearEvents.push({ t: 0, gear: 4 });
  gearEvents.sort((a, b) => a.t - b.t);
  insertNeutrals(gearEvents);

  smooth(A.thr, 4); smooth(A.brk, 4); smooth(A.str, 7);

  const RATIO = [0, 3.30, 2.25, 1.66, 1.30, 1.05, 0.86];
  let speed = 22;
  for (let i = 0; i < N; i++) {
    const t = i / HZ;
    let g = 4;
    for (const e of gearEvents) { if (e.t <= t) g = e.gear; else break; }
    speed = Math.max(6, Math.min(88,
      speed + (A.thr[i] * 26 / (0.7 + RATIO[g]) - A.brk[i] * 42 - 1.4) / HZ));
    T.spd[i] = speed;
    T.rpm[i] = clamp01(speed * RATIO[g] * 0.0142);
  }

  return { HZ, N, LAP_SECONDS, A, T, gearEvents };
}
