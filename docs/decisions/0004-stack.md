# 0004 — A boring, static-first stack; services only on real need

**Status:** Accepted · **Date:** 2026-07-23

## Context

With hosting settled as static files ([ADR 0002](0002-static-first-hosting.md)) and configuration in the URL ([ADR 0001](0001-config-in-the-url.md)), most of a conventional web stack is optional. The question is what to actually commit to now versus defer until a concrete need appears.

## Decision

**Start with the smallest thing that works and add nothing speculatively:**

- **Today** — plain HTML/CSS/JS as native ES modules, served static. No framework, no bundler, no backend. Python (stdlib only) for the manifest quality-gate and doc rendering.
- **If/when a site shell is warranted** — a static-export framework (e.g. Next.js on Vercel: static today, server routes later without a migration) is the intended path, chosen so it does not force a rewrite if dynamic needs ever appear.
- **Accounts/persistence** — deferred, possibly forever. Only introduced if a feature genuinely requires server-side state; the URL-config model is designed so most features don't.

## Rationale

- The client-side, static-file nature means the expensive parts of a stack (server, database, auth) buy nothing yet, so committing to them now is pure cost.
- Choosing a static-export-capable framework for the eventual shell avoids a one-way door: it can grow server routes without abandoning the static deployment.
- Boring, widely-recognised tools keep the project legible and low-maintenance for a side project.

## Consequences

- No backend to run or secure at this stage; the ops surface is "publish static files."
- Any proposal that needs a server (accounts, saved presets beyond the URL, server-side anything) must clear the bar of a real, demonstrated need — and gets its own ADR.
- Business/monetisation choices are deliberately **out of this repo** — they are not technical decisions and do not belong in a public repo.
