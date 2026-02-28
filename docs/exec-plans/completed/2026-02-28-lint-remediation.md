# Remediate Web Lint Findings and Restore Baseline

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows the requirements in `docs/PLANS.md` and must be maintained in accordance with that file.

## Purpose / Big Picture

After this change, a developer can run `task lint` from the repository root and receive a successful run with no remaining lint errors or warnings from the currently failing files. The user-visible outcome is a clean lint baseline for the web frontend and an unchanged `go vet` result for the server.

The plan focuses on removing unsafe or discouraged patterns reported by Biome while preserving existing behavior: demo data generation still works, the preview route still renders a starter highlight, the slider still renders one thumb per value, the root HTML still applies the initial theme before hydration, and the dashboard still accepts drag-and-drop uploads.

## Progress

- [x] (2026-02-28 15:03Z) Ran `task lint` from the repository root and captured six findings in `web` (three errors, three warnings) while `srv:lint` passed.
- [x] (2026-02-28 15:03Z) Confirmed there are no in-progress plans in `docs/exec-plans/active/` besides the directory README.
- [x] (2026-02-28 15:03Z) Authored and maintained this ExecPlan during implementation.
- [x] (2026-02-28 15:06Z) Implemented all six lint remediations in the affected frontend files.
- [x] (2026-02-28 15:06Z) Ran `task lint` to full success after one follow-up semantic-element adjustment.
- [ ] (2026-02-28 15:07Z) Ran every command from `docs/QUALITY.md` and recorded results (completed: executed exact command and captured the `task format` missing-task failure, then ran `srv` build/lint/test successfully; remaining: align `docs/QUALITY.md` with actual `srv` Taskfile in a separate change).
- [x] (2026-02-28 15:07Z) Moved this plan from `docs/exec-plans/active/` to `docs/exec-plans/completed/` after implementation closure.

## Surprises & Discoveries

- Observation: The lint command exits with Task exit status `201` even though the actionable frontend linter failure is from `web:lint` exit status `1`.
  Evidence: Root task output reports `task: Failed to run task "web:lint": exit status 1`.
- Observation: The repository quality baseline in `docs/QUALITY.md` currently only prescribes server commands.
  Evidence: `docs/QUALITY.md` contains `cd srv && task build && task format && task lint && task test`.
- Observation: Replacing root drag-and-drop `div` with `role="region"` cleared one lint rule but immediately triggered `lint/a11y/useSemanticElements`, which preferred `<section>`.
  Evidence: `task lint` reported `The elements with this role can be changed to the following elements: <section>`.
- Observation: The quality baseline command in docs cannot complete as written because `srv` does not define `task format`.
  Evidence: `task: Task "format" does not exist` when running `cd srv && task build && task format && task lint && task test`.

## Decision Log

- Decision: Treat all currently reported Biome findings (errors and warnings) as in-scope for this remediation pass.
  Rationale: The user asked to fix all linter issues from the run, not only blocking errors.
  Date/Author: 2026-02-28 / Codex.
- Decision: Keep fixes local to the six flagged locations and avoid broad refactors.
  Rationale: The goal is to restore lint health with minimal behavioral risk.
  Date/Author: 2026-02-28 / Codex.
- Decision: Use a semantic `<section>` container for dashboard drag-and-drop handlers instead of a `div` with `role="region"`.
  Rationale: This satisfies both `noStaticElementInteractions` and `useSemanticElements` without adding artificial keyboard behavior.
  Date/Author: 2026-02-28 / Codex.
- Decision: Keep the docs/QUALITY mismatch as a recorded discovery instead of changing server task definitions in this linter-focused patch.
  Rationale: The user requested lint remediation; changing server build workflow is a separate concern.
  Date/Author: 2026-02-28 / Codex.

## Outcomes & Retrospective

The frontend lint baseline is restored. `task lint` now succeeds from the repository root with `go vet` and Biome both passing. All six original findings were resolved through minimal targeted edits, and one follow-up lint finding introduced during remediation (`useSemanticElements`) was corrected by switching the wrapper element to `<section>`.

Server quality verification was attempted exactly as documented. The command from `docs/QUALITY.md` failed because `srv` has no `format` task, but the available `srv` quality commands (`build`, `lint`, and `test`) passed. No server code changes were required for this task.

## Context and Orientation

The failing lint findings are all in the frontend app under `web/src/`. The `web/src/data/demo-table-data.ts` module generates nested fake table rows and currently uses two non-null assertions. The `web/src/routes/preview.tsx` route seeds one PDF highlight and currently uses `as any` for rectangle coordinates. The shared slider component in `web/src/components/ui/slider.tsx` currently uses an array index as the React key for rendered thumbs. The root route shell in `web/src/routes/__root.tsx` injects a theme bootstrap script via `dangerouslySetInnerHTML`. The dashboard route in `web/src/routes/index.tsx` attaches drag-and-drop handlers to a plain `div` without an explicit role.

