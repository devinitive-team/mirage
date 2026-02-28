# Implement Proposal A: Deterministic Query Evidence + Tree/PDF APIs

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, a query response will return deterministic, traversal-grounded `evidence[]` entries instead of LLM-generated `citations[]`, and each evidence item will carry section and page-range context needed for UI highlights. The backend will also expose document binary/tree endpoints required by the frontend highlight workflow. In the UI, query evidence will be rendered as previewable references and the PDF viewer will highlight evidence pages directly.

Observable user impact:

- Query API responses include `answer` + `evidence[]` with `node_title`, `page_start`, `page_end`, and `snippet`.
- `GET /api/v1/documents/{document-id}/tree` returns tree data with one-indexed page numbers suitable for frontend display.
- Preview highlights in the frontend are based on evidence page ranges rather than hardcoded/sample highlights.

## Progress

- [x] (2026-02-28 17:35Z) Reviewed Proposal A design doc and mapped backend/frontend files impacted by the contract change.
- [x] (2026-02-28 17:35Z) Ran two explorer subagents to validate implementation strategy and likely testing surface.
- [x] (2026-02-28 17:45Z) Implemented backend domain/service changes for deterministic evidence generation and removed LLM citation output dependency.
- [x] (2026-02-28 17:46Z) Implemented API DTO mapping for one-indexed evidence/tree outputs and registered `GET /documents/{id}/tree` plus binary PDF route.
- [x] (2026-02-28 17:50Z) Updated frontend API/types and rewired dashboard references + preview to query-driven evidence.
- [x] (2026-02-28 17:50Z) Regenerated OpenAPI TypeScript definitions and adjusted callers to the new schema.
- [x] (2026-02-28 17:51Z) Added backend and frontend tests for retrieval evidence mapping, DTO conversion, document endpoints, and evidence helper logic.
- [x] (2026-02-28 17:54Z) Ran `task build`, `task format`, `task lint`, and `task test` successfully.
- [x] (2026-02-28 17:54Z) Ran required `agent-browser` UI verification flow; query submit path was exercised and entered loading state, but completion depended on external LLM availability.

## Surprises & Discoveries

- Observation: `web/src/lib/api.gen.ts` already contains a `get-document-pdf` operation while server route registration currently lacks a PDF handler.
  Evidence: Opened `web/src/lib/api.gen.ts` and `srv/internal/api/documents.go`; only upload/list/get/delete routes are registered in code.
- Observation: The current dashboard does not call `queryDocuments`; its references panel is built from randomized local PDF regions.
  Evidence: `web/src/routes/index.tsx` currently builds references via `buildRandomReference...` utilities and never invokes `queryDocuments`.
- Observation: In sandboxed execution, `task codegen` failed unless `GOCACHE` was redirected to a writable path.
  Evidence: `go run ./cmd/mirage openapi` returned permission errors writing under `$HOME/.cache/go-build`; rerun with `GOCACHE=/tmp/go-build` succeeded.
- Observation: Browser verification could exercise query submit and loading state, but answer/evidence completion was not observed within the check window.
  Evidence: `agent-browser get text body` returned `Running query and collecting evidence...` after submit and did not transition during the 5s wait.

## Decision Log

- Decision: Perform page index conversion (`0`-based internal to `1`-based API) only in API DTO mapping functions, not in retrieval service internals.
  Rationale: Keeps retrieval/storage logic unchanged and centralizes contract translation to one boundary.
  Date/Author: 2026-02-28 / Codex.
- Decision: Keep evidence generation deterministic by deriving directly from selected leaf traversal and fetched pages, with no LLM citation generation.
  Rationale: Proposal A requires provenance-grounded evidence and removes citation hallucination risk.
  Date/Author: 2026-02-28 / Codex.
- Decision: Integrate query evidence into the existing references/preview layout rather than introducing a separate page.
  Rationale: Minimizes churn while delivering the required query-to-highlight loop.
  Date/Author: 2026-02-28 / Codex.
- Decision: Cap synthetic page-level highlight generation in `PdfViewer` at 24 pages per render.
  Rationale: Proposal A only requires page-level highlighting; capping prevents unbounded highlight rendering cost on large evidence ranges.
  Date/Author: 2026-02-28 / Codex.

## Outcomes & Retrospective

Implemented Proposal A end-to-end across backend contract, API endpoints, frontend query/evidence wiring, and tests. The query contract now emits deterministic `evidence[]`, the tree endpoint is available with one-indexed pages, and the dashboard now runs queries and maps evidence into previewable references with PDF page-range highlights.

Quality baseline commands passed. Interactive browser validation was executed and confirmed the new query submit workflow and loading-state behavior. Final answer/evidence rendering could not be fully observed in the short automated check window because completion depends on external retrieval/LLM runtime conditions.

## Context and Orientation

The backend query pipeline lives in `srv/internal/service/retrieval.go`. It currently gathers page markdown from selected leaf nodes but asks the LLM to generate `citations` in `generateAnswer`, which is nondeterministic. Query response types are defined in `srv/internal/domain/query.go` and currently expose `Citation`.

HTTP DTOs and route handlers are in `srv/internal/api/dto.go`, `srv/internal/api/query.go`, and `srv/internal/api/documents.go`. Storage methods needed by Proposal A already exist in `srv/internal/port/storage.go` and `srv/internal/adapter/fs/storage.go`, including `OpenPDF` and `GetTree`.

