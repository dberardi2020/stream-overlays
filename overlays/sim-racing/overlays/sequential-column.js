/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "sequential-column";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const pop=Math.max(0,1-s.shiftAge/0.3);
  for(let g=6;g>=1;g--){
    const y=28+(6-g)*20, on=g===s.gear;
    ctx.beginPath(); ctx.arc(w/2-24,y+7,4,0,Math.PI*2);
    ctx.fillStyle=on?C.clu:"rgba(255,255,255,0.16)"; ctx.fill();
    mono(on?14:11,on?600:400); txt(String(g),w/2+4,y+12,on?C.gear:C.label);
  }
  ctx.globalAlpha=pop;
  const up=s.shiftDir>0, ay=up?14:h-10;
  ctx.beginPath(); ctx.moveTo(w/2-9,up?ay+9:ay-9); ctx.lineTo(w/2,ay); ctx.lineTo(w/2+9,up?ay+9:ay-9);
  ctx.strokeStyle=up?C.thr:C.brk; ctx.lineWidth=3; ctx.lineCap="round"; ctx.stroke();
  ctx.globalAlpha=1;
}
