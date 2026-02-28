# Security

Document security posture and boundaries here. Update when new external integrations, data stores, or capability boundaries are introduced.

When extending the system's surface, use least-privilege defaults and explicit capability boundaries.

## Current Posture

- No authentication — assumes single-user or trusted-network deployment.
- Documents stored as plaintext on the local filesystem, no encryption at rest.
- Mistral API key provided via environment variable, never logged or persisted beyond config.
- No CORS configuration — assumes same-origin frontend.
- No rate limiting — suitable for single-user use.
