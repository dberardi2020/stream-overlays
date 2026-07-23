/* Overlay module — see bowtie.js for the contract. Draw body is byte-for-byte
   from the prototype (Dot ladder). */

import { CH, C, mono } from "../engine/draw-kit.js";

export const id = "dot-ladder";

export function draw(ctx, w, h, s, mem) {
  const DOTS = 10, colGap = 34;
  let x = w / 2 - colGap;
  for (const ch of CH) {
    const lit = Math.round(s[ch.k] * DOTS);
    for (let i = 0; i < DOTS; i++) {
      const y = h - 28 - i * 9.5;
      ctx.beginPath(); ctx.arc(x, y, i < lit ? 3.6 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = i < lit ? ch.c : "rgba(255,255,255,0.16)";
      ctx.fill();
    }
    mono(ctx, 9, 500); ctx.textAlign = "center"; ctx.fillStyle = C.label;
    ctx.fillText(ch.label, x, h - 8);
    x += colGap;
  }
}
