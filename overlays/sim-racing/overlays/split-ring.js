/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, pct, mono } from "../engine/draw-kit.js";

export const id = "split-ring";

export function draw(ctx, w, h, s, mem) {
  const cx = w / 2, cy = h / 2, r = 48, TOP = -Math.PI / 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = C.track; ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, TOP, TOP + Math.PI * s.thr);
  ctx.strokeStyle = C.thr; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, TOP - Math.PI * s.brk, TOP);
  ctx.strokeStyle = C.brk; ctx.lineWidth = 10; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 14, TOP, TOP + Math.PI * 2 * s.clu);
  ctx.strokeStyle = C.clu; ctx.lineWidth = 3; ctx.stroke();
  mono(ctx, 15); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = s.brk > s.thr ? C.brk : C.thr;
  ctx.fillText(pct(Math.max(s.thr, s.brk)), cx, cy);
  ctx.textBaseline = "alphabetic";
}
