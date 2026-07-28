/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, mode, mono, oxa, txt } from "../engine/draw-kit.js";

export const id = "throw-timer";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const ms=Math.round(mode().throw*1000), p=s.shiftProg;
  ctx.beginPath(); ctx.roundRect(16,h/2-6,w-32,12,6);
  ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.fill();
  ctx.beginPath(); ctx.roundRect(16,h/2-6,(w-32)*p,12,6);
  ctx.fillStyle=p<1?C.clu:C.thr; ctx.fill();
  oxa(24); txt(gearName(s.lever), 34, h/2-18, C.gear);
  mono(13); txt(ms+" ms", w-20, h/2-18, p<1?C.clu:C.label, "right");
  mono(9,500); txt("LAST THROW", 16, h-14, C.label, "left");
}
