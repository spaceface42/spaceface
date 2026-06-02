# Spaceface Architecture

This document describes the current runtime, not the older router-era experiments.

## System Boundary

Spaceface is:

- a static-page runtime
- authored in `public/`
- generated into `docs/`
- bundled from `src/` into `dist/` for package consumption
- activated from `data-feature="..."`
- driven by shared contract data in `app/contract-data.js`
- separated into authored markup in `public/`, app wiring in `app/`, runtime internals in `src/`, and generated package output in `dist/`

Spaceface is not:

- a router framework
- a component framework
- a feature dependency graph
- a compatibility-first API layer

## Boot Flow

The current composition root is [`app/main.ts`](./app/main.ts).

Startup does four things:

1. attach the console log sink
2. apply current nav state
3. start shared activity tracking
4. register and start contract-defined features

The app layer reaches shared runtime code through the public entries in [`src/spaceface.ts`](./src/spaceface.ts), [`src/editorial.ts`](./src/editorial.ts), and [`src/screensaver.ts`](./src/screensaver.ts), while app-owned boot wiring stays under `app/`.

Current repo behavior:

- `public/` is the authored site tree
- `docs/` is generated output
- `dist/` is the generated package output for the public runtime API
- multi-site scaffolding has been removed on purpose

Current package direction:

- `src/spaceface.ts` is the public core entrypoint
- `src/editorial.ts` is the optional editorial feature entrypoint
- `src/screensaver.ts` is the optional screensaver entrypoint
- the site app still boots from `app/main.ts`
- Phase 1 packaging work keeps the current site intact while making the runtime buildable as a reusable package with clearer optional-module boundaries

## Framework Evolution Completed

The framework-evolution pass is now part of the current architecture rather than an active roadmap item.

- the reusable runtime ships from `dist/`
- the supported public package shape is `spaceface`, `spaceface/editorial`, and `spaceface/screensaver`
- host-scoped registry startup is supported, and regression coverage now proves multiple host roots can coexist on one page
- the screensaver remains the only pause source and a deliberate singleton authored contract
- the older evolution plan and handoff notes now live under `_history/`

## Core Runtime Pieces

### Feature Registry

The registry in [`src/core/feature.ts`](./src/core/feature.ts) watches one host root with one `MutationObserver`.

It handles:

- initial DOM scan
- added nodes
- removed nodes
- `data-feature` attribute changes on existing nodes
- explicit host-root startup through `start(root)`
- sync and async mount failures, with failed instances torn down before the error is surfaced
- aborting in-flight async mounts during teardown
- runtime feature definitions keyed by `featureId`

Current app behavior:

- [`app/main.ts`](./app/main.ts) still starts the registry on `document.body`
- host-root startup makes the runtime easier to embed into a subtree later without changing the current site behavior

Each mount receives:

- `signal`
- `logger`
- `services`

Current stable services surface:

- `services.activity.signal`
- `services.pause.signal`
- `services.partials.loadHtml(...)`
- `services.scheduler.frame`

### Signals

The signal layer in [`src/core/signals.ts`](./src/core/signals.ts) is only used for small shared runtime state:

- `userActivitySignal`
- `screensaverActiveSignal`
- `featurePauseSignal`, currently backed by the screensaver shell state for reusable features that only need pause semantics

There is no broader reactive application model on top of it.

### Extension API

The public core package entry in [`src/spaceface.ts`](./src/spaceface.ts) now re-exports the runtime primitives that custom features are expected to use directly:

- `createSignal(...)` and `createEffect(...)`
- `loadPartialHtml(...)`
- `FrameScheduler` and `globalScheduler`
- `userActivitySignal`
- `featurePauseSignal`

The optional package entries are now:

- [`src/editorial.ts`](./src/editorial.ts) for `SlideshowFeature`, `SlidePlayerFeature`, `FloatingImagesFeature`, and `PortfolioStageFeature`
- [`src/screensaver.ts`](./src/screensaver.ts) for `ScreensaverFeature`, `AttractorSceneFeature`, and `screensaverActiveSignal`

Package-level compatibility coverage now checks all three entrypoints through self-imported package names and TypeScript consumer compilation, so the public runtime surface is exercised as a real package boundary rather than only by repo-local deep paths.

The repo-level custom feature example lives in [`examples/public-api/PauseAwareStatusFeature.ts`](./examples/public-api/PauseAwareStatusFeature.ts) and mounts as `data-feature="public-api-example"`.

