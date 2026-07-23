/* Channel state — Layer 2.

   The live values every overlay draws from. One object per running page, shared
   by the calibration engine (which writes it) and the draw loop (which reads it).
   `real` flips true once a calibrated wheel is connected; until then the overlay
   rests at zero rather than showing fake data. */

export function createState() {
  return { thr: 0, brk: 0, clu: 0, str: 0, real: false, lapTime: 0 };
}
