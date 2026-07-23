/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, glass, mono, txt } from "../engine/draw-kit.js";

export const id = "gear-ladder";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  for(let g=6;g>=1;g--){
    const y=20+(6-g)*21, on=g===s.lever;
    ctx.beginPath(); ctx.roundRect(14,y,w-28,17,4);
    ctx.fillStyle=on?C.gear:"rgba(255,255,255,0.08)"; ctx.fill();
    mono(12); txt(String(g), w/2, y+13, on?"#15171b":C.label);
  }
}
