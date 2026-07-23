/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "shift-pulse";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const pop=Math.max(0,1-s.shiftAge/0.35);
  const up=s.shiftDir>0, col=up?C.thr:C.brk;
  for(let k=0;k<3;k++){
    const off=k*16-16, yy=h/2+(up?off:-off);
    ctx.globalAlpha=(0.16+pop*0.84)*(1-k*0.28);
    ctx.beginPath();
    ctx.moveTo(w/2-20, up?yy+12:yy-12);
    ctx.lineTo(w/2, yy);
    ctx.lineTo(w/2+20, up?yy+12:yy-12);
    ctx.strokeStyle=col; ctx.lineWidth=4;
    ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.stroke();
  }
  ctx.globalAlpha=1;
  mono(11); txt(up?"UPSHIFT":"DOWNSHIFT", w/2, h-14, pop>0.1?col:C.label);
}
