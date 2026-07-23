# Stream Overlays

[![tests](https://github.com/dberardi2020/stream-overlays/actions/workflows/tests.yml/badge.svg)](https://github.com/dberardi2020/stream-overlays/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Browser **overlays for streamers** that read your hardware in the browser and composite over your scene in **OBS**. Everything is a **static file** and every setting lives **in the URL**, so there is no install, no account, and nothing to host but plain files. The first vertical is **sim racing** — live **throttle / brake / clutch / steering** from a **Logitech G923**, drawn as a catalogue of small canvas overlays.

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

> **Status: pilot.** The design catalogue holds **72 overlays** (`overlays/sim-racing/catalogue.json`), the manifest that is the source of truth. Three are migrated to the live one-file-per-overlay module architecture (**Bowtie**, **Dot ladder**, **Comet**); the rest are tracked for migration in [SO-0001](docs/tickets/tickets.md). This is not yet a streamer-facing site — it is the architecture and engine the site will be built on.

## Install

There is nothing to install — the overlays are static files served over HTTP (the Gamepad API and ES modules both require a secure/HTTP context, so `file://` will not work). To run locally:

```sh
git clone git@github.com:dberardi2020/stream-overlays.git ~/Code/stream-overlays
cd ~/Code/stream-overlays
python3 -m http.server --directory overlays/sim-racing 8000
# then open http://localhost:8000/pages/overlay.html?style=bowtie
```

In **OBS**: add a **Browser Source** pointing at the overlay URL, then right-click it → **Interact**, press a wheel button, and calibrate. Config lives entirely in the URL (`?style=…&scale=…`), so a configured overlay is just a link you paste.

### Hand it to your coding agent

```
Clone https://github.com/dberardi2020/stream-overlays and read docs/README.md.
Serve overlays/sim-racing over HTTP and open pages/overlay.html?style=bowtie.
Then walk me through adding a new overlay: a module in overlays/sim-racing/overlays/
that exports `id` + `draw(ctx,w,h,state,mem)`, plus its catalogue.json entry — and
run `node --test tests/*.test.mjs` and pytest so the blank-tile and manifest guards pass.
```

## Overlays

Every overlay is a small canvas renderer selected by its immutable id: `?style=<id>`. The manifest (`catalogue.json`) owns the metadata; a module owns the drawing.

| id | Reads | Migrated | What it shows |
| --- | --- | --- | --- |
| `bowtie` | brake · throttle · clutch | ✅ | Brake left, throttle right, from a shared centre line — overlap is obvious. |
| `dot-ladder` | brake · throttle · clutch | ✅ | Ten dots per channel; reads at tiny sizes and survives stream compression. |
| `comet` | brake · throttle · clutch | ✅ | Input history as fading dots — ambient, less precise, far less busy. |
| *…69 more* | — | ⏳ SO-0001 | The rest of the catalogue, pending migration to modules. |

`set` and `uses` in the manifest are **derived from what each overlay's draw body actually reads**, then verified against it — see [`docs/technical`](docs/technical/README.md).

## Roadmap

Near-term is finishing what the pilot started, not new surface:

- **SO-0001** — migrate the remaining catalogue overlays to the module contract.
- A **gallery** page (browse all overlays over demo data) and a **configure** page that emits the URL.
- The **OBS gamepad fallback** flow ([ADR 0003](docs/decisions/0003-obs-gamepad-fallback.md)) as a guided UI.
- Longer-term, a **builder** that composes overlays from named sub-visuals — which the module architecture is shaped to enable.

## Documentation

Full docs live in [`docs/`](docs/README.md).

- **[Product](docs/product/README.md)** — what it is, who it's for, and the vocabulary (overlay, channel, set, stage, the manifest).
- **[Technical](docs/technical/README.md)** — the layered architecture, the overlay module contract, and how the manifest stays honest.
- **[Decisions](docs/decisions/README.md)** — the ADRs: config-in-the-URL, static-first hosting, the OBS fallback, the stack, and the module contract.
- **[Tickets](docs/tickets/tickets.md)** — the backlog, led by the SO-0001 migration.

## License

[MIT](LICENSE) © Dimitri Berardi
