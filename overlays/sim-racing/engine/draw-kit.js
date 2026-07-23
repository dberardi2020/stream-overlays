/* Draw kit — the shared sub-visuals every overlay draws with — Layer 2.

   Palette, channel table, glass/mono/pct helpers, and the rolling input history.
   Overlay modules import from here; their draw bodies are lifted verbatim from
   the single-file prototype, so the names they reference (`C`, `CH`, `glass`,
   `mono`, `pct`, `traceOf`, `hist`) must resolve to exactly these. This is also
   the seam the future builder composes from — each helper is a named callable. */

/* Palette. `C.thr/brk/clu/str` are the channel colours; the rest are chrome. */
export const C = {
  thr: "#34d97a", brk: "#f2453d", clu: "#ffb020", str: "#64b5ff",
  glass: "rgba(8,9,12,0.55)", edge: "rgba(255,255,255,0.14)",
  track: "rgba(8,9,12,0.6)", faint: "rgba(255,255,255,0.10)", label: "rgba(255,255,255,0.68)"
};

/* Pedal channels, in bottom-to-top display order (clutch, brake, throttle). */
export const CH = [
  { k: "clu", c: C.clu, label: "CLU", full: "CLUTCH" },
  { k: "brk", c: C.brk, label: "BRK", full: "BRAKE" },
  { k: "thr", c: C.thr, label: "THR", full: "THROTTLE" }
];

export const pct = v => String(Math.round(v * 100));

export function glass(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = C.glass; ctx.fill();
  ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
}

export function mono(ctx, size, weight) {
  ctx.font = (weight || 600) + " " + size + "px 'IBM Plex Mono', monospace";
}

/* Rolling per-channel history, shared by every overlay on the page (they all
   read the same wheel). `pushHistory` is called once per frame by the loop;
   `traceOf` hands an overlay the last `count` samples of a channel. */
export const HIST_MAX = 400;
export const hist = { thr: [], brk: [], clu: [] };

export function pushHistory(state) {
  for (const k of ["thr", "brk", "clu"]) {
    hist[k].push(state[k]);
    if (hist[k].length > HIST_MAX) hist[k].shift();
  }
}

export function traceOf(k, count) {
  const d = hist[k], n = Math.min(d.length, count);
  return { d, n, start: d.length - n };
}
