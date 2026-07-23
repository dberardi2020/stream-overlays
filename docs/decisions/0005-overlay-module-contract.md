# 0005 — One module per overlay: `export id` + `export draw`, metadata in the manifest

**Status:** Accepted · **Date:** 2026-07-23

## Context

The overlays were prototyped as `add(name, note, w, h, drawFn)` calls concatenated into one HTML file by a build script that sliced code out of the prototype by **line number** and reconciled helpers by string replacement. That was fragile — a comment moving one line could silently produce a blank tile — and it entangled each overlay's drawing with its metadata and with every other overlay. To go from prototype to a maintainable catalogue (and to enable a future builder that composes overlays from parts), the overlays need a real contract.

## Decision

**Each overlay is one ES module** exporting exactly two things:

```js
export const id = "bowtie";                      // immutable, kebab-case, = filename
export function draw(ctx, w, h, state, mem) {}   // the drawing, byte-for-byte from the prototype
```

- All other metadata — `name`, `size`, `set`, `stage`, `uses`, `note` — lives in **`catalogue.json`**, the single source of truth. The module does not duplicate it.
- The shared sub-visuals a draw body uses (`glass`, `mono`, palette, history) are imported from `engine/draw-kit.js` as **named callables**, so the future builder can compose overlays from them.
- `mem` is a per-overlay scratch object for stateful overlays (peak-hold decay, etc.), replacing the prototype's `this.mem`.

## Rationale

- **One file per overlay** makes each overlay independently readable, reviewable, and diffable, and kills the line-number slicing.
- **Metadata in the manifest, not the module** avoids two sources of truth. The set of module ids and manifest ids are kept in lock-step by a test instead of by duplication.
- **`id` = filename = URL contract** ties the three together with no room to drift, and honours the immutability rule ([ADR 0001](0001-config-in-the-url.md), [concepts](../product/concepts.md)).
- **Named sub-visual imports** are the seam the builder needs; making them the normal way overlays are written means the builder doesn't require a later refactor.

## Consequences

- Adding an overlay is: write `overlays/<id>.js`, add the `catalogue.json` entry — then `pytest` (manifest ↔ module coherence, `set` vs `uses`) and `node --test` (the blank-tile guard) must pass.
- Migrating the remaining prototype overlays is mechanical (copy each draw body into a module) and guarded by those same tests — tracked as [SO-0001](../tickets/tickets.md).
- Draw bodies are copied **byte-for-byte**; the only permitted change during migration is `this.mem` → the `mem` parameter, which does not alter what is drawn.
- The full-coverage assertion (every non-excluded manifest entry has a module) is switched off during the pilot and flips on when migration completes.
