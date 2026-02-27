# Spaceface

Spaceface is a TypeScript runtime for display-focused web pages.
It provides small, framework-free modules for:

- Event orchestration (`EventBus`, `EventBinder`, `EventWatcher`)
- Feature controllers (`SlidePlayer`, `ScreensaverController`, `BaseImageEngine`, `DriftImageEngine`, `RainImageEngine`, `WarpImageEngine`)
- Runtime utilities (`PartialLoader`, `AsyncImageLoader`, `AnimationLoop`, `ResizeManager`, `InactivityWatcher`)

## Architecture

- `src/system/`: reusable runtime and feature modules
- `src/app/`: app entrypoints and startup orchestration
- `src/app/spaceface.core.ts`: shared app core used by all entrypoints
- `src/app/startup.ts`: shared startup flow used by all entry files
- `src/app/config/features.ts`: shared feature presets
- `src/app/dev/devEventLogger.ts`: dev-only event logging helper
- Version source: `package.json` is the single project version source.

## Entrypoints

- `src/app/main.ts`
Development entry. Runtime partial loading is enabled and debug/event logging is enabled on localhost.

- `src/app/main.pjax.ts`
PJAX entry. Runtime partial loading is disabled because HTML is pre-rendered during build.

- `src/app/main.prod.ts`
Production fallback entry without PJAX.

## Build Pipeline

- JS bundle output: `docs/bin/`
- HTML source: `docs.src/`
- Final site output: `docs/` (generated)

`bin/build.js` builds the JS bundle.
`bin/build-html.js` composes HTML from `docs.src` into `docs` and swaps script references to the bundle.
`SITE_BASE` can be set during build (for example `/spaceface`) to prefix generated `href`/`src` paths for project-based GitHub Pages hosting.

GitHub Pages deploys via workflow artifact from generated `docs/`.
`docs/` is treated as build output and is not tracked as source.

## Build Commands

- Node version: use `.nvmrc` (`nvm use`) before install/build.

- `npm run build:dev`
Compile TS modules to `docs.src/spaceface` (`tsc`) and pre-render HTML to `docs` without swapping module scripts to bundle files.

- `npm run build:prod:pjax`
Bundle with `ENTRY=./src/app/main.pjax.ts` and pre-render HTML (bundle script swap enabled).

- `npm run build:prod`
Bundle with `ENTRY=./src/app/main.prod.ts` and pre-render HTML (bundle script swap enabled).

- `npm run build`
Default production bundle build (`main.pjax.ts`) and pre-render HTML.

- `npm run typecheck`
Run TypeScript checks without emitting output.

- `npm run lint`
Run ESLint for `src/` (currently warning-focused).

- `npm run lint:fix`
Run ESLint with auto-fixes where possible.

## Notes

- PJAX swaps container `innerHTML`. Scripts inside swapped HTML do not auto-execute.
- If page-specific behavior is required after PJAX navigation, initialize it from the main bundle on `pjax:complete`.
- For local debug logs, run `npm run build:dev` and serve `docs/` from `localhost` or `127.0.0.1`.

## Feature Behavior

- Boot sequence (`SpacefaceCore`):
1. `initBase()` adds `js-enabled` and resolves `pageType` from `body[data-page]` or URL.
2. `initDomFeatures()` initializes DOM-dependent features (`SlidePlayer`, motion image engines via `floatingImages` feature config).
3. `initOnceFeatures()` initializes singleton/lifecycle features (`InactivityWatcher`, `ScreensaverController`).
4. `InactivityWatcher` is intentionally a singleton: one app-level inactivity source drives one screensaver lifecycle per page.

- `Motion Images` (`floatingImages` config key):
1. Uses existing HTML markup (`.floating-images-container` + `.floating-image`) as source of truth.
2. Supports interaction options: `hoverBehavior`, `hoverSlowMultiplier`, `tapToFreeze`.
3. Animation modes: `drift`, `rain`, `warp`.
4. Engine + image classes are fully separated by mode:
   - `DriftImageEngine` -> `DriftImage`
   - `RainImageEngine` -> `RainImage`
   - `WarpImageEngine` -> `WarpImage`
5. `pauseOnScreensaver` can be set explicitly per page.
6. If omitted, default is page-aware: `true` on `floatingimages`/`motionimages` page, `false` elsewhere.

- `ScreensaverController`:
1. Starts on inactivity via `InactivityWatcher`.
2. Emits lifecycle events: `screensaver:shown` and `screensaver:hidden`.
3. Requires feature config with at least `screensaver.partialUrl`.
4. `screensaver.motionMode` selects `drift`, `rain`, or `warp`.
5. Motion image engines can listen to screensaver events and pause/resume when configured.

### Screensaver config example

```ts
screensaver: {
  delay: 4500,
  partialUrl: 'content/feature/screensaver/index.html',
  motionMode: 'rain', // 'drift' | 'rain' | 'warp'
}
```
