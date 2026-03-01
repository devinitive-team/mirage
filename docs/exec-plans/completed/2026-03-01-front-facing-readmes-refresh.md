# Improve Front-Facing README Quality and Consistency

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan is maintained in accordance with `docs/PLANS.md`.

## Purpose / Big Picture

After this work, a first-time visitor can understand what Mirage is, how to run it locally, and what each sub-project is responsible for without reading source code first. The result should reduce setup mistakes, remove stale template wording, and align all front-facing README files with actual behavior in code and Taskfiles. A visible proof is that each documented command runs successfully (or is clearly marked optional), and every README states the project scope and current limitations accurately.

## Progress

- [x] (2026-03-01 13:47Z) Reviewed `docs/PLANS.md` requirements and confirmed active plan workspace usage.
- [x] (2026-03-01 13:48Z) Rewrote root `README.md` with clearer product framing, accurate setup flow, and hackathon context (`Mistral Worldwide Hackathon 2026`).
- [x] (2026-03-01 13:54Z) Standardized structure and tone across `web/README.md`, `marketing/README.md`, `video/README.md`, and `srv/README.md` (purpose, quick start, commands, scope, related docs).
- [x] (2026-03-01 13:55Z) Verified command examples in front-facing READMEs against root/project Taskfiles and package/go scripts.
- [x] (2026-03-01 13:54Z) Added cross-links from each sub-project README to root `README.md` and `docs/README.md`.
- [x] (2026-03-01 13:49Z) Ran repository quality baseline successfully (`task build`, `task format`, `task lint`, `task typecheck`, `task test`).
- [x] (2026-03-01 13:56Z) Moved completed plan to `docs/exec-plans/completed/`.

## Surprises & Discoveries

- Observation: Previous root README claimed support for both PDFs and text documents, but the current ingest endpoint and handlers are PDF-focused.
  Evidence: `srv/internal/api/documents.go` registers upload/get routes explicitly around PDF handling (`application/pdf` response and PDF parsing path).

- Observation: Root `task setup` intentionally installs `srv`, `web`, and `video`, but does not install `marketing`.
  Evidence: root `Taskfile.yml` `setup` task includes only `srv:install`, `web:install`, and `video:install`.

- Observation: The repository quality baseline still passes after root README and ExecPlan changes.
  Evidence: `task build`, `task format`, `task lint`, `task typecheck`, and `task test` all returned PASS on 2026-03-01.

- Observation: Adding a predictable README section structure across projects made command verification mechanical and low-risk.
  Evidence: Each sub-project README now follows the same core order (`What`, `Prerequisites`, `Quick Start`, `Commands`, `Current Scope`, `Related Docs`).

## Decision Log

- Decision: Treat “front-facing READMEs” as the repository root README and project-root READMEs in `srv/`, `web/`, `marketing/`, and `video/`.
  Rationale: These files are the first entry points for contributors and evaluators; they map directly to runnable projects.
  Date/Author: 2026-03-01 / Codex

- Decision: Add explicit hackathon provenance in the root README.
  Rationale: The user requested this context and it is core project identity for external readers.
  Date/Author: 2026-03-01 / Codex

- Decision: Keep README guidance implementation-truthful over aspirational marketing language.
  Rationale: Accurate setup and behavior descriptions prevent onboarding failures.
  Date/Author: 2026-03-01 / Codex

- Decision: Add a mandatory `Related Docs` section to each sub-project README pointing to root README and docs index.
  Rationale: New readers can orient from any entry point without searching the repository tree.
  Date/Author: 2026-03-01 / Codex

## Outcomes & Retrospective

Completed outcomes:

- Root README now reflects real project shape, hackathon provenance, founders, and current scope/limits.
- `srv/`, `web/`, `marketing/`, and `video` READMEs now follow a consistent structure and tone.
- Front-facing README command references were cross-checked against Taskfiles/scripts.
- Cross-links were added so any README can route readers to root and canonical docs quickly.
- Full quality baseline passed after documentation updates.

No remaining scope in this plan.

## Context and Orientation

Mirage is a monorepo with separate runnable applications. New readers usually start at the root README, then move to the sub-project README they need. In this plan, “front-facing README” means a top-level README that describes a runnable project surface:

- `README.md` (monorepo entry point)
- `srv/README.md` (Go backend)
- `web/README.md` (product UI)
- `marketing/README.md` (landing site)
- `video/README.md` (Remotion renderer)

