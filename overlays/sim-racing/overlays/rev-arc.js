/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, revColor, tel, txt } from "../engine/draw-kit.js";

export const id = "rev-arc";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);
  const t = tel;   // telemetry (rpm/spd) is a separate object, like the prototype

  const cx=w/2, cy=h/2, r=48, A0=Math.PI*0.75, A1=Math.PI*2.25;
  ctx.beginPath(); ctx.arc(cx,cy,r,A0,A1);
  ctx.strokeStyle=C.track; ctx.lineWidth=12; ctx.lineCap="round"; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r,A0,A0+(A1-A0)*t.rpm);
  ctx.strokeStyle=revColor(t.rpm); ctx.lineWidth=10; ctx.stroke();
  oxa(38); txt(gearName(s.lever), cx, cy+13, C.gear);
}
