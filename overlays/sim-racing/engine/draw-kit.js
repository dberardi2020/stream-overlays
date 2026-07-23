/* Draw kit — the shared sub-visuals every overlay draws with — Layer 2.

   Palette, channel table, the rolling input history, the shifter/wheel/rev
   helpers, and the text/line primitives. Overlay draw bodies are lifted verbatim
   from the prototype, so the names they reference here must resolve to exactly
   these — every helper is a named callable (the seam the future builder composes
   from).

   Two calling conventions coexist (see ADR 0005): some bodies pass `ctx`
   explicitly to `glass`/`mono`; most rely on a module-global `ctx`, and the
   shifter helpers read a module-global `input`. `bind(ctx, s)` sets both before a
   draw runs; `glass`/`mono` are reconciled to accept either form. Helper bodies
   are byte-for-byte from the prototype's reconciled engine (catalogue.html), which
   is also the source the QA goldens were rendered from — so the palette here is
   that file's palette exactly. */

/* ---- palette + channel table ---- */
export const C = {
  thr: "#34d97a", brk: "#f2453d", clu: "#ffb020", str: "#64b5ff", gear: "#e7e3da",
  glass: "rgba(8,9,12,0.55)", edge: "rgba(255,255,255,0.14)",
  faint: "rgba(255,255,255,0.10)", label: "rgba(255,255,255,0.66)",
  track: "rgba(8,9,12,0.6)", ghost: "rgba(231,227,218,0.5)"
};
export const CH = [
  { k: "clu", c: C.clu, label: "CLU", full: "CLUTCH" },
  { k: "brk", c: C.brk, label: "BRK", full: "BRAKE" },
  { k: "thr", c: C.thr, label: "THR", full: "THROTTLE" }
];
export const pct = v => String(Math.round(v * 100));
export const gearName = g => g === 0 ? "N" : String(g);
export const DEG = s => Math.round(s.str * 450);
export const revColor = r => r > 0.92 ? C.brk : r > 0.78 ? C.clu : C.thr;
export const GATE = { 1: [-1, -1], 2: [-1, 1], 3: [0, -1], 4: [0, 1], 5: [1, -1], 6: [1, 1] };
export const ALLK = ["H", "SEQ", "PADDLE"];
export const LAP_SECONDS = 30;   // sim lap length; some overlays phase against clock.lapTime
const lerp = (a, b, t) => a + (b - a) * t;

/* Shift-mode config (H-pattern / sequential / paddle) — some shifter overlays read
   the active mode's throw duration etc. `mode()` returns the current entry. */
export const MODES = [
  { id: "H",      label: "H-pattern",  throw: 0.34, cluPeak: 1.0, cluDur: 0.40, absolute: true  },
  { id: "SEQ",    label: "Sequential", throw: 0.14, cluPeak: 0.5, cluDur: 0.14, absolute: false },
  { id: "PADDLE", label: "Paddles",    throw: 0.07, cluPeak: 0,   cluDur: 0,    absolute: false }
];
let modeIdx = 0;
export const mode = () => MODES[modeIdx];
export function setMode(i) { modeIdx = i; }

/* ---- shared mutable render state ---- */
/* The rolling per-channel history, plus the shifter accumulators. All are shared
   singletons the loop feeds (live) or the QA harness sets (from the fixture). */
export const HIST_MAX = 500;
export const hist = { thr: [], brk: [], clu: [], str: [], gear: [] };
export const shiftLog = [];
export const shiftTimes = [];
export const gateUse = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
export const clock = { t: 0, lapTime: 0 };   // wall-time + lap phase the overlays read
export const tel = { rpm: 0, spd: 0 };        // sim telemetry — separate from input, as the prototype has it

export function pushHistory(st) {
  for (const k of Object.keys(hist)) {
    if (st[k] === undefined) continue;
    hist[k].push(st[k]);
    if (hist[k].length > HIST_MAX) hist[k].shift();
  }
}

/* ---- the render context + state the helpers close over ---- */
/* `ctx` is the canvas the global-convention helpers draw to; `input` is the live
   state the shifter helpers read. `bind` sets both — the loop/harness/module
   wrapper calls it before each draw so both resolve to the same objects. */
let ctx = null;
let input = null;
export function bind(c, s) { ctx = c; input = s; }

/* ---- text + line primitives (byte-for-byte from the prototype) ---- */
function glassImpl(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = C.glass; ctx.fill();
  ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
}
function monoImpl(sz, wt) { ctx.font = (wt || 600) + " " + sz + "px 'IBM Plex Mono', ui-monospace, monospace"; }
export function oxa(sz, wt) { ctx.font = (wt || 800) + " " + sz + "px Oxanium, 'IBM Plex Mono', monospace"; }
export function txt(s, x, y, color, align, base) {
  ctx.fillStyle = color;
  ctx.textAlign = align || "center";
  ctx.textBaseline = base || "alphabetic";
  ctx.fillText(s, x, y);
  ctx.textBaseline = "alphabetic";
}
export function series(k, count) {
  const d = hist[k], n = Math.min(d.length, count);
  return { d, n, start: d.length - n };
}
export function line(k, x0, y0, gw, gh, count, color, width, map) {
  const { d, n, start } = series(k, count);
  if (n < 2) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = map ? map(d[start + i]) : d[start + i];
    const x = x0 + (i / (n - 1)) * gw, y = y0 + gh * (1 - v);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 2;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.stroke();
}

