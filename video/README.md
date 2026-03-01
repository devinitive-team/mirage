# Mirage Video (Remotion)

Remotion project for rendering Mirage video assets.

## Current state

- Registers a single composition:
  - `id`: `promo`
  - `size`: `1280x720`
  - `fps`: `30`
  - `duration`: `60` frames
- `src/Composition.tsx` currently returns `null`, so the rendered output is a blank composition until content is added.

## Requirements

- Node.js 22+
- npm

## Local development

```bash
cd video
npm install
npm run dev
```

This opens Remotion Studio.

## Render

```bash
cd video
mkdir -p out
npx remotion render --port=3041 src/index.ts promo out/promo.mp4
```

Default artifact path: `video/out/promo.mp4`.

## Commands

```bash
npm run dev     # remotion studio
npm run build   # remotion bundle
npm run lint    # eslint src && tsc
npm run upgrade # remotion upgrade
```

## Task shortcuts

From repo root:

```bash
task video:install
task video:dev
task video:build
task video:lint
task video:compositions
task video:render
task video:validate
task render
```

From `video/`:

```bash
task install
task dev
task build
task lint
task compositions
task render
```
