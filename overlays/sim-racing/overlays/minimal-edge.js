/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, txt } from "../engine/draw-kit.js";

export const id = "minimal-edge";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  [["thr",C.thr,h-16],["brk",C.brk,h-9]].forEach(([k,col,y])=>{
    ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(10+(w-20)*s[k],y);
    ctx.strokeStyle=col; ctx.lineWidth=3; ctx.lineCap="round"; ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(10,18); ctx.lineTo(w-10,18);
  ctx.strokeStyle="rgba(255,255,255,0.10)"; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(10+(w-20)*((s.str+1)/2), 18, 4, 0, Math.PI*2);
  ctx.fillStyle=C.str; ctx.fill();
  oxa(26); txt(gearName(s.lever), w/2, h/2+10, C.gear);
}
