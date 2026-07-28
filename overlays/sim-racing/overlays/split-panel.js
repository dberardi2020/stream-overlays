/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, pedalBars, revColor, txt, wheel } from "../engine/draw-kit.js";

export const id = "split-panel";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  ctx.beginPath(); ctx.moveTo(w/2,16); ctx.lineTo(w/2,h-16);
  ctx.strokeStyle=C.edge; ctx.lineWidth=1; ctx.stroke();
  pedalBars(24, 24, 18, h-64, 12, s);
  wheel(w/4, h-24, 14, s.str*Math.PI*0.78, {lw:2, mark:false});
  const cx=w*0.75, cy=h/2, r=40, A0=Math.PI*0.78, A1=Math.PI*2.22;
  ctx.beginPath(); ctx.arc(cx,cy,r,A0,A1); ctx.strokeStyle=C.track; ctx.lineWidth=9; ctx.lineCap="round"; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r,A0,A0+(A1-A0)*s.rpm); ctx.strokeStyle=revColor(s.rpm); ctx.lineWidth=7; ctx.stroke();
  oxa(28); txt(gearName(s.gear),cx,cy+10,C.gear);
}
