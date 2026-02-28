# Add Uploaded-File Preview Dialog in Dashboard

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, users can open a PDF preview directly from the Uploaded Files list on the left side of the dashboard. The preview opens in the same closable dialog style already used by evidence references, so the experience stays visually consistent with the current page design. Users can close the dialog using the existing close button, overlay click, or Escape key.

This improves discoverability and allows immediate file inspection without running a query first.

## Progress

- [x] (2026-02-28 18:30Z) Confirmed there are no other active ExecPlans and scoped current dashboard/preview architecture.
- [x] (2026-02-28 18:31Z) Added uploaded-file preview action in the left file list.
- [x] (2026-02-28 18:31Z) Reused existing `PreviewDialog` by mapping uploaded documents to deterministic page-1 preview references.
- [x] (2026-02-28 18:31Z) Updated frontend behavior docs.
- [x] (2026-02-28 18:36Z) Ran build/tests and full quality baseline (`task build`, `task format`, `task lint`, `task test`) and recorded outcomes.
- [x] (2026-02-28 18:37Z) Plan finalized and ready to move to `docs/exec-plans/completed/`.

## Surprises & Discoveries

- Observation: `PreviewDialog` is already generic enough to display any `ReferenceListItemData`, not only query evidence.
  Evidence: It accepts `reference: ReferenceListItemData | null` and only uses shared fields (`documentName`, `documentId`, page range, snippet).
- Observation: Uploaded-file rows currently have selection and delete actions only; no preview action is available.
  Evidence: `web/src/routes/index.tsx` rendered row includes checkbox, status, delete button, but no preview trigger.
- Observation: Running project quality checks triggered a Biome formatting rewrite in the edited dashboard file.
  Evidence: `task format` reported “Fixed 1 file”, and the resulting import block in `web/src/routes/index.tsx` was normalized.

## Decision Log

- Decision: Reuse `PreviewDialog` instead of introducing a second dialog component.
  Rationale: Keeps one modal pattern and one PDF preview implementation, matching existing page design.
  Date/Author: 2026-02-28 / Codex.
- Decision: Map uploaded-file preview to a deterministic synthetic reference (`pageStart=1`, `pageEnd=1`, `nodeTitle="Uploaded file preview"`).
  Rationale: Minimal-risk integration with existing dialog contracts and predictable context label.
  Date/Author: 2026-02-28 / Codex.

## Outcomes & Retrospective

Uploaded files can now be previewed directly from the left file list without running a query. The implementation reused the existing dialog and PDF viewer path, so the preview experience remains consistent with page design and existing evidence preview interactions.

The change was low-risk and localized: one UI action added in the dashboard list and one documentation update. Full repository quality commands passed after implementation.

## Context and Orientation

The main dashboard is in `web/src/routes/index.tsx`. The left `aside` renders uploaded files and controls (search, select, delete, upload). The right panel renders query answer and evidence cards.

The preview modal is implemented in `web/src/components/PreviewDialog.tsx` and consumes `ReferenceListItemData` from `web/src/components/ReferenceListItem.tsx`. It lazy-loads `PdfViewer` (`web/src/components/PdfViewer.tsx`).

Because dialog behavior already matches project style, this feature can be implemented by wiring uploaded rows to the same preview state (`selectedReference`, `isPreviewOpen`) used by evidence cards.

## Plan of Work

Add a preview button/icon to each uploaded-file row in `index.tsx`. When clicked, build a synthetic `ReferenceListItemData` for that document and call the existing preview open handler.

Keep interactions isolated: checkbox still controls selection, delete still deletes, and preview action only opens dialog.

No API changes are required. The preview already loads PDF by document id.

Update `docs/FRONTEND.md` to mention uploaded-file preview control.

## Concrete Steps

From repository root (`$REPO_ROOT`):

1. Edit `web/src/routes/index.tsx`:
   - Add preview icon/action in uploaded rows.
   - Add helper to build uploaded-file preview reference object.
2. Optionally adjust `web/src/components/PreviewDialog.tsx` copy if needed for better context wording.
3. Update `docs/FRONTEND.md` behavior notes.
4. Validate:
   - `cd web && npm run build`
   - `cd web && npm run test` (or document any non-applicable outcome)

## Validation and Acceptance

Acceptance criteria:

- Uploaded file rows show a visible preview action consistent with existing row controls.
- Activating preview opens `PreviewDialog` with that document’s PDF.
- The dialog can be closed via existing dialog controls.
- Existing evidence-reference preview behavior remains intact.
- Frontend build passes.

## Idempotence and Recovery

Edits are additive and safe to re-run. If route or dialog behavior regresses, revert only `index.tsx` uploaded-row changes and re-run frontend build to verify recovery.

## Artifacts and Notes

Validation transcripts:

    cd web && npm run build
    # exit 0

    cd web && npm run test
    # Test Files 4 passed, Tests 11 passed

    task build && task format && task lint && task test
    # all tasks exit 0

## Interfaces and Dependencies

No new dependencies.

Primary touched interfaces:

- `ReferenceListItemData` (existing shape reused for uploaded-file preview objects).
- `PreviewDialog` props in `web/src/components/PreviewDialog.tsx`.
- Uploaded row controls in `web/src/routes/index.tsx`.

## Revision Notes

- 2026-02-28 18:30Z (Codex): Created plan for uploaded-file preview dialog feature request.
- 2026-02-28 18:37Z (Codex): Recorded completed implementation, validation evidence, and completion status for move to completed plans.
