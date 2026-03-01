# Mirage

Universal, relevance search over your documents at any scale.

Upload PDFs and text documents, and Mirage makes them searchable. Ask questions in plain language and get precise answers with references back to the original pages. It works whether you have ten documents or ten thousand — no manual tagging, no keyword guessing. Just drop your files in and start asking questions.

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
