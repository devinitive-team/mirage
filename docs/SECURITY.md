# Security

Document security posture and boundaries here. Update when new external integrations, data stores, or capability boundaries are introduced.

When extending the system's surface, use least-privilege defaults and explicit capability boundaries.

## Current Posture

- No authentication — assumes single-user or trusted-network deployment.
- Documents stored as plaintext on the local filesystem, no encryption at rest.
- Mistral API key provided via environment variable, never logged or persisted beyond config.
- CORS policy is configurable via environment variables (`CORS_ALLOWED_ORIGINS`, `CORS_ALLOWED_METHODS`, `CORS_ALLOWED_HEADERS`, `CORS_EXPOSED_HEADERS`, `CORS_ALLOW_CREDENTIALS`, `CORS_MAX_AGE`). When `CORS_ALLOWED_ORIGINS` is empty, CORS middleware is not enabled (same-origin behavior). For browser safety, `CORS_ALLOW_CREDENTIALS=true` is rejected when `CORS_ALLOWED_ORIGINS` contains `*`.
- No rate limiting — suitable for single-user use.
