/* Overlay module — see the contract in ADR 0005.
   The three pedal blocks broken out of `cockpit` into a dedicated pedals-set
   overlay: each block depresses and lights up with press. Diegetic — magnitude
   reads from fill + travel, no numerals (matches the cockpit source). */

import { C, CH, mono } from "../engine/draw-kit.js";

export const id = "pedal-blocks";

export function draw(ctx, w, h, s, mem) {

  const bw = 34, bh = 46, r = 5, travel = 11, gap = 48;
  const cx = w / 2;
  // Centre the housing-plus-label group vertically.
  const restTop = Math.round((h - (bh + travel) - 16) / 2);

  CH.forEach((ch, i) => {                 // CH order: clu, brk, thr — left to right
    const v = Math.max(0, Math.min(1, s[ch.k] || 0));
    const x = cx + (i - 1) * gap - bw / 2;

    // Housing the pedal travels in (faint, diegetic — not a readout).
    ctx.beginPath(); ctx.roundRect(x, restTop, bw, bh + travel, r + 1);
    ctx.fillStyle = C.faint; ctx.fill();

    // The pedal block, pressed downward and brightening with travel.
    const top = restTop + v * travel;
    ctx.beginPath(); ctx.roundRect(x, top, bw, bh, r);
    ctx.globalAlpha = 0.20 + v * 0.7; ctx.fillStyle = ch.c; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 1.4; ctx.strokeStyle = ch.c; ctx.stroke();

    // Channel label beneath.
    mono(ctx, 9, 500); ctx.textAlign = "center"; ctx.fillStyle = C.label;
    ctx.fillText(ch.label, x + bw / 2, restTop + bh + travel + 15);
  });
}
