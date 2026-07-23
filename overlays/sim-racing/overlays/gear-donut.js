/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gateUse, gearName, oxa, txt } from "../engine/draw-kit.js";

export const id = "gear-donut";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2, r=48;
  let total=0;
  for(const g in gateUse) total+=gateUse[g];
  total=Math.max(total,0.001);
  let a=-Math.PI/2;
  for(let g=1;g<=6;g++){
    const span=(gateUse[g]/total)*Math.PI*2;
    ctx.beginPath(); ctx.arc(cx,cy,r,a,a+span);
    ctx.strokeStyle=g===s.lever?C.clu:"rgba(255,255,255,"+(0.15+g*0.05)+")";
    ctx.lineWidth=g===s.lever?14:10;
    ctx.stroke();
    a+=span;
  }
  oxa(30); txt(gearName(s.lever), cx, cy+11, C.gear);
}
