# Rewrite Web PDF Highlighting from `react-pdf-highlighter` to Mozilla `pdf.js`

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, the web app will render PDF previews and evidence highlights directly with Mozilla `pdf.js` (`pdfjs-dist`), without depending on `react-pdf-highlighter`. Users will still click an evidence card and open the preview dialog, but three behaviors are required: they must be able to view only selected pages, they must also be able to view the whole document with highlights, and they must see highlights inside page content (not only whole-page overlays).

This matters because the current setup mixes two different `pdf.js` versions (app dependency plus nested dependency), adds type friction, and hides rendering behavior behind a third-party abstraction that we only use for page-level highlighting. A successful implementation is observable when the preview dialog and `/preview` route can switch between full-document and selected-page rendering, display text-level highlight marks tied to evidence/snippets, and pass all quality checks after removing `react-pdf-highlighter` from dependencies.

## Progress

- [x] (2026-02-28 20:05Z) Audited current frontend PDF rendering usage and identified all `react-pdf-highlighter` integration points (`web/src/components/PdfViewer.tsx`, `web/src/routes/preview.tsx`, dependency entries in `web/package.json` and `web/package-lock.json`).
- [x] (2026-02-28 20:05Z) Confirmed existing `pdfjs-dist` integration pattern and worker bootstrap in `web/src/lib/referencePreviews.ts`.
- [x] (2026-02-28 18:32Z) Created shared `pdf.js` runtime utility in `web/src/lib/pdfjs.ts` and migrated `web/src/lib/referencePreviews.ts` to reuse it.
- [x] (2026-02-28 18:33Z) Rewrote `web/src/components/PdfViewer.tsx` to use `pdfjs-dist` directly for document loading and canvas page rendering.
- [x] (2026-02-28 18:33Z) Added explicit page-window behavior via `visiblePageNumbers` with full-document mode as default.
- [x] (2026-02-28 18:33Z) Added intra-page text highlighting (snippet matching) with page-overlay fallback for unmatched snippets.
- [x] (2026-02-28 18:33Z) Updated `web/src/routes/preview.tsx` to consume the rewritten `PdfViewer` and removed all `react-pdf-highlighter` usage.
- [x] (2026-02-28 18:33Z) Added mode toggle in `web/src/components/PreviewDialog.tsx` for `Evidence pages` vs `Whole document`.
- [x] (2026-02-28 18:34Z) Removed `react-pdf-highlighter` from `web/package.json` and refreshed `web/package-lock.json`.
- [x] (2026-02-28 18:34Z) Added `web/src/components/PdfViewer.test.ts` covering normalization, page selection, and snippet-matching helpers.
- [x] (2026-02-28 18:41Z) Ran `task build`, `task format`, `task lint`, `task typecheck`, `task test`, and `agent-browser` interactive verification.
- [x] (2026-02-28 18:41Z) Prepared this plan for move to `docs/exec-plans/completed/` after recording outcomes.

## Surprises & Discoveries

- Observation: The repository already has direct `pdfjs-dist` usage, but only for random preview metadata generation, not page rendering.
  Evidence: `web/src/lib/referencePreviews.ts` dynamically imports `pdfjs-dist` and sets `GlobalWorkerOptions.workerSrc`.
- Observation: The app currently ships two `pdf.js` versions in dependency graph.
  Evidence: `web/package.json` depends on `pdfjs-dist@^5.4.624`, while `web/package-lock.json` shows `react-pdf-highlighter` pulling nested `pdfjs-dist@4.4.168`.
- Observation: The current viewer only needs coarse page-level highlighting, not text-selection anchoring.
  Evidence: `web/src/components/PdfViewer.tsx` generates synthetic full-page highlight rectangles from `pageStart/pageEnd` ranges.
- Observation: Current evidence payload used by the viewer always includes page ranges and optional snippet text, but no persisted character offsets.
  Evidence: `PdfHighlightRange` in `web/src/components/PdfViewer.tsx` includes `pageStart`, `pageEnd`, `snippet?`, `nodeTitle?` only.
- Observation: Quality command execution in this environment required elevated permissions for some steps due sandbox restrictions on Go build/cache and localhost checks.
  Evidence: Initial `task build` failed with `operation not permitted` on Go cache paths until rerun with elevated permissions.
- Observation: Dev/runtime port conflicts affected interactive validation startup.
  Evidence: Existing `mirage run` held `:2137`, and a `node` process held `:42069`, causing `task run` startup failures until stale processes were stopped.

## Decision Log

