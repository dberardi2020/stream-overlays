# 0006 — Setup is a dedicated surface; the overlay is a pure renderer

**Status:** Accepted · **Date:** 2026-07-23 · **Refines:** [0003](0003-obs-gamepad-fallback.md)

## Context

The overlay page is the thing OBS captures and puts on stream. Today it *also* hosts the setup UI — the calibration panel and connect flow — and hides it (`body.live`) once a wheel is connected. Two problems fall out of that conflation:

- **It can corrupt a live scene.** A mid-stream device drop, a cache clear, or a lost calibration can flip the page back out of the live state and pop the setup chrome onto the broadcast. The "thing on stream" should never be able to show configuration UI.
- **The control surface is wrong.** You can only set up (and only see live input on) *one* overlay at a time, and only by loading that overlay. Choosing and tuning a whole catalogue against real input is the job of a browsing surface, not the OBS source.

We want the safer, more predictable split, and we want to reach it **without a local install** — the zero-install, static-first property (ADR 0002) is worth keeping. (The alternative — a local input bridge that every surface subscribes to — is captured as the road-not-taken below.)

## Decision

**The overlay page becomes a pure renderer with no setup UI, ever.** It reads calibration from `localStorage` and live gamepad input, and draws; with no calibration it rests at zero and shows nothing else. Setup moves to two places:

- A **dedicated setup page** (`setup.html`) owns connect + calibrate and the OBS missing-gamepad **fallback ladder** from ADR 0003. It is where a browser context gets calibrated.
- The **gallery gains a live-input mode** (Demo ⇄ Live) built on the same calibration engine, so you bind once and drive the *whole* catalogue at once — the control surface, separate from the OBS render surface.

Calibration is **per-origin, per-browser-context** (it's `localStorage`, intrinsic to the physical wheel on that machine). So each context that renders overlays calibrates once: your desktop browser for the gallery preview, and OBS's own browser once — by loading `setup.html` in it (a temporary Browser Source → **Interact** → calibrate → remove it), after which every `overlay.html` in that same OBS browser reads the stored calibration. **This is Path A: zero-install.**

## Rationale

- **A pure-render overlay cannot corrupt a live scene** — the mid-stream-chrome failure mode is removed structurally, not patched. This is the root fix for the concern SO-0013 was tracking.
- **Separating render from control** makes each surface do one thing: the overlay renders, the setup page calibrates, the gallery browses/tunes against live or demo input. More visible, more predictable UX.
- **Reuses what exists** — the calibration engine (`calibration.js` + `calibration-math.js`) already works; this is a relocation, not a rewrite.
- **Keeps static-first (ADR 0002)** — no server, no companion process. Configuration that *should* travel still travels in the URL (ADR 0001); calibration, which is device- and context-intrinsic, deliberately does not.

## Consequences

- **`overlay.html` loses all setup chrome.** It reads calibration from `localStorage`, reads live input, draws, and rests at zero when uncalibrated — no panel, no "press c", no error UI on the broadcast.
- **New `setup.html`** owns connect/calibrate and the ADR 0003 fallback ladder — so that ladder now lives here, not on the overlay (this refines ADR 0003's "the overlay page needs a fallback UI").
- **The gallery gains a Demo/Live toggle.** Live drives every tile from the real wheel via the calibration engine.
- **Per-context calibration is the price of zero-install.** OBS calibrates once in its own browser via `setup.html`; the [user guide](../product/user-guide.md) documents the one-time flow. Calibration does not transfer between machines or browser contexts — by design.
- **Full input coverage plugs into the setup page** when built: the H-shifter/gear binding (SO-0006) and any telemetry source (SO-0007) extend `setup.html`, not the overlay.
- **Road not taken — the local bridge (Path B).** A small local process reading the wheel and broadcasting to every surface would let a single calibration serve the gallery *and* all OBS overlays, making overlays pure subscribers. It's the cleanest UX but breaks zero-install, so it stays the documented fallback (ADR 0003, step 3): revisit if per-context calibration proves too clunky in real use.
