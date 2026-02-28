---
name: doc-gardening
description: Keep repository documentation aligned with real code behavior using recurring, mechanical audits and targeted fixes. Use when asked to reconcile docs, clean stale documentation, fix broken doc links/paths, update AGENTS and docs maps, or run documentation maintenance passes before merge.
---

# Doc Gardening

## Overview

Run a small, repeatable maintenance loop that treats `docs/` as the system of
record and keeps `AGENTS.md` as a concise table of contents.

## Editing Rules

- Keep `AGENTS.md` short and map-like; move detailed guidance into `docs/`.
- Preserve map-first navigation and avoid monolithic instruction files.
- Favor enforceable checks and deterministic validation over broad style rewrites.
- Never open gardening fixes for `docs/references/` or `docs/exec-plans/completed/`.
- When behavior changes in code, update the nearest source-of-truth doc in the same task.
