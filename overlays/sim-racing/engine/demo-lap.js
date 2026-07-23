/* Synthetic lap — Layer 1 (pure).

   A hand-authored lap of throttle/brake/clutch/steering traces, used as preview
   data in the gallery and catalogue so an overlay can be judged before a wheel
   is ever connected. The live overlay never uses this — it rests at zero until a
   real wheel is calibrated. Lifted verbatim from the prototype; no browser deps,
   so it builds under node too. `createDemoLap()` returns the filled Float32Arrays. */

const HZ = 100, LAP_SECONDS = 26, N = HZ * LAP_SECONDS;
const idx = t => Math.max(0, Math.min(N - 1, Math.round(t * HZ)));
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

function smooth(arr, r) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) { const j = i + k; if (j >= 0 && j < arr.length) { s += arr[j]; c++; } }
    out[i] = s / c;
  }
  arr.set(out);
}

export function createDemoLap() {
  const lap = { thr: new Float32Array(N), brk: new Float32Array(N), clu: new Float32Array(N), str: new Float32Array(N) };
  lap.thr.fill(1);
  const corners = [
    { t: 2.4,  peak: 0.98, dur: 1.5, rot: -0.85, apex: 1.9, exit: 2.0, blips: [0.35, 0.95] },
    { t: 7.0,  peak: 0.62, dur: 0.8, rot:  0.45, apex: 1.0, exit: 1.2, blips: [0.35] },
    { t: 10.6, peak: 0.90, dur: 1.2, rot:  0.78, apex: 1.6, exit: 1.8, blips: [0.30, 0.80] },
    { t: 15.4, peak: 0.45, dur: 0.6, rot: -0.35, apex: 0.8, exit: 0.9, blips: [] },
    { t: 18.6, peak: 1.00, dur: 1.8, rot: -0.92, apex: 2.3, exit: 2.4, blips: [0.30, 0.85, 1.30] },
    { t: 23.4, peak: 0.55, dur: 0.7, rot:  0.40, apex: 0.9, exit: 1.1, blips: [0.30] }
  ];
  for (const c of corners) {
    const b0 = idx(c.t), b1 = idx(c.t + c.dur);
    const lift0 = idx(c.t - 0.12);
    for (let i = lift0; i < b0; i++) lap.thr[i] = 1 - (i - lift0) / Math.max(1, b0 - lift0);
    for (let i = b0; i < b1; i++) {
      const p = (i - b0) / (b1 - b0);
      const rise = Math.min(1, p / 0.14);
      const trail = 1 - Math.pow(Math.max(0, (p - 0.25) / 0.75), 1.35);
      lap.brk[i] = c.peak * rise * Math.max(0, trail);
      lap.thr[i] = 0;
    }
    const a1 = idx(c.t + c.apex);
    for (let i = b1; i < a1; i++) lap.thr[i] = 0.04;
    const e1 = idx(c.t + c.apex + c.exit);
    for (let i = a1; i < e1; i++) {
      const p = (i - a1) / Math.max(1, e1 - a1);
      lap.thr[i] = Math.min(1, 0.04 + Math.pow(p, 0.72));
    }
    for (const off of c.blips) {
      const s = idx(c.t + off), len = Math.round(0.20 * HZ);
      for (let i = s; i < s + len && i < N; i++) {
        const shape = Math.sin(Math.PI * ((i - s) / len));
        lap.clu[i] = Math.max(lap.clu[i], Math.min(1, shape * 1.35));
        lap.thr[i] = Math.max(lap.thr[i], shape * 0.5);
      }
    }
    const s0 = idx(c.t + 0.15), sa = idx(c.t + c.apex), s1 = idx(c.t + c.apex + c.exit * 0.9);
    for (let i = s0; i < sa; i++) lap.str[i] = c.rot * Math.pow((i - s0) / Math.max(1, sa - s0), 0.8);
    for (let i = sa; i < s1; i++) lap.str[i] = c.rot * (1 - Math.pow((i - sa) / Math.max(1, s1 - sa), 1.2));
  }
  for (const t of [5.2, 6.0, 13.6, 14.3, 17.2, 22.0]) {
    const s = idx(t), len = Math.round(0.10 * HZ);
    for (let i = s; i < s + len && i < N; i++) {
      const shape = Math.sin(Math.PI * ((i - s) / len));
      lap.clu[i] = Math.max(lap.clu[i], shape);
      lap.thr[i] = Math.min(lap.thr[i], 1 - shape * 0.85);
    }
  }
  for (let i = 0; i < N; i++) {
    const n = (Math.sin(i * 0.37) + Math.sin(i * 1.13)) * 0.006;
    lap.thr[i] = clamp01(lap.thr[i] + n);
    lap.brk[i] = clamp01(lap.brk[i] + n * 0.8);
  }
  smooth(lap.thr, 4); smooth(lap.brk, 4); smooth(lap.clu, 2); smooth(lap.str, 6);
  return lap;
}

export const DEMO_LAP_HZ = HZ;
export const DEMO_LAP_N = N;
