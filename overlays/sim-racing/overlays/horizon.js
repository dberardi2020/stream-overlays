/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind } from "../engine/draw-kit.js";

export const id = "horizon";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  ctx.save();
  ctx.beginPath(); ctx.roundRect(10,10,w-20,h-20,10); ctx.clip();
  ctx.translate(w/2,h/2); ctx.rotate(-s.str*0.42);
  ctx.fillStyle="rgba(100,181,255,0.28)"; ctx.fillRect(-w,-h,w*2,h);
  ctx.fillStyle="rgba(8,9,12,0.5)"; ctx.fillRect(-w,0,w*2,h);
  ctx.beginPath(); ctx.moveTo(-w,0); ctx.lineTo(w,0);
  ctx.strokeStyle=C.str; ctx.lineWidth=2; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(w/2-16,h/2); ctx.lineTo(w/2+16,h/2);
  ctx.strokeStyle=C.gear; ctx.lineWidth=2; ctx.stroke();
}
