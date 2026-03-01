# Frontend

This file specifies the user-facing interface behavior. Update it as UI features are added or changed.

## Stack

Frontend is split across three apps:

- `web/`: React 19, TanStack (Router, Query, Form, Table), Vite, Tailwind CSS, Biome (lint + format).
- `marketing/`: Astro 5 + Tailwind CSS for the public landing site.
- `video/`: Remotion 4 for composition-based video rendering.

For the `web/` app, Tailwind CSS is the default styling system for UI components and layout.
For the `marketing/` app, Tailwind CSS is the default styling system, with shared theme tokens/fonts in `marketing/src/styles/global.css`.
For the `video/` app, use Remotion primitives for timeline-driven visuals and validate changes in Remotion Studio before rendering final artifacts.

## Product App Controls (`web/`)

- Document upload: file picker for PDFs.
- Document list: searchable uploaded-file list with row status, per-file preview, per-file delete, multi-select checkboxes, `Delete selected`, and `Delete all` actions.
  Status labels are user-facing: `Queued` (backend `pending`), `Indexing` (backend `processing`), `Ready` (backend `complete`), `Failed` (backend `failed`).
- Upload and delete actions show non-blocking toast notifications for success and error outcomes.
- Query input: text field for natural-language questions, scoped to selected ready documents (or all ready documents when none are selected).
- Results: evidence cards grouped by document; each group renders a responsive grid of clickable preview tiles (scales from one column up to six columns by viewport), each tile showing a page screenshot and, for multi-page evidence, additional rendered PDF pages stacked behind the first one, and opens the PDF preview on the selected evidence pages.
- Preview dialog modes: `Evidence pages` (render only selected pages) and `Whole document` (render entire PDF), both with page-range highlights.
- Header navigation: route links for `Dashboard` and `History`.
- Route transition motion: dashboard/history route changes cross-fade the main content with fade-out/fade-in animation.
- History page: left panel lists asked questions captured from query responses during the current frontend session; right panel shows the selected question's answer snapshot plus its evidence references.

## Marketing Site Contract (`marketing/`)

- Public landing page served from Astro at `http://localhost:4321/` in development.
- Primary conversion CTA label is currently `Join Waitlist`.
- Waitlist form submits to the production endpoint configured in `marketing/src/config/site.ts` (`https://mirage-email.kapusciak-k.workers.dev/api/waitlist`).
- Landing page supports light and dark themes; initial theme follows `localStorage["mirage-theme"]` or system preference, and the footer toggle persists explicit user choice.
- Marketing page style choices are documented in `docs/design-docs/marketing-page-styling.md`.
- Marketing styles are owned in `marketing/src/styles/` and component-local classes/styles in `marketing/src/components/landing/`; they may intentionally differ from `web/` layout while staying brand-aligned.
- Marketing UI workflow: run `cd marketing && npm run dev`, verify changes with `agent-browser` at `http://localhost:4321`, iterate, then confirm `cd marketing && npm run build` (or `task marketing:build`) passes before handoff.

## Video Workflow Contract (`video/`)

Use a closed loop for every video change:

1. Start Remotion Studio:
   `cd video && npm run dev` (or `task video:dev` from repo root). This opens Studio for interactive composition validation.
2. Make visual/timing changes and validate them directly in Studio timeline playback.
3. Render a deterministic artifact:
   `task video:render` (writes `video/out/promo.mp4`).
4. Evaluate rendered output outside Studio (timing, transitions, text/readability, and visual continuity across the full clip).
5. If anything is off, go back to step 1 and iterate until output matches expectations.

Before handoff for video-related work, run:

- `task video:lint`
- `task video:build`
- `task video:render`

## Render Contract

- `web/`: interactive document workflow (upload, process, query, evidence preview).
- `marketing/`: static-first conversion flow with optional animated islands.
- `video/`: composition-first workflow validated in Studio and finalized through deterministic renders.
