/* Overlay module — see the contract in ADR 0005.
   Originally a byte-for-byte prototype port; since evolved to carry the gate-map
   readouts (gear numbers + GEAR callout) on top of the decaying knob trail.
   `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, GATE, bind, drawGate, drawKnob, gateXY, glass, knobXY, mono, txt } from "../engine/draw-kit.js";

export const id = "gate-with-trail";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  const cx=w/2, cy=h/2-4, sx=44, sy=36;
  drawGate(cx,cy,sx,sy);

  // decaying trail of the knob path (shorter buffer -> fades a touch quicker)
  const m=mem; m.trail=m.trail||[];
  const [kx,ky]=knobXY(cx,cy,sx,sy);
  const last=m.trail[m.trail.length-1];
  if(!last || Math.hypot(last[0]-kx,last[1]-ky)>0.5) m.trail.push([kx,ky]);
  if(m.trail.length>45) m.trail.shift();
  ctx.lineCap="round"; ctx.lineJoin="round";
  for(let i=1;i<m.trail.length;i++){
    ctx.globalAlpha=(i/m.trail.length)*0.6;
    ctx.beginPath();
    ctx.moveTo(m.trail[i-1][0],m.trail[i-1][1]);
    ctx.lineTo(m.trail[i][0],m.trail[i][1]);
    ctx.strokeStyle=C.clu; ctx.lineWidth=5; ctx.stroke();
  }
  ctx.globalAlpha=1;

  // gate-map readouts: numbered gates + the current-gear callout
  for(let g=1;g<=6;g++){
    const [x,y]=gateXY(g,cx,cy,sx,sy);
    mono(10,500); txt(String(g), x+GATE[g][0]*12, y+(GATE[g][1]<0?-10:18), C.label);
  }
  drawKnob(cx,cy,sx,sy,9);
  mono(10,500); txt(s.lever==null?"NO SHIFTER":s.lever===0?"NEUTRAL":"GEAR "+s.lever, cx, h-10, C.label);
}