/* ---- H gate + shifter ---- */
export function gateXY(g, cx, cy, sx, sy) {
  const p = GATE[g] || [0, 0];
  return [cx + p[0] * sx, cy + p[1] * sy];
}
export function knobXY(cx, cy, sx, sy) {
  const p = input.shiftProg;
  if (p >= 1 || input.prevGear === input.gear) return gateXY(input.gear, cx, cy, sx, sy);
  const from = gateXY(input.prevGear, cx, cy, sx, sy);
  const to   = gateXY(input.gear, cx, cy, sx, sy);
  const d1 = Math.abs(from[1] - cy);
  const d2 = Math.abs(to[0] - from[0]);
  const d3 = Math.abs(to[1] - cy);
  const total = d1 + d2 + d3;
  if (total < 0.001) return to;
  const t = p * total;
  if (t <= d1) return [from[0], lerp(from[1], cy, d1 ? t / d1 : 1)];
  if (t <= d1 + d2) return [lerp(from[0], to[0], d2 ? (t - d1) / d2 : 1), cy];
  return [to[0], lerp(cy, to[1], d3 ? (t - d1 - d2) / d3 : 1)];
}
export function drawGate(cx, cy, sx, sy, lw) {
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = lw || 6;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - sx, cy); ctx.lineTo(cx + sx, cy); ctx.stroke();
  for (const c of [-1, 0, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + c * sx, cy - sy); ctx.lineTo(cx + c * sx, cy + sy); ctx.stroke();
  }
}
export function drawKnob(cx, cy, sx, sy, r) {
  const [kx, ky] = knobXY(cx, cy, sx, sy);
  ctx.beginPath(); ctx.arc(kx, ky, r || 9, 0, Math.PI * 2);
  ctx.fillStyle = input.lever === 0 ? C.ghost : C.gear;
  ctx.fill();
  return [kx, ky];
}

/* ---- wheel: a flat-bottomed GT rim with real spokes ---- */
export function wheel(cx, cy, r, angle, opts) {
  const o = opts || {};
  const col = o.color || C.str;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.72, Math.PI * 2.28);
  ctx.closePath();
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(2.5, r * 0.16);
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.62, r * 0.04); ctx.lineTo(r * 0.62, r * 0.04);
  ctx.moveTo(0, r * 0.04);         ctx.lineTo(0, r * 0.66);
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.6, r * 0.10);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.roundRect(-r * 0.19, -r * 0.13, r * 0.38, r * 0.30, r * 0.09);
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (o.mark !== false) {
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 1.44, Math.PI * 1.56);
    ctx.strokeStyle = C.clu;
    ctx.lineWidth = Math.max(3, r * 0.19);
    ctx.lineCap = "butt";
    ctx.stroke();
  }
  ctx.restore();
}

export function pedalBars(x, y, bw, bh, gap, s) {
  [["clu", C.clu], ["brk", C.brk], ["thr", C.thr]].forEach((p, i) => {
    const px = x + i * (bw + gap), v = s[p[0]];
    glass(px, y, bw, bh, 4);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(px, y, bw, bh, 4); ctx.clip();
    ctx.fillStyle = p[1]; ctx.fillRect(px, y + bh * (1 - v), bw, bh * v);
    ctx.restore();
  });
  return x + 3 * (bw + gap) - gap;
}

export function revStrip(x, y, w2, h2, r) {
  const L = 12, lit = Math.round(r * L);
  for (let i = 0; i < L; i++) {
    const col = i < L * 0.55 ? C.thr : i < L * 0.82 ? C.clu : C.brk;
    ctx.beginPath(); ctx.roundRect(x + i * (w2 / L), y, w2 / L - 3, h2, 2);
    ctx.fillStyle = i < lit ? col : "rgba(255,255,255,0.10)"; ctx.fill();
  }
}

/* ---- reconciled glass/mono: accept ctx-first OR module-global ctx ---- */
export function glass(a, b, c, d, e, f) {
  if (a && typeof a === "object" && typeof a.roundRect === "function") {
    const prev = ctx; ctx = a; glassImpl(b, c, d, e, f); ctx = prev; return;
  }
  return glassImpl(a, b, c, d, e);
}
export function mono(a, b, c) {
  if (a && typeof a === "object" && typeof a.roundRect === "function") {
    const prev = ctx; ctx = a; monoImpl(b, c); ctx = prev; return;
  }
  return monoImpl(a, b);
}

export function hexToRgba(hex, a) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "000000";
  const n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
export function traceOf(k, count) {
  const d = hist[k], n = Math.min(d.length, count);
  return { d, n, start: d.length - n };
}