The frontend API layer is `web/src/lib/api.ts` with OpenAPI-derived types in `web/src/lib/api.gen.ts` and aliases in `web/src/lib/types.ts`. The current dashboard UI in `web/src/routes/index.tsx` does not execute queries; instead it shows random reference cards and opens `web/src/components/PreviewDialog.tsx`, which renders `web/src/components/PdfViewer.tsx` with hardcoded highlights. Proposal A requires replacing that mock path with evidence-driven highlights from query results.

## Plan of Work

First, update backend domain and retrieval service code so `domain.QueryResult` contains `Evidence` entries. In retrieval, capture evidence only when a selected candidate is a leaf and pages are fetched from storage. Build snippet content from fetched markdown and deduplicate repeated leaf visits by stable key `(document_id,node_id,start,end)`.

Second, update API DTO contracts so query output and tree output are explicit API structs rather than direct domain structs. Add mappers that convert zero-based internal page indexes to one-based API page fields. Register and implement `GET /api/v1/documents/{document-id}/tree`. Keep the existing PDF URL contract and ensure binary responses remain available for PDF loading.

Third, update frontend generated/alias types and API client helpers (`getDocumentTree`, updated query result typing), then replace random reference generation in dashboard state with query execution over selected complete documents. Transform `evidence[]` into `ReferenceListItemData` entries with section/page metadata and snippets, and make `PdfViewer` build page-level highlights from evidence ranges.

Fourth, update and add tests close to changed surfaces: backend tests for retrieval evidence generation and API page-index mapping, plus frontend tests for reference item rendering changes and any new evidence mapping helpers.

Finally, run required quality commands from `docs/QUALITY.md` and record exact results and any caveats.

## Concrete Steps

From repository root (`$REPO_ROOT`):

1. Implement backend contract updates.
   - Edit `srv/internal/domain/query.go`.
   - Edit `srv/internal/service/retrieval.go`.
   - Edit `srv/internal/api/dto.go`, `srv/internal/api/query.go`, `srv/internal/api/documents.go`.
2. Implement frontend wiring updates.
   - Edit `web/src/lib/types.ts`, `web/src/lib/api.ts`.
   - Edit `web/src/routes/index.tsx`, `web/src/components/ReferenceListItem.tsx`, `web/src/components/PreviewDialog.tsx`, `web/src/components/PdfViewer.tsx`.
3. Regenerate OpenAPI client types.
   - Run `task codegen`.
4. Add/update tests.
   - Add backend tests in `srv/internal/service` and/or `srv/internal/api`.
   - Update/add frontend tests under `web/src`.
5. Validate implementation.
   - Run `task build`.
   - Run `task format`.
   - Run `task lint`.
   - Run `task test` (or document existing repository caveat if frontend has no tests in a given area).

Expected completion signals:

- Backend query response uses `evidence[]` and no longer exposes `citations[]`.
- Tree endpoint responds with one-indexed pages.
- Frontend references panel is populated by query evidence and preview highlights correspond to evidence page ranges.
- Quality commands pass, or any pre-existing baseline failures are explicitly documented with evidence.

## Validation and Acceptance

Acceptance is met when:

- Posting to `/api/v1/query` returns `answer` and at least one `evidence` item (for seeded test data) with populated `document_id`, `node_id`, `node_title`, one-indexed `page_start/page_end`, and `snippet`.
- `GET /api/v1/documents/{document-id}/tree` returns tree nodes where every `start_page`/`end_page` value is one-indexed.
- Frontend query flow can submit a question, render resulting evidence cards, open preview, and show highlights on evidence pages.
- Automated tests and quality commands complete successfully (or any non-regression caveat is documented).

## Idempotence and Recovery

All edits are source-level and can be re-applied safely. Regenerating OpenAPI typings is idempotent and should be rerun whenever API DTOs change. If type generation causes broad diffs, keep only files directly derived from current server schema and re-run formatting/linting to normalize output.

If a step fails mid-way, rerun the failed command after fixing the root cause; no data migrations are involved.

## Artifacts and Notes

Command evidence captured during implementation:

- `GOCACHE=/tmp/go-build task codegen` completed and regenerated `web/src/lib/api.gen.ts`.
- `cd web && npx tsc --noEmit` passed after updating typed `PdfViewer` callbacks.
- `cd srv && GOCACHE=/tmp/go-build go test ./...` passed (API/config/service test packages).
- `cd web && npm run test` passed (4 files, 11 tests).
- `GOCACHE=/tmp/go-build task build`, `task format`, `task lint`, `task test` all passed.
- `agent-browser` flow: open app, snapshot, fill query, submit via Enter, and capture screenshot at `/tmp/query-evidence-running.png`.

## Interfaces and Dependencies

Backend output interfaces to end in this milestone:

- `domain.Evidence` in `srv/internal/domain/query.go`.
- `domain.QueryResult` with `Evidence []Evidence`.
- API DTO response body for query with `evidence` array and one-indexed page fields.
- API DTO response body for document tree with recursively mapped node pages.

Frontend interfaces to end in this milestone:

- `QueryResult` type with `evidence` array (and corresponding alias in `web/src/lib/types.ts`).
- `ReferenceListItemData` extended with section and page-range fields needed for evidence display and preview.
- `PdfViewer` props capable of rendering highlights from one or more evidence-derived page ranges.

## Revision Notes

- 2026-02-28 17:35Z (Codex): Created active ExecPlan for Proposal A implementation after repository exploration and subagent-assisted scope validation, to ensure implementation proceeds with explicit milestones and verification.
- 2026-02-28 17:54Z (Codex): Updated plan to reflect completed implementation, testing outcomes, browser validation results, and environment-specific execution caveats.
