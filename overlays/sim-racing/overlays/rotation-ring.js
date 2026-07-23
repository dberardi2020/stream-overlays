/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "rotation-ring";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2, r=48;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle=C.track; ctx.lineWidth=9; ctx.stroke();
  const a=-Math.PI/2, sweep=s.str*Math.PI*0.9;
  ctx.beginPath(); ctx.arc(cx,cy,r,Math.min(a,a+sweep),Math.max(a,a+sweep));
  ctx.strokeStyle=C.str; ctx.lineWidth=8; ctx.lineCap="round"; ctx.stroke();
  for(const m of [-0.9,-0.45,0,0.45,0.9]){
    const ang=-Math.PI/2+m*Math.PI*0.9;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(ang)*(r-9), cy+Math.sin(ang)*(r-9));
    ctx.lineTo(cx+Math.cos(ang)*(r+9), cy+Math.sin(ang)*(r+9));
    ctx.strokeStyle=C.edge; ctx.lineWidth=1.5; ctx.stroke();
  }
  mono(17); txt(DEG(s)+"\u00B0", cx, cy+6, C.str);
}
