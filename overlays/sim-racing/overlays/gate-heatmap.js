/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, drawGate, gateUse, gateXY, mono, txt } from "../engine/draw-kit.js";

export const id = "gate-heatmap";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  const cx=w/2, cy=h/2, sx=44, sy=38;
  let max=0.001;
  for(const g in gateUse) max=Math.max(max,gateUse[g]);
  for(let g=1;g<=6;g++){
    const [x,y]=gateXY(g,cx,cy,sx,sy);
    ctx.beginPath(); ctx.arc(x,y,16,0,Math.PI*2);
    ctx.fillStyle=C.clu; ctx.globalAlpha=0.10+(gateUse[g]/max)*0.70; ctx.fill(); ctx.globalAlpha=1;
    mono(11); txt(String(g),x,y+4,g===s.lever?C.gear:C.label);
  }
  drawGate(cx,cy,sx,sy,3);
}
