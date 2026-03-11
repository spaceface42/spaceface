# Spaceface Architecture

This document describes the current runtime, not the older router-era experiments.

## System Boundary

Spaceface is:

- a static-page runtime
- authored in `sites/spaceface/public/`
- generated into `docs/`
- activated from `data-feature="..."`
- driven by shared contract data in `sites/spaceface/app/contract-data.js`
- separated into a site app layer in `sites/spaceface/` and runtime internals in `src/`

Spaceface is not:

- a router framework
- a component framework
- a feature dependency graph
- a legacy selector compatibility layer

## Boot Flow

The composition root is [`sites/spaceface/app/main.ts`](./sites/spaceface/app/main.ts).

Startup does four things:

1. attach the console log sink
2. apply current nav state
3. start shared activity tracking
4. register and start contract-defined features

`sites/spaceface/app/` reaches runtime code through the public API in [`src/spaceface.ts`](./src/spaceface.ts), not by importing deep internal paths.

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
- Shared contract data: [`sites/spaceface/app/contract-data.js`](./sites/spaceface/app/contract-data.js)
- TypeScript helpers: [`sites/spaceface/app/contract.ts`](./sites/spaceface/app/contract.ts)
- Runtime registration: [`sites/spaceface/app/runtime.ts`](./sites/spaceface/app/runtime.ts)
- Doc sync command: `npm run sync:contracts`

### Routes
- `index.html`: page id `index`; nav id `index`; required hooks `none`; features `slideshow`, `floating-images`, `screensaver`
- `slideplayer.html`: page id `slideplayer`; nav id `slideplayer`; required hooks `[data-slideplayer-stage]`, `[data-slideplayer-bullets]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-slide]`; features `slideplayer`, `screensaver`
- `floatingimages.html`: page id `floatingimages`; nav id `floatingimages`; required hooks `none`; features `floating-images`, `screensaver`

### Features
- `slideshow`: root `data-feature="slideshow"`; internals `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- `slideplayer`: root `data-feature="slideplayer"`; internals `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`; singleton note: One slideplayer per page is the intended authored pattern.
- `floating-images`: root `data-feature="floating-images"`; internals `[data-floating-item]`
- `screensaver`: root `data-feature="screensaver"`; internals `[data-screensaver]`, `[data-screensaver-partial]`

### Partials
- `resources/features/screensaver/index.html`: host hook `[data-screensaver-partial]`; features `floating-images`; required hooks `[data-floating-item]`, `class="screensaver-floating"`

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
- fetches and injects its partial on demand
- aborts in-flight partial loads when activity resumes

The screensaver does not directly instantiate child features. It relies on the registry to see injected `data-feature` markup.

### SlidePlayer

`SlidePlayerFeature` is the image-stage variant.

Deliberate current constraint:

- one slideplayer per page is the intended authored pattern
- document-level keyboard handling is therefore acceptable and kept on purpose

### Floating Images

`FloatingImagesFeature` owns animation state and scheduler subscription only.

It:

- waits for images before full initialization
- pauses on screensaver activity unless the instance lives inside the screensaver
- restores temporary inline styles during teardown

## Non-Goals

- restoring the old router or PJAX shell
- broadening feature activation beyond `data-feature="..."`
- adding framework-shaped abstractions before a concrete product need appears
