/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, glass, mono, txt } from "../engine/draw-kit.js";

export const id = "centre-out-bar";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, half=w/2-16;
  glass(14,h/2-11,w-28,22,5);
  ctx.beginPath(); ctx.moveTo(cx,h/2-14); ctx.lineTo(cx,h/2+14);
  ctx.strokeStyle=C.edge; ctx.lineWidth=1; ctx.stroke();
  const len=half*Math.abs(s.str);
  ctx.beginPath(); ctx.roundRect(s.str<0?cx-len:cx, h/2-9, len, 18, 3);
  ctx.fillStyle=C.str; ctx.fill();
  mono(11); txt(DEG(s)+"\u00B0", cx, h-10, C.label);
}
