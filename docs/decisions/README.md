# Decisions

Architecture Decision Records — the *why* behind each load-bearing choice. Numbered, never renumbered or reused. Each is Context · Decision · Rationale · Consequences.

| ADR | Decision |
| --- | --- |
| [0001](0001-config-in-the-url.md) | Configuration lives in the URL, not in browser storage. |
| [0002](0002-static-first-hosting.md) | Ship static files with native ES modules — no server, no bundler. |
| [0003](0003-obs-gamepad-fallback.md) | Treat OBS's missing-gamepad case as a guided fallback flow, not a bug. |
| [0004](0004-stack.md) | A boring, static-first stack; add services only if a real need appears. |
| [0005](0005-overlay-module-contract.md) | One module per overlay: `export id` + `export draw`, metadata in the manifest. |
| [0006](0006-setup-surface-pure-overlay.md) | Setup lives on a dedicated page; the overlay is a pure renderer (zero-install). Refines 0003. |
| [0007](0007-gear-sources-are-independent.md) | The H-shifter and paddles are independent sources, calibrated separately; paddles report direction only and never yield a gear position. |

When an ADR and a synthesis doc ([product](../product/README.md) / [technical](../technical/README.md)) disagree, the ADR is the current state and the synthesis is stale.
