/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt, wheel } from "../engine/draw-kit.js";

export const id = "wheel";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  wheel(w/2, h/2-8, 46, s.str*Math.PI*0.78);
  mono(12); txt(DEG(s)+"\u00B0", w/2, h-12, C.str);
}
