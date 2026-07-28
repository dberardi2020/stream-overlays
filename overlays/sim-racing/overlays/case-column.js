/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, mono, oxa, pedalBars, txt, wheel } from "../engine/draw-kit.js";

export const id = "case-column";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  oxa(58); txt(gearName(s.lever), w/2, 76, C.gear);
  mono(9,500); txt("GEAR", w/2, 94, C.label);
  wheel(w/2, 150, 40, s.str*Math.PI*0.78);
  pedalBars(w/2-42, 200, 24, 74, 12, s);
  mono(9,500); txt("CLU    BRK    THR", w/2, h-14, C.label);
}
