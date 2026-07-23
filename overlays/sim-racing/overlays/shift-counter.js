/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, mono, oxa, shiftLog, txt } from "../engine/draw-kit.js";

export const id = "shift-counter";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const ups=shiftLog.filter(x=>x.dir>0).length;
  const dns=shiftLog.length-ups;
  oxa(40); txt(String(s.shiftCount), w/2, h/2+6, C.gear);
  mono(10,500); txt("SHIFTS", w/2, h/2+24, C.label);
  mono(12); txt("\u25B2 "+ups, w/2-42, h-16, C.thr);
  mono(12); txt("\u25BC "+dns, w/2+42, h-16, C.brk);
}
