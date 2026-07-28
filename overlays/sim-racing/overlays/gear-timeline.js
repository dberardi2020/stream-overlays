/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, mono, series, txt } from "../engine/draw-kit.js";

export const id = "gear-timeline";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const rowH=(h-24)/6;
  for(let g=1;g<=6;g++){
    const y=h-12-g*rowH;
    ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(w-24,y);
    ctx.strokeStyle=C.faint; ctx.lineWidth=1; ctx.stroke();
    mono(8,500); txt(String(g), w-14, y+rowH*0.75, C.label);
  }
  const {d,n,start}=series("gear",260);
  if(n<2) return;
  for(let i=0;i<n;i++){
    const g=d[start+i];
    ctx.fillStyle=g===s.gear?C.clu:"rgba(255,255,255,0.42)";
    ctx.fillRect(10+(i/(n-1))*(w-36), h-12-g*rowH, Math.max(1.6,(w-36)/n+0.6), rowH-2);
  }
}
