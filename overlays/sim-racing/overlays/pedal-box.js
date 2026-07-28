/* Overlay module — see the contract in ADR 0005.
   Draw body byte-for-byte from the prototype. */

import { C, CH, pct, mono } from "../engine/draw-kit.js";

export const id = "pedal-box";

export function draw(ctx, w, h, s, mem) {
  const slot = (w - 20) / 3;
  CH.forEach((ch, i) => {
    const v = s[ch.k], cx = 10 + slot * i + slot / 2, hy = 20, arm = 66;
    ctx.beginPath(); ctx.arc(cx, hy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
    ctx.save(); ctx.translate(cx, hy); ctx.rotate(0.42 * v);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, arm - 22);
    ctx.strokeStyle = "rgba(255,255,255,0.30)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();
    const fw = 26, fh = 34, fy = arm - 22;
    ctx.beginPath(); ctx.roundRect(-fw / 2, fy, fw, fh, 5);
    ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fill();
    ctx.strokeStyle = ch.c; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-fw / 2, fy, fw, fh, 5); ctx.clip();
    ctx.globalAlpha = 0.85; ctx.fillStyle = ch.c;
    ctx.fillRect(-fw / 2, fy + fh * (1 - v), fw, fh * v);
    ctx.restore();
    ctx.restore();
    mono(ctx, 12); ctx.textAlign = "center"; ctx.fillStyle = ch.c;
    ctx.fillText(pct(v), cx, h - 20);
    mono(ctx, 8, 500); ctx.fillStyle = C.label; ctx.fillText(ch.full, cx, h - 8);
  });
}
