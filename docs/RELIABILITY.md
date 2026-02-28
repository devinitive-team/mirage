# Reliability

Runtime correctness expectations. Add entries as behaviors are implemented.

- New runtime behavior should include deterministic validation steps.
- Document metadata is flushed to disk before the upload response is sent.
- Filesystem writes use atomic rename to prevent partial/corrupt state.
- Failed processing surfaces as document status `failed` with an error message.
- Worker pool drains in-flight jobs on shutdown.
