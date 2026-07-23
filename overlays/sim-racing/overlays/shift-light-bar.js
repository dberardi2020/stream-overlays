/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. `bind(ctx, s)` wires the module-global ctx/state the helpers use. */

import { C, bind, gearName, oxa, tel, txt } from "../engine/draw-kit.js";

export const id = "shift-light-bar";

export function draw(ctx, w, h, s, mem) {
  bind(ctx, s);
  const t = tel;   // telemetry (rpm/spd) is a separate object, like the prototype

  const LEDS=14, pad=12, gw=w-pad*2-58, lit=Math.round(t.rpm*LEDS);
  for(let i=0;i<LEDS;i++){
    const col=i<LEDS*0.55?C.thr:i<LEDS*0.82?C.clu:C.brk;
    ctx.beginPath(); ctx.roundRect(pad+i*(gw/LEDS), h/2-14, gw/LEDS-4, 28, 3);
    ctx.fillStyle=i<lit?col:"rgba(255,255,255,0.09)"; ctx.fill();
  }
  oxa(34); txt(gearName(s.lever), w-30, h/2+12, C.gear);
}
