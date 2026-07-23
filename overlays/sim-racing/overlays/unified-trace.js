/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, glass, line, mono, oxa, pct, series, txt } from "../engine/draw-kit.js";

export const id = "unified-trace";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  glass(.5,.5,w-1,h-1,8);
  const gh=h-56;
  line("thr",12,12,w-56,gh,240,C.thr,2);
  line("brk",12,12,w-56,gh,240,C.brk,2);
  line("clu",12,12,w-56,gh,240,C.clu,1.3);
  line("str",12,12,w-56,gh,240,C.str,1.3,v=>(v+1)/2);
  const {d,n,start}=series("gear",240);
  if(n>1){
    for(let i=0;i<n;i++){
      ctx.fillStyle="rgba(231,227,218,"+(0.25+d[start+i]/12)+")";
      ctx.fillRect(12+(i/(n-1))*(w-56), h-34, (w-56)/n+0.8, 10);
    }
  }
  oxa(22); txt(gearName(s.lever), w-24, h-24, C.gear, "right");
  mono(11); txt(pct(s.thr), w-24, 26, C.thr, "right");
  mono(11); txt(pct(s.brk), w-24, 42, C.brk, "right");
}
