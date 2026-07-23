/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, mono } from "../engine/draw-kit.js";

export const id = "segment-ladder";

export function draw(ctx, w, h, s, mem) {
  const SEG = 12, bw = 26, gap = 14;
  let x = (w - (CH.length * bw + (CH.length - 1) * gap)) / 2;
  const top = 20, bottom = h - 20, segH = (bottom - top) / SEG;
  for (const ch of CH){
    const v = s[ch.k], lit = Math.round(v * SEG);
    for (let i = 0; i < SEG; i++){
      const y = bottom - (i + 1) * segH + 2;
      ctx.beginPath(); ctx.roundRect(x, y, bw, segH - 4, 2);
      ctx.fillStyle = i < lit ? ch.c : "rgba(255,255,255,0.09)";
      ctx.fill();
    }
    mono(ctx, 9, 500); ctx.textAlign = "center"; ctx.fillStyle = C.label;
    ctx.fillText(ch.label, x + bw / 2, h - 6);
    x += bw + gap;
  }
}
