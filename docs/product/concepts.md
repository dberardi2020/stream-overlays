# Concepts

The vocabulary of the project. This is the single source for the concept model — other docs link here rather than restate it.

| Term | Meaning |
| --- | --- |
| **Overlay** | One canvas renderer with an immutable **id** and a `draw` function. Selected in the URL: `?style=<id>`. |
| **Channel** | A single normalised input value the overlay draws: `thr` (throttle), `brk` (brake), `clu` (clutch) — each `0..1` — and `str` (steering, `-1..+1`). Later: `gear`, `rpm`, `spd`. |
| **id** | The overlay's permanent name in kebab-case (`dot-ladder`). It is the OBS URL contract, so it never changes; a forced rename is handled by `aliases`, not by editing the id. |
| **set** | Which input groups an overlay uses — `pedals`, `wheel`, `shifter`, or `combo` (two or more). **Derived** from the draw code, not authored by hand. |
| **uses** | The exact channel keys an overlay reads. Also derived and verified against the code. |
| **stage** | Curation state: `live`, `draft`, `experimental`, or `excluded`. `excluded` means archived (kept in the manifest), not deleted. Orthogonal to it, `hidden` hides an overlay from listings without changing its stage. |
| **manifest** | `catalogue.json` — the list of every overlay's id, name, size, set, stage, and channels. The **source of truth** the site renders and an agent edits. |
| **calibration** | The per-wheel capture of each pedal's rest/full travel and the wheel's centre/extremes, so raw axis values map to true `0..1` / `-1..+1`. Lives in the browser, never gates anything. |
| **the URL is the config** | All settings live in query params, so a configured overlay is a shareable link. See [ADR 0001](../decisions/0001-config-in-the-url.md). |

## The immutability rule, in one line

**`id` is permanent; everything else about an overlay can change.** `name` is free prose, `set`/`uses` are re-derived whenever the code changes, `stage` moves through curation — but the id, which streamers have pasted into OBS, is frozen. That single rule is why the id encodes nothing derived (not the set, not the version).
