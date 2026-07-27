/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, GATE, bind, drawGate, drawKnob, gateXY, glass, mono, txt } from "../engine/draw-kit.js";

export const id = "gate-map";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  const cx=w/2, cy=h/2-4, sx=44, sy=36;
  drawGate(cx,cy,sx,sy);
  for(let g=1;g<=6;g++){
    const [x,y]=gateXY(g,cx,cy,sx,sy);
    mono(10,500); txt(String(g), x+GATE[g][0]*12, y+(GATE[g][1]<0?-10:18), C.label);
  }
  drawKnob(cx,cy,sx,sy,10);
  mono(10,500); txt(s.lever==null?"NO SHIFTER":s.lever===0?"NEUTRAL":"GEAR "+s.lever, cx, h-10, C.label);
}
