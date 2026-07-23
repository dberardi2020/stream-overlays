/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, mono } from "../engine/draw-kit.js";

export const id = "numerals";

export function draw(ctx, w, h, s, mem) {
  const slot = w / 3;
  CH.forEach((ch, i) => {
    const cx = slot * i + slot / 2, v = s[ch.k];
    mono(ctx, 34, 600); ctx.textAlign = "center";
    ctx.fillStyle = ch.c; ctx.globalAlpha = 0.35 + v * 0.65;
    ctx.fillText(pct(v).padStart(2, "0"), cx, h / 2 + 8);
    ctx.globalAlpha = 1;
    mono(ctx, 9, 500); ctx.fillStyle = C.label; ctx.fillText(ch.label, cx, h / 2 + 26);
  });
}
