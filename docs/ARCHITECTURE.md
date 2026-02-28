# Architecture

This file is the top-level codemap for the project. Update it as modules are added, renamed, or removed.

## Problem Scope

Mirage is a document search system. Users upload PDFs, the system extracts text via OCR, builds a hierarchical index, and answers natural-language questions with deterministic evidence grounded to traversed sections and stored page ranges. Current milestone: MVP with ingestion, indexing, retrieval, and query-to-PDF highlight support via Mistral.

## Codemap

Monorepo with three projects:

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

- `web/src` — React + TanStack (Router, Query, Form, Table) + Vite + Biome.

### `marketing/` — Astro marketing site

- `marketing/src/pages` — Route entrypoints for public marketing pages.
- `marketing/src/styles` — Global and page-level marketing styling.

## Invariants

- Hexagonal architecture: services depend on ports, never on adapters.
- Dependency direction: `cmd → config, api, worker, adapter, service`; `api → service, domain`; `service → port, domain`; `adapter → port, domain`; `domain → nothing`.
- All filesystem writes use write-to-temp-then-rename for crash safety.
- Document processing is asynchronous — upload returns 202, worker processes in background.
- Document status transitions: pending → processing → complete (or failed at any step).
- Internal page ranges are 0-indexed in storage/service layers; API responses convert them to 1-indexed fields.
- TOC-derived page labels are calibrated to physical page offsets before tree ranges are persisted.

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
