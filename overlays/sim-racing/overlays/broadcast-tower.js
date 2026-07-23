/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, gearName, glass, mono, oxa, pct, revStrip, tel, txt } from "../engine/draw-kit.js";

export const id = "broadcast-tower";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);
  const t = tel;   // telemetry (rpm/spd) is a separate object, like the prototype

  glass(.5,.5,w-1,h-1,6);
  const row=(y,label,val,col,frac)=>{
    ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(10,y,w-20,30);
    ctx.fillStyle=col; ctx.globalAlpha=0.22; ctx.fillRect(10,y,(w-20)*frac,30); ctx.globalAlpha=1;
    mono(9,500); txt(label, 16, y+19, C.label, "left");
    mono(13);    txt(val, w-16, y+19, col, "right");
  };
  oxa(34); txt(gearName(s.lever), w/2, 48, C.gear);
  revStrip(12, 60, w-24, 10, t.rpm);
  row(84,  "THR", pct(s.thr), C.thr, s.thr);
  row(118, "BRK", pct(s.brk), C.brk, s.brk);
  row(152, "CLU", pct(s.clu), C.clu, s.clu);
  row(186, "STR", DEG(s)+"\u00B0", C.str, (s.str+1)/2);
  row(220, "SPD", Math.round(t.spd*2.2)+"", C.gear, t.spd/88);
}
