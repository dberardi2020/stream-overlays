/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, knobXY, oxa, txt } from "../engine/draw-kit.js";

export const id = "lever-position";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2, sx=40, sy=34;
  ctx.strokeStyle=C.faint; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx-sx-14,cy); ctx.lineTo(cx+sx+14,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-sy-14); ctx.lineTo(cx,cy+sy+14); ctx.stroke();
  const [kx,ky]=knobXY(cx,cy,sx,sy);
  ctx.setLineDash([3,3]); ctx.strokeStyle=C.str; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(kx,cy); ctx.lineTo(kx,ky); ctx.lineTo(cx,ky); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(kx,ky,7,0,Math.PI*2); ctx.fillStyle=C.str; ctx.fill();
  oxa(20); txt(gearName(s.lever), w-22, h-14, C.gear, "right");
}
