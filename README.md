# Spaceface

Spaceface is a lightweight TypeScript runtime for building fast, interactive static pages.

The core philosophy is simple: write static HTML, sprinkle in declarative `data-` attributes, and let the runtime wire up features (like slideshows, floating images, and screensavers) without the overhead of a heavy Virtual DOM framework.

This repository now treats the current `src/` + `docs.src/` system as the baseline architecture.

## Current Structure

- Authored source: `docs.src/`
- Generated output: `docs/`
- Runtime entrypoint: `src/app/main.ts`
- Core primitives: `src/core/`
- Features: `src/features/`

## Runtime Contract

Spaceface uses one generic feature activation scheme:

- feature roots: `data-feature="..."`
- feature-internal parts: feature-specific `data-*` attributes when needed

Current feature roots:

- `data-feature="slideshow"`
- `data-feature="slideplayer"`
- `data-feature="floating-images"`
- `data-feature="screensaver"`

Current feature-internal selectors:

- slideshow slides: `[data-slide]`
- slideplayer controls/slides: `[data-slideplayer-*]`
- floating images items: `[data-floating-item]`

## Commands

```bash
npm ci
npm run build:dev
npm run build:prod
npm run serve:docs
npm run verify:docs
```

## Current Behavior

- `FeatureRegistry` mounts and unmounts features from `data-feature="..."`.
- `ScreensaverFeature` drives global idle state through `screensaverActiveSignal`.
- `SlideshowFeature` and `SlidePlayerFeature` pause while the screensaver is active.
- page-level `FloatingImagesFeature` instances also pause during screensaver activity.

## Out Of Scope

- the old router/PJAX shell
- feature-to-feature injection
- legacy root selector contracts for feature activation

## Project Docs

- [`architecture.md`](/Users/sandorzsolt/Documents/GitHub/spaceface/architecture.md): architecture direction and current system model
- [`RELEASE_NOTES.md`](/Users/sandorzsolt/Documents/GitHub/spaceface/RELEASE_NOTES.md): what changed
- [`ROADMAP.md`](/Users/sandorzsolt/Documents/GitHub/spaceface/ROADMAP.md): what is next
