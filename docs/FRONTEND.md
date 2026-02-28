# Frontend

This file specifies the user-facing interface behavior. Update it as UI features are added or changed.

## Stack

React 19, TanStack (Router, Query, Form, Table), Vite, Tailwind CSS, Biome (lint + format).

## Controls

- Document upload: file picker for PDFs.
- Document list: searchable uploaded-file list with row status, per-file delete, multi-select checkboxes, `Delete selected`, and `Delete all` actions.
  Status labels are user-facing: `Uploaded` (backend `pending`), `Processing`, `Ready`, `Failed`.
- Upload and delete actions show non-blocking toast notifications for success and error outcomes.
- Query input: text field for natural-language questions, scoped to selected ready documents (or all ready documents when none are selected).
- Results: fixed-height virtualized evidence cards generated from query responses; each card shows document name, section title, page range, and snippet text, and opens a full PDF preview dialog with page-range highlights on click.

## Render Contract

TBD — layout and component structure to be defined as the UI is built.
