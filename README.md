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

## Feature Behavior

- Boot sequence (`SpacefaceCore`):
1. `initBase()` adds `js-enabled` and resolves `pageType` from `body[data-page]` or URL.
2. `initDomFeatures()` initializes DOM-dependent features (`SlidePlayer`, `FloatingImages`).
3. `initOnceFeatures()` initializes singleton/lifecycle features (`InactivityWatcher`, `ScreensaverController`).

- `FloatingImages`:
1. Uses existing HTML markup (`.floating-images-container` + `.floating-image`) as source of truth.
2. Supports interaction options: `hoverBehavior`, `hoverSlowMultiplier`, `tapToFreeze`.
3. `pauseOnScreensaver` can be set explicitly per page.
4. If omitted, default is page-aware: `true` on `floatingimages` page, `false` elsewhere.

- `ScreensaverController`:
1. Starts on inactivity via `InactivityWatcher`.
2. Emits lifecycle events: `screensaver:shown` and `screensaver:hidden`.
3. `FloatingImagesManager` can listen to those events and pause/resume animation when configured.