- Decision: Keep the public `PdfViewer` prop contract stable (`documentId`, `highlightRanges`, `compact`) while replacing internals.
  Rationale: `PreviewDialog` and dashboard query flow can remain unchanged, which reduces migration risk.
  Date/Author: 2026-02-28 / Codex.
- Decision: Introduce a shared `pdf.js` loader module and reuse it from both the rewritten viewer and `referencePreviews`.
  Rationale: Worker configuration must be single-source-of-truth to avoid duplicate initialization bugs.
  Date/Author: 2026-02-28 / Codex.
- Decision: Initial scope assumed read-only page-range highlighting only; this decision is superseded by later requirements in this same log.
  Rationale: Kept for historical traceability of scope change.
  Date/Author: 2026-02-28 / Codex.
- Decision: Expand migration scope to require page-window rendering and intra-page text highlighting as first-class features of the new viewer.
  Rationale: Product requirements now explicitly call for selective page display and highlights inside page content.
  Date/Author: 2026-02-28 / Codex.
- Decision: Viewer API must support both display modes: full-document (default) and selected-page window (opt-in), with highlighting in either mode.
  Rationale: Product needs both focused evidence inspection and full-context reading without separate viewer implementations.
  Date/Author: 2026-02-28 / Codex.
- Decision: Implement text highlights by matching evidence snippet text within the `pdf.js` text layer on target pages, with fallback to page-level overlay when no robust match is found.
  Rationale: Backend currently provides snippets and page ranges but not stable character offsets; snippet matching delivers value without blocking on API changes.
  Date/Author: 2026-02-28 / Codex.
- Decision: Keep `/preview` as a diagnostics route with URL-driven mode/page parameters while routing all rendering through shared `PdfViewer`.
  Rationale: Enables deterministic verification of both modes without duplicating viewer logic.
  Date/Author: 2026-02-28 / Codex.

## Outcomes & Retrospective

Implemented and validated the migration end-to-end. `react-pdf-highlighter` was removed from dependencies and from all application source usage. PDF rendering now uses first-party `pdfjs-dist` integration with a shared loader, dual display modes (full-document and selected-page window), and snippet-driven intra-page highlights with fallback overlays.

User-visible behavior now supports both requested preview modes:

- Focus mode: render only selected evidence pages with highlights.
- Context mode: render the whole document with highlights still applied.

Gaps and follow-ups:

- Text matching currently uses snippet normalization and first-match selection; precision can be improved later with persisted text anchors from backend evidence payloads.
- Interactive validation covered `/preview` route mode behavior and rendered highlight elements; dashboard query-to-preview flow remains dependent on document/query availability as before.

## Context and Orientation

The web frontend lives under `web/src/`. PDF preview behavior is currently wired like this:

`web/src/routes/index.tsx` renders evidence cards. Clicking a card opens `web/src/components/PreviewDialog.tsx`, which lazy-loads `web/src/components/PdfViewer.tsx`. That component currently uses `react-pdf-highlighter` to render the PDF and apply full-page highlights from `PdfHighlightRange` (`pageStart` to `pageEnd`).

`web/src/routes/preview.tsx` is a direct viewer route that also imports `react-pdf-highlighter`. It currently contains demo highlight state and selection callbacks.

`web/src/lib/referencePreviews.ts` already loads `pdfjs-dist` dynamically and configures the worker URL via `pdf.worker.min.mjs?url`; this logic should be centralized and reused.

In this plan, “Mozilla `pdf.js`” means the `pdfjs-dist` package APIs (`getDocument`, `GlobalWorkerOptions`, and page rendering via `PDFPageProxy.render`). “Highlight overlay” means a visual layer drawn over pages in the evidence range, equivalent to today’s page-level emphasis.

In this plan, “page window” means rendering only a caller-selected subset of pages (for example, evidence pages 12-14) while hiding other pages from the preview. “Full-document mode” means rendering every page of the PDF while still applying highlights to matching evidence areas. “Intra-page highlight” means a visible marker over specific words/phrases in the page text layer, not just tinting the whole page.

## Plan of Work

Milestone 1 establishes shared `pdf.js` runtime plumbing. Create `web/src/lib/pdfjs.ts` with an idempotent async loader that imports `pdfjs-dist`, imports the worker URL module, sets `GlobalWorkerOptions.workerSrc`, and returns the initialized module. Update `web/src/lib/referencePreviews.ts` to consume this loader so there is one worker bootstrap path in the codebase.

