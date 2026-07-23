/* Overlay module — the one-file-per-overlay contract.

   Each overlay exports its immutable `id` (the OBS URL contract: ?style=bowtie)
   and a `draw(ctx, w, h, state, mem)`. All other metadata — name, size, set,
   stage, note — lives in catalogue.json, the single source of truth; a test keeps
   the set of module ids and manifest ids in lock-step. The draw body is lifted
   byte-for-byte from the prototype; only the surrounding module frame is new. */

import { C, mono, pct } from "../engine/draw-kit.js";

export const id = "bowtie";

export function draw(ctx, w, h, s, mem) {
  const cx = w / 2, bh = 22, y = h / 2 - bh / 2, half = w / 2 - 18;
  ctx.beginPath(); ctx.moveTo(cx, 12); ctx.lineTo(cx, h - 12);
  ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(cx - half * s.brk, y, half * s.brk, bh, 3);
  ctx.fillStyle = C.brk; ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx, y, half * s.thr, bh, 3);
  ctx.fillStyle = C.thr; ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - half * s.clu / 2, y + bh + 6, half * s.clu, 5, 2);
  ctx.fillStyle = C.clu; ctx.fill();
  mono(ctx, 12); ctx.textAlign = "right"; ctx.fillStyle = C.brk; ctx.fillText(pct(s.brk), cx - 6, y - 8);
  ctx.textAlign = "left"; ctx.fillStyle = C.thr; ctx.fillText(pct(s.thr), cx + 6, y - 8);
}