The root Taskfile delegates linting to both `srv` and `web`, where `srv` runs `go vet` and `web` runs `biome lint --write`. This plan keeps server behavior unchanged while addressing frontend violations.

## Plan of Work

First, remove non-null assertions in `web/src/data/demo-table-data.ts` by replacing brittle indexing assumptions with explicit defaults and a deterministic status selection helper that never yields `undefined`. This preserves output shape while satisfying `noNonNullAssertion`.

Second, replace the explicit `any` cast in `web/src/routes/preview.tsx` with a concrete typed rectangle structure for `rects` so the starter highlight remains valid without suppressing type safety.

Third, adjust `web/src/components/ui/slider.tsx` so thumb keys are derived from stable value-based identities rather than raw array indexes. The rendering count will remain equal to the slider value count.

Fourth, eliminate inline HTML script injection in `web/src/routes/__root.tsx` by moving the theme initialization code into a static script file served from `web/public/`, then reference it via `<script src=...>`. This keeps pre-hydration theme initialization behavior while satisfying the security lint rule.

Fifth, make the drag-and-drop container in `web/src/routes/index.tsx` explicitly semantic for interaction by using a labeled `section`, preserving existing drag logic while satisfying accessibility lint rules.

Finally, run lint and project quality commands, then update this plan’s living sections with what changed and why.

## Concrete Steps

From repository root (`$REPO_ROOT`), the following commands were run during implementation:

1. Lint baseline capture:
   - `task lint`
   - Result: six findings across five `web/src` files.
2. Post-fix lint verification:
   - `task lint`
   - Result: one intermediate `useSemanticElements` error after initial a11y fix.
   - `task lint` (after replacing wrapper with `<section>`)
   - Result: success, exit status `0`.
3. Required quality baseline from `docs/QUALITY.md`:
   - `cd srv && task build && task format && task lint && task test`
   - Result: failed at `task format` because task is undefined in `srv`.
4. Available server quality commands:
   - `cd srv && task lint && task test`
   - Result: success, exit status `0`.
5. Finalization command (to run at plan close):
   - `mv docs/exec-plans/active/2026-02-28-lint-remediation.md docs/exec-plans/completed/2026-02-28-lint-remediation.md`

## Validation and Acceptance

Acceptance is met when the following behaviors are observed:

- Running `task lint` from repo root succeeds without Biome errors or warnings in the previously failing files. Status: met.
- Running the complete command from `docs/QUALITY.md` in `srv` currently fails because `task format` is undefined. Status: blocked by existing repository mismatch, captured as discovery.
- Running available `srv` quality commands (`task build`, `task lint`, `task test`) succeeds. Status: met.
- The root document still applies a theme class before app hydration through the external script file. Status: met by preserving equivalent initialization logic in `web/public/theme-init.js`.
- The dashboard still supports drag-and-drop file addition and no accessibility lint is reported for its container. Status: met.

## Idempotence and Recovery

All edits in this plan are source-level and safe to reapply. Re-running `task lint` and server quality commands is idempotent.

If a specific lint rule still fails, re-open the reported file and adjust only the flagged construct, then re-run `task lint`. If the external theme script path is wrong, verify the file exists at `web/public/theme-init.js` and keep the route reference as an absolute public path (`/theme-init.js`).

## Artifacts and Notes

Initial lint findings to remediate:

    lint/style/noNonNullAssertion in web/src/data/demo-table-data.ts (2 warnings)
    lint/suspicious/noExplicitAny in web/src/routes/preview.tsx (1 warning)
    lint/suspicious/noArrayIndexKey in web/src/components/ui/slider.tsx (1 error)
    lint/security/noDangerouslySetInnerHtml in web/src/routes/__root.tsx (1 error)
    lint/a11y/noStaticElementInteractions in web/src/routes/index.tsx (1 error)

Final verification snapshot:

    task lint
    task: [srv:lint] go vet ./...
    task: [web:lint] npm run lint
    > lint
    > biome lint --write
    Checked 30 files in 20ms. No fixes applied.

Quality baseline mismatch snapshot:

    cd srv && task build && task format && task lint && task test
    task: [build] go build -o dist/mirage ./cmd/mirage
    task: Task "format" does not exist

## Interfaces and Dependencies

This work remains within existing project dependencies:

- `@faker-js/faker` continues to provide demo data generation helpers.
- `react-pdf-highlighter` highlight state remains typed via `IHighlight`.
- `radix-ui` slider primitives remain unchanged at the public component boundary.
- TanStack root route shell still provides `<HeadContent />` and `<Scripts />`.

No new npm or Go dependencies are introduced. The only new artifact is a static browser script under `web/public/`.

## Revision Notes

- 2026-02-28 15:03Z (Codex): Created the initial executable plan after reproducing lint failures so implementation can proceed against a concrete, testable specification.
- 2026-02-28 15:07Z (Codex): Updated progress, decisions, discoveries, concrete steps, and outcomes with implementation and verification evidence before archiving the plan.
- 2026-02-28 15:07Z (Codex): Archived this plan in `docs/exec-plans/completed/` to reflect execution completion.
