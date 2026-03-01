# Mirage Marketing Site

Astro marketing site for Mirage.

## What this project does

- Serves the main landing page at `/`.
- Renders hero/proof/workflow/FAQ/final CTA sections.
- Uses a Kit (ConvertKit) embedded form for waitlist signup.
- Routes `Join Waitlist` CTAs to `PUBLIC_TRY_FOR_FREE_URL` (defaults to `http://localhost:3000`) and preserves UTM/ref attribution params.

## Tech stack

- Astro 5
- Tailwind CSS 4
- React islands for selected UI components

## Requirements

- Node.js 22+
- npm

## Local development

```bash
cd marketing
npm install
npm run dev
```

Astro dev server runs on `http://localhost:4321` by default.

## Build and preview

```bash
cd marketing
npm run build
npm run preview
```

## Task shortcuts

From repo root:

```bash
task marketing:install
task marketing:dev
task marketing:build
```

From `marketing/`:

```bash
task install
task dev
task build
```

## Environment variables

- `PUBLIC_TRY_FOR_FREE_URL` (optional): Target URL for CTA links. Defaults to `http://localhost:3000`.

## Notes

- There are currently no dedicated lint/test scripts in this sub-project.
- Waitlist form submission is handled by Kit via the embedded form markup in `src/components/landing/email-form.astro`.
