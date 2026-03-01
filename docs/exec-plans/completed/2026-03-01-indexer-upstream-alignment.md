# Align Indexer Flow With Upstream PageIndex and Simplify Internals

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, our Go indexer flow will mirror the upstream PageIndex decision path more closely, especially in TOC detection and mode selection, while keeping the code easier to maintain through shared helpers and reduced duplication.

The user-visible outcome is that indexing behavior for TOC/no-TOC documents is more consistent with upstream reference behavior. The engineering-visible outcome is lower complexity in `srv/internal/service/indexer.go` and stronger tests around fallback/mode selection.

## Progress

- [x] (2026-03-01 13:20Z) Re-audited current `indexer.go` against upstream `page_index.py` and identified remaining behavioral deltas.
- [x] (2026-03-01 13:20Z) Collected targeted test-gap audit for mode selection and incremental TOC detection behavior.
- [x] (2026-03-01 14:22Z) Implemented upstream-aligned mode selection and incremental TOC-page scanning in `srv/internal/service/indexer.go`.
- [x] (2026-03-01 14:22Z) Refactored duplicated indexer logic into shared helpers (`runModeWithVerification`, TOC walkers, shared page-map and TOC decode helpers).
- [x] (2026-03-01 14:22Z) Updated/added indexer tests for no-page-number TOC routing, incremental TOC scan behavior, and multi-group no-TOC continuation.
- [x] (2026-03-01 14:22Z) Ran quality baseline commands from `docs/QUALITY.md`: `task build`, `task format`, `task lint`, `task typecheck`, `task test` all passed.

## Surprises & Discoveries

- Observation: existing `detectTOC` is a one-shot parse, while upstream uses iterative TOC-page detection semantics.
  Evidence: local `detectTOC` in `srv/internal/service/indexer.go`; upstream `find_toc_pages` + `check_toc` in `/tmp/upstream_page_index.py`.

- Observation: current fallback path starts mode 2 whenever TOC exists, which differs from upstream initial routing when TOC lacks page numbers.
  Evidence: `processWithFallback` in `srv/internal/service/indexer.go` vs `tree_parser` + `meta_processor` in `/tmp/upstream_page_index.py`.

- Observation: moving filtering earlier required adjusting “filtered count” logging because preface insertion can increase item count.
  Evidence: negative filtered count appeared in test logs before updating Build-stage accounting.

## Decision Log

- Decision: Align initial mode selection first (`TOC without page numbers -> no-TOC mode`), then adjust TOC detection and helper extraction.
  Rationale: This is the highest-impact behavioral mismatch and easiest to verify with targeted tests.
  Date/Author: 2026-03-01 / Codex.

- Decision: Keep strict structured JSON output (`CompleteJSON`) while aligning algorithmic flow.
  Rationale: Project lesson requires strict schema behavior with Mistral; alignment should not reintroduce free-form parsing.
  Date/Author: 2026-03-01 / Codex.

- Decision: Align splitting behavior partway toward upstream by allowing non-leaf split attempts and preserving nested split hierarchy with `listToTree`, without introducing upstream async fan-out.
  Rationale: This improves parity and structure quality while avoiding a sudden concurrency/rate-limit increase.
  Date/Author: 2026-03-01 / Codex.

## Outcomes & Retrospective

This plan is complete for the targeted parity scope. The indexer now follows upstream-style initial routing when TOC page numbers are absent, performs incremental TOC-page scanning, and centralizes duplicated verification/decoding/page-map logic. Tests were expanded for these flows, and the full quality baseline passed.

Remaining intentional differences include sequential execution (no upstream `asyncio.gather` equivalent) and always-on summaries in this code path. These were left as-is to avoid increasing API burst pressure while still aligning core algorithmic routing and fallback behavior.

## Context and Orientation

Relevant code lives in:

- `srv/internal/service/indexer.go`: indexer orchestration, TOC detection/mode selection, verification/fix logic, splitting, summaries.
- `srv/internal/service/indexer_test.go`: unit and integration-style tests for indexer behavior.
- `/tmp/upstream_page_index.py`: upstream reference behavior used for cross-checking.

The primary target is behavioral alignment where our current flow differs from upstream in ways that affect indexing outcomes and LLM call patterns.

## Plan of Work

First, update flow control in `indexer.go` so that when TOC exists but page numbers are unavailable, initial processing starts from no-TOC mode (upstream parity) rather than mode 2. At the same time, introduce helper functions to reduce duplication in mode execution and page rendering.

Second, align TOC detection strategy toward upstream incremental semantics while keeping strict schema-based decoding. Any extra helper extraction should be done in-place and kept local/private to avoid broad API churn.

Third, update tests to lock in behavior: direct no-TOC start when TOC has no page numbers, stronger cascade fallback expectations, and group continuation coverage.

## Concrete Steps

From repository root:

1. Edit `srv/internal/service/indexer.go` for flow alignment and helper extraction.
2. Edit `srv/internal/service/indexer_test.go` to add/adjust behavioral tests.
3. Run targeted tests for indexer package.
4. Run full quality baseline commands from `docs/QUALITY.md`.

## Validation and Acceptance

Acceptance criteria:

- `has_toc=true` and missing page numbers no longer starts mode 2 first.
- fallback behavior for mode 1 failures is deterministic and test-covered.
- no-TOC grouping continuation path is test-covered.
- full repository quality baseline passes.

## Idempotence and Recovery

All changes are source-level and repeatable. If any step regresses behavior, revert only touched hunks and rerun `go test ./internal/service` before proceeding.

## Artifacts and Notes

Validation evidence:

- `cd srv && go test ./internal/service` passed after indexer and test changes.
- `task build` passed.
- `task format` passed.
- `task lint` passed.
- `task typecheck` passed.
- `task test` passed.

## Interfaces and Dependencies

No new external dependencies are expected. Refactor scope is limited to internal helpers and test updates under `srv/internal/service/`.

## Revision Notes

- 2026-03-01 13:20Z (Codex): Created active ExecPlan for upstream-alignment + DRY refactor pass on indexer.
- 2026-03-01 14:22Z (Codex): Updated progress/decisions/outcomes after implementing indexer alignment, expanding tests, and completing full quality baseline.
