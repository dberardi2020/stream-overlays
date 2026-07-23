/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, mono, oxa, txt } from "../engine/draw-kit.js";

export const id = "big-numeral";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const pop=Math.max(0,1-s.shiftAge/0.3);
  ctx.save();
  ctx.shadowColor=s.shiftDir>0?C.thr:C.brk;
  ctx.shadowBlur=pop*30;
  oxa(74+pop*10);
  txt(gearName(s.lever), w/2, h/2+26, C.gear);
  ctx.restore();
  mono(10,500); txt("GEAR", w/2, h-14, C.label);
}
