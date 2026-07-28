/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { CH, hist, traceOf } from "../engine/draw-kit.js";

export const id = "waterfall";

export function draw(ctx, w, h, s, mem) {
  const pl = 10, pr = 10, gw = w - pl - pr;
  const { n } = traceOf("thr", 150);
  for (const ch of CH){
    const d = hist[ch.k], start = d.length - n;
    if (n < 2) continue;
    ctx.beginPath();
    for (let i = 0; i < n; i++){
      const y = 8 + ((n - 1 - i) / (n - 1)) * (h - 16);
      const x = pl + gw * d[start + i];
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = ch.c; ctx.lineWidth = ch.k === "clu" ? 1.2 : 1.9;
    ctx.lineJoin = "round"; ctx.stroke();
  }
}
