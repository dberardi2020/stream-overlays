/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, drawGate, drawKnob, glass, mono, txt } from "../engine/draw-kit.js";

export const id = "clutch-and-gate";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  const cx=w/2+20, cy=h/2, sx=38, sy=32;
  drawGate(cx,cy,sx,sy,5);
  drawKnob(cx,cy,sx,sy,9);
  const bx=22, bh=h-44;
  ctx.beginPath(); ctx.roundRect(bx,22,22,bh,5);
  ctx.fillStyle="rgba(8,9,12,0.5)"; ctx.fill();
  ctx.strokeStyle=C.edge; ctx.lineWidth=1; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(bx,22,22,bh,5); ctx.clip();
  ctx.fillStyle=C.clu; ctx.fillRect(bx,22+bh*(1-s.clu),22,bh*s.clu);
  ctx.restore();
  mono(9,500); txt("CLU", bx+11, h-8, C.label);
}
