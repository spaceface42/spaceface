# Spaceface

Spaceface is a small TypeScript runtime for interactive static pages.
Current active runtime lives in `src/` and ships a demo from `docs/demo/`.
Legacy code is preserved in `oldworld/`.

## Project Layout

- `src/core/`: framework primitives (event bus, logger, startup pipeline, router, animation scheduler)
- `src/features/`: feature modules (`slideshow`, `floating-images`, `screensaver`)
- `src/app/main.ts`: composition root (register features, startup, lifecycle hooks)
- `docs/demo/`: demo HTML pages (`index.html`, `page2.html`)
- `docs/dist/`: generated JS bundle output (build artifact)
- `docs/scripts/smoke-check.mjs`: post-build smoke validation
- `oldworld/`: previous architecture kept for reference/migration

## Runtime Model

1. `main.ts` resolves runtime config from DOM (`html[data-mode]`).
2. `FeatureRegistry` activates features by selector presence.
3. `StartupPipeline` initializes features with failure isolation (one feature error does not abort startup).
4. `RouteCoordinator` intercepts same-origin links and swaps `data-route-container` content.
5. Features reconcile on route changes (removed DOM => feature teardown, added DOM => feature init).

## Features

- `SlideshowFeature`
  - Active when `[data-slideshow]` exists.
  - Global controls via `slideshow:next` / `slideshow:prev` events.
- `FloatingImagesFeature`
  - Active when `[data-floating-images]` exists.
  - Uses markup as source of truth (`[data-floating-item]` / `.floating-image`).
  - Waits for image readiness through shared `src/core/images.ts` helper (reusable for image slideshows/decks).
  - Uses RAF via shared `AnimationScheduler`.
  - Pauses/resumes on screensaver lifecycle events.
- `ScreensaverFeature`
  - Active when `#screensaver` exists.
  - Emits `screensaver:shown` / `screensaver:hidden`.
  - Supports runtime partial content via `partialUrl` (cached fetch); falls back to generated markup if partial fails.
  - Starts/stops its own floating-images instance while visible.

## Build And Run

Prereq:

- Node from `.nvmrc`
- PHP installed (for local static server script)

Install:

```bash
npm ci
```

Development bundle:

```bash
npm run build:dev
```

Production/minified bundle:

```bash
npm run build:prod
```

Local demo server:

```bash
php ./bin/start-server.php
```

One-command demo (build + serve):

```bash
npm run build:dev && php ./bin/start-server.php
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run verify:docs
```

## GitHub Actions

- `.github/workflows/ci.yml`
  - Typecheck, lint, build, and docs smoke checks on `main` and `codex/**` branches + pull requests.
- `.github/workflows/pages.yml`
  - On push to `main`, builds production bundle, assembles Pages artifact from `docs/demo` + `docs/dist`, minifies HTML, and deploys.

## Notes

- `docs/dist/` is generated and ignored in git.
- Route swaps update HTML and title only; scripts in swapped markup are not auto-executed.
- Set `data-mode="prod"` on `<html>` to silence dev logging defaults.
- For screensaver partials, image URLs in partial HTML resolve relative to the current page URL.
