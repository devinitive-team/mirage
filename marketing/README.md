<img width="1180" height="818" alt="Screenshot 2026-03-01 at 15 14 37" src="https://github.com/user-attachments/assets/1bf5d099-9079-4851-a9e4-3d858acbd553" />

# Mirage Marketing Site (`marketing`)

Astro marketing site for Mirage.

## What This App Does

- Serves the public landing page at `/`.
- Renders hero/proof/workflow/FAQ/final CTA sections.
- Uses a custom waitlist form that posts to the production worker endpoint.
- Routes `Join Waitlist` CTAs to the production Mirage app and forwards inbound attribution params (`utm_*`, `gclid`, `ref`).

## Stack

- Astro 5
- Tailwind CSS 4
- React islands for selected UI interactions

## Prerequisites

- Node.js 22+
- npm

## Quick Start

```bash
cd marketing
npm install
npm run dev
```

Dev server: `http://localhost:4321`.

## Commands

```bash
npm run dev
npm run build
npm run preview
```

Taskfile shortcuts from repo root:

```bash
task marketing:install
task marketing:dev
task marketing:build
```

Taskfile shortcuts from `marketing/`:

```bash
task install
task dev
task build
```

## Production Links

- CTA destination URL is hardcoded in `src/config/site.ts`.
- Waitlist API endpoint URL is hardcoded in `src/config/site.ts`.

## Current Scope

- This project currently has no dedicated lint/test scripts.
- Waitlist form submission uses fetch-based JSON POST in `src/components/landing/email-form.astro`.

## Related Docs

- Root overview: [`../README.md`](../README.md)
- Docs index: [`../docs/README.md`](../docs/README.md)
- Frontend contract: [`../docs/FRONTEND.md`](../docs/FRONTEND.md)
