# AGENTS

This file is a table of contents, not an encyclopedia.
The repository knowledge base lives in `docs/`, which is the system of record.
Keep this file short and stable so it works as injected context.

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in docs/PLANS.md) from design to implementation.

Always check for any active plans in `docs/exec-plans/active/`. If there are any, continue working on them until complete.

## Workflow

Use this iterative workflow for changes:

1. Explore: read the relevant code paths, docs, and tests to understand current behavior and constraints.
2. Ideate: sketch 1-3 viable approaches, choose the simplest option that preserves behavior and minimizes risk.
3. Plan: define a small, testable implementation plan (use an ExecPlan when required by `docs/PLANS.md`).
4. Reproduce with tests: when fixing bugs, add or update a test that fails for the current behavior before implementing the fix.
5. Implement: apply focused code changes with clear boundaries and minimal indirection.
6. Validate with targeted tests: run the nearest unit/integration tests while iterating.
7. Quality: always run every command listed in `docs/QUALITY.md`.
8. Document and handoff: update affected docs and summarize what changed, why, and how it was validated.

## Security

- Never commit or document sensitive personal data in this repository (for example: usernames, absolute home paths, tokens, private hostnames, or machine-specific identifiers).
- Always use generic examples in docs and plans, such as `$HOME`, `$REPO_ROOT`, or `~/project`, instead of personal absolute paths.
- If sensitive data appears in generated content, sanitize it before writing files or committing changes.

## Table of Contents

- `docs/README.md`: canonical documentation index.
- `docs/ARCHITECTURE.md`: top-level codemap and module boundaries.
- `docs/PRODUCT_SENSE.md`: user/problem framing and scope.
- `docs/DESIGN.md`: design constraints and implementation direction.
- `docs/FRONTEND.md`: UI behavior and controls.
- `docs/RELIABILITY.md`: runtime correctness and deterministic behavior.
- `docs/SECURITY.md`: integration security posture.
- `docs/QUALITY.md`: quality command baseline.
- `docs/PLANS.md`: ExecPlan protocol and required structure.
- `docs/LESSONS.md`: recurring mistake patterns and project-specific rules.
- `docs/exec-plans/active/README.md`: active plan workspace guidance.
- `docs/exec-plans/tech-debt-tracker.md`: deferred improvements.
- `docs/product-specs/`: behavior-level specs.
- `docs/design-docs/`: deeper design writeups.
- `docs/generated/`: generated artifacts (ephemeral).
- `docs/references/`: external source notes.
