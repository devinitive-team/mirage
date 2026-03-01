# Simplify Backend Through DRY Refactors and Lifecycle Hardening

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, the backend will keep the same external API behavior while using less duplicated code and fewer broad dependencies internally. The system will be easier to extend as document volume and feature scope grow because core workflows (upload, ingest, retrieve, shutdown, and external API integration) will have clearer boundaries and shared helpers instead of repeated ad hoc logic.

A user-visible success signal is that all existing HTTP endpoints keep behavior and status codes, while server startup and shutdown become more reliable under concurrent upload load. An engineering-visible success signal is that repeated patterns in API handlers, service JSON decoding, Mistral adapter transport handling, and runtime wiring are reduced to single reusable implementations, backed by new characterization tests.

## Progress

- [x] (2026-03-01 10:13Z) Surveyed backend codebase (`srv/`) and identified architectural hotspots from API, service/domain, adapter/storage, and runtime/CLI layers.
- [x] (2026-03-01 10:13Z) Collected parallel explorer audits with concrete file/line references, risk notes, and test implications.
- [x] (2026-03-01 10:13Z) Authored this active ExecPlan with phased implementation order, acceptance criteria, and rollback guidance.
- [x] (2026-03-01 10:27Z) Implemented Milestone 1: worker submit-after-shutdown safety, graceful server-first shutdown flow, and new worker/cli characterization tests.
- [x] (2026-03-01 10:27Z) Implemented Milestone 2: API upload/error helper extraction, service shared LLM JSON decode helper, and new retrieval/indexer/ingest tests.
- [x] (2026-03-01 10:27Z) Implemented Milestone 3: Mistral `doJSON` transport helper, filesystem write-path dedup, service-local storage interfaces, and runtime bootstrap cleanup.
- [x] (2026-03-01 10:27Z) Ran full quality baseline from `docs/QUALITY.md`: `task build`, `task format`, `task lint`, `task typecheck`, and `task test` all passed.

## Surprises & Discoveries

- Observation: `internal/cli` and `internal/worker` have no direct tests despite owning process lifecycle and shutdown correctness.
  Evidence: Explorer baseline run `go test ./internal/config ./internal/worker ./internal/cli ./cmd/mirage` passed with no test files in worker/cli/cmd packages.

- Observation: document handlers with the highest coupling (`Upload`, `Get`, `Delete`) also have the weakest characterization coverage, increasing refactor risk.
  Evidence: API audit found `go test ./internal/api/...` passing with approximately 50.4% package coverage and limited handler-path assertions.

- Observation: service logic duplicates JSON completion/decode behavior across retrieval and indexer, but each path has different tolerance for fenced/non-strict LLM output.
  Evidence: audit references in `srv/internal/service/retrieval.go` and `srv/internal/service/indexer.go` show repeated decode stages and inconsistent normalization behavior.

- Observation: current shutdown sequence can panic under concurrency and may delay shutdown indefinitely.
  Evidence: `run.go` currently shuts the worker pool before server close, while upload path can still call `pool.Submit` after channel close.

- Observation: moving worker shutdown behind server shutdown and returning `ErrPoolClosed` from `Submit` removed the panic path without changing endpoint contracts.
  Evidence: new tests in `srv/internal/worker/pool_test.go` and `srv/internal/cli/run_test.go` pass, including submit-after-shutdown and run command error propagation checks.

- Observation: a shared service-level JSON decode utility can support both strict and lenient modes, allowing indexer and retrieval to use one implementation while preserving callsite-specific behavior.
  Evidence: `srv/internal/service/llm_json.go` is now used by both `retrieval.go` and `indexer.go`; new tests verify fenced JSON acceptance and invalid JSON failure paths.

## Decision Log

- Decision: Start with characterization tests and shutdown safety before broader dedup refactors.
  Rationale: This work reduces regression risk and addresses the highest severity operational issue first.
  Date/Author: 2026-03-01 / Codex.

- Decision: Preserve public API contracts and endpoint behavior while simplifying internals.
  Rationale: The project is preparing for growth; contract stability is required while reducing complexity debt.
  Date/Author: 2026-03-01 / Codex.

- Decision: Consolidate duplicated logic into a small number of well-named helpers instead of introducing a new abstraction layer.
  Rationale: This keeps code size down and avoids over-engineering while still enforcing DRY.
  Date/Author: 2026-03-01 / Codex.

