# Frontend

This file specifies the user-facing interface behavior. Update it as UI features are added or changed.

## Stack

Frontend is split across two apps:

- `web/`: React 19, TanStack (Router, Query, Form, Table), Vite, Tailwind CSS, Biome (lint + format).
- `marketing/`: Astro 5 for the public landing site.

## Product App Controls (`web/`)

- Document upload: file picker for PDFs.
- Document list: searchable uploaded-file list with row status, per-file preview, per-file delete, multi-select checkboxes, `Delete selected`, and `Delete all` actions.
  Status labels are user-facing: `Uploaded` (backend `pending`), `Processing`, `Ready`, `Failed`.
- Upload and delete actions show non-blocking toast notifications for success and error outcomes.
- Query input: text field for natural-language questions, scoped to selected ready documents (or all ready documents when none are selected).
- Results: fixed-height virtualized evidence cards generated from query responses; each card shows document name, section title, and page range, and opens a PDF preview dialog on click.
- Preview dialog modes: `Evidence pages` (render only selected pages) and `Whole document` (render entire PDF), both with page-range highlights.

## Marketing Site Contract (`marketing/`)

- Public landing page served from Astro at `http://localhost:4321/` in development.
- Primary conversion CTA label is `Try for free` wherever primary CTA appears.
- Marketing styles are owned in `marketing/src/styles/` and may intentionally differ from `web/` layout while staying brand-aligned.

## Render Contract

- `web/`: interactive document workflow (upload, process, query, evidence preview).
- `marketing/`: static-first conversion flow with optional animated islands.
