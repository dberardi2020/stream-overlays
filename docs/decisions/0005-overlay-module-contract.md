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

### Calling conventions (as-built, derived from the prototype)

The one signature `draw(ctx, w, h, s, mem)` has to absorb three shapes the prototype's draw bodies were written in, because bodies are ported **byte-for-byte**:

- **State is a single object `s`.** Every channel a body reads lives on it: `thr`/`brk`/`clu` (0..1), `str` (−1..+1), and for combos/telemetry `gear`/`lever`/`rpm`/`spd`/`shiftAge`/`shiftDir`/`shiftCount`/`shiftProg`. The prototype nominally passed a second `tel` argument, but **no draw body reads it** — so the contract omits it.
- **Two ctx conventions coexist.** 20 bodies pass `ctx` explicitly to `glass`/`mono`; 52 rely on a **module-global `ctx`** for helpers (`txt`, `wheel`, `drawGate`, `pedalBars`, …). The engine therefore holds a settable global `ctx` the loop sets before each `draw`, and `glass`/`mono` are reconciled to accept either form. Because the `draw` parameter is also named `ctx` and the loop sets the global to the same context, bare `ctx.*` calls, explicit-`ctx` helpers, and global-`ctx` helpers all resolve to one context. This settable global is a deliberate, contained bit of engine state — the price of byte-for-byte fidelity (the alternative, rewriting every body to pass `ctx`, was rejected as transcription risk).
- **The three body signatures** `(ctx,w,h,s)`, `(w,h,s)`, `(w,h,s,t)` all bind correctly under `draw(ctx,w,h,s,mem)`: `w`/`h`/`s` land by position, `ctx` is present for those that use it, and the unused 4th/5th slot is harmless.

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
