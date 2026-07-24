/* The one hardware seam — Layer 2.

   Every read of the physical wheel goes through here: `navigator.getGamepads()`
   is client-side, so the streamer's browser reads their G923 and hands us the
   axis values. Isolating it in one module means the rest of the engine takes a
   plain `{ axes: [...] }` object and can be driven by a mock in tests. */

export function getPad() {
  return [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
}

/* The H-shifter and paddles report as gamepad BUTTONS, not axes — a gear is
   "button N held". `pad.buttons[i]` is a GamepadButton ({pressed, value}) in a
   real browser, but tests drive a plain `{ buttons: [...] }` mock, so accept a
   bare number/boolean too. The 0.5 value threshold catches analog buttons that
   never report `pressed`. */
export function isButtonDown(pad, i) {
  const b = pad && pad.buttons && pad.buttons[i];
  if (b == null) return false;
  return typeof b === "object" ? (b.pressed || b.value > 0.5) : b > 0.5;
}

/* The indices of every currently-held button — what gear calibration watches to
   learn which button a gear engages. */
export function pressedButtons(pad) {
  const out = [];
  const n = pad && pad.buttons ? pad.buttons.length : 0;
  for (let i = 0; i < n; i++) if (isButtonDown(pad, i)) out.push(i);
  return out;
}
