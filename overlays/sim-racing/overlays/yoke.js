/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "yoke";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  ctx.save();
  ctx.translate(w/2,h/2);
  ctx.rotate(s.str*Math.PI*0.6);
  ctx.beginPath();
  ctx.arc(0,0,40,Math.PI*1.10,Math.PI*1.90);
  ctx.lineTo(26,15); ctx.lineTo(-26,15); ctx.closePath();
  ctx.strokeStyle=C.str; ctx.lineWidth=5; ctx.lineJoin="round"; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-7,-5,14,12,3); ctx.fillStyle=C.str; ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,40,Math.PI*1.46,Math.PI*1.54);
  ctx.strokeStyle=C.clu; ctx.lineWidth=7; ctx.stroke();
  ctx.restore();
  mono(11); txt(DEG(s)+"\u00B0", w/2, h-10, C.str);
}
