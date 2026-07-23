/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, txt } from "../engine/draw-kit.js";

export const id = "hud";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  [["thr",C.thr,0],["brk",C.brk,10],["clu",C.clu,20]].forEach(([k,col,off])=>{
    const y=h-46+off;
    ctx.beginPath(); ctx.moveTo(14,y); ctx.lineTo(w-92,y);
    ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14,y); ctx.lineTo(14+(w-106)*s[k],y);
    ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(14,26); ctx.lineTo(w-92,26);
  ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=1.5; ctx.stroke();
  const mx=14+(w-106)*((s.str+1)/2);
  ctx.beginPath(); ctx.moveTo(mx,19); ctx.lineTo(mx,33);
  ctx.strokeStyle=C.str; ctx.lineWidth=2.5; ctx.stroke();
  oxa(44); txt(gearName(s.lever), w-44, h/2+16, C.gear);
}
