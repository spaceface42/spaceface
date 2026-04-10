# Spaceface

Spaceface is a small TypeScript runtime for static pages authored in `public/`, generated into `docs/`, and bundled from `src/` into `dist/` for package-style reuse.

The system stays deliberately narrow:

- author HTML first
- activate behavior from `data-feature="..."`
- keep runtime state small and local
- keep the generated site predictable enough to serve from a local server, a custom domain, or GitHub Pages

## Source Layout

- Authored pages and partials: `public/`
- Generated site: `docs/`
- Generated package build: `dist/`
- Site app wiring: `app/`
- Public core runtime API: `src/spaceface.ts`
- Optional editorial feature API: `src/editorial.ts`
- Optional screensaver API: `src/screensaver.ts`
- Shared contract data: `app/contract-data.js`
- TypeScript contract helpers: `app/contract.ts`
- Runtime registration: `app/runtime.ts`
- Runtime entrypoint: `app/main.ts`
- Core runtime primitives: `src/core/`
- DOM features: `src/features/`

Current repo behavior stays explicit: the project ships one authored site in `public/`, one app wiring layer in `app/`, one core package entry built from `src/spaceface.ts`, and optional package entries built from `src/editorial.ts` and `src/screensaver.ts`.

Feature-authored assets can stay colocated under `public/resources/features/<feature>/`, including partial markup and feature-local CSS.

## Runtime Model

- `FeatureRegistry` mounts and destroys features from `data-feature="..."` within one host root
- Runtime feature definitions use `featureId`
- `app/` imports core runtime code through `src/spaceface.ts` and optional built-ins through `src/editorial.ts` and `src/screensaver.ts`, while app-owned boot wiring stays in `app/`
- The registry can start on a provided host root; the shipped app currently passes `document.body`
- Feature mounts may be async and receive one mount context with `signal`, `logger`, and `services`
- `FeatureMountContext.services` currently exposes `activity.signal`, `pause.signal`, `partials.loadHtml(...)`, and `scheduler.frame`
- Failed async mounts are torn down before the error is surfaced
- `userActivitySignal` tracks last interaction time
- `featurePauseSignal` is the generic pause hook for reusable page features and currently follows the screensaver shell state
- `ScreensaverFeature` is the shared idle shell, and it can load different visual scenes from authored partials
- `screensaverActiveSignal` tracks whether the screensaver shell is active and is exported from `src/screensaver.ts`
- `Ctrl+Shift+.` starts the screensaver shell on all platforms, regardless of which scene the page selects
- `AttractorSceneFeature` is the screensaver-scene runtime: it updates viewport metadata and rotates authored layouts while the shell is active
- `FrameScheduler` runs animated features in update-then-render order

## Contract Snapshot

<!-- CONTRACT:README:START -->
### Routes
- `index.html`: `body[data-page="index"]`; features `slideshow`, `floating-images`, `screensaver`
- `demo2.html`: `body[data-page="demo2"]`; features `screensaver`
- `demo3.html`: `body[data-page="demo3"]`; features `screensaver`
- `slideplayer.html`: `body[data-page="slideplayer"]`; features `slideplayer`, `screensaver`
- `floatingimages.html`: `body[data-page="floatingimages"]`; features `floating-images`, `screensaver`
- `portfoliostage.html`: `body[data-page="portfoliostage"]`; features `portfolio-stage`, `screensaver`

