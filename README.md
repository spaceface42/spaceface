Spaceface

A proudly overengineered, no-thrills, no-framework TypeScript oddity.
It handles screensavers and partial HTML fetching — because reloading the whole page is so last century.
No React. No clutter. No apologies.
Just handcrafted logic and a sprinkle of cosmic minimalism.

A tiny TypeScript feature library for display-focused web apps (slideshows, screensavers, floating imagery, partial HTML loading and small runtime utilities).

What it provides
Modular utilities: EventBus, EventBinder, EventWatcher, PartialFetcher, AsyncImageLoader, AnimationLoop, ResizeManager, InactivityWatcher.
Feature controllers: SlidePlayer, ScreensaverController, FloatingImagesManager / FloatingImage.
Robust lifecycle helpers: automatic bind/unbind, cancellable/debounced callbacks, safe async init and cleanup.
Why use it
Framework‑agnostic, lightweight building blocks for kiosks, digital signage and single‑page display apps.
Strong TypeScript types and defensive runtime checks for predictable behavior.
Minimizes leaks and race conditions via tracked listeners, safe destroy paths and guarded async flows.
Quick usage
Import the feature you need (e.g. SlidePlayer or ScreensaverController).
Create an instance and await its .ready promise.
Check .initError after awaiting .ready to detect init failures.
Use eventBinder / eventBus for app-level wiring with automatic cleanup.
Elevator pitch
Spaceface is a compact, TypeScript-first toolkit that supplies focused, well-typed utilities and small feature controllers for building resilient display UIs without a full framework — it handles event lifecycles, partial loading, animation loops and image management so you can compose robust progressive features with minimal overhead.

# Code layout

System code (`src/system/`)
- Core runtime utilities (EventBus, EventBinder, EventWatcher, timers, loaders, observers).
- Reusable feature controllers (SlidePlayer, ScreensaverController, FloatingImagesManager).
- Intended to be framework-agnostic building blocks.

App code (`src/app/`)
- App entry points and orchestration.
- Handles boot order, feature registration, and app-level configuration.
- PJAX lives here by design since it depends on app DOM structure and lifecycle.
- Shared core logic lives in `src/app/spaceface.core.ts` and is used by:
  - `src/app/main.ts` (dev/learning)
  - `src/app/main.prod.ts` (production)
  - `src/app/main.pjax.ts` (PJAX-enabled)

# PJAX note

PJAX swaps `innerHTML` for the container and does not execute `<script>` tags in the swapped content. If a page needs scripts, ensure they are part of the main bundle or re-initialized via `pjax:complete`.

# spaceface engine

npm install --save-dev esbuild
node ./bin/build.js

# build targets

By default the build uses `src/app/main.pjax.ts`. To switch entry points:

- `ENTRY=./src/app/main.ts node ./bin/build.js` (dev/learning)
- `ENTRY=./src/app/main.prod.ts node ./bin/build.js` (production)
- `ENTRY=./src/app/main.pjax.ts node ./bin/build.js` (PJAX)

# build commands

- `npm run build:dev` -> `main.ts` + HTML pre-rendering
- `npm run build:prod:pjax` -> `main.pjax.ts` + HTML pre-rendering
- `npm run build:prod` -> `main.prod.ts` + HTML pre-rendering
- `npm run build` -> default build (`main.pjax.ts`) + HTML pre-rendering

# entrypoint strategy

- `src/app/main.ts`: development entry, runtime partial loading enabled.
- `src/app/main.pjax.ts`: production entry with PJAX; runtime partial loading disabled because pages are pre-rendered by the build pipeline.
- `src/app/main.prod.ts`: non-PJAX production fallback/minimal baseline.

# todo

optimize system/features/\*
