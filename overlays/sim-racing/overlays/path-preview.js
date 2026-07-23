/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt } from "../engine/draw-kit.js";

export const id = "path-preview";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h-22;
  ctx.beginPath(); ctx.moveTo(cx,cy);
  const k=s.str*0.024;
  for(let i=1;i<=44;i++){
    const t=i*2.6;
    ctx.lineTo(cx + Math.sin(k*t)*(k?1/k:0) * (k?1:0) + (k?0:0) + (k? (1/k)*(1-Math.cos(0)) *0 :0) + t*Math.sin(k*t*0.5)*0.35, cy - t);
  }
  ctx.strokeStyle=C.str; ctx.lineWidth=3; ctx.globalAlpha=0.75; ctx.lineCap="round"; ctx.stroke(); ctx.globalAlpha=1;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(s.str*0.22);
  ctx.beginPath(); ctx.roundRect(-11,-16,22,32,4);
  ctx.fillStyle=C.gear; ctx.fill(); ctx.restore();
  mono(11); txt(DEG(s)+"\u00B0", w-14, 18, C.str, "right");
}
