/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { CH, traceOf } from "../engine/draw-kit.js";

export const id = "filled-trace";

export function draw(ctx, w, h, s, mem) {
  const pl = 8, pr = 8, pt = 10, pb = 10, gw = w - pl - pr, gh = h - pt - pb;
  for (const ch of [CH[2], CH[1], CH[0]]){
    const { d, n, start } = traceOf(ch.k, 240);
    if (n < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pl, pt + gh);
    for (let i = 0; i < n; i++){
      ctx.lineTo(pl + (i / (n - 1)) * gw, pt + gh * (1 - d[start + i]));
    }
    ctx.lineTo(pl + gw, pt + gh); ctx.closePath();
    ctx.globalAlpha = 0.45; ctx.fillStyle = ch.c; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = ch.c; ctx.lineWidth = 1.4; ctx.stroke();
  }
}
