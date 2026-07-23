/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype; `this.mem` -> the `mem` parameter. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt, wheel } from "../engine/draw-kit.js";

export const id = "countersteer-flash";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const m=mem;
  const prev=m.prev===undefined?s.str:m.prev;
  m.prev=s.str;
  const rate=(s.str-prev)*60;
  m.flash=Math.max((m.flash||0)-0.03, Math.min(1,Math.abs(rate)/2.2));
  const opp=Math.sign(rate)!==Math.sign(s.str)&&Math.abs(s.str)>0.12;
  if(m.flash>0.05&&opp){
    ctx.globalAlpha=m.flash*0.75;
    ctx.beginPath(); ctx.arc(w/2,h/2-8,58,0,Math.PI*2);
    ctx.strokeStyle=C.brk; ctx.lineWidth=3; ctx.stroke();
    ctx.globalAlpha=1;
  }
  wheel(w/2,h/2-8,42,s.str*Math.PI*0.78,{color:opp?C.brk:C.str});
  mono(11);
  if(m.flash>0.05&&opp) txt("CATCH", w/2, h-12, C.brk);
  else txt(DEG(s)+"\u00B0", w/2, h-12, C.label);
}
