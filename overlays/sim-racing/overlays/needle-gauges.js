/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, mono } from "../engine/draw-kit.js";

export const id = "needle-gauges";

export function draw(ctx, w, h, s, mem) {
  const slot = w / 3;
  CH.forEach((ch, i) => {
    const v = s[ch.k], cx = slot * i + slot / 2, cy = h - 30, r = 30;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
    ctx.strokeStyle = C.track; ctx.lineWidth = 7; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * v);
    ctx.strokeStyle = ch.c; ctx.lineWidth = 3; ctx.stroke();
    const a = Math.PI + Math.PI * v;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
    ctx.strokeStyle = ch.c; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = ch.c; ctx.fill();
    mono(ctx, 9, 500); ctx.textAlign = "center"; ctx.fillStyle = C.label;
    ctx.fillText(ch.label, cx, cy + 16);
  });
}