Milestone 2 rewrites `web/src/components/PdfViewer.tsx` without `react-pdf-highlighter`. Keep the existing props and range model as the compatibility baseline, then extend it with explicit display-mode support: default full-document rendering, plus page-window support when the caller passes a selected page subset/range. Load the PDF document from `getDocumentPdfUrl(documentId)`, render pages to `<canvas>` elements according to the selected mode, and keep existing loading/error state behavior. Ensure cleanup destroys loading tasks and document handles when the component unmounts or `documentId` changes.

Milestone 3 adds intra-page highlighting. Build a text layer for rendered pages using `pdf.js` text content and map evidence snippets to DOM text spans. Apply highlight styling to matched spans so users can see the relevant phrase in context. When matching fails, render a fallback page-level overlay and log a non-fatal debug signal for future tuning.

Milestone 4 updates `web/src/routes/preview.tsx` to use the new viewer path instead of direct `react-pdf-highlighter` primitives. The route can stay as a diagnostics surface, but it must run on the same rendering component so there is one rendering implementation to maintain.

Milestone 5 removes `react-pdf-highlighter` from dependencies and validates the full quality baseline. Update package metadata and lockfile, then run tests and browser-driven checks to confirm upload/query/preview flows still work, selected-page rendering works, and intra-page highlights remain visible.

Milestone 6 finishes documentation and plan hygiene. Update any docs that mention the old library (at minimum `docs/FRONTEND.md` when behavior text changes) and then move this plan to `docs/exec-plans/completed/` with final outcomes filled in.

## Concrete Steps

From repository root (`$REPO_ROOT`):

1. Baseline inventory:
   - `rg -n "react-pdf-highlighter" web/src web/package.json web/package-lock.json`
   - `rg -n "pdfjs-dist|GlobalWorkerOptions" web/src`
2. Implement shared loader and migrate utility usage:
   - Edit `web/src/lib/referencePreviews.ts`.
   - Add `web/src/lib/pdfjs.ts`.
3. Rewrite the viewer and route integration:
   - Edit `web/src/components/PdfViewer.tsx`.
   - Edit `web/src/components/PreviewDialog.tsx` only if prop or loading behavior needs minor adaptation.
   - Edit `web/src/routes/preview.tsx`.
4. Implement page-window and intra-page highlighting internals:
   - Add helper logic for page window normalization and page filtering.
   - Add display-mode branching so full-document mode renders all pages and page-window mode renders only requested pages.
   - Build text layer generation and snippet-to-span highlight matching with fallback behavior.
5. Add tests for new helper logic (for example range normalization, page inclusion helpers, snippet matching helpers):
   - Add or edit test file under `web/src/components/` or `web/src/lib/` using Vitest.
6. Remove dependency and refresh lockfile:
   - `cd web && npm uninstall react-pdf-highlighter`
7. Run required quality commands from repository root:
   - `task build`
   - `task format`
   - `task lint`
   - `task typecheck`
   - `task test`
8. Run required interactive validation from `docs/QUALITY.md`:
   - `task run`
   - Use `agent-browser` to verify: open app, upload/select/query if needed, open preview dialog, confirm both modes work (full-document with highlights and selected-page subset with highlights), and text-level highlights are visible inside pages.

Expected completion signals:

- `rg -n "react-pdf-highlighter" web/src web/package.json web/package-lock.json` returns no matches.
- `task typecheck` and `task test` exit successfully.
- Browser validation confirms preview dialog and `/preview` route support both full-document and selected-page rendering, with visible intra-page highlights.

## Validation and Acceptance

Acceptance is satisfied when all of the following are true:

- Evidence preview from dashboard still opens a PDF dialog and visually highlights the evidence page range.
- `/preview?documentId=<id>` renders the PDF through the same `pdf.js` implementation (no `react-pdf-highlighter` imports remain).
- The viewer supports full-document mode with highlights (for example default behavior when no page filter is provided).
- The viewer supports selected-page mode (for example by passing explicit page list/range), and non-selected pages are not rendered in that mode.
- Page-range normalization still prevents invalid ranges (`pageStart`/`pageEnd` less than 1 or reversed).
- Evidence snippets are highlighted within page text content when a match is found; unmatched snippets visibly fall back to page-level highlight behavior without crashing.
- Loading and error states are user-visible and non-crashing when PDF fetch fails.
- `task build`, `task format`, `task lint`, `task typecheck`, and `task test` all pass.
- Required `agent-browser` verification from `docs/QUALITY.md` is executed and recorded in this plan’s artifacts section before completion.

## Idempotence and Recovery

