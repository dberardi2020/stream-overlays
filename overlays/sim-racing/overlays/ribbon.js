/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { CH, hist, traceOf } from "../engine/draw-kit.js";

export const id = "ribbon";

export function draw(ctx, w, h, s, mem) {
  const { n } = traceOf("thr", 180);
  CH.forEach((ch, row) => {
    const d = hist[ch.k], start = d.length - n, mid = 26 + row * 32;
    if (n < 2) return;
    ctx.beginPath();
    for (let i = 0; i < n; i++){
      const x = 10 + (i / (n - 1)) * (w - 20);
      ctx.lineTo(x, mid - d[start + i] * 13);
    }
    for (let i = n - 1; i >= 0; i--){
      const x = 10 + (i / (n - 1)) * (w - 20);
      ctx.lineTo(x, mid + d[start + i] * 13);
    }
    ctx.closePath();
    ctx.fillStyle = ch.c; ctx.globalAlpha = 0.75; ctx.fill(); ctx.globalAlpha = 1;
  });
}
