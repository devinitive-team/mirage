# Mirage

Universal, relevance search over your PDF documents at any scale. Unbounded by the limits of LLMs context window.

Mirage is an AI-powered document search system using page-index algorithm.

It helps teams find answers inside large sets of PDFs without manually tagging or keyword tuning. You upload documents, Mirage indexes them, and you ask questions in plain language. The system returns answers with page-level evidence so results are verifiable.

In this repository, Mirage is a monorepo with:

- `srv/`: Go backend API for ingestion, OCR/indexing, retrieval, and history.
- `web/`: React app for upload, search, and evidence review.
- `marketing/`: Astro marketing site.
- `video/`: Remotion project for product videos.

## Getting Started

```bash
cp srv/.env.example srv/.env   # fill in your API key
task setup                     # install dependencies
task run                       # start server and frontend
```

The server starts on `:2137` by default (`LISTEN_ADDR`) and the frontend on `:3000`.

If the frontend is served from a different origin than the API, configure CORS in `srv/.env`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Video Project (Remotion)

A dedicated `video/` project is available for generating videos with Remotion.

Get started by running:

```bash
cd video
npm i
npm run dev
```

To render a video, run:

```bash
npx remotion render
```

## Dependencies

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/) 22+
- [Task](https://taskfile.dev/) (task runner)
- A [Mistral](https://mistral.ai/) API key
