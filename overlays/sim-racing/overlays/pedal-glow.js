/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, mono } from "../engine/draw-kit.js";

export const id = "pedal-glow";

export function draw(ctx, w, h, s, mem) {
  const slot = w / 3;
  CH.forEach((ch, i) => {
    const v = s[ch.k], cx = slot * i + slot / 2, cy = h / 2 - 6;
    ctx.save();
    ctx.shadowColor = ch.c; ctx.shadowBlur = 6 + v * 26;
    ctx.beginPath(); ctx.roundRect(cx - 20, cy - 30, 40, 60, 7);
    ctx.fillStyle = ch.c; ctx.globalAlpha = 0.12 + v * 0.8; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(cx - 20, cy - 30, 40, 60, 7);
    ctx.strokeStyle = "rgba(255,255,255,0.30)"; ctx.lineWidth = 1.2; ctx.stroke();
    mono(ctx, 9, 500); ctx.textAlign = "center"; ctx.fillStyle = C.label;
    ctx.fillText(ch.label, cx, h - 10);
  });
}
