# Mirage Server (`srv`)

Go backend for document ingestion, indexing, query answering, and query history.

## What This Service Does

- Accepts PDF uploads through the REST API.
- Runs OCR + PageIndex building asynchronously in a worker pool.
- Stores document metadata, source PDF, pages, tree index, and query history on local filesystem storage.
- Answers natural-language questions with evidence references.
- Exposes OpenAPI used by the web app for generated TypeScript types.

## Prerequisites

- Go 1.24+
- Mistral API key

## Quick Start

```bash
cd srv
cp .env.example .env
# set MISTRAL_API_KEY in .env

task install
task run
```

Default listen address: `:2137`.

## Commands

CLI:

```bash
go run ./cmd/mirage run      # start HTTP server
go run ./cmd/mirage openapi  # print OpenAPI JSON to stdout
```

Taskfile:

```bash
task install  # go mod download
task build    # build dist/mirage
task run      # go run ./cmd/mirage run (loads .env)
task openapi  # write openapi.json
task test     # go test ./...
task lint     # go vet ./...
task clean    # remove data/
```

## API Endpoints

- `GET /health`
- `POST /api/v1/documents`
- `GET /api/v1/documents`
- `GET /api/v1/documents/{document-id}`
- `GET /api/v1/documents/{document-id}/pdf`
- `GET /api/v1/documents/{document-id}/tree`
- `DELETE /api/v1/documents/{document-id}`
- `POST /api/v1/query`
- `GET /api/v1/history`
- `DELETE /api/v1/history`

## Configuration

Environment variables (see `.env.example`):

- `LISTEN_ADDR` (default `:2137`)
- `MISTRAL_API_KEY` (required)
- `MISTRAL_BASE_URL` (default `https://api.mistral.ai`)
- `MISTRAL_LLM_MODEL` (default `mistral-large-latest`)
- `MISTRAL_OCR_MODEL` (default `mistral-ocr-latest`)
- `DATA_DIR` (default `./data`)
- `WORKER_COUNT` (default `2`)
- `MAX_PAGES_PER_NODE` (default `10`)
- `MAX_TOKENS_PER_NODE` (default `20000`)
- `CORS_ALLOWED_ORIGINS` (empty disables CORS middleware)
- `CORS_ALLOWED_METHODS` (default `GET,POST,PUT,PATCH,DELETE,OPTIONS`)
- `CORS_ALLOWED_HEADERS` (default `Accept,Authorization,Content-Type`)
- `CORS_EXPOSED_HEADERS` (default `Link`)
- `CORS_ALLOW_CREDENTIALS` (default `false`)
- `CORS_MAX_AGE` (default `300`)
- `HISTORY_MAX_ENTRIES` (default `10`)

## Storage Layout

Under `DATA_DIR`:

- `documents/<doc-id>/meta.json`
- `documents/<doc-id>/source.pdf`
- `documents/<doc-id>/pages.json`
- `documents/<doc-id>/tree.json`
- `history.json`

Writes are atomic (temp file + rename).

## Current Scope

- Upload flow is PDF-focused in current API implementation.
- Single-user / trusted-network MVP (no auth yet).

## Validation

```bash
cd srv
task test
task lint
```

## Related Docs

- Root overview: [`../README.md`](../README.md)
- Docs index: [`../docs/README.md`](../docs/README.md)
- Architecture: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
