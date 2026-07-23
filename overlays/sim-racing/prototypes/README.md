# Prototypes

Parked explorations — self-contained HTML spikes that aren't part of the shipped product but capture an idea worth keeping. Nothing here is wired into the engine or the pages; treat each as a standalone sketch.

| Prototype | What it explores |
| --- | --- |
| `track-driven-demo-data.html` | Generating **correlated** demo data from one source: a car's position on a track. Curvature gives steering, a speed profile gives throttle/brake, speed gives gear — so everything moves together because it all derives from the geometry, rather than being hand-authored channel by channel (as the current `engine/demo-lap.js` is). |

Why it's kept: it's the seed of two roadmap ideas — a real recorded/derived data source for the previews ([SO-0014](../../../docs/tickets/tickets.md)) and, run the other way, reconstructing a virtual driver from the data ([SO-0016](../../../docs/tickets/tickets.md)). It also states the honesty rule plainly: generated data is fine for a *showcase* as long as the site says so — [principle 1](../design-principles.md) (never infer one signal from another) governs **live** overlays, not a simulator whose whole job is to be simulated.
