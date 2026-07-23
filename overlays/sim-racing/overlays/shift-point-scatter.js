/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, glass, mono, shiftLog, tel, txt } from "../engine/draw-kit.js";

export const id = "shift-point-scatter";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);
  const t = tel;   // telemetry (rpm/spd) is a separate object, like the prototype

  glass(.5,.5,w-1,h-1,7);
  const x0=28, x1=w-14, y0=16, y1=h-24;
  ctx.strokeStyle=C.faint; ctx.lineWidth=1;
  for(const f of [0.25,0.5,0.75]){
    const y=y0+(y1-y0)*f;
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
  }
  shiftLog.slice(-26).forEach((sh,i)=>{
    ctx.beginPath();
    ctx.arc(x0+((i+0.5)/26)*(x1-x0), y0+(y1-y0)*(1-sh.rpm), 3.4, 0, Math.PI*2);
    ctx.fillStyle=sh.dir>0?C.thr:C.brk;
    ctx.globalAlpha=0.35+0.65*(i/26); ctx.fill(); ctx.globalAlpha=1;
  });
  mono(8,500); txt("SHIFT RPM", x0+2, y1+14, C.label, "left");
}
