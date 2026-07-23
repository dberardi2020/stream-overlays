/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, glass, mono } from "../engine/draw-kit.js";

export const id = "vertical-bars";

export function draw(ctx, w, h, s, mem) {
  const bw = 26, gap = 14, total = CH.length * bw + (CH.length - 1) * gap;
  let x = (w - total) / 2;
  for (const ch of CH){
    const v = s[ch.k];
    glass(ctx, x, 22, bw, h - 44, 5);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, 22, bw, h - 44, 5); ctx.clip();
    ctx.fillStyle = ch.c;
    ctx.fillRect(x, 22 + (h - 44) * (1 - v), bw, (h - 44) * v);
    ctx.restore();
    mono(ctx, 12); ctx.textAlign = "center"; ctx.fillStyle = ch.c;
    ctx.fillText(pct(v), x + bw / 2, 16);
    mono(ctx, 9, 500); ctx.fillStyle = C.label;
    ctx.fillText(ch.label, x + bw / 2, h - 8);
    x += bw + gap;
  }
}