The migration is safe to repeat. Re-running dependency uninstall is idempotent once the package is removed. Re-running quality commands should not mutate runtime behavior beyond formatting/lint rewrites already accepted by project policy.

If the new viewer fails to render in development, rollback is straightforward: restore `web/src/components/PdfViewer.tsx`, `web/src/routes/preview.tsx`, and `web/package.json` from git, run `cd web && npm install`, then reattempt milestone-by-milestone with tests after each step.

Because PDF rendering is async, cleanup logic must always cancel/destroy prior loading tasks before starting a new document load to avoid stale updates and memory leaks during rapid navigation.

Text-layer matching should be deterministic and side-effect free: retrying the same snippet/page input must produce the same match outcome so tests remain stable.

## Artifacts and Notes

Initial inventory before migration:

    web/src/components/PdfViewer.tsx imports react-pdf-highlighter
    web/src/routes/preview.tsx imports react-pdf-highlighter
    web/package.json includes "react-pdf-highlighter": "^8.0.0-rc.0"
    web/package-lock.json includes react-pdf-highlighter and nested pdfjs-dist@4.4.168

Current `pdf.js` worker bootstrap already present:

    web/src/lib/referencePreviews.ts:
      import("pdfjs-dist")
      import("pdfjs-dist/build/pdf.worker.min.mjs?url")
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default

Implementation artifacts and verification evidence:

    Added: web/src/lib/pdfjs.ts
    Added: web/src/components/PdfViewer.test.ts
    Updated: web/src/lib/referencePreviews.ts
    Updated: web/src/components/PdfViewer.tsx
    Updated: web/src/components/PreviewDialog.tsx
    Updated: web/src/routes/preview.tsx
    Updated: web/package.json
    Updated: web/package-lock.json

Quality command outcomes:

    task build      -> PASS
    task format     -> PASS
    task lint       -> PASS
    task typecheck  -> PASS
    task test       -> PASS (includes PdfViewer.test.ts)

Interactive verification (`agent-browser`) evidence:

    Uploaded test document id: 01KJJRR60G7SMB4AHVZT98NNVY
    Evidence-mode route text included: "Mode: Evidence pages. Highlighted: Page 1." and only "Page 1" page label.
    Whole-document mode text included: "Mode: Whole document. Highlighted: Page 1." and page labels "Page 1 Page 2 Page 3".
    Highlight-layer presence check passed in both modes via DOM predicate on amber highlight classes.
    Screenshots:
      /Users/kacperkapusciak/.agent-browser/tmp/screenshots/screenshot-2026-02-28T18-41-01-185Z-26ks0m.png
      /Users/kacperkapusciak/.agent-browser/tmp/screenshots/screenshot-2026-02-28T18-41-06-470Z-eeq53q.png

## Interfaces and Dependencies

No new external libraries are planned. The migration standardizes on existing `pdfjs-dist` dependency.

The following interfaces must exist after implementation:

- `web/src/lib/pdfjs.ts` exports a reusable async loader for initialized `pdfjs-dist`.
- `web/src/components/PdfViewer.tsx` continues to export:
  - `type PdfHighlightRange = { id: string; pageStart: number; pageEnd: number; snippet?: string; nodeTitle?: string }`
  - `function PdfViewer(props: { documentId: string; highlightRanges: Array<PdfHighlightRange>; compact?: boolean; visiblePageNumbers?: Array<number> }): JSX.Element`, where omitted/empty `visiblePageNumbers` means full-document mode, and non-empty means selected-page mode.
- `web/src/routes/preview.tsx` consumes the same viewer path rather than third-party highlighter APIs.

Dependency endpoint assumptions stay unchanged:

- PDF source URL remains `getDocumentPdfUrl(documentId)` from `web/src/lib/api.ts`.
- Backend document API contract is unchanged by this frontend migration.

## Revision Notes

- 2026-02-28 20:05Z (Codex): Created initial ExecPlan to migrate from `react-pdf-highlighter` to Mozilla `pdf.js`, with scoped milestones, quality gates, and dependency cleanup steps.
- 2026-02-28 20:18Z (Codex): Expanded requirements to include selective page rendering (display only chosen pages) and intra-page text highlighting, with acceptance criteria and interface updates.
- 2026-02-28 20:24Z (Codex): Added explicit requirement for full-document rendering with highlights, alongside selected-page mode, and updated validation/interface language for dual-mode support.
- 2026-02-28 18:41Z (Codex): Completed implementation, executed required quality and browser validation flows, and updated this plan with outcomes and evidence.
