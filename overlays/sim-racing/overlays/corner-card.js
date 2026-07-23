/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, glass, oxa, pedalBars, txt, wheel } from "../engine/draw-kit.js";

export const id = "corner-card";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,9);
  oxa(38); txt(gearName(s.lever), 46, 58, C.gear);
  wheel(w-50, 46, 28, s.str*Math.PI*0.78);
  pedalBars(26, 92, 30, 58, 13, s);
}
