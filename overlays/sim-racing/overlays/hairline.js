/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { CH } from "../engine/draw-kit.js";

export const id = "hairline";

export function draw(ctx, w, h, s, mem) {
  CH.forEach((ch, i) => {
    const y = h / 2 - 10 + i * 10;
    ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(w - 8, y);
    ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(8 + (w - 16) * s[ch.k], y);
    ctx.strokeStyle = ch.c; ctx.lineWidth = 2.5; ctx.stroke();
  });
}