The repo also now includes a true core-only starter in [`examples/minimal-core/`](./examples/minimal-core/README.md), which mounts one custom feature from the generated core bundle without depending on any optional editorial or screensaver module.

`SlideshowFeature` is now the first shipped built-in feature to read pause state through `context.services.pause.signal` when mount context is available, while still preserving the shared pause alias as the fallback for direct/manual mounts.

`ScreensaverFeature` now also dogfoods mount-context services by reading activity from `context.services.activity.signal` and fetching scene partials through `context.services.partials.loadHtml(...)` when available, while still remaining the sole owner of `screensaverActiveSignal`.

`FloatingImagesFeature` now also prefers `context.services.pause.signal` and `context.services.scheduler.frame` when mount context is available, while preserving its existing screensaver-owned inversion so floating scenes only animate when the singleton screensaver shell is active.

### Scheduler

Animated features use [`src/core/scheduler.ts`](./src/core/scheduler.ts).

Contract:

- `update(dt)` is for math and reads
- `render()` is for DOM writes

The scheduler isolates failing tasks and keeps healthy tasks running.

### Logging

Logging lives in [`src/core/logger.ts`](./src/core/logger.ts).

Rules:

- startup owns the base logger
- mount context passes a feature-scoped child logger
- failures should not be silently swallowed if they matter for debugging

## Partial Model

There are two kinds of partial usage:

1. build-time includes through `<link rel="partial" href="...">`
2. runtime-loaded partials through `loadPartialHtml(...)`

Asset path rule:

- partial assets are authored relative to the partial file itself
- build-time includes rebase asset refs into the including file
- runtime loads rebase asset refs against the fetched partial URL before insertion
- stylesheet links inside partials follow the same rebasing rule, so feature-local CSS can live beside the partial that owns it
- inline `url(...)` refs inside partial `<style>` blocks follow the same rebasing rule

## Contract Manifest

<!-- CONTRACT:ARCH:START -->
### Source Of Truth
- Shared contract data: [`app/contract-data.js`](./app/contract-data.js)
- TypeScript helpers: [`app/contract.ts`](./app/contract.ts)
- Runtime registration: [`app/runtime.ts`](./app/runtime.ts)
- Doc sync command: `npm run sync:contracts`

### Routes
- `index.html`: page id `index`; nav id `index`; hooks `none`; features `slideshow`, `floating-images`, `screensaver`
- `slideplayer.html`: page id `slideplayer`; nav id `slideplayer`; hooks required `[data-slideplayer-stage]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-slide]`; optional `[data-slideplayer-bullets]`; features `slideplayer`, `screensaver`
- `floatingimages.html`: page id `floatingimages`; nav id `floatingimages`; hooks `none`; features `floating-images`, `screensaver`
- `portfoliostage.html`: page id `portfoliostage`; nav id `portfoliostage`; hooks required `[data-portfolio-stage-stage]`, `[data-portfolio-stage-item]`, `[data-portfolio-stage-prev]`, `[data-portfolio-stage-next]`; optional `[data-portfolio-stage-filter]`, `[data-portfolio-stage-details-toggle]`, `[data-portfolio-stage-details]`; features `portfolio-stage`, `screensaver`

