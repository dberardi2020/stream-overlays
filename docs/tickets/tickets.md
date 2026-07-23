# Tickets

The backlog. Board-first: a lightweight tracker until a real one is warranted. IDs are `SO-NNNN`, uppercase, never reused.

## In progress

*(none)*

## Open

| ID | Title | Notes |
| --- | --- | --- |
| **SO-0001** | Migrate the remaining catalogue overlays to modules | 3 of 72 overlays are migrated (Bowtie, Dot ladder, Comet). Migrate the rest: copy each draw body byte-for-byte into `overlays/sim-racing/overlays/<id>.js` exporting `id` + `draw`, per [ADR 0005](../decisions/0005-overlay-module-contract.md). Only permitted change: `this.mem` → the `mem` parameter. Guarded by the manifest-sync + blank-tile tests. When complete, flip `REQUIRE_FULL_COVERAGE` in `tests/test_overlay_modules.py`. |
| **SO-0002** | Gallery page over demo data | Browse all overlays rendered against `engine/demo-lap.js`, for choosing a style. |
| **SO-0003** | Configure page → URL generator | Bind inputs, pick style/scale/colours, emit the `?style=…` URL to paste into OBS. Realises [ADR 0001](../decisions/0001-config-in-the-url.md). |
| **SO-0004** | OBS gamepad fallback flow | The guided ladder from [ADR 0003](../decisions/0003-obs-gamepad-fallback.md): device-presence timeout, Interact prompt, Window-Capture path, optional local bridge. |
| **SO-0005** | Collapse near-duplicate overlay families | Curation: the 3 `Wheel` variants and the `bars`/`history` clusters. Family metadata exists to support this. |

## Done

| ID | Title |
| --- | --- |
| **SO-0000** | Scaffold the repo: layered engine extracted from the prototype, 3 pilot overlays, manifest quality-gate, pytest + node test suites, ADRs. |

## Notes

- `excluded` overlays stay in the manifest (archived, not deleted); they are not migration targets.
- The **builder** (compose overlays from swappable sub-visuals) is a longer-term direction, not a ticket yet — the module contract and named draw-kit callables are the groundwork for it.
