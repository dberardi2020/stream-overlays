# 0001 — Configuration lives in the URL, not in storage

**Status:** Accepted · **Date:** 2026-07-23

## Context

A streamer configures an overlay in one place (a normal browser, or a future configure page) and runs it in another: OBS's embedded Browser Source. The two do not share state. `localStorage` is scoped per-origin *and* per-browser-profile, so anything saved there in Chrome is invisible to OBS's browser — which quietly breaks the one workflow that matters.

## Decision

**All overlay configuration lives in URL query parameters** — `?style=<id>&scale=<n>&bg=<hex>&…`. The page reads its entire configuration from the URL and stores nothing about *which overlay, how big, what colours*. The only thing kept in browser storage is the per-wheel **calibration**, which is intrinsic to the physical device on that machine and never needs to travel.

## Rationale

- A configured overlay becomes a **link you paste into OBS** — portable, shareable, bookmarkable, diffable.
- It sidesteps storage entirely for the thing that must cross browser boundaries, which is exactly where per-origin storage fails.
- It matches how established overlay tools already work, so it meets user expectations.
- Storing nothing user-specific also means there is nothing to sync, migrate, or protect.

## Consequences

- The **id is a permanent contract**: it appears in URLs streamers have saved, so it can never change (see [ADR 0005](0005-overlay-module-contract.md) and [concepts](../product/concepts.md)).
- A future **configure page** is a URL generator, not a settings store — it binds inputs and emits the link.
- Any setting that must persist across the configure→OBS boundary has to be expressible in the URL. Calibration is the deliberate exception, because it is tied to the device, not the overlay.
