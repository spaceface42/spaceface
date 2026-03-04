# Spaceface

Spaceface is a small TypeScript runtime for interactive static pages.
Current active runtime lives in `src/` and ships static output to `docs/` from `public.src/`.

## Project Layout

- `src/core/`: framework primitives (event bus, logger, startup pipeline, router, animation scheduler)
- `src/features/`: feature modules (`slideshow`, `floating-images`, `screensaver`)
- `src/app/main.ts`: composition root (register features, startup, lifecycle hooks)
- `public.src/`: source HTML/CSS/assets and build-time partials
- `docs/`: generated static site output
- `docs/dist/`: generated JS bundle output (build artifact)
- `bin/build-public-html.mjs`: build-time partial renderer (`public.src` -> `docs`)
- `bin/smoke-check.mjs`: post-build smoke validation

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
- `SlidePlayerFeature`
  - Active when `[data-slideplayer]` exists.
  - Displays image slides from `[data-slideplayer-image]` with optional local prev/next controls.
  - Autoplay pauses/resumes with screensaver lifecycle.
- `FloatingImagesFeature`
  - Active when `[data-floating-images]` exists.
  - Uses markup as source of truth (`[data-floating-item]` / `.floating-image`).
  - Waits for image readiness through shared `src/core/images.ts` helper (reusable for image slideshows/decks).
  - Uses RAF via shared `AnimationScheduler`.
  - Pauses/resumes on screensaver lifecycle events.
- `ScreensaverFeature`
  - Auto-creates host `[data-screensaver]` when missing.
  - Runtime-generated host:
    ```html
    <div data-screensaver="true" aria-hidden="true" hidden></div>
    ```
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

Build pipeline summary:

1. `npm run build:html` renders `public.src` into fully static `docs` (partials are replaced).
2. `npm run build:js:dev` or `npm run build:js:prod` writes bundle to `docs/dist/main.js`.
3. Local server serves `docs/` root.

## GitHub Actions

- `.github/workflows/ci.yml`
  - Typecheck, lint, build, and docs smoke checks on `main` and `codex/**` branches + pull requests.
- `.github/workflows/pages.yml`
  - On push to `main`, builds production static site (`public.src` -> `docs` + JS bundle), assembles Pages artifact from `docs/`, minifies HTML, and deploys.
  - The deployed site is built in CI from source; local build output is not required in git.

## Notes

- `docs/` is generated and can be rebuilt from source at any time.
- HTML/CSS source of truth is `public.src/`; production artifact is generated in `docs/`.
- Build-time partial syntax in `public.src`: `<link rel="partial" href="./resources/spacesuit/partials/footer.html" />`.
- Route swaps update HTML and title only; scripts in swapped markup are not auto-executed.
- Set `data-mode="prod"` on `<html>` to silence dev logging defaults.
- For screensaver partials, image URLs in partial HTML resolve relative to the current page URL.