- Decision: Use service-local narrow interfaces for storage dependencies instead of only one large global `port.Storage` dependency in service constructors.
  Rationale: Reduces mock boilerplate and coupling with minimal runtime impact.
  Date/Author: 2026-03-01 / Codex.

- Decision: Apply strict config parsing for malformed ints/bools and explicit range validation for worker/retrieval/index limits.
  Rationale: Silent fallback hid misconfiguration and created avoidable runtime risk in lifecycle-critical settings.
  Date/Author: 2026-03-01 / Codex.

## Outcomes & Retrospective

This plan is complete. The backend now has fewer duplicated control paths in API, service, adapter, and runtime layers while preserving existing HTTP contracts. Lifecycle safety is improved by server-first shutdown and non-panicking worker submission semantics. The refactor also added targeted tests for previously uncovered operational paths (`internal/worker`, `internal/cli`, ingest flow, retrieval error/cap behavior, and adapter/fs write mechanics). The full repository quality baseline passed after implementation.

## Context and Orientation

The backend lives in `srv/` and follows a hexagonal layout. Runtime wiring starts at `srv/cmd/mirage/main.go` and `srv/internal/cli/run.go`, HTTP routes and DTO mapping live in `srv/internal/api/`, domain types live in `srv/internal/domain/`, orchestration logic lives in `srv/internal/service/`, interfaces in `srv/internal/port/`, and concrete adapters in `srv/internal/adapter/`.

The current complexity pattern is repeated logic at multiple boundaries:

- API handlers in `srv/internal/api/documents.go` repeat not-found/error mapping and bundle multipart parsing, persistence, and background scheduling in one method.
- Retrieval and indexer in `srv/internal/service/` each re-implement LLM JSON completion/decode and include repeated stage error flow.
- Mistral adapter methods in `srv/internal/adapter/mistral/` duplicate HTTP status/body/decode handling around a shared request sender.
- Filesystem storage in `srv/internal/adapter/fs/storage.go` repeats write preconditions and has inconsistent directory creation behavior across save methods.
- Runtime lifecycle in `srv/internal/cli/run.go` duplicates error exit paths and currently orders shutdown in a way that can panic under concurrent request load.

This plan focuses on reducing duplication in those paths while preserving behavior and improving maintainability.

## Plan of Work

### Milestone 1: Establish Regression Nets and Fix Lifecycle Ordering

Add targeted tests before refactors in the most fragile areas. In `srv/internal/api`, add table-driven characterization tests for `Upload`, `List`, `Get`, `Delete`, and `Query` status mapping and side effects. In `srv/internal/worker` and `srv/internal/cli`, add tests covering submit-after-shutdown behavior and command error propagation.

Then fix lifecycle sequencing in `srv/internal/cli/run.go` and `srv/internal/worker/pool.go`: stop accepting new requests before worker shutdown, make worker submission safe after shutdown (return error instead of panic), and centralize process-fatal behavior at one entry point (`main`).

At the end of this milestone, concurrent upload + shutdown should not panic, and lifecycle paths should be test-covered.

### Milestone 2: API and Service DRY Consolidation

In `srv/internal/api/documents.go` and related files, extract helper functions for repeated error mapping and upload sub-steps. Keep route and OpenAPI metadata unchanged while removing repeated literals and stringly-typed fragments where possible.

In `srv/internal/service/retrieval.go`, split the `Answer` flow into private step functions (`validate`, `iterate`, `collect`, `finalize`) while preserving stop conditions and output semantics. In `srv/internal/service/indexer.go` and retrieval, introduce one shared helper for LLM JSON completion/decode with explicit strict vs normalized modes to preserve behavior where needed.

In `srv/internal/service/ingest.go`, consolidate repeated fail-and-wrap control flow into a single step runner helper and add missing ingest tests.

At the end of this milestone, service code should have less repeated error/JSON logic and clearer stage boundaries without contract changes.

### Milestone 3: Adapter, Storage, and Bootstrap Simplification

In `srv/internal/adapter/mistral/`, centralize request/response handling into one JSON transport helper and update OCR/LLM call paths to use it. Keep external request payloads and status semantics stable.

In `srv/internal/adapter/fs/storage.go`, unify write path behavior by ensuring parent directory setup and atomic write handling are centralized. Remove the duplicate close pattern in `SavePDF`.

