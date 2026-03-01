# Marketing Page Styling Inventory

This document describes the current visual implementation of the public landing page in `marketing/src/pages/index.astro`.
Snapshot date: 2026-03-01.

## Scope

- Route: `/` (Astro page at `marketing/src/pages/index.astro`).
- Sections rendered in order: header, hero, proof strip, workflow, proof cards, FAQ, final CTA, footer.
- Verification sources:
  - Source code in `marketing/src/styles/` and `marketing/src/components/landing/`.
  - Runtime checks with `agent-browser` against `http://localhost:4321`.

## Style System

- Styling stack is Tailwind CSS v4 utilities plus shared tokens in `marketing/src/styles/global.css`.
- Fonts are loaded from Google Fonts:
  - `IBM Plex Sans` (`--font-sans`) for body copy and UI text.
  - `Manrope` (`--font-display`) for headings and primary CTAs.
  - `IBM Plex Mono` (`--font-mono`) for overlines/labels and metric text.
- Base page defaults:
  - Background: `#f4f5f6` (`--bg-0`).
  - Primary text: `#13161c` (`--text-0`).
  - Secondary text: `#3d4651` (`--text-1`).
  - Body line-height: `1.58`.
  - Letter spacing: `0.004em`.

## Visual Direction

- Overall aesthetic is light, technical, and restrained:
  - Neutral grayscale surfaces with dark text.
  - Frequent 1px separators (`border-black/10`) instead of elevated cards.
  - Minimal corner rounding on most layout blocks; stronger rounding reserved for media/overlays.
- Accent color appears mostly in small utility markers, chips, and inline diagram elements, not as large surface fills.
- Visual hierarchy relies on typography scale and spacing, not heavy color contrast blocks.

## Layout And Rhythm

- Global content wrapper pattern: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`.
- Main content vertical framing: `pb-20 pt-8 md:pt-12`.
- Section cadence is consistent with `mt-16` blocks after hero/proof strip.
- Information blocks use dividing lines (`border-y`, `border-t`, `divide-x`, `divide-y`) to create structure without card shadows.

## Section-by-Section Styling

### Header

- Sticky header: `sticky top-0 z-40`.
- Background: semi-transparent white (`bg-white/80`) with `backdrop-blur`.
- Bottom rule: `border-b border-black/10`.
- Brand lockup: inline monochrome SVG mark + `Manrope` wordmark.
- Nav CTA:
  - Label: `Join Waitlist`.
  - Visual style: dark solid button (`bg-slate-900`, white text) with subtle lift on hover (`hover:-translate-y-0.5`).

### Hero

- Overline uses mono uppercase label with short horizontal rules.
- Primary heading is display-heavy (`text-4xl sm:text-5xl lg:text-7xl`, tight tracking) and balanced line wrapping.
- Supporting paragraph uses subdued slate tone (`text-slate-600`, `sm:text-lg`).
- Primary form is embedded ConvertKit markup with site-level overrides:
  - Input and submit button are forced to square corners (`border-radius: 0px` inline styles).
  - Submit button is black with white text.
- Demo media block:
  - Container: rounded 3xl panel with light border and translucent white surface.
  - Animated border sheen via `ShineBorder`.
  - Thumbnail uses rounded 2xl image with hover scale/brightness shift.
  - Centered black translucent “Watch Demo” chip with circular white play icon.

### Proof Strip

- Three-column metric strip on desktop; stacked rows on mobile.
- Uses divider lines and mono metric numerals (`0 tags`, `1 query`, `Page-level`).

### Workflow

- Heading/subheading follow same overline + display title system.
- Three steps in bordered rows.
- Each step pairs descriptive text with custom SVG diagrams styled as technical wireframes:
  - Dashed axes, projection lines, mono annotations, low-opacity fills, thin strokes.
  - Intentional blueprint-like look instead of polished illustration gradients.

### Proof Cards And FAQ

- Both sections use simple bordered list/card patterns with minimal ornament.
- Proof cards use tiny color markers (cyan/emerald/amber/rose) plus numbered mono labels.
- FAQ uses stacked articles separated by top borders.

### Final CTA

- Dominant closing headline (`text-5xl sm:text-6xl lg:text-7xl`, `font-extrabold`) centered on the page.
- Reuses the same ConvertKit form component, centered and width-constrained.

### Footer

- Large low-opacity outlined “Mirage” wordmark in background SVG.
- Foreground footer row keeps compact brand + copyright text.

## Motion And Interaction

- Entry motion is driven by `BlurFade` (`motion/react`) with:
  - small directional offsets (typically 8-10px),
  - short durations (roughly `0.45-0.55s`),
  - blur-to-sharp transitions (`filter: blur(...) -> blur(0)`),
  - staggered delays.
- Hero border shimmer uses custom `animate-shine` keyframes over a radial-gradient mask.
- Video modal behavior:
  - Opens with centered scale animation (`from-center`) and spring transition.
  - Full-screen dark backdrop (`bg-black/80`) with backdrop blur.
  - Escape key and backdrop click close handling.
- Nav CTA behavior:
  - Clicking the top CTA scrolls/focuses the hero email input (instead of navigating away).
  - Input gets temporary highlighted pulse/ring state through data-attribute utility classes.

## Responsive Behavior

- Mobile collapses multi-column regions into stacked flow while preserving border rhythm.
- Typography scales down by Tailwind breakpoints (`sm`, `md`, `lg`) rather than separate mobile-only components.
- ConvertKit form remains full-width-first; larger breakpoints switch to horizontal input/button layout.

## Runtime Verification Artifacts

Generated during the 2026-03-01 inspection with `agent-browser`:

- `docs/generated/marketing-page-desktop-full.png`
- `docs/generated/marketing-page-desktop-annotated.png`
- `docs/generated/marketing-page-mobile-full.png`
- `docs/generated/marketing-page-video-modal-mobile.png`
