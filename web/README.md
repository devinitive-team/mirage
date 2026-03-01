# Mirage Web App

Frontend application for uploading documents, running semantic queries, and reviewing evidence.

## What this project does

- Dashboard (`/`):
  - Upload PDF files.
  - Track document indexing status (`pending`, `processing`, `complete`, `failed`).
  - Ask questions against ready documents.
  - Review cited evidence and preview PDF references.
- History (`/history`):
  - Browse saved question/answer history.
  - Inspect evidence for previous queries.
  - Clear saved history.

## Tech stack

- React 19
- TanStack Start + TanStack Router
- TanStack Query
- Vite
- Tailwind CSS 4
- Vitest + Testing Library
- Biome (format/lint/check)

## Requirements

- Node.js 22+
- npm
- Mirage server running on `http://localhost:2137`

## Local development

```bash
cd web
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
npm run test     # run vitest
npm run format   # biome format --write
npm run lint     # biome lint --write
npm run check    # biome check --write
npx tsc --noEmit # typecheck
```

## Task shortcuts

From repo root:

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

From `web/`:

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

## API integration

- API client lives in `src/lib/api.ts`.
- API base URL is currently hardcoded to `http://localhost:2137`.
- `task codegen` regenerates `src/lib/api.gen.ts` from the Go server OpenAPI output.

## Environment variables

- `VITE_POSTHOG_KEY` (optional): Enables PostHog client initialization.
- `VITE_POSTHOG_HOST` (optional): PostHog API host override.
- `VITE_APP_TITLE` (optional): Declared in env schema.
- `SERVER_URL` (optional): Declared in env schema.

