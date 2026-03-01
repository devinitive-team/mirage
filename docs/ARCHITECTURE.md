# Architecture

This file is the top-level codemap for the project. Update it as modules are added, renamed, or removed.

## Problem Scope

Mirage is a document search system. Users upload PDFs, the system extracts text via OCR, builds a hierarchical index, and answers natural-language questions with deterministic evidence grounded to traversed sections and stored page ranges. Current milestone: MVP with ingestion, indexing, retrieval, and query-to-PDF highlight support via Mistral.

## Codemap

Monorepo with five projects:

### `srv/` — Go backend

- `srv/cmd/mirage` — Entry point, dependency wiring, server startup.
- `srv/internal/domain` — Pure types: Document, Page, TreeNode, TreeIndex, Query, QueryResult, Evidence.
- `srv/internal/port` — Interfaces: OCRProvider, LLMProvider, Storage.
- `srv/internal/adapter/fs` — Filesystem storage implementation (atomic JSON writes).
- `srv/internal/adapter/mistral` — Mistral OCR and chat completions client.
- `srv/internal/service` — Business logic: Ingest (pipeline orchestrator), Indexer (tree construction), Retrieval (reasoning loop).
- `srv/internal/api` — HTTP layer: Chi/Huma router, document and query handlers, middleware (including optional CORS).
- `srv/internal/worker` — Bounded goroutine pool for background jobs.
- `srv/internal/config` — Environment variable loading.

### `web/` — React frontend

React 19 + TanStack (Router, Query, Form, Table) + Vite + Tailwind CSS + Biome.

- `web/src/routes/` — TanStack Router file-based routes (`__root.tsx` layout, `index.tsx` main view).
- `web/src/components/` — UI components: SearchInput, FileUpload, PdfViewer, PreviewDialog, ReferenceListItem, Header, Footer, ThemeToggle.
- `web/src/components/ui/` — Shared Radix-based primitive elements (Button, Dialog, Input, Select, etc.).
- `web/src/lib/` — API client (`api.ts`, `api.gen.ts`), domain types (`types.ts`), PDF utilities (`pdfjs.ts`, `pdfHighlighting.ts`, `pdfPageSelection.ts`, `pdfFiles.ts`), evidence processing (`evidence.ts`).
- `web/src/hooks/` — React Query hooks for data fetching (`documents.ts`).
- `web/src/integrations/` — Third-party providers: PostHog analytics, TanStack Query client config.
- `web/src/data/` — Static data constants.

### `marketing/` — Astro marketing site

- `marketing/src` — Astro + Tailwind CSS marketing app.
- `marketing/src/pages` — Route entrypoints for public marketing pages.

### `email/` — Waitlist API worker

- `email/src/index.ts` — Hono app with `/api/waitlist` and `/health`.
- `email/wrangler.jsonc` — Cloudflare Worker runtime and D1 binding config.
- `email/schema.sql` — D1 table/index definitions for waitlist records.
- `email/README.md` — deploy and environment instructions.

### `video/` — Remotion video renderer

- `video/src` — Remotion compositions and root registration.
- `video/public` — Static assets for preview and render.
- `video/remotion.config.ts` — Render and bundling configuration.
- `video/Taskfile.yml` — Project tasks for install, dev, build, lint, composition inspection, and render.

## Invariants

- Hexagonal architecture: services depend on ports, never on adapters.
- Dependency direction: `cmd → config, api, worker, adapter, service`; `api → service, domain`; `service → port, domain`; `adapter → port, domain`; `domain → nothing`.
- All filesystem writes use write-to-temp-then-rename for crash safety.
- Document processing is asynchronous — upload returns 202, worker processes in background.
- Document status transitions: pending → processing → complete (or failed at any step).
- Internal page ranges are 0-indexed in storage/service layers; API responses convert them to 1-indexed fields.
- TOC-derived page labels are best-effort calibrated to physical page offsets before tree ranges are persisted; if calibration yields no usable matches, original TOC labels are retained.

## Cross-Cutting Concerns

- Reliability: commands in docs should be reproducible and idempotent.
- Observability: runtime events should use stable names and predictable payloads.
- Security: external integrations remain explicit and user-configured.

## Where To Add Things

- **Domain types**: `srv/internal/domain/`
- **New external integrations**: Add interface in `srv/internal/port/`, implement in `srv/internal/adapter/`
- **Business logic**: `srv/internal/service/`
- **REST endpoints**: Add handler in `srv/internal/api/`, register in `api.New(...)`
- **Configuration**: Add env var to `srv/.env.example`, parse in `srv/internal/config/config.go`
- **Product frontend features**: `web/src/`
- **Marketing site features**: `marketing/src/`
- **Waitlist API changes**: `email/src/`
- **Video composition features**: `video/src/`

## API Reference

Server listens on `LISTEN_ADDR` (default `:2137`). All document endpoints use ULID identifiers.

| Method | Path | Summary | Notes |
|--------|------|---------|-------|
| GET | `/health` | Health check | Returns `{"status":"ok"}` |
| POST | `/api/v1/documents` | Upload PDF | Multipart form-data; returns 202, processes async |
| GET | `/api/v1/documents` | List documents | Params: `page`, `page_size` |
| GET | `/api/v1/documents/{document-id}` | Get document | |
| DELETE | `/api/v1/documents/{document-id}` | Delete document | Returns 204 |
| GET | `/api/v1/documents/{document-id}/pdf` | Get document PDF | Returns `application/pdf` binary |
| GET | `/api/v1/documents/{document-id}/tree` | Get document tree | Hierarchical index |
| POST | `/api/v1/query` | Query documents | Body: `{ question, document_ids }` |

Domain types defined in `srv/internal/domain/`: Document, Page, TreeNode, TreeIndex, Query, QueryResult, Evidence. OpenAPI spec is auto-generated by Huma at runtime; TypeScript types are generated via `task codegen`.

## Configuration

All settings via environment variables. See `srv/.env.example` for defaults.

| Variable | Default | Description |
|----------|---------|-------------|
| `LISTEN_ADDR` | `:2137` | Server listen address |
| `MISTRAL_API_KEY` | *(required)* | Mistral API key |
| `MISTRAL_BASE_URL` | `https://api.mistral.ai` | Mistral API base URL |
| `MISTRAL_LLM_MODEL` | `mistral-large-latest` | LLM model for reasoning |
| `MISTRAL_OCR_MODEL` | `mistral-ocr-latest` | OCR model for text extraction |
| `DATA_DIR` | `./data` | Filesystem storage directory |
| `WORKER_COUNT` | `2` | Background worker pool size |
| `MAX_PAGES_PER_NODE` | `10` | Max pages per tree node |
| `MAX_TOKENS_PER_NODE` | `20000` | Max tokens per tree node |
| `CORS_ALLOWED_ORIGINS` | *(empty = disabled)* | Comma-separated allowed origins |
| `CORS_ALLOWED_METHODS` | `GET,POST,PUT,PATCH,DELETE,OPTIONS` | Allowed HTTP methods |
| `CORS_ALLOWED_HEADERS` | `Accept,Authorization,Content-Type` | Allowed request headers |
| `CORS_EXPOSED_HEADERS` | `Link` | Headers exposed to browsers |
| `CORS_ALLOW_CREDENTIALS` | `false` | Allow credentials (rejected with `*` origins) |
| `CORS_MAX_AGE` | `300` | Preflight cache duration in seconds |
