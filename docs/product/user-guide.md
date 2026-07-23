# User guide

How to get an overlay onto your stream. No code assumed — you pick a style, paste a URL into OBS, and calibrate your wheel once.

## Requirements

- A **Chromium-based browser** (Chrome or Edge). OBS's Browser Source is Chromium (CEF), so it works there too.
- The pages must be served over **http/https**, not opened as `file://` — the browser blocks ES modules, `fetch`, and the Gamepad API on `file://`. Locally, `npm run serve` (or any static server) is enough; `localhost` counts as a secure context, so calibration works there. A public deploy needs **https** (the Gamepad API refuses insecure origins). See [ADR 0002](../decisions/0002-static-first-hosting.md).
- A wheel/pedals the browser can see as a **gamepad** (built for the Logitech G923; other HID wheels may work for the direct channels).

## Pick a style

Open the [gallery](../../overlays/sim-racing/pages/gallery.html) (`pages/gallery.html`). Every overlay animates over a demo lap so you can judge it before plugging anything in — filter by set/stage, and use the **Backdrop** control to preview it against a light, dark, or busy scene. Each tile shows its **id** and its **native size**; note the id of the one you want (e.g. `dot-ladder`).

## Add it to OBS

The overlay page paints no background, so OBS renders it transparent automatically — it composites over your scene.

1. In OBS: **Sources → + → Browser**. Untick **Local file**.
2. Set **URL** to the overlay page with your chosen id:
   `…/pages/overlay.html?style=<id>` — e.g. `…/pages/overlay.html?style=dot-ladder`. Add options below as needed.
3. Set the Browser Source **Width / Height** to the size shown in the overlay's setup caption (its native size × your `scale`). **Don't** scale the source in OBS itself — it resamples and goes soft; use the `scale` param so it redraws sharp.
4. Connect your wheel: right-click the source → **Interact**, then **press any wheel button** — browsers only expose gamepads after a real input on a focused page — and calibrate (below).
5. Close Interact. The setup panel hides itself once you're live, leaving only the overlay.

> A **configure page** that builds this URL for you (pick style, scale, colours → copy link) is planned — [SO-0003](../tickets/tickets.md). Until then you write the URL by hand.

## URL options

All configuration lives in the URL, so a configured overlay is a shareable link ([ADR 0001](../decisions/0001-config-in-the-url.md)).

| Param | Meaning | Default |
| --- | --- | --- |
| `style` | Which overlay — an **id** (`dot-ladder`), or an alias. | *(required)* |
| `scale` | Size multiplier, `0.5`–`6`. Redraws at the larger size (sharp), never resampled. | `2` |
| `bg` | Contrast-plate colour behind the overlay, hex (e.g. `ffffff`, `000000`). | none |
| `bga` | Plate opacity, `0`–`1` (`0` = no plate, fully transparent). | `0` |
| `radius` | Plate corner radius, px (`0`–`40`). | `8` |

Example: `overlay.html?style=rolling-trace&scale=2.5&bg=ffffff&bga=0.15`

An unknown `style` shows an honest "unknown overlay" message rather than silently picking a default.

## Calibration

Calibration maps your wheel's raw axis values to true channel values (each pedal's rest→full travel, the wheel's centre and extremes), so bars hit 100% only at a real full press. It's saved in the browser (`localStorage`) and auto-connects on later launches. It lives on the machine and never travels — it's intrinsic to that physical wheel.

- **Neutral** — release all pedals and centre the wheel, then Confirm. Captures a clean rest baseline so nothing false-triggers.
- **Pedals** (throttle / brake / clutch) — press fully, then release. Records rest + the real full-press extreme.
- **Steering** (optional) — sweep fully left, fully right, then re-centre. Maps to −100 %…+100 %. Only a couple of styles use it, so it's skippable.

Each channel confirms on its own (with **Redo**), and already-assigned axes are excluded so releasing one control can't be mistaken for the next. Use **Calibrate all** for the full sequence, a per-row **Redo/Set** to fix one channel, or **Clear** to wipe it. Press **`c`** in the OBS Interact window to reopen calibration any time.

## Notes & limitations

- **Chromium only** — Chrome, Edge, or OBS's CEF. Other engines may not expose the Gamepad API the same way.
- If OBS clears the browser cache, saved calibration is lost and you re-run the flow.
- **Telemetry overlays** (rpm / speed / gear-from-sim) render from demo data but can't run *live* yet — a G923 exposes no telemetry, so those need a sim feed ([SO-0007](../tickets/tickets.md)). They still work as visuals; they just rest until a source exists.