### Feature Hooks
- `slideshow`: root `data-feature="slideshow"`; hooks `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- `slideplayer`: root `data-feature="slideplayer"`; hooks `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`; note: Exactly one slideplayer per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `floating-images`: root `data-feature="floating-images"`; hooks `[data-floating-item]`
- `attractor-scene`: root `data-feature="attractor-scene"`; hooks `[data-attractor-scene]`, `[data-attractor-scene-layout]`, `[data-attractor-scene-width]`, `[data-attractor-scene-height]`, `[data-attractor-scene-year]`
- `portfolio-stage`: root `data-feature="portfolio-stage"`; hooks `[data-portfolio-stage-stage]`, `[data-portfolio-stage-item]`, `[data-portfolio-stage-title]`, `[data-portfolio-stage-category]`, `[data-portfolio-stage-summary]`, `[data-portfolio-stage-prev]`, `[data-portfolio-stage-next]`, `[data-portfolio-stage-filter]`, `[data-portfolio-stage-filter-value]`, `[data-portfolio-stage-slot]`, `[data-portfolio-stage-wrap-enter]`, `[data-portfolio-stage-current-title]`, `[data-portfolio-stage-current-category]`, `[data-portfolio-stage-current-index]`, `[data-portfolio-stage-current-summary]`, `[data-portfolio-stage-details-toggle]`, `[data-portfolio-stage-details]`; note: Exactly one portfolio-stage per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `screensaver`: root `data-feature="screensaver"`; hooks `[data-screensaver]`, `[data-screensaver-scene]`, `[data-screensaver-idle-ms]`, `[data-screensaver-partial]`; note: Exactly one screensaver per page; smoke validation fails duplicates and runtime warns on extra mounts.

### Shared Contracts
- Page hooks: `html[data-mode]`, `body[data-page]`, `[data-nav-link]`
- Activity inputs: `mousemove`, `wheel`, `keydown`, `pointerdown`, `visibilitychange`
- Partial asset attributes rebased at build time and runtime: `src`, `poster`, `data-src`
<!-- CONTRACT:README:END -->

## Commands

```bash
npm ci
npm run build:docs
npm run build:docs:prod
npm run build:lib
npm run build
npm run serve:docs
npm run serve:root
npm run check:package-compat
npm run sync:contracts
npm run verify:docs
```

Build notes:

- `npm run build:docs` builds the authored site into `docs/`
- `npm run build:lib` builds the reusable runtime package into `dist/`
- the package root is the core runtime entry, with optional `editorial` and `screensaver` subpath entries
- `npm run build` builds both the site and the package outputs

## Validation

Minimum validation before commit:

- `npm run typecheck:docs`
- `npm run build:dev`
- `npm run smoke:docs`

Additional contract validation:

- `npm run check:contract-docs`
- `npm run check:package-compat`

Full verification:

- `npm run verify:docs`
  This now builds the library package and verifies the exported `spaceface`, `spaceface/editorial`, and `spaceface/screensaver` entrypoints before the site checks run.

## Custom Feature Example

See [`examples/public-api/PauseAwareStatusFeature.ts`](./examples/public-api/PauseAwareStatusFeature.ts) for a tiny custom feature mounted as `data-feature="public-api-example"`.

It only imports from [`src/spaceface.ts`](./src/spaceface.ts) and uses the supported public surface:

- `Feature` and `FeatureMountContext`
- `createEffect`
- `context.services.activity.signal`
- `context.services.pause.signal`
- `context.services.partials.loadHtml(...)`
- `context.services.scheduler.frame`

## Minimal Core Starter

See [`examples/minimal-core/README.md`](./examples/minimal-core/README.md) for the smallest standalone setup in the repo.

It demonstrates:

- one authored HTML page outside the site app
- one custom `featureId` mounted from `data-feature="counter-card"`
- host-scoped startup through `registry.start(appRoot)`
- imports from the generated core bundle only at `dist/spaceface.js`
- no screensaver or editorial feature dependency

## Scope Limits

- no router or PJAX shell
- no feature-to-feature injection container
- no broad app state layer on top of signals
- no component framework

## Related Docs

- [`architecture.md`](./architecture.md)
- [`FRAMEWORK_EVOLUTION_PLAN.md`](./FRAMEWORK_EVOLUTION_PLAN.md)
- [`FRAMEWORK_EVOLUTION_STATUS.md`](./FRAMEWORK_EVOLUTION_STATUS.md)
- [`V4_ARCHITECTURE_NOTE.md`](./V4_ARCHITECTURE_NOTE.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [`ROADMAP.md`](./ROADMAP.md)
