# Technical

How the code is built.

| Doc | Read it for |
| --- | --- |
| [architecture.md](architecture.md) | The three layers, the one-way dependency rule, and how the manifest stays honest. |

The overlay module contract has its own decision record: [ADR 0005](../decisions/0005-overlay-module-contract.md). Why the whole thing is static files is [ADR 0002](../decisions/0002-static-first-hosting.md).

## Doc pairing in this repo

Prose docs are Markdown + HTML pairs, generated with `docs/render.py` (stdlib only). The `.md` is the source of truth. Interactive or data pages (the overlay pages themselves, `catalogue.json`) are single-format — they have no meaningful Markdown form.

## Tests

Two runners, both required in CI:

- `node --test tests/*.test.mjs` — the pure calibration maths, and the **blank-tile guard**: every migrated overlay is drawn against a mock canvas and must paint.
- `pytest tests/` — manifest schema and invariants, including that each overlay's `set` agrees with the channels its `uses` implies, and that every overlay module maps to a real manifest entry.