In service constructors, replace broad dependency usage with narrow service-local interfaces, and in runtime wiring (`srv/internal/cli/run.go`) extract a concise runtime builder to reduce repetitive assembly logic and make bootstrap behavior testable.

At the end of this milestone, adapter and bootstrap layers should expose fewer repeated patterns and reduce code required for future integrations.

## Concrete Steps

From `$REPO_ROOT/srv`:

1. Add characterization and lifecycle tests.
   - `go test ./internal/api -run 'Test.*(Upload|List|Get|Delete|Query)'`
   - `go test ./internal/worker ./internal/cli ./cmd/mirage`

2. Implement lifecycle safety and error propagation cleanup.
   - Edit `internal/cli/run.go`, `internal/worker/pool.go`, and `cmd/mirage/main.go`.
   - Re-run package tests above.

3. Implement API and service dedup refactors.
   - Edit `internal/api/documents.go`, `internal/api/query.go`, `internal/service/retrieval.go`, `internal/service/indexer.go`, `internal/service/ingest.go`.
   - Run `go test ./internal/api ./internal/service`.

4. Implement adapter/storage/bootstrap simplifications.
   - Edit `internal/adapter/mistral/client.go`, `internal/adapter/mistral/llm.go`, `internal/adapter/mistral/ocr.go`, `internal/adapter/fs/storage.go`, `internal/cli/run.go`.
   - Run `go test ./internal/adapter/... ./internal/service ./internal/cli ./internal/worker`.

5. Run repository quality baseline from repo root.
   - `task build`
   - `task format`
   - `task lint`
   - `task typecheck`
   - `task test`

Expected implementation evidence:

- Lifecycle tests demonstrate no panic when submission races with shutdown.
- API behavior tests preserve existing status mappings and error surface.
- Service tests verify unchanged retrieval/index behavior under strict and normalized JSON parsing paths.
- Full quality baseline passes.

## Validation and Acceptance

Acceptance is met when all conditions below are true:

- Existing HTTP contracts remain unchanged for `/api/v1/documents*` and `/api/v1/query` behavior (status codes and essential response fields).
- Server shutdown under active upload traffic does not panic and exits predictably.
- Repeated logic identified in this plan is consolidated into shared helpers in API, service, adapter, and runtime layers.
- New tests cover the previously untested lifecycle paths and key handler/service error branches.
- The full quality baseline in `docs/QUALITY.md` passes.

## Idempotence and Recovery

All work is source-level and idempotent. If a milestone fails midway, reset to the last green commit and rerun tests before continuing. Keep milestones small and mergeable so any regression can be isolated quickly.

If lifecycle changes introduce uncertain shutdown semantics, keep old and new code paths behind a temporary private helper split for one commit, validate behavior with tests, then remove the old path in the next commit.

## Artifacts and Notes

Important baseline evidence collected before implementation:

- API package tests pass but coverage is around 50.4%, with weak characterization of upload/list/get/delete/query handlers.
- Service package tests pass with around 60.3% coverage, and `ingest.go` is under-tested.
- Worker/CLI/CMD operational packages currently have no direct tests.
- Full backend test sweep used by audits passed: `go test ./internal/adapter/... ./internal/port ./internal/service ./internal/api`.

Post-implementation validation evidence:

- `go test ./...` from `srv/` passed after all backend refactors and new tests.
- Full repository baseline from repo root passed: `task build`, `task format`, `task lint`, `task typecheck`, `task test`.

## Interfaces and Dependencies

Implementation should end with these stable internal interfaces and helper boundaries:

- API error mapping helper in `internal/api` (single mapping for not-found and wrapped operational errors).
- Shared LLM JSON completion/decode helper used by both retrieval and indexer in `internal/service`.
- Service-local storage interfaces (`retrievalStore`, `ingestStore`, `indexStore`) replacing broad constructor dependence where feasible.
- Mistral transport helper (`doJSON` or equivalent) in `internal/adapter/mistral/client.go` used by both OCR and LLM paths.
- Worker `Submit` that is safe after shutdown (error return contract instead of panic).

No new external libraries are required. This refactor remains within Go standard library and existing project dependencies.

## Revision Notes

- 2026-03-01 10:13Z (Codex): Created this active ExecPlan after full backend audit to guide a DRY-first simplification program with explicit sequencing, risks, and acceptance checks.
- 2026-03-01 10:27Z (Codex): Updated this plan to reflect completed implementation across all milestones, recorded new discoveries/decisions, and captured final validation evidence.
