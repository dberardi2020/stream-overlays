# Stream Overlays — Documentation

The map of this folder. Routing is by intent, not a file listing.

| Folder | For whom | Purpose |
| --- | --- | --- |
| **[product/](product/README.md)** | any reader | What it is, who it's for, and the vocabulary — no code assumed. |
| **[technical/](technical/README.md)** | developers | How it's built: the layered architecture and the overlay module contract. |
| **[decisions/](decisions/README.md)** | anyone going deep | ADRs — *why* each load-bearing choice was made. |
| **[tickets/](tickets/tickets.md)** | maintainers | The backlog, led by the SO-0001 migration. |

## Where to start

- **New to the project?** → [product/overview](product/overview.md), then [product/concepts](product/concepts.md).
- **Going to add or change an overlay?** → [technical/architecture](technical/architecture.md), then [ADR 0005 — the module contract](decisions/0005-overlay-module-contract.md).
- **Wondering why it works this way?** → the [decisions](decisions/README.md), starting with [0002 — static-first](decisions/0002-static-first-hosting.md).

## How these relate

`decisions/` is the primary source — the current decision state. `product/` and `technical/` synthesize it for their audiences and link back rather than duplicate. When they disagree, the ADRs win. The concept model lives in [product/concepts](product/concepts.md) and nowhere else.

## Doc convention

Filenames are lowercase kebab-case (`README.md` is the one exception); ADRs are `NNNN-kebab-title.md`. Every prose doc is a **Markdown + HTML pair** in lock-step — the `.md` is the source of truth, the `.html` a styled render. After editing a `.md`, regenerate its `.html`:

```sh
python docs/render.py docs/<path>/<file>.md
python docs/render.py docs/decisions/*.md      # or a whole folder
```
