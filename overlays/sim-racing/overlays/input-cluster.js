/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, glass, mono, oxa, pedalBars, txt, wheel } from "../engine/draw-kit.js";

export const id = "input-cluster";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,10);
  oxa(54); txt(gearName(s.lever), w/2-6, h/2+18, C.gear);
  mono(9,500); txt("GEAR", w/2-6, h/2+36, C.label);
  pedalBars(18,28,15,h-56,7,s);
  wheel(w-58, h/2-2, 36, s.str*Math.PI*0.78);
}
