# Reliability

Runtime correctness expectations. Add entries as behaviors are implemented.

- New runtime behavior should include deterministic validation steps.
- Document metadata is flushed to disk before the upload response is sent.
- Filesystem writes use atomic rename to prevent partial/corrupt state.
- Failed processing surfaces as document status `failed` with an error message.
- Worker pool drains in-flight jobs on shutdown.
- Query evidence page ranges are deterministic from stored tree ranges, not extracted mention-level offsets.
- TOC-derived page labels are reconciled to physical page offsets before section ranges are stored.
