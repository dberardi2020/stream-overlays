# 0003 — The OBS missing-gamepad case is a guided fallback, not a bug

**Status:** Accepted · **Date:** 2026-07-23

## Context

There is one real obstacle to the whole approach: **OBS's embedded browser often will not expose a gamepad**, because the Browser Source never receives real window focus, and the Gamepad API only reports devices to a focused document. Hosting neither causes this nor fixes it — it is a property of how OBS runs the page.

## Decision

**Detect "no device after N seconds" and present a fallback ladder** rather than failing silently. In order of effort:

1. Right-click the source → **Interact**, and press a pedal in that window (this gives the page focus and usually wakes the API).
2. Failing that, run the overlay in a real Chrome window and use OBS **Window Capture** with a colour key.
3. Eventually, an optional **local bridge** for people who want it bulletproof — reads the device over HID and pushes values to the page.

## Rationale

- The failure is unavoidable and environmental, so the honest response is to guide the user through it, not to pretend it won't happen.
- Turning a confusing dead end ("my overlay is blank") into a labelled, ordered recovery flow is a **product feature** — it is often the difference between a user succeeding and giving up.
- The ladder degrades gracefully: most users are fixed at step 1; the heavier options exist only for those who need them.

## Field result (2026-07-26)

**Step 1 works.** Confirmed on Windows 11 / OBS with a Logitech G923: adding
`pages/setup.html` as a Browser Source and using right-click → **Interact** wakes the
Gamepad API — the device line goes green and reports the wheel. So Browser Source is
viable, and Window Capture is *not* forced.

Two things that test made concrete, and which the guidance has to say out loud:

- **OBS's CEF is a separate browser**, so it has its own `localStorage` and needs its
  own calibration. A rig calibrated in Chrome shows as entirely "not set" in OBS.
- The Interact window is small and shows the full site — nav bar and all — which is
  wasted space for a surface only ever used inside OBS.

One environment is not the population, so the ladder stays. But the ordering is now
evidence-backed rather than assumed, and the **local bridge (step 3) stays firmly
optional**.

## Consequences

- The overlay page needs a **device-presence timeout and a fallback UI** (the current pilot page shows calibration state but not yet the full ladder — tracked with the configure/gallery work).
- The **local bridge** is an optional future component, not a dependency — the static site must remain fully usable without it.
- How common the focus problem is across real setups is still open (see the README roadmap); the answer decides whether the bridge stays optional or becomes recommended.
