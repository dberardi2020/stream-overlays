/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, glass, oxa, pedalBars, revStrip, txt, wheel } from "../engine/draw-kit.js";

export const id = "lower-third";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  pedalBars(14,14,14,h-28,6,s);
  oxa(30); txt(gearName(s.gear), 96, h/2+11, C.gear);
  revStrip(126, h/2-7, 120, 14, s);
  wheel(w-40, h/2, 22, s.str*Math.PI*0.78, {lw:2.5});
}
