/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, line } from "../engine/draw-kit.js";

export const id = "steering-trace";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  ctx.beginPath(); ctx.moveTo(10,h/2); ctx.lineTo(w-10,h/2);
  ctx.strokeStyle=C.faint; ctx.lineWidth=1; ctx.stroke();
  line("str",10,12,w-20,h-24,240,C.str,2,v=>(v+1)/2);
  const y=12+(h-24)*(1-(s.str+1)/2);
  ctx.beginPath(); ctx.arc(w-10,y,3,0,Math.PI*2); ctx.fillStyle=C.str; ctx.fill();
}
