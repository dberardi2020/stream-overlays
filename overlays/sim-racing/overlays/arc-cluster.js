/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind } from "../engine/draw-kit.js";

export const id = "arc-cluster";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx = w / 2, cy = h - 22;
  const rings = [{k:"thr",r:60},{k:"brk",r:48},{k:"clu",r:36}];
  const A0 = Math.PI * 1.02, A1 = Math.PI * 1.98;
  for (const ring of rings){
    const c = C[ring.k];
    ctx.beginPath(); ctx.arc(cx, cy, ring.r, A0, A1);
    ctx.strokeStyle = C.track; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, ring.r, A0, A0 + (A1 - A0) * s[ring.k]);
    ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.stroke();
  }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.str * 0.9);
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0);
  ctx.strokeStyle = C.str; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();
}
