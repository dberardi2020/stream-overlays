/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, drawGate, drawKnob, gearName, glass, oxa, pedalBars, txt, wheel } from "../engine/draw-kit.js";

export const id = "gate-strip";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  pedalBars(14,18,14,h-36,6,s);
  const cx=142, cy=h/2, sx=22, sy=17;
  drawGate(cx,cy,sx,sy,4);
  drawKnob(cx,cy,sx,sy,6);
  oxa(30); txt(gearName(s.lever), 224, h/2+11, C.gear);
  wheel(w-44, h/2, 26, s.str*Math.PI*0.78);
}
