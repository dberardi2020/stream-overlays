/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, drawGate, drawKnob, gearName, oxa, txt, wheel } from "../engine/draw-kit.js";

export const id = "cockpit";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  wheel(78, 62, 40, s.str*Math.PI*0.78);
  const cx=72, cy=136;
  [["clu",-30,C.clu],["brk",0,C.brk],["thr",30,C.thr]].forEach(([k,dx,col])=>{
    const v=s[k];
    ctx.beginPath(); ctx.roundRect(cx+dx-11, cy-18+v*8, 22, 32, 4);
    ctx.fillStyle=col; ctx.globalAlpha=0.20+v*0.7; ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle=col; ctx.lineWidth=1.2; ctx.stroke();
  });
  const gx=196, gy=88, sx=24, sy=22;
  drawGate(gx,gy,sx,sy,4);
  drawKnob(gx,gy,sx,sy,7);
  oxa(20); txt(gearName(s.lever), gx, h-18, C.gear);
}
