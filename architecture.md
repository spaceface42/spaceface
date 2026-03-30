# Spaceface Architecture

This document describes the current runtime, not the older router-era experiments.

## System Boundary

Spaceface is:

- a static-page runtime
- authored in `public/`
- generated into `docs/`
- activated from `data-feature="..."`
- driven by shared contract data in `app/contract-data.js`
- separated into authored markup in `public/`, app wiring in `app/`, and runtime internals in `src/`

Spaceface is not:

- a router framework
- a component framework
- a feature dependency graph
- a legacy selector compatibility layer

## Boot Flow

The current composition root is [`app/main.ts`](./app/main.ts).

Startup does four things:

1. attach the console log sink
2. apply current nav state
3. start shared activity tracking
4. register and start contract-defined features

The app layer reaches runtime code through the public API in [`src/spaceface.ts`](./src/spaceface.ts), not by importing deep internal paths.

Current repo behavior:

- `public/` is the authored site tree
- `docs/` is generated output
- multi-site scaffolding has been removed on purpose

## Core Runtime Pieces

### Feature Registry

The registry in [`src/core/feature.ts`](./src/core/feature.ts) watches `document.body` with one `MutationObserver`.

It handles:

- initial DOM scan
- added nodes
- removed nodes
- `data-feature` attribute changes on existing nodes
- sync and async mount failures, with failed instances torn down before the error is surfaced
- aborting in-flight async mounts during teardown

Each mount receives:

- `signal`
- `logger`

### Signals

The signal layer in [`src/core/signals.ts`](./src/core/signals.ts) is only used for small shared runtime state:

- `userActivitySignal`
- `screensaverActiveSignal`

There is no broader reactive application model on top of it.

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

## Contract Manifest

<!-- CONTRACT:ARCH:START -->
### Source Of Truth
- Shared contract data: [`app/contract-data.js`](./app/contract-data.js)
- TypeScript helpers: [`app/contract.ts`](./app/contract.ts)
- Runtime registration: [`app/runtime.ts`](./app/runtime.ts)
- Doc sync command: `npm run sync:contracts`

### Routes
- `index.html`: page id `index`; nav id `index`; hooks `none`; features `slideshow`, `floating-images`, `screensaver`
- `demo2.html`: page id `demo2`; nav id `demo2`; hooks `none`; features `screensaver`
- `demo3.html`: page id `demo3`; nav id `demo3`; hooks `none`; features `screensaver`
- `slideplayer.html`: page id `slideplayer`; nav id `slideplayer`; hooks required `[data-slideplayer-stage]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-slide]`; optional `[data-slideplayer-bullets]`; features `slideplayer`, `screensaver`
- `floatingimages.html`: page id `floatingimages`; nav id `floatingimages`; hooks `none`; features `floating-images`, `screensaver`
- `portfoliostage.html`: page id `portfoliostage`; nav id `portfoliostage`; hooks required `[data-portfolio-stage-stage]`, `[data-portfolio-stage-item]`, `[data-portfolio-stage-prev]`, `[data-portfolio-stage-next]`; optional `[data-portfolio-stage-filter]`, `[data-portfolio-stage-details-toggle]`, `[data-portfolio-stage-details]`; features `portfolio-stage`, `screensaver`

### Features
- `slideshow`: root `data-feature="slideshow"`; internals `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- `slideplayer`: root `data-feature="slideplayer"`; internals `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`; singleton note: Exactly one slideplayer per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `floating-images`: root `data-feature="floating-images"`; internals `[data-floating-item]`
- `attractor-scene`: root `data-feature="attractor-scene"`; internals `[data-attractor-scene]`, `[data-attractor-scene-layout]`, `[data-attractor-scene-width]`, `[data-attractor-scene-height]`, `[data-attractor-scene-year]`
- `portfolio-stage`: root `data-feature="portfolio-stage"`; internals `[data-portfolio-stage-stage]`, `[data-portfolio-stage-item]`, `[data-portfolio-stage-title]`, `[data-portfolio-stage-category]`, `[data-portfolio-stage-summary]`, `[data-portfolio-stage-prev]`, `[data-portfolio-stage-next]`, `[data-portfolio-stage-filter]`, `[data-portfolio-stage-filter-value]`, `[data-portfolio-stage-slot]`, `[data-portfolio-stage-wrap-enter]`, `[data-portfolio-stage-current-title]`, `[data-portfolio-stage-current-category]`, `[data-portfolio-stage-current-index]`, `[data-portfolio-stage-current-summary]`, `[data-portfolio-stage-details-toggle]`, `[data-portfolio-stage-details]`; singleton note: Exactly one portfolio-stage per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `screensaver`: root `data-feature="screensaver"`; internals `[data-screensaver]`, `[data-screensaver-scene]`, `[data-screensaver-idle-ms]`, `[data-screensaver-partial]`

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
- fetches and injects the authored partial for the selected scene on demand
- resolves the visual scene from `data-screensaver-scene`, defaulting to the configured floating-images scene
- supports per-host idle timing overrides through `data-screensaver-idle-ms`
- can also be started manually with `Ctrl+Shift+.` on all platforms
- aborts in-flight partial loads when activity resumes
- keeps the current scene mounted between activations so repeat starts are instant

The screensaver does not directly instantiate child features. It relies on the registry to see injected `data-feature` markup.

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
- document-level keyboard handling is therefore acceptable and kept on purpose

Residual risk to remember later:

- if the authored contract ever allows dynamic slideplayer replacement or more than one mounted instance, the current singleton keyboard-owner model should be revisited so ownership can transfer cleanly instead of staying with the first instance that bound the document listener

### Portfolio Stage

`PortfolioStageFeature` is the page-level, editorial work navigator.

Deliberate current constraint:

- one portfolio stage per page is the enforced authored pattern
- smoke validation fails duplicate mounts and runtime warns if an extra instance is mounted anyway

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
