/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, DEG, bind, gearName, line, mono, pct, txt } from "../engine/draw-kit.js";

export const id = "engineer-view";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);

  [["THR",pct(s.thr),C.thr,"thr",null],
   ["BRK",pct(s.brk),C.brk,"brk",null],
   ["CLU",pct(s.clu),C.clu,"clu",null],
   ["STR",DEG(s)+"",C.str,"str",v=>(v+1)/2],
   ["GEAR",gearName(s.lever),C.gear,"gear",v=>v/6]
  ].forEach(([label,val,col,key,map],i)=>{
    const y=20+i*25;
    mono(10,500); txt(label, 14, y+10, C.label, "left");
    mono(12);     txt(val,   66, y+10, col, "right");
    line(key, 78, y, w-96, 16, 180, col, 1.4, map);
  });
}
