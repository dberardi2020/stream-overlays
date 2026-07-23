/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, glass, oxa, pedalBars, revColor, tel, txt, wheel } from "../engine/draw-kit.js";

export const id = "dash-cluster";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);
  const t = tel;   // telemetry (rpm/spd) is a separate object, like the prototype

  glass(.5,.5,w-1,h-1,10);
  const cx=w/2-4, cy=h/2+10, r=46, A0=Math.PI*0.78, A1=Math.PI*2.22;
  ctx.beginPath(); ctx.arc(cx,cy,r,A0,A1);
  ctx.strokeStyle=C.track; ctx.lineWidth=11; ctx.lineCap="round"; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r,A0,A0+(A1-A0)*t.rpm);
  ctx.strokeStyle=revColor(t.rpm); ctx.lineWidth=9; ctx.stroke();
  oxa(34); txt(gearName(s.lever), cx, cy+13, C.gear);
  pedalBars(18,28,15,h-56,7,s);
  wheel(w-52, cy-6, 32, s.str*Math.PI*0.78);
}
