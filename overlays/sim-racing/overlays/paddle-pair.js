/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "paddle-pair";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const pop=Math.max(0,1-s.shiftAge/0.22);
  const cx=w/2, cy=h/2;
  ctx.beginPath(); ctx.arc(cx,cy,26,0,Math.PI*2);
  ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=3; ctx.stroke();
  mono(11,500); txt("SHIFT", cx, cy+4, C.label);
  const flip=(sign,active,col)=>{
    ctx.save();
    ctx.translate(cx+sign*44, cy);
    ctx.rotate(sign*(0.25+(active?pop*0.35:0)));
    ctx.beginPath(); ctx.roundRect(-9,-30,18,60,8);
    ctx.fillStyle=col; ctx.globalAlpha=0.18+(active?pop*0.8:0); ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke();
    ctx.restore();
  };
  flip(-1, s.shiftDir<0, C.brk);
  flip( 1, s.shiftDir>0, C.thr);
  mono(9,500); txt("DOWN", cx-44, h-8, C.label); txt("UP", cx+44, h-8, C.label);
}