The authoritative behavior and command sources for this plan are:

- `docs/ARCHITECTURE.md` for module roles and API shape.
- `docs/FRONTEND.md` for user-facing UI behavior.
- `docs/QUALITY.md` for required validation commands.
- `Taskfile.yml` (root and per-project) plus package/go scripts for command truth.

## Plan of Work

First, normalize structure across all front-facing READMEs so readers see predictable sections: purpose, what exists today, prerequisites, local run commands, task shortcuts, validation, and known limits. This is not cosmetic only; the content must be synchronized to current scripts and code paths.

Second, verify command validity line-by-line by executing or cross-checking each documented command against live Taskfiles and script definitions. Any command that is optional, expensive, or environment-dependent will be labeled as such.

Third, tighten cross-navigation so readers can move from any README to canonical docs and back to repo root quickly. Each README will include short pointers to `docs/README.md` and sibling project docs where relevant.

Finally, run quality baseline commands and record concise evidence in this plan so a novice can confirm the state is healthy after documentation updates.

## Concrete Steps

Work from repository root.

1. Audit front-facing README files and source-of-truth command files.

   Commands:

       rg --files -g 'README.md'
       sed -n '1,260p' README.md
       sed -n '1,260p' srv/README.md
       sed -n '1,260p' web/README.md
       sed -n '1,260p' marketing/README.md
       sed -n '1,260p' video/README.md
       sed -n '1,260p' Taskfile.yml
       sed -n '1,260p' srv/Taskfile.yml
       sed -n '1,260p' web/Taskfile.yml
       sed -n '1,260p' marketing/Taskfile.yml
       sed -n '1,260p' video/Taskfile.yml

2. Apply focused README edits.

   Files to edit:

   - `README.md`
   - `srv/README.md`
   - `web/README.md`
   - `marketing/README.md`
   - `video/README.md`

   Required content checks per file:

   - Project purpose in plain language.
   - Exact runnable commands for local development.
   - Accurate scope/limitations.
   - Reference to canonical docs index.

3. Validate quality baseline.

   Commands:

       task build
       task format
       task lint
       task typecheck
       task test

4. Update this plan’s `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` with final evidence and then move the file to `docs/exec-plans/completed/`.

## Validation and Acceptance

Acceptance is met when all of the following are true:

- A new contributor can read `README.md` and accurately describe Mirage’s architecture, run path, and scope without opening code.
- Each sub-project README documents commands that exist in current Taskfiles/scripts.
- No README claims unsupported behavior (for example, ingesting non-PDF files if not implemented).
- The quality baseline passes:

      task build
      task format
      task lint
      task typecheck
      task test

- Root README includes project provenance: built during Mistral Worldwide Hackathon 2026.

## Idempotence and Recovery

README edits are safe and idempotent: rerunning this plan should result in no functional code drift and only textual refinements if needed. If a command or behavior check fails, recover by reconciling docs against the corresponding source-of-truth file (Taskfile, script, or implementation) and rerun validation. No destructive filesystem operations are required.

## Artifacts and Notes

Current root README change (already completed in this plan run):

- Added explicit hackathon context.
- Replaced vague marketing wording with accurate system behavior.
- Clarified run paths for `srv` + `web`, plus separate marketing/video workflows.
- Added explicit current limitations and docs entry point.

Evidence snippets to preserve at completion:

- `git status --short` showing README-only diffs.
- Short output tails from quality baseline commands.

## Interfaces and Dependencies

This plan touches only Markdown documentation files and uses existing repository tooling.

- Task runner: `task` (root and per-project Taskfiles).
- Backend toolchain context: Go 1.24+ in `srv/`.
- Frontend toolchain context: Node.js 22+ in `web/`, `marketing/`, `video/`.
- External service context: Mistral API key for backend runtime behavior.

Revision Note (2026-03-01 13:48Z): Initial version of this ExecPlan created to satisfy a request for structured README improvements and to track work as a living plan.
Revision Note (2026-03-01 13:49Z): Updated progress and discoveries after running the full quality baseline; kept remaining multi-README work explicitly pending.
Revision Note (2026-03-01 13:56Z): Completed sub-project README normalization, command verification, cross-linking, and final baseline validation; marked plan complete and ready to move to `completed/`.
