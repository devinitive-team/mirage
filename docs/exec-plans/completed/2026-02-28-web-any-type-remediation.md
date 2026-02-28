# Eliminate Explicit `any` from Web TypeScript Sources

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, authored frontend TypeScript under `web/src/` no longer uses explicit `any`, and PDF highlight callbacks use concrete `react-pdf-highlighter` contracts. The user-visible behavior remains unchanged.

## Progress

- [x] (2026-02-28 15:50Z) Audited explicit `any` usage and scoped work to authored frontend files.
- [x] (2026-02-28 17:42Z) Re-scoped this plan to `any` remediation only (no backend scope).
- [x] (2026-02-28 17:42Z) Implemented typed callback signatures in `web/src/routes/preview.tsx`.
- [x] (2026-02-28 17:42Z) Implemented typed callback signatures in `web/src/components/PdfViewer.tsx`.
- [x] (2026-02-28 17:42Z) Added guardrail to fail explicit `any` in authored files via Biome rule configuration.
- [x] (2026-02-28 17:42Z) Ran required quality commands from `docs/QUALITY.md`.
- [ ] Move this plan to `docs/exec-plans/completed/`.

## Surprises & Discoveries

- Observation: Remaining `as any` appears only in generated router output.
  Evidence: `rg` scan shows `web/src/routeTree.gen.ts` matches only; that file is excluded from Biome includes.
- Observation: Directly spelling callback argument types in `highlightTransform` can conflict with `react-pdf-highlighter`'s `T_ViewportHighlight<T>` intersection type.
  Evidence: TypeScript reported incompatibility until callback types were sourced from `ComponentProps<typeof PdfHighlighter<IHighlight>>`.
- Observation: Opening `/preview` during interactive validation logs an SSR module resolution error for `react-pdf-highlighter`/`pdfjs-dist`, then falls back to client rendering.
  Evidence: Browser validation captured `ERR_MODULE_NOT_FOUND` on that route; this behavior predates the type-only edits.

## Decision Log

- Decision: Keep scope strictly frontend type remediation; do not implement backend API work in this plan.
  Rationale: User direction explicitly constrained this pass to fixing `any` types only.
  Date/Author: 2026-02-28 / Codex.
- Decision: Use `ComponentProps<typeof PdfHighlighter<IHighlight>>` to type callback contracts.
  Rationale: This avoids drift from library contracts and resolves `T_ViewportHighlight<T>` typing edge cases.
  Date/Author: 2026-02-28 / Codex.
- Decision: Enforce `noExplicitAny` as a Biome error for authored files while keeping generated-file exclusions.
  Rationale: Prevents regressions without blocking on tooling-generated `as any` output.
  Date/Author: 2026-02-28 / Codex.

## Outcomes & Retrospective

Implementation is complete for the scoped goal.

Implemented changes:

- `web/src/routes/preview.tsx`: removed explicit `any`; typed `highlightTransform` and `onSelectionFinished` via `PdfHighlighter` prop contracts.
- `web/src/components/PdfViewer.tsx`: removed `unknown` callback placeholders/casts; aligned callback signatures with `PdfHighlighter` contracts; corrected helper parameter typing; removed cast-based highlight creation.
- `web/biome.json`: set `linter.rules.suspicious.noExplicitAny` to `error`.

Validation results:

- Explicit-any audit (`rg` with authored-file globs): only generated `web/src/routeTree.gen.ts` still contains `as any`.
- `cd web && npx tsc --noEmit`: pass.
- `task build`: pass.
- `task format`: pass.
- `task lint`: pass.
- `task test`: pass.
- Interactive browser check: dashboard preview flow works; `/preview` route shows pre-existing SSR module-resolution warning/fallback.

## Context and Orientation

Relevant touched files:

- `web/src/routes/preview.tsx`
- `web/src/components/PdfViewer.tsx`
- `web/biome.json`

Generated-file caveat:

- `web/src/routeTree.gen.ts` is tooling-managed and excluded from authored-file lint enforcement.

## Plan of Work

1. Replace explicit `any` callback annotations in `preview.tsx` with typed `PdfHighlighter` contracts.
2. Replace `unknown`/casts in `PdfViewer.tsx` callback signatures with typed contracts.
3. Add/confirm explicit-any guardrail for authored files.
4. Run full quality baseline and capture outcomes.
5. Move this completed plan to `docs/exec-plans/completed/`.

## Concrete Steps

From repository root (`$REPO_ROOT`):

1. `rg -n --hidden --glob '!web/node_modules/**' --glob '!web/dist/**' --glob 'web/**/*.{ts,tsx,mts,cts}' '\\bany\\b|as\\s+any' web`
2. `cd web && npx tsc --noEmit`
3. `task build`
4. `task format`
5. `task lint`
6. `task test`

## Validation and Acceptance

Acceptance criteria:

- Authored frontend TypeScript has zero explicit `any`.
- `preview.tsx` and `PdfViewer.tsx` callback signatures align with `react-pdf-highlighter` contracts.
- Explicit-any guardrail fails on new authored-file explicit `any`.
- Required quality commands pass.

Status: Met.

## Idempotence and Recovery

Edits are source-level and safe to re-run. Generated output (`web/src/routeTree.gen.ts`) remains excluded from authored-file explicit-any enforcement.

## Artifacts and Notes

- Interactive validation screenshot path used during verification: `artifacts/ui-validation/pdf-preview-example.png` (workspace-cleanup removed this transient artifact).

## Interfaces and Dependencies

No new dependencies introduced.

Relied on existing library contracts from `react-pdf-highlighter` types exported through `PdfHighlighter` props and `IHighlight`.

## Revision Notes

- 2026-02-28 17:42Z (Codex): Re-scoped plan to explicit-any remediation only per user direction; recorded completed implementation and validation evidence.
