/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "rudder-scale";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const x0=18, x1=w-18, y=h/2;
  ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y);
  ctx.strokeStyle=C.edge; ctx.lineWidth=2; ctx.stroke();
  for(let i=0;i<=8;i++){
    const x=x0+(x1-x0)*(i/8), big=i%2===0;
    ctx.beginPath(); ctx.moveTo(x,y-(big?10:5)); ctx.lineTo(x,y+(big?10:5));
    ctx.strokeStyle=C.faint; ctx.lineWidth=1.5; ctx.stroke();
  }
  const mx=x0+(x1-x0)*((s.str+1)/2);
  ctx.beginPath(); ctx.moveTo(mx,y-16); ctx.lineTo(mx-7,y-26); ctx.lineTo(mx+7,y-26); ctx.closePath();
  ctx.fillStyle=C.str; ctx.fill();
  mono(11); txt(DEG(s)+"\u00B0", mx, y+26, C.str);
}
