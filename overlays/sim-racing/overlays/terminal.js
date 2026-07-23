/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, glass, mono } from "../engine/draw-kit.js";

export const id = "terminal";

export function draw(ctx, w, h, s, mem) {
  glass(ctx, 0.5, 0.5, w - 1, h - 1, 5);
  const CELLS = 16;
  mono(ctx, 13, 500); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  CH.forEach((ch, i) => {
    const v = s[ch.k], lit = Math.round(v * CELLS);
    const y = 26 + i * 24;
    ctx.fillStyle = C.label; ctx.fillText(ch.label, 12, y);
    ctx.fillStyle = ch.c;
    ctx.fillText("█".repeat(lit), 50, y);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillText(" ".repeat(lit) + "░".repeat(CELLS - lit), 50, y);
    ctx.fillStyle = ch.c; ctx.textAlign = "right";
    ctx.fillText(pct(v), w - 12, y);
    ctx.textAlign = "left";
  });
  ctx.textBaseline = "alphabetic";
}
