# Restructure And Clean Up PDF.js Integration

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `docs/PLANS.md`.

## Purpose / Big Picture

The current PDF.js integration works, but the implementation is spread across a large viewer component and an outdated helper module that still contains random-preview logic from earlier iterations. After this change, PDF behavior stays the same for users, but the implementation is easier to understand, safer to modify, and scoped to current product behavior: deterministic viewing/highlighting and PDF-only upload validation.

A developer should be able to open the PDF viewer path and quickly identify where document loading happens, where text-highlight matching lives, and where upload file validation lives. A user should still be able to upload PDFs, open previews, and see highlights without regressions.

## Progress

- [x] (2026-02-28 19:54Z) Read `docs/PLANS.md`, `docs/exec-plans/active/README.md`, and mapped all PDF.js touchpoints in `web/src`.
- [x] (2026-02-28 19:59Z) Refactored `web/src/components/PdfViewer.tsx` to consume extracted pure utilities from `web/src/lib/pdfPageSelection.ts` and `web/src/lib/pdfHighlighting.ts`.
- [x] (2026-02-28 20:00Z) Removed obsolete `web/src/lib/referencePreviews.ts` and `web/src/lib/referencePreviews.test.ts`; updated upload validation import in `web/src/routes/index.tsx` to use `web/src/lib/pdfFiles.ts`.
- [x] (2026-02-28 20:00Z) Added/updated tests in `web/src/lib/pdfFiles.test.ts`, `web/src/lib/pdfPageSelection.test.ts`, and `web/src/lib/pdfHighlighting.test.ts`.
- [x] (2026-02-28 20:01Z) Ran validation commands (`task build`, `task format`, `task lint`, `task typecheck`, `task test`) and recorded outcomes below.
- [x] (2026-02-28 20:03Z) Split deferred backend API-model content into a dedicated active ExecPlan (`docs/exec-plans/active/pdf-evidence-anchor-api-contract.md`) so this plan remains implementation-cleanup focused.

## Surprises & Discoveries

- Observation: The upload route currently imports `isPdfFile` from `web/src/lib/referencePreviews.ts`, but that file still contains random area generation and PDF parsing paths that are no longer used by the app.
  Evidence: `rg -n "buildRandomReferenceArea|buildRandomReferenceFromPdfFile|isPdfFile" web/src` shows random functions only referenced by tests while `isPdfFile` is used in `web/src/routes/index.tsx`.
- Observation: The generated frontend `EvidenceBody` model does not include snippet/offset data, so current highlighting falls back to range-level overlays unless caller-injected snippet text is available.
  Evidence: `web/src/lib/api.gen.ts` defines `EvidenceBody` with `document_id`, `document_name`, `node_id`, `node_title`, `page_start`, `page_end` only.

## Decision Log

- Decision: Perform an in-place cleanup by extracting pure logic out of `PdfViewer.tsx` and replacing the stale `referencePreviews` module with a focused PDF file-validation module, instead of redesigning viewer behavior.
  Rationale: The user requested restructure/cleanup of the implementation, not behavior changes. This approach lowers risk while delivering clearer architecture.
  Date/Author: 2026-02-28 / Codex

- Decision: Define a backend-enforceable API contract for precise highlight navigation as a deferred plan artifact, without implementing backend behavior in this change.
  Rationale: User explicitly requested planning for future backend work now, while keeping current refactor focused on cleanup.
  Date/Author: 2026-02-28 / Codex

## Outcomes & Retrospective

Implemented cleanup:

- `PdfViewer` now delegates pure logic to dedicated modules:
  - `web/src/lib/pdfPageSelection.ts`
  - `web/src/lib/pdfHighlighting.ts`
- Legacy random preview module/tests removed:
  - deleted `web/src/lib/referencePreviews.ts`
  - deleted `web/src/lib/referencePreviews.test.ts`
- Upload validation now imports from focused PDF validation module:
  - `web/src/routes/index.tsx` -> `#/lib/pdfFiles`
- Tests moved/expanded for the extracted pure modules:
  - `web/src/lib/pdfFiles.test.ts`
  - `web/src/lib/pdfPageSelection.test.ts`
  - `web/src/lib/pdfHighlighting.test.ts`

Validation outcomes:

- `task build` passed.
- `task format` passed (formatted 1 file).
- `task lint` passed.
- `task typecheck` passed.
- `task test` passed.

Retrospective:

- Extracting pure PDF helper code substantially reduced `PdfViewer.tsx` complexity without changing runtime behavior.
- Removing stale random-preview logic reduced confusion and clarified the supported path (deterministic PDF preview + validation).
- A dedicated backend API model is required to move from page-range overlays to deterministic snippet-level highlights and section navigation.
For the deferred backend API modeling work, use the dedicated active plan:

