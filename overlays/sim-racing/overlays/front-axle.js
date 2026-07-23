/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "front-axle";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2;
  ctx.beginPath(); ctx.roundRect(cx-20,cy-42,40,84,8);
  ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.28)"; ctx.lineWidth=1.4; ctx.stroke();
  const tyre=(x,y,ang)=>{
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    ctx.beginPath(); ctx.roundRect(-5,-13,10,26,3);
    ctx.fillStyle=C.str; ctx.fill(); ctx.restore();
  };
  const a=s.str*0.55;
  tyre(cx-26,cy-28,a); tyre(cx+26,cy-28,a);
  tyre(cx-26,cy+28,0); tyre(cx+26,cy+28,0);
  mono(11); txt(DEG(s)+"\u00B0", cx, h-8, C.label);
}
