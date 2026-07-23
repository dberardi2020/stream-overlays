/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, txt, wheel } from "../engine/draw-kit.js";

export const id = "radial-hub";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2;
  const A0=Math.PI*0.72, A1=Math.PI*2.28;
  for(const [k,r,col] of [["thr",58,C.thr],["brk",46,C.brk],["clu",34,C.clu]]){
    ctx.beginPath(); ctx.arc(cx,cy,r,A0,A1);
    ctx.strokeStyle=C.track; ctx.lineWidth=9; ctx.lineCap="round"; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r,A0,A0+(A1-A0)*s[k]);
    ctx.strokeStyle=col; ctx.lineWidth=7; ctx.stroke();
  }
  oxa(28); txt(gearName(s.lever), cx, cy+10, C.gear);
  ctx.save(); ctx.translate(cx,cy); ctx.scale(1,1);
  wheel(0,0,78,s.str*Math.PI*0.78,{color:"rgba(100,181,255,0.85)"});
  ctx.restore();
}
