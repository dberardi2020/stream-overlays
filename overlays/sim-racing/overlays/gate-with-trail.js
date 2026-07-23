/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype; `this.mem` -> the `mem` parameter. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, drawGate, drawKnob, glass, knobXY } from "../engine/draw-kit.js";

export const id = "gate-with-trail";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  const cx=w/2, cy=h/2, sx=44, sy=38;
  drawGate(cx,cy,sx,sy);
  const m=mem; m.trail=m.trail||[];
  const [kx,ky]=knobXY(cx,cy,sx,sy);
  const last=m.trail[m.trail.length-1];
  if(!last || Math.hypot(last[0]-kx,last[1]-ky)>0.5) m.trail.push([kx,ky]);
  if(m.trail.length>60) m.trail.shift();
  ctx.lineCap="round"; ctx.lineJoin="round";
  for(let i=1;i<m.trail.length;i++){
    ctx.globalAlpha=(i/m.trail.length)*0.6;
    ctx.beginPath();
    ctx.moveTo(m.trail[i-1][0],m.trail[i-1][1]);
    ctx.lineTo(m.trail[i][0],m.trail[i][1]);
    ctx.strokeStyle=C.clu; ctx.lineWidth=5; ctx.stroke();
  }
  ctx.globalAlpha=1;
  drawKnob(cx,cy,sx,sy,9);
}
