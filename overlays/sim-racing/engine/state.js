/* Channel state — Layer 2.

   The live values every overlay draws from. One object per running page, shared
   by the calibration engine (which writes it) and the draw loop (which reads it).
   `real` flips true once a calibrated wheel is connected; until then the overlay
   rests at zero rather than showing fake data.

   The gear/shifter fields mirror what the demo driver produces (demo-driver.js),
   so the shifter overlays read the same shape whether the data is live or demo:
   `gear` (0=N, 1..6, -1=R), `lever` (the throw-animated position, 0 mid-throw in
   H-pattern), `prevGear`/`shiftDir`/`shiftAge`/`shiftProg`/`shiftCount` for the
   shift-in-progress visuals. Live values are filled by live-input.js (SO-0006);
   they rest at neutral until a shifter is calibrated. */

export function createState() {
  return {
    thr: 0, brk: 0, clu: 0, str: 0, real: false, lapTime: 0,
    gear: 0, lever: 0, prevGear: 0,
    shiftAge: 99, shiftDir: 0, shiftProg: 1, shiftCount: 0
  };
}
