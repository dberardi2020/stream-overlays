/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, mono } from "../engine/draw-kit.js";

export const id = "ring-gauges";

export function draw(ctx, w, h, s, mem) {
  const r = 30, gap = 80;
  let cx = w / 2 - gap, cy = h / 2 - 6;
  for (const ch of CH){
    const v = s[ch.k];
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = C.track; ctx.lineWidth = 8; ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
    ctx.strokeStyle = ch.c; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.stroke();
    mono(ctx, 13); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = ch.c; ctx.fillText(pct(v), cx, cy);
    mono(ctx, 9, 500); ctx.fillStyle = C.label; ctx.textBaseline = "alphabetic";
    ctx.fillText(ch.label, cx, cy + r + 16);
    cx += gap;
  }
}
