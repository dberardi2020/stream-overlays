/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, series } from "../engine/draw-kit.js";

export const id = "steering-ribbon";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const {d,n,start}=series("str",200);
  if(n<2) return;
  ctx.beginPath();
  for(let i=0;i<n;i++) ctx.lineTo(10+(i/(n-1))*(w-20), h/2+d[start+i]*30-6);
  for(let i=n-1;i>=0;i--) ctx.lineTo(10+(i/(n-1))*(w-20), h/2+d[start+i]*30+6);
  ctx.closePath();
  ctx.fillStyle=C.str; ctx.globalAlpha=0.7; ctx.fill(); ctx.globalAlpha=1;
}