- `docs/exec-plans/active/pdf-evidence-anchor-api-contract.md`

## Context and Orientation

The PDF rendering flow lives in `web/src/components/PdfViewer.tsx`. That component currently owns all of the following concerns in one file: page-selection math, snippet-to-text-item matching, rectangle normalization, page render task lifecycle, and document load lifecycle. This makes it hard to reason about and test.

The PDF.js loader is in `web/src/lib/pdfjs.ts`. It correctly memoizes the dynamic import and worker wiring.

File upload validation currently relies on `isPdfFile` from `web/src/lib/referencePreviews.ts`, but that module still contains random-area generation and a random-page selection path that is no longer part of the product behavior. Keeping it creates confusion and false coupling with PDF.js internals.

The tests currently cover old random-preview helpers in `web/src/lib/referencePreviews.test.ts`. They do not directly cover current PDF-file validation behavior or the extracted pure logic we need from the viewer.

## Plan of Work

First, extract pure helper logic from `web/src/components/PdfViewer.tsx` into new utility modules under `web/src/lib/`:

- Create a page-selection utility module for `normalizePageRange`, page normalization, and `resolvePagesToRender`.
- Create a highlight utility module for snippet normalization/matching and rect conversion (`findSnippetItemIndexes`, text-item mapping, dedupe, and rect geometry).

Then update `PdfViewer.tsx` to import and use those utilities. Keep component behavior and UI output unchanged.

Second, replace the obsolete `referencePreviews` module with a focused PDF validation module:

- Add `web/src/lib/pdfFiles.ts` exposing `isPdfFile`.
- Update imports in `web/src/routes/index.tsx`.
- Remove random preview helpers and their obsolete tests.

Third, add/update tests:

- Add tests for `isPdfFile` in a new `web/src/lib/pdfFiles.test.ts`.
- Add tests for extracted pure helper behavior (at minimum snippet matching and page resolution) in dedicated test files.

Finally, run project quality commands for this repo and record outcomes in this plan.

## Concrete Steps

Working directory: repository root.

1. Extract and wire utility modules.
2. Replace/rename PDF file-validation module and imports.
3. Update tests for new utility locations.
4. Run quality commands from `docs/QUALITY.md` and capture outcomes.

Expected implementation checkpoints:

- `web/src/components/PdfViewer.tsx` shrinks and focuses on rendering/lifecycle.
- New utility modules are imported by `PdfViewer.tsx` and have direct tests.
- No remaining imports of `#/lib/referencePreviews`.

## Validation and Acceptance

Run and expect success:

- `cd web && npm run lint`
- `cd web && npm run test`
- `cd web && npm run build`

Run repo quality baseline and capture any environment limitations:

- `task build`
- `task format`
- `task lint`
- `task typecheck`
- `task test`

Acceptance criteria:

- Users can still upload PDF files and receive the same validation behavior for non-PDF files.
- PDF preview rendering still works and highlights still appear.
- Code structure clearly separates PDF.js lifecycle code from pure text/highlight utility logic.
- Obsolete random preview logic is removed from active code paths.

## Idempotence and Recovery

These edits are additive/refactor-oriented and can be rerun safely. If any extraction step fails, restore the target file from git and re-apply the extraction in smaller slices. If tests fail after extraction, temporarily re-export helpers from the old location to bisect, then remove shims once tests pass.

## Artifacts and Notes

Initial discovery snapshot:

    rg -n "pdfjs|referencePreviews|PdfViewer|PreviewDialog" web/src

Conflict safety note: if git state changes unexpectedly during implementation, pause and re-check `git status` before continuing.

## Interfaces and Dependencies

The refactor will keep existing external interfaces stable:

- `PdfViewer` component API remains:
  - `documentId: string`
  - `highlightRanges: Array<PdfHighlightRange>`
  - optional `compact` and `visiblePageNumbers`

- PDF.js loading continues via `loadPdfJs` in `web/src/lib/pdfjs.ts`.

New internal utilities will expose stable function signatures equivalent to current behavior, for example:

- Page selection:
  - `normalizePageRange(pageStart: number, pageEnd: number): [number, number]`
  - `resolvePagesToRender(totalPages: number, visiblePageNumbers?: number[]): number[]`

- Highlight matching:
  - `findSnippetItemIndexes(items: Array<{ str: string }>, snippet: string): number[]`

Change log note: 2026-02-28 — Initial ExecPlan created to drive PDF.js cleanup and refactor with preserved user behavior.

Change log note: 2026-02-28 — Deferred backend API contract content was split into a dedicated active ExecPlan file so this document remains scoped to implemented cleanup work.
