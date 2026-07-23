/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype; `this.mem` -> the `mem` parameter. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, glass, mono, txt } from "../engine/draw-kit.js";

export const id = "smoothness-meter";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const m=mem;
  const prev=m.prev===undefined?s.str:m.prev;
  m.prev=s.str;
  m.v=(m.v||0)*0.9+Math.abs(s.str-prev)*6;
  const f=Math.min(1,m.v/1.6);
  glass(14,h/2-12,w-28,24,5);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(14,h/2-12,w-28,24,5); ctx.clip();
  ctx.fillStyle=f>0.7?C.brk:f>0.4?C.clu:C.thr;
  ctx.fillRect(14,h/2-12,(w-28)*f,24);
  ctx.restore();
  mono(11); txt(f>0.7?"RAGGED":f>0.4?"BUSY":"SMOOTH", w/2, h/2-22, C.label);
  mono(10,500); txt("INPUT RATE", w/2, h/2+32, C.label);
}
