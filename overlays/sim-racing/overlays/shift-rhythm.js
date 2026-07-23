/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, clock, glass, mono, shiftTimes, txt } from "../engine/draw-kit.js";

export const id = "shift-rhythm";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,7);
  const mid=h/2, span=12;
  ctx.beginPath(); ctx.moveTo(12,mid); ctx.lineTo(w-12,mid);
  ctx.strokeStyle=C.faint; ctx.lineWidth=1; ctx.stroke();
  for(const ev of shiftTimes){
    const age=clock.t-ev.t;
    if(age>span) continue;
    const x=w-12-(age/span)*(w-24);
    const up=ev.dir>0;
    ctx.globalAlpha=1-age/span*0.75;
    ctx.beginPath();
    ctx.moveTo(x,mid);
    ctx.lineTo(x, up?mid-26:mid+26);
    ctx.strokeStyle=up?C.thr:C.brk;
    ctx.lineWidth=2.5; ctx.lineCap="round";
    ctx.stroke();
  }
  ctx.globalAlpha=1;
  mono(9,500); txt("UP", 16, mid-30, C.label, "left");
  mono(9,500); txt("DOWN", 16, mid+38, C.label, "left");
}
