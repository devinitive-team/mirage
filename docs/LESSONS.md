# Lessons

- If a test verifies package-level API behavior, prefer naming it `api_test.go` instead of a narrower filename like `cors_test.go`.
- After adding tests, check filenames against existing project naming conventions before finalizing.
- After resolving merge conflicts in frontend routes, always run `npx tsc --noEmit` and scan for undefined identifiers before considering the merge complete.
