# Mirage

### **[🔮 mirage.lukaszgut.com](https://mirage.lukaszgut.com/)**

![photo_2026-03-01 15 02 10](https://github.com/user-attachments/assets/ccb7026b-9057-4980-92f8-0122d40a8122)

AI-powered document search for PDF-heavy workflows. Built during the **Mistral Worldwide Hackathon 2026**.

Upload PDFs, ask questions in plain language, and get answers with page-level evidence — reviewable and traceable. Powered by **PageIndex: Document Index for Vectorless, Reasoning-based RAG**.

## Founders

- [Łukasz Gut](https://github.com/Blinkuu)
- [Kacper Kapuściak](https://github.com/kacperkapusciak)
- [Mateusz Kutyna](https://github.com/KutynaMateusz)

## Repository Layout

| Directory | Description |
|-----------|-------------|
| [`srv/`](srv/README.md) | Go backend API and indexing/retrieval pipeline |
| [`web/`](web/README.md) | React app for upload, query, and evidence review |
| [`marketing/`](marketing/README.md) | Astro marketing site |
| [`email/`](email/README.md) | Hono + Cloudflare Worker for waitlist capture |
| [`video/`](video/README.md) | Remotion project for video assets |
| [`docs/`](docs/README.md) | System-of-record documentation |

## Quick Start

### Prerequisites

- [Go](https://go.dev/) 1.24+
- [Node.js](https://nodejs.org/) 22+
- [Task](https://taskfile.dev/)
- A [Mistral](https://mistral.ai/) API key

### Setup

```bash
cp srv/.env.example srv/.env    # then set MISTRAL_API_KEY
task setup                      # install dependencies
task dev                        # start API + web app
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:2137`.

Run `task help` for the full list of available commands (build, lint, test, codegen, etc.).

## Limitations

- PDF-only ingestion (no other file types yet).
- Single-user MVP — no authentication.
- Local filesystem storage, no encryption at rest.
- Evidence ranges are section/page-level, not text spans.
