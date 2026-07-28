/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, mono, traceOf } from "../engine/draw-kit.js";

export const id = "rolling-trace";

export function draw(ctx, w, h, s, mem) {
  const pl = 8, pr = 46, pt = 10, pb = 10, gw = w - pl - pr, gh = h - pt - pb;
  ctx.strokeStyle = C.faint; ctx.lineWidth = 1;
  for (const f of [0.25,0.5,0.75]){
    const y = pt + gh * f;
    ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pl + gw, y); ctx.stroke();
  }
  for (const ch of CH){
    const { d, n, start } = traceOf(ch.k, 240);
    if (n < 2) continue;
    ctx.beginPath();
    for (let i = 0; i < n; i++){
      const x = pl + (i / (n - 1)) * gw, y = pt + gh * (1 - d[start + i]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = ch.c; ctx.lineWidth = ch.k === "clu" ? 1.4 : 2;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
    const y = pt + gh * (1 - s[ch.k]);
    ctx.beginPath(); ctx.arc(pl + gw, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = ch.c; ctx.fill();
    mono(ctx, 12); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(pct(s[ch.k]), pl + gw + 8, y);
  }
  ctx.textBaseline = "alphabetic";
}
