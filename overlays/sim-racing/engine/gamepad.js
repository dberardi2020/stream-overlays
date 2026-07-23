/* The one hardware seam — Layer 2.

   Every read of the physical wheel goes through here: `navigator.getGamepads()`
   is client-side, so the streamer's browser reads their G923 and hands us the
   axis values. Isolating it in one module means the rest of the engine takes a
   plain `{ axes: [...] }` object and can be driven by a mock in tests. */

export function getPad() {
  return [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
}
