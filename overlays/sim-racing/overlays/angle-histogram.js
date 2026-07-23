/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype; `this.mem` -> the `mem` parameter. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "angle-histogram";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const m=mem;
  m.bins=m.bins||new Float32Array(25);
  const b=Math.max(0,Math.min(24,Math.round((s.str+1)/2*24)));
  m.bins[b]+=1;
  let max=1;
  for(const v of m.bins) max=Math.max(max,v);
  const bw=(w-24)/25;
  for(let i=0;i<25;i++){
    const bh=(h-36)*(m.bins[i]/max);
    ctx.beginPath(); ctx.roundRect(12+i*bw, h-22-bh, bw-2, bh, 2);
    ctx.fillStyle=i===b?C.clu:"rgba(100,181,255,0.55)"; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(w/2,10); ctx.lineTo(w/2,h-20);
  ctx.strokeStyle=C.faint; ctx.lineWidth=1; ctx.stroke();
  mono(9,500); txt("L",14,h-6,C.label,"left"); txt("R",w-14,h-6,C.label,"right");
}
