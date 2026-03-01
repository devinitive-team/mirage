# Mirage Video Project (`video`)

Remotion project for rendering Mirage video assets.

## Current State

- Registers one composition:
  - `id`: `promo`
  - `size`: `1280x720`
  - `fps`: `30`
  - `duration`: `60` frames
- `src/Composition.tsx` currently returns `null`, so rendered output is blank until composition content is implemented.

## Prerequisites

- Node.js 22+
- npm

## Quick Start

```bash
cd video
npm install
npm run dev
```

This opens Remotion Studio.

## Commands

NPM scripts:

```bash
npm run dev     # remotion studio
npm run build   # remotion bundle
npm run lint    # eslint src && tsc
npm run upgrade # remotion upgrade
```

Manual render:

```bash
cd video
mkdir -p out
npx remotion render --port=3041 src/index.ts promo out/promo.mp4
```

Taskfile shortcuts from repo root:

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

Taskfile shortcuts from `video/`:

```bash
task install
task dev
task build
task lint
task compositions
task render
```

## Output

- Default render artifact: `video/out/promo.mp4`

## Related Docs

- Root overview: [`../README.md`](../README.md)
- Docs index: [`../docs/README.md`](../docs/README.md)
- Frontend contract: [`../docs/FRONTEND.md`](../docs/FRONTEND.md)
