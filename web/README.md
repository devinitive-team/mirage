# Mirage Web App (`web`)

React frontend for uploading documents, asking questions, and reviewing evidence.

## What This App Does

- Dashboard (`/`):
  - Upload PDF files.
  - Track indexing status (`pending`, `processing`, `complete`, `failed`).
  - Ask questions against ready documents.
  - Inspect evidence and open PDF previews.
- History (`/history`):
  - Browse saved question/answer history.
  - Inspect evidence references for previous queries.
  - Clear history.

## Stack

- React 19
- TanStack Start + TanStack Router + TanStack Query
- Vite
- Tailwind CSS 4
- Vitest + Testing Library
- Biome

## Prerequisites

- Node.js 22+
- npm
- Mirage backend available at `http://localhost:2137`

## Quick Start

```bash
cd web
npm install
npm run dev
```

Dev server: `http://localhost:3000`.

## Commands

NPM scripts:

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
npm run test     # vitest run
npm run format   # biome format --write
npm run lint     # biome lint --write
npm run check    # biome check --write
npx tsc --noEmit # typecheck
```

Taskfile shortcuts from repo root:

```bash
task web:install
task web:dev
task web:build
task web:test
task web:format
task web:lint
task web:typecheck
task web:check
task web:codegen
```

Taskfile shortcuts from `web/`:

```bash
task install
task dev
task build
task test
task format
task lint
task typecheck
task check
task codegen
```

## API Integration

- API client: `src/lib/api.ts`.
- Current API base URL in client code is hardcoded to `http://localhost:2137`.
- Vite dev server proxies `/api` to `http://localhost:2137`.
- `task codegen` regenerates `src/lib/api.gen.ts` from backend OpenAPI output.

## Environment Variables

- `VITE_POSTHOG_KEY` (optional)
- `VITE_POSTHOG_HOST` (optional)
- `VITE_APP_TITLE` (optional)
- `SERVER_URL` (optional)

## Current Scope

- Product UI is designed around the backend PageIndex-style retrieval + evidence ranges.
- Query evidence uses section/page ranges rather than mention-level text spans.

## Related Docs

- Root overview: [`../README.md`](../README.md)
- Docs index: [`../docs/README.md`](../docs/README.md)
- Frontend contract: [`../docs/FRONTEND.md`](../docs/FRONTEND.md)
