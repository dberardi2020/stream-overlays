/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, txt } from "../engine/draw-kit.js";

export const id = "ambient-trio";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  [["clu",-66,C.clu],["brk",0,C.brk],["thr",66,C.thr]].forEach(([k,dx,col])=>{
    const v=s[k];
    ctx.save();
    ctx.shadowColor=col; ctx.shadowBlur=6+v*30;
    ctx.beginPath(); ctx.arc(w/2+dx, h/2+16, 15, 0, Math.PI*2);
    ctx.fillStyle=col; ctx.globalAlpha=0.12+v*0.85; ctx.fill();
    ctx.restore();
  });
  oxa(30); txt(gearName(s.lever), w/2, 46, C.gear);
  ctx.beginPath(); ctx.arc(w/2+s.str*76, h-14, 3.5, 0, Math.PI*2);
  ctx.fillStyle=C.str; ctx.fill();
}
