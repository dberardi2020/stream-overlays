# Overview

What the project is, the problem it solves, and who it's for.

## The idea, as built

A streamer who sim races wants their **inputs on screen** — how hard they're braking, whether they're trailing the throttle, how much lock they're carrying. Stream Overlays draws that live. The browser reads the wheel **client-side** through the Gamepad API, an overlay renders the values to a **transparent canvas**, and **OBS** composites it over the scene. Because the browser does the reading, there is no service to run: an overlay is a **static file**, and its configuration is **a URL you paste into OBS**. No install, no account, nothing stored.

## Who it's for

Sim racers who stream (and streamers who race) on **Logitech G923** today — the first supported wheel. The design is not sim-specific: "read a device in the browser, draw it, composite in OBS" generalises, so sim racing is the first *vertical* under a broader overlay platform, not the whole of it.

## What exists now

- An **engine** that turns raw wheel axes into normalised channel values through a per-wheel calibration, plus the shared drawing kit overlays are built from.
- A **catalogue of 72 overlay designs** (`overlays/sim-racing/catalogue.json`), the manifest that is the source of truth.
- **All 68 non-excluded overlays** migrated to the one-file-per-overlay architecture, each draw body byte-for-byte from the prototype and pixel-verified against a golden ([SO-0001](../tickets/tickets.md) ✅).
- A **gallery** (`pages/gallery.html`) that renders every overlay live over a synthetic demo lap — pedals, steering, gears, and telemetry all moving — so a style can be judged before a wheel is connected ([SO-0002](../tickets/tickets.md) ✅).
- A **test suite** that guards the manifest's integrity, that every overlay actually paints, and that the demo driver stays faithful to the reference.

## What does not exist yet

The rest of the streamer-facing site — a configure page that generates the OBS URL, hosting, and a discovery/landing front door. Those come next; see the [roadmap in the README](../../README.md#roadmap). The vocabulary those pages will use is fixed now in [concepts.md](concepts.md).
