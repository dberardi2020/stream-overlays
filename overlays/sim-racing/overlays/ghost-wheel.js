/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype; `this.mem` -> the `mem` parameter. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, LAP_SECONDS, bind, clock, mono, txt, wheel } from "../engine/draw-kit.js";

export const id = "ghost-wheel";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const m=mem;
  m.ghost=m.ghost||Array.from({length:300},(_,i)=>Math.sin(i/300*Math.PI*4)*0.7);
  const gi=Math.floor((clock.lapTime/LAP_SECONDS)*m.ghost.length)%m.ghost.length;
  ctx.globalAlpha=0.28;
  wheel(w/2,h/2-8,46,m.ghost[gi]*Math.PI*0.78,{color:C.gear,mark:false});
  ctx.globalAlpha=1;
  wheel(w/2,h/2-8,46,s.str*Math.PI*0.78);
  const delta=Math.round((s.str-m.ghost[gi])*450);
  mono(11); txt((delta>0?"+":"")+delta+"\u00B0", w/2, h-12, Math.abs(delta)>60?C.brk:C.thr);
}
