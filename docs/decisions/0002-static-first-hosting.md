# 0002 — Static files with native ES modules, no server, no bundler

**Status:** Accepted · **Date:** 2026-07-23

## Context

The load-bearing feasibility question was whether this can be a hosted product at all. It can, and better than expected: the **Gamepad API is client-side**. The browser on the streamer's machine reads their wheel and hands the values to whatever page is running — it does not care whether that page came from `file://` or a domain. Device data never leaves the user's machine. So the product is **static files**, not a service.

Separately, the overlays were extracted from single-file prototypes into a layered module architecture. That raised a second question: does modularising force a build step?

## Decision

**Ship static files, and use native ES modules with dynamic `import()` — no bundler, no build step.** The overlay page reads the manifest, then `import()`s the chosen overlay module at runtime. Hosting is any static host that serves HTTPS (GitHub Pages, Netlify, Cloudflare Pages).

## Rationale

- Static hosting is sufficient and free at any realistic scale — no server, no database.
- **HTTPS is required anyway** — the Gamepad API only runs in a secure context — and every static host provides it.
- Native modules keep the "no build" property of the original single file while giving us one-file-per-overlay structure. The browser resolves imports; there is nothing to compile.
- The Python under `build/` is a **quality gate** (deriving and checking the manifest), not a compiler. Removing it would not stop the site from running.

## Consequences

- The site **must be served over HTTP**, including in local dev — `file://` blocks both `fetch` (for the manifest) and ES module loading. Local dev is `python3 -m http.server`.
- No bundler means no tree-shaking or minification step; overlay modules are served as-authored. Acceptable at this size, and revisitable if payload ever matters.
- Iframe embedding of the overlay would require `Permissions-Policy: gamepad=*` on the response; top-level use (OBS Browser Source) needs nothing special.
