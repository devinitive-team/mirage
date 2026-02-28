# Frontend

This file specifies the user-facing interface behavior. Update it as UI features are added or changed.

## Stack

React 19, TanStack (Router, Query, Form, Table), Vite, Tailwind CSS, Biome (lint + format).

## Controls

- Document upload: file picker for PDFs.
- Document list: searchable uploaded-file list with row status, per-file delete, multi-select checkboxes, `Delete selected`, and `Delete all` actions.
- Query input: text field for natural-language questions.
- Results: fixed-height virtualized reference cards generated from uploaded PDFs in the current session; each card shows file name, sampled page-area metadata, and a random visual crop from the source PDF page.

## Render Contract

TBD — layout and component structure to be defined as the UI is built.
