/* Overlay module — see bowtie.js for the contract. Draw body is byte-for-byte
   from the prototype (Comet). Reads rolling history, so it imports `hist`/`traceOf`. */

import { CH, hist, traceOf } from "../engine/draw-kit.js";

export const id = "comet";

export function draw(ctx, w, h, s, mem) {
  const { n } = traceOf("thr", 60);
  CH.forEach((ch, row) => {
    const d = hist[ch.k], start = d.length - n, y = 26 + row * 30;
    for (let i = 0; i < n; i++) {
      const v = d[start + i];
      const x = 14 + (i / Math.max(1, n - 1)) * (w - 50);
      ctx.globalAlpha = (i / n) * 0.85;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + v * 7, 0, Math.PI * 2);
      ctx.fillStyle = ch.c; ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}
