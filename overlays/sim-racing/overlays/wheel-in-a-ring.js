/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, mono, txt, wheel } from "../engine/draw-kit.js";

export const id = "wheel-in-a-ring";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2-6;
  ctx.beginPath(); ctx.arc(cx,cy,62,0,Math.PI*2);
  ctx.strokeStyle="rgba(255,255,255,0.10)"; ctx.lineWidth=7; ctx.stroke();
  const a=-Math.PI/2, sweep=s.str*Math.PI*0.9;
  ctx.beginPath(); ctx.arc(cx,cy,62,Math.min(a,a+sweep),Math.max(a,a+sweep));
  ctx.strokeStyle=C.str; ctx.lineWidth=6; ctx.lineCap="round"; ctx.stroke();
  wheel(cx,cy,42,s.str*Math.PI*0.78,{lw:3});
  mono(12); txt(DEG(s)+"\u00B0", cx, h-10, C.str);
}
