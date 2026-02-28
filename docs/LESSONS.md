# Lessons

- If a test verifies package-level API behavior, prefer naming it `api_test.go` instead of a narrower filename like `cors_test.go`.
- After adding tests, check filenames against existing project naming conventions before finalizing.
- After resolving merge conflicts in frontend routes, always run `npx tsc --noEmit` and scan for undefined identifiers before considering the merge complete.
- For retrieval reliability fixes, default to explicit fail-fast behavior with actionable errors unless the user explicitly asks for graceful fallback behavior.
- When the API response shape is intentionally reduced (for example removing `snippet` from query evidence), update backend domain/DTO contracts, generated frontend types, UI mappings, and tests in the same change to prevent schema drift.
- For PageIndex-style retrieval, avoid silent recovery flags (for example `degradedMode`); fail fast on selection/synthesis errors and emit structured logs with stage context instead.
- For Mistral structured outputs, prefer `response_format.type=json_schema` with `strict=true` and a real JSON Schema object over free-form JSON prompts.
- When the user states the project is greenfield, avoid rollout plans, migration strategy, and backward-compatibility framing unless explicitly requested.
- When introducing strict structured output, audit every `CompleteJSON` callsite and convert all schema hints to proper JSON Schema objects in the same change.
- For strict structured-output APIs, avoid heuristic schema detection; require JSON Schema input directly and fail fast if it is missing or invalid.
