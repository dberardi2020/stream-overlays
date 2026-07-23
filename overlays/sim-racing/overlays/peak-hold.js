/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype; `this.mem` -> the `mem` parameter (stateful overlay). */

import { C, CH, glass, mono } from "../engine/draw-kit.js";

export const id = "peak-hold";

export function draw(ctx, w, h, s, mem) {
  const m = mem;
  for (const ch of CH){
    const v = s[ch.k];
    m[ch.k] = Math.max(v, (m[ch.k] || 0) - 0.006);
  }
  const bw = 26, gap = 14;
  let x = (w - (CH.length * bw + (CH.length - 1) * gap)) / 2;
  const top = 18, bh = h - 40;
  for (const ch of CH){
    const v = s[ch.k];
    glass(ctx, x, top, bw, bh, 5);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, top, bw, bh, 5); ctx.clip();
    ctx.fillStyle = ch.c; ctx.fillRect(x, top + bh * (1 - v), bw, bh * v);
    ctx.restore();
    const py = top + bh * (1 - m[ch.k]);
    ctx.beginPath(); ctx.moveTo(x - 3, py); ctx.lineTo(x + bw + 3, py);
    ctx.strokeStyle = ch.c; ctx.lineWidth = 2; ctx.stroke();
    mono(ctx, 9, 500); ctx.textAlign = "center"; ctx.fillStyle = C.label;
    ctx.fillText(ch.label, x + bw / 2, h - 8);
    x += bw + gap;
  }
}