### Features
- `slideshow`: root `data-feature="slideshow"`; internals `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- `slideplayer`: root `data-feature="slideplayer"`; internals `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`; singleton note: Exactly one slideplayer per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `floating-images`: root `data-feature="floating-images"`; internals `[data-floating-item]`
- `attractor-scene`: root `data-feature="attractor-scene"`; internals `[data-attractor-scene]`, `[data-attractor-scene-layout]`, `[data-attractor-scene-width]`, `[data-attractor-scene-height]`, `[data-attractor-scene-year]`
- `portfolio-stage`: root `data-feature="portfolio-stage"`; internals `[data-portfolio-stage-stage]`, `[data-portfolio-stage-item]`, `[data-portfolio-stage-title]`, `[data-portfolio-stage-category]`, `[data-portfolio-stage-summary]`, `[data-portfolio-stage-prev]`, `[data-portfolio-stage-next]`, `[data-portfolio-stage-filter]`, `[data-portfolio-stage-filter-value]`, `[data-portfolio-stage-slot]`, `[data-portfolio-stage-wrap-enter]`, `[data-portfolio-stage-current-title]`, `[data-portfolio-stage-current-category]`, `[data-portfolio-stage-current-index]`, `[data-portfolio-stage-current-summary]`, `[data-portfolio-stage-details-toggle]`, `[data-portfolio-stage-details]`; singleton note: Exactly one portfolio-stage per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `screensaver`: root `data-feature="screensaver"`; internals `[data-screensaver]`, `[data-screensaver-scene]`, `[data-screensaver-idle-ms]`, `[data-screensaver-partial]`; singleton note: Exactly one screensaver per page; smoke validation fails duplicates and runtime warns on extra mounts.

### Partials
- `resources/features/screensaver-scenes/attractor.html`: host hook `[data-screensaver-partial]`; features `attractor-scene`; hooks required `[data-attractor-scene]`, `[data-attractor-scene-layout]`, `[data-attractor-scene-width]`, `[data-attractor-scene-height]`, `[data-attractor-scene-year]`, `class="attractor-scene"`
- `resources/features/screensaver-scenes/floating-images.html`: host hook `[data-screensaver-partial]`; features `floating-images`; hooks required `[data-floating-item]`, `class="screensaver-floating"`

### Shared Rules
- Activity reset inputs: `mousemove`, `wheel`, `keydown`, `pointerdown`, `visibilitychange`
- Rebased partial asset attributes: `src`, `poster`, `data-src`
- Page hooks: `html[data-mode]`, `body[data-page]`, `[data-nav-link]`
<!-- CONTRACT:ARCH:END -->

## Feature Notes

### Screensaver

The screensaver:

- listens to `userActivitySignal`
- toggles `screensaverActiveSignal`
- currently also backs `featurePauseSignal` for reusable page features
- fetches and injects the authored partial for the selected scene on demand
- resolves the visual scene from `data-screensaver-scene`, defaulting to the configured floating-images scene
- supports per-host idle timing overrides through `data-screensaver-idle-ms`
- can also be started manually with `Ctrl+Shift+.` on all platforms
- aborts in-flight partial loads when activity resumes
- keeps the current scene mounted between activations so repeat starts are instant

Singleton constraint:

- the screensaver remains a deliberate singleton authored contract even as the registry becomes more host-scoped and reusable

The screensaver does not directly instantiate child features. It relies on the registry to see injected `data-feature` markup.

### Generic Pause Service

`featurePauseSignal` is the framework-facing pause hook for reusable page features.

It:

- currently maps directly to the screensaver shell state
- lets reusable features depend on generic pause semantics instead of importing screensaver-specific state
- keeps screensaver ownership explicit while allowing future pause drivers to stay behind one shared contract

### Attractor Scene

`AttractorSceneFeature` is the branded editorial scene used inside the screensaver shell.

It:

- rotates authored visual layouts on a timer instead of running a floating-object system
- updates viewport-width, viewport-height, and year labels while mounted
- starts and stops purely from `screensaverActiveSignal` instead of owning idle timing itself
- stays swappable because the shell only depends on scene partial paths, not on attractor-specific logic

### SlidePlayer

`SlidePlayerFeature` is the image-stage variant.

Deliberate current constraint:

- one slideplayer per page is the enforced authored pattern
- smoke validation fails duplicate mounts and runtime warns if an extra instance is mounted anyway
- keyboard handling is scoped to the slideplayer root rather than `document`

Residual risk to remember later:

- if the authored contract broadens later, the remaining work is about authored semantics and runtime warnings, not document-level keyboard ownership

### Portfolio Stage

`PortfolioStageFeature` is the page-level, editorial work navigator.

Deliberate current constraint:

- one portfolio stage per page is the enforced authored pattern
- smoke validation fails duplicate mounts and runtime warns if an extra instance is mounted anyway
- keyboard handling is scoped to the portfolio-stage root rather than `document`

It:

- keeps one active project in a large stage
- supports direct prev/next navigation plus filters
- stores authored item metadata on `data-portfolio-stage-title`, `data-portfolio-stage-category`, and `data-portfolio-stage-summary`
- updates text outputs from the active item metadata
- keeps details as an optional secondary layer instead of an always-open text block
- resolves blank-stage click fallbacks from the live rendered card boxes so CSS positioning remains authoritative
- owns transient runtime attrs `data-portfolio-stage-filter-value`, `data-portfolio-stage-slot`, and `data-portfolio-stage-wrap-enter`

### Floating Images

`FloatingImagesFeature` owns animation state and scheduler subscription only.

It:

- waits for images before full initialization
- pauses on screensaver activity when mounted on the page and only runs while the screensaver is active when mounted inside the screensaver shell
- restores temporary inline styles during teardown

## Non-Goals

- restoring the old router or PJAX shell
- broadening feature activation beyond `data-feature="..."`
- adding framework-shaped abstractions before a concrete product need appears
