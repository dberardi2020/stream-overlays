# Stream Overlays

[![Tests](https://github.com/dberardi2020/stream-overlays/actions/workflows/tests.yml/badge.svg)](https://github.com/dberardi2020/stream-overlays/actions/workflows/tests.yml)
![platform: OBS | browser](https://img.shields.io/badge/platform-OBS%20%7C%20browser-blue)
![hardware: Logitech G923](https://img.shields.io/badge/hardware-Logitech%20G923-blue)
![license: MIT](https://img.shields.io/badge/license-MIT-green)

Browser **overlays for streamers** that read your hardware in the browser and composite over your scene in **OBS**. Everything is a **static file** and every setting lives **in the URL**, so there is no install, no account, and nothing to host but plain files. The first vertical is **sim racing** — live **throttle / brake / clutch / steering / gears** from a **Logitech G923**, drawn as a catalogue of small canvas overlays.

<p align="center">
<svg width="640" height="150" viewBox="0 0 640 150" role="img" aria-label="Data flow: the browser reads the G923 wheel via the Gamepad API; the engine normalises it into channel values through per-wheel calibration; an overlay module draws those channels to a transparent canvas; OBS composites the canvas over the stream scene." xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="12">
  <style>
    .box{fill:none;stroke:#64b5ff;stroke-width:1.5;rx:8}
    .lbl{fill:#c9cdd6}.sub{fill:#878d9a;font-size:10px}
    .arr{stroke:#5f6672;stroke-width:1.5;marker-end:url(#a)}
    @media (prefers-color-scheme: light){.lbl{fill:#1b1e24}.sub{fill:#5f6672}}
  </style>
  <defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#5f6672"/></marker></defs>
  <rect class="box" x="8"   y="46" width="120" height="58" rx="8"/><text class="lbl" x="68"  y="70" text-anchor="middle">G923 wheel</text><text class="sub" x="68"  y="88" text-anchor="middle">Gamepad API</text>
  <rect class="box" x="176" y="46" width="120" height="58" rx="8"/><text class="lbl" x="236" y="70" text-anchor="middle">engine</text><text class="sub" x="236" y="88" text-anchor="middle">calibrate → 0..1</text>
  <rect class="box" x="344" y="46" width="120" height="58" rx="8"/><text class="lbl" x="404" y="70" text-anchor="middle">overlay module</text><text class="sub" x="404" y="88" text-anchor="middle">draw(ctx,…)</text>
  <rect class="box" x="512" y="46" width="120" height="58" rx="8"/><text class="lbl" x="572" y="70" text-anchor="middle">OBS</text><text class="sub" x="572" y="88" text-anchor="middle">Browser Source</text>
  <line class="arr" x1="128" y1="75" x2="174" y2="75"/>
  <line class="arr" x1="296" y1="75" x2="342" y2="75"/>
  <line class="arr" x1="464" y1="75" x2="510" y2="75"/>
</svg>
</p>

> **Status: works, not yet hosted.** The catalogue holds **73 overlays** (`overlays/sim-racing/catalogue.json`, the source of truth); all **69** non-excluded ones are migrated to the one-file-per-overlay module architecture and pixel-checked against a golden render (see [Testing](#testing)). Pedals, wheel, H-shifter and paddles all bind to a real G923 and are verified on hardware. What is missing is **hosting** — you run it from a local static server today, so the overlay URLs only work while that server is up.

## Model, in five words

- **Overlay** — one canvas renderer, selected by its **immutable id**: `?style=bowtie`. Ids are never
  reused or renumbered, so a URL you pasted into OBS keeps working.
- **Channel** — one normalised input value in `0..1`: `thr`, `brk`, `clu`, `str`, plus gear. Calibration
  turns whatever your hardware reports into these; overlays only ever see channels.
- **Set** — which channels an overlay is *about*: `pedals`, `wheel`, `shifter`, or `combo`. Derived from
  the draw code, not hand-typed.
- **Stage** — how finished it is: `live`, `draft`, `experimental`, or `excluded` (archived, not deleted).
- **Manifest** — `catalogue.json`, the single source of truth for every overlay's id, name, size, set,
  stage, channels and plate. Tests verify it against the modules rather than trusting it.

## Requirements

- A **static HTTP server** — the Gamepad API and ES modules both need an HTTP context, so `file://`
  will not work. Node or any Python 3 is enough; `npm run serve` finds whichever you have.
- **OBS** (or any browser) for display, and a **wheel** for live input. Without one, everything still
  runs on the built-in demo lap.

## Install

There is nothing to install — the overlays are static files. To run locally:

```sh
git clone https://github.com/dberardi2020/stream-overlays.git
cd stream-overlays
npm run serve   # finds python3 / py / python, whichever this machine has
# then open http://localhost:8000/pages/gallery.html
```

Then, in order: open **`pages/setup.html`** and calibrate your wheel; browse **`pages/gallery.html`** and pick an overlay; hit **Copy OBS link**; in **OBS** add a **Browser Source** at that URL and the size the card shows.

**Calibration is per browser.** OBS ships its own browser with its own storage, so calibrating in Chrome does *not* carry over — do it once more inside OBS via right-click → **Interact**. The setup page walks through this.

Config lives entirely in the URL — `?style=<id>&scale=<n>` plus optional plate settings `&bg=&bga=&radius=&edge=` — so a configured overlay is just a link you paste, and nothing is stored server-side because there is no server.

Those URLs are served by your local dev server, so **it has to be running whenever OBS loads the source** — otherwise the overlay is blank. On Windows, double-click `scripts/start-overlays.cmd`; drop a shortcut to it in `shell:startup` to have it always up. Hosting would make the links permanent — see [ADR 0002](docs/decisions/0002-static-first-hosting.md) — but nothing is deployed yet.

### Hand it to your coding agent

```
Clone https://github.com/dberardi2020/stream-overlays and read docs/README.md.
Serve overlays/sim-racing over HTTP and open pages/gallery.html.
Then walk me through adding a new overlay: a module in overlays/sim-racing/overlays/
that exports `id` + `draw(ctx,w,h,state,mem)`, plus its catalogue.json entry — and
run `node --test tests/*.test.mjs` and pytest so the blank-tile and manifest guards pass.
```

## Overlays

Every overlay is a small canvas renderer selected by its immutable id: `?style=<id>`. The manifest owns the metadata; a module owns the drawing.

| id | Reads | What it shows |
| --- | --- | --- |
| `bowtie` | brake · throttle · clutch | Brake left, throttle right, from a shared centre line — overlap is obvious. |
| `dot-ladder` | brake · throttle · clutch | Ten dots per channel; reads at tiny sizes and survives stream compression. |
| `wheel` | steering | A flat-bottomed GT rim with real spokes and a top-dead-centre marker. |
| `gate-map` | gear | The H-pattern gate with the engaged gear lit — needs a real H-shifter. |
| `dash-cluster` | all channels | The classic: rev arc + gear centre, pedals and wheel around it. |
| *…64 more* | pedals · wheel · shifter · combos | Browse them all animated over a demo lap in `pages/gallery.html`. |

Overlays are grouped by **set**, and both `set` and the exact channels an overlay reads are **derived from its draw code** and verified against the manifest — see [`docs/technical`](docs/technical/README.md).

Overlays whose subject *is* gear position declare `requires: gear:absolute` and stand down when only paddles are calibrated, because paddles report a shift *direction*, never which gear you are in ([ADR 0007](docs/decisions/0007-gear-sources-are-independent.md)).

## Testing

Three layers — the two deterministic ones gate every change:

- **Unit** — `node --test tests/*.test.mjs` (calibration maths, gear motion, and a blank-tile guard that runs every overlay against a mock canvas) and `pytest tests/` (manifest schema, `set`-vs-`uses`, and module↔manifest coherence).
- **Acceptance** — `node qa/acceptance.mjs` renders every overlay in real headless Chromium and **pixel-diffs it against a golden**, so a rendering regression fails the build, not the stream. Needs `npm i && npx playwright install chromium`; skips cleanly when a browser is absent.
- **Agentic browser pass** — dev-only, driven live per [`qa/product-map.md`](qa/product-map.md).

Goldens have two provenances and are not the same guarantee: 40 come from the original prototype and prove the port is faithful to it, while 29 were re-baselined from the modules after those overlays deliberately diverged. [`docs/technical/testing.md`](docs/technical/testing.md) has the detail, the coverage, and the known gaps.

## Roadmap

The engine, overlay library, calibration, gallery and landing page are done and hardware-verified. What remains:

- An **overlay quality pass** — cull the half-baked, upgrade the rough (SO-0019).
- **Hosting + deploy**, which turns local URLs into permanent ones (SO-0008).
- **Sim telemetry** (rpm, speed, gear-from-sim), deferred until there is a feed to read — those overlays run on demo data until then (SO-0007).
- Longer-term, a **builder** that composes overlays from named sub-visuals — which the module architecture is shaped to enable (SO-0011).

## Documentation

Full docs live in [`docs/`](docs/README.md):

- **[Product](docs/product/README.md)** — what it is, who it's for, and the vocabulary above in full.
- **[Technical](docs/technical/README.md)** — the layered architecture, the overlay module contract, and how the manifest stays honest.
- **[Decisions](docs/decisions/README.md)** — the ADRs: config-in-the-URL, static-first hosting, the OBS fallback, the stack, the module contract, and why the two gear sources are independent.
- **[Tickets](docs/tickets/tickets.md)** — the backlog, and the record of how each piece was decided.

## License

[MIT](LICENSE) © Dimitri Berardi
