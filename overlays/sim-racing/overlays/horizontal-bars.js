/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, glass, mono } from "../engine/draw-kit.js";

export const id = "horizontal-bars";

export function draw(ctx, w, h, s, mem) {
  const bh = 16, gap = 12;
  let y = (h - (CH.length * bh + (CH.length - 1) * gap)) / 2;
  for (const ch of CH){
    const v = s[ch.k];
    mono(ctx, 9, 500); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = C.label; ctx.fillText(ch.label, 4, y + bh / 2);
    glass(ctx, 34, y, w - 74, bh, 4);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(34, y, w - 74, bh, 4); ctx.clip();
    ctx.fillStyle = ch.c; ctx.fillRect(34, y, (w - 74) * v, bh);
    ctx.restore();
    mono(ctx, 12); ctx.textAlign = "right"; ctx.fillStyle = ch.c;
    ctx.fillText(pct(v), w - 4, y + bh / 2);
    y += bh + gap;
  }
  ctx.textBaseline = "alphabetic";
}
