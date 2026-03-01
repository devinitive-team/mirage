# Mirage

![photo_2026-03-01 15 02 10](https://github.com/user-attachments/assets/ccb7026b-9057-4980-92f8-0122d40a8122)

Built during the **Mistral Worldwide Hackathon 2026**, Mirage is an AI-powered document search system for PDF-heavy workflows.

Mirage lets you upload PDFs, ask questions in plain language, and get answers with page-level evidence so results are reviewable and traceable.

Mirage uses **PageIndex: Document Index for Vectorless, Reasoning-based RAG**.

## Founders

- [Łukasz Gut](https://github.com/Blinkuu)
- [Kacper Kapuściak](https://github.com/kacperkapusciak)
- [Mateusz Kutyna](https://github.com/KutynaMateusz)

## What Mirage Does

- Lets you upload PDFs directly from the dashboard.
- Processes uploaded documents asynchronously (OCR + hierarchical indexing).
- Lets you ask natural-language questions against ready documents in the dashboard.
- Returns answers with deterministic evidence page ranges.
- Supports evidence preview and query history in the web UI.

## Repository Layout

- `srv/` - Go backend API and indexing/retrieval pipeline.
- `web/` - React app for upload, query, and evidence review.
- `marketing/` - Astro marketing site.
- `video/` - Remotion project for video assets.
- `docs/` - system-of-record documentation.

Project-specific READMEs:

- [`srv/README.md`](srv/README.md)
- [`web/README.md`](web/README.md)
- [`marketing/README.md`](marketing/README.md)
- [`video/README.md`](video/README.md)

## Quick Start

### Prerequisites

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/) 22+
- [Task](https://taskfile.dev/)
- A [Mistral](https://mistral.ai/) API key

### 1. Configure backend env

```bash
cp srv/.env.example srv/.env
```

Set at minimum:

```env
MISTRAL_API_KEY=your_key_here
```

### 2. Install dependencies

```bash
task setup
```

### 3. Run app stack (API + web)

```bash
task run
```

Default local endpoints:

- Web app: `http://localhost:3000`
- API health: `http://localhost:2137/health`

If your web app is served from a different origin, configure CORS in `srv/.env`, for example:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Running Sub-Projects

### Marketing site

```bash
task marketing:install
task marketing:dev
```

Runs on `http://localhost:4321` in development.

### Video project

```bash
task video:install
task video:dev
```

Render artifact:

```bash
task video:render
```

## Developer Commands

```bash
task build
task format
task lint
task typecheck
task test
```

OpenAPI/Type generation:

```bash
task codegen
```

## Current Scope and Limitations

- PDF ingestion is implemented; other file types are not part of the current backend ingest API.
- Designed as a single-user/trusted-network MVP (no authentication yet).
- Files are stored on local filesystem storage (no encryption at rest in current implementation).
- CORS is opt-in via environment configuration.
- Evidence ranges are deterministic section/page ranges, not mention-level text spans.

## Documentation

Start with [`docs/README.md`](docs/README.md) for the canonical docs index.
