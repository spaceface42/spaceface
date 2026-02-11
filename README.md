# Spaceface

Spaceface is a TypeScript runtime for display-focused web pages.
It provides small, framework-free modules for:

- Event orchestration (`EventBus`, `EventBinder`, `EventWatcher`)
- Feature controllers (`SlidePlayer`, `ScreensaverController`, `FloatingImagesManager`)
- Runtime utilities (`PartialLoader`, `AsyncImageLoader`, `AnimationLoop`, `ResizeManager`, `InactivityWatcher`)

## Architecture

- `src/system/`: reusable runtime and feature modules
- `src/app/`: app entrypoints and boot orchestration
- `src/app/spaceface.core.ts`: shared app core used by all entrypoints

## Entrypoints

- `src/app/main.ts`
Development entry. Runtime partial loading is enabled.

- `src/app/main.pjax.ts`
Production entry with PJAX. Runtime partial loading is disabled because HTML is pre-rendered during build.

- `src/app/main.prod.ts`
Production fallback entry without PJAX.

## Build Pipeline

- JS bundle output: `docs/bin/`
- HTML source: `docs.src/`
- Final site output: `docs/`

`bin/build.js` builds the JS bundle.
`bin/build-html.js` composes HTML from `docs.src` into `docs` and swaps script references to the bundle.

## Build Commands

- `npm run build:dev`
Build TypeScript modules (`tsc`) and pre-render HTML without bundle script swapping.

- `npm run build:prod:pjax`
Build with `main.pjax.ts` and pre-render HTML.

- `npm run build:prod`
Build with `main.prod.ts` and pre-render HTML.

- `npm run build`
Default build (`main.pjax.ts`) and pre-render HTML.

- `npm run typecheck`
Run TypeScript checks without emitting output.

## Notes

- PJAX swaps container `innerHTML`. Scripts inside swapped HTML do not auto-execute.
- If page-specific behavior is required after PJAX navigation, initialize it from the main bundle on `pjax:complete`.
