# Define PDF Evidence Anchor API Contract (Plan Only)

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `docs/PLANS.md`.

## Purpose / Big Picture

After this plan is implemented in a future change, the frontend will be able to open a PDF directly at the best page, highlight the exact evidence snippet (not just whole page ranges), and expose section context that matches backend indexing output. This plan is intentionally design-only right now: it defines the enforceable API contract and rollout path, but does not execute backend or frontend implementation.

The user-visible behavior targeted by this future work is deterministic navigation: clicking an evidence item should consistently jump to the same page and highlight anchor, even when page-level ranges are broad. Success will be observable when a single evidence item reliably opens the intended page and marks the correct snippet and section title.

## Progress

- [x] (2026-02-28 20:03Z) Split deferred API-model content out of `pdfjs-restructure-cleanup.md` into this dedicated active ExecPlan.
- [x] (2026-02-28 20:03Z) Captured initial contract proposal for snippet anchors, page targets, and section metadata.
- [ ] Validate the contract shape with backend owners and lock field semantics (required vs optional, confidence meaning, coordinate units).
- [ ] Update OpenAPI schema and generated types in a dedicated implementation PR.
- [ ] Implement backend evidence anchor population and deterministic tests.
- [ ] Implement frontend anchor-priority rendering and navigation behavior.
- [ ] Validate end-to-end behavior using real PDFs and record outcomes.

## Surprises & Discoveries

- Observation: Current frontend evidence types do not include snippet text offsets or geometry anchors.
  Evidence: `web/src/lib/api.gen.ts` defines `EvidenceBody` with `document_id`, `document_name`, `node_id`, `node_title`, `page_start`, `page_end` only.

- Observation: Current `PdfViewer` supports snippet matching only when `highlightRanges` include `snippet`; otherwise it falls back to page overlay.
  Evidence: `web/src/lib/pdfHighlighting.ts` includes `getRangeSnippet` and fallback behavior is driven by missing snippet matches.

## Decision Log

- Decision: Keep this plan design-only and do not execute backend implementation yet.
  Rationale: User requested a backend-enforceable plan artifact now, with implementation deferred.
  Date/Author: 2026-02-28 / Codex

- Decision: Model anchors as layered data (`pdf_anchor`, `snippet_anchor`, `page_target`) instead of only one mechanism.
  Rationale: Different documents/indexers may provide precise geometry for some evidence and only snippet offsets for others; layered fallback keeps behavior robust.
  Date/Author: 2026-02-28 / Codex

## Outcomes & Retrospective

Current outcome is planning-only. No backend schema, service logic, or frontend runtime behavior changed as part of this plan split.

The immediate gain is execution clarity: cleanup/refactor work remains isolated in `pdfjs-restructure-cleanup.md`, and backend API modeling has a dedicated plan that can be reviewed and scheduled independently.

## Context and Orientation

Relevant current frontend files:

- `web/src/lib/api.gen.ts`: generated API model consumed by frontend.
- `web/src/lib/evidence.ts`: maps evidence payload into reference items used in UI.
- `web/src/components/PdfViewer.tsx`: renders PDF pages and highlights.
- `web/src/lib/pdfHighlighting.ts`: pure highlight matching and geometry helpers.

A "snippet anchor" means text content metadata that lets frontend locate a textual evidence span inside rendered PDF text layers. A "geometry anchor" means explicit highlight rectangles on a specific page (for example x/y/width/height values). A "page target" means canonical page number used for initial navigation when opening preview.

Today, evidence includes page ranges only; it does not include snippet-level offsets or geometry. Because of that, highlighting cannot always be deterministic at snippet level.

## Plan of Work

First, define the contract extension in OpenAPI for evidence items. The extension must be additive to maintain backward compatibility during rollout. Existing fields (`document_id`, `node_id`, `page_start`, `page_end`, etc.) remain present.

Second, implement backend population rules:

- when geometry data is available from indexing/chunking, populate `pdf_anchor`.
- always populate `page_target.page_number` as the best initial page.
- populate `snippet_anchor` with canonical snippet text and offsets when available.
- include `trace` metadata for debugging and quality scoring.

Third, implement frontend consumption in strict priority order:

- use `pdf_anchor.rects` if present for exact rendering.
- otherwise use `snippet_anchor.snippet_text` on `page_target` and local text-layer matching.
- otherwise fall back to current page-range overlay.

Fourth, add deterministic tests:

- backend: anchor consistency for fixed fixture PDFs.
- frontend: priority order and fallback correctness.

This plan is not executed in this change; it is a staged implementation design.

## Proposed API Model (Draft)

Extend evidence payload with optional nested objects:

- `page_target`:
  - `page_number: number` (1-based canonical target page for initial focus)
  - `page_start: number`
  - `page_end: number`
- `snippet_anchor`:
  - `snippet_text: string`
  - `char_start: number | null`
  - `char_end: number | null`
  - `confidence: number` (0..1)
- `pdf_anchor`:
  - `page_number: number`
  - `rects: Array<{ x: number; y: number; width: number; height: number; unit: "ratio" | "pt" }>`
- `section_anchor`:
  - `node_id: string`
  - `node_title: string`
  - `section_path: string[]`
- `trace`:
  - `anchor_version: string`
  - `source_chunk_id: string`
  - `score: number`

Compatibility rule: all new fields are optional during rollout; frontend must preserve current behavior when they are absent.

## Concrete Steps

This is a deferred plan. Do not execute implementation in this document yet.

When implementation begins, run from repository root:

1. Update schema in backend OpenAPI source and regenerate clients.
2. Update backend evidence assembly to fill new fields.
3. Update frontend types and mapping logic.
4. Add backend and frontend tests.
5. Run full quality baseline from `docs/QUALITY.md`.

Expected command shape during execution phase:

    task build
    task format
    task lint
    task typecheck
    task test

## Validation and Acceptance

Acceptance for future implementation phase:

- Given an evidence item with `pdf_anchor.rects`, preview opens on `page_target.page_number` and renders those rects.
- Given no `pdf_anchor` but valid `snippet_anchor`, preview matches snippet text and highlights snippet words.
- Given neither anchor, preview falls back to range overlay on `page_start..page_end`.
- End-to-end tests prove deterministic behavior on fixed PDF fixtures.

For this planning-only split, acceptance is documentation-level:

- API model and fallback rules are explicit in one dedicated active ExecPlan file.
- No implementation steps from this plan were executed.

## Idempotence and Recovery

Creating and revising this plan file is idempotent. If field naming decisions change later, update this plan first, then implement in a separate code PR so behavior and contract discussions remain traceable.

## Artifacts and Notes

Source orientation references:

    web/src/lib/api.gen.ts
    web/src/lib/evidence.ts
    web/src/components/PdfViewer.tsx
    web/src/lib/pdfHighlighting.ts

Linked implementation cleanup plan:

    docs/exec-plans/active/pdfjs-restructure-cleanup.md

## Interfaces and Dependencies

Primary interface to update in future implementation:

- Evidence schema in backend OpenAPI definition (source of truth for generated `web/src/lib/api.gen.ts`).

Frontend dependencies that will consume new fields:

- `web/src/lib/evidence.ts` for mapping API model to UI references.
- `web/src/components/PdfViewer.tsx` and `web/src/lib/pdfHighlighting.ts` for rendering and fallback logic.

No new third-party library is required by this contract design. Implementation should continue to use existing PDF.js rendering and current frontend state flow.

Change log note: 2026-02-28 — Plan created by splitting deferred backend API contract content out of `pdfjs-restructure-cleanup.md`, per user request, to keep cleanup and backend design tracks separate.
