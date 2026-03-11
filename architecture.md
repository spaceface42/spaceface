# Spaceface Architecture

This document describes the current system only. It is not a proposal for reviving older router-era ideas.

## System Boundary

Spaceface is:

- a static-page runtime
- authored in `docs.src/`
- generated into `docs/`
- activated from `data-feature="..."`
- implemented by a small TypeScript runtime in `src/`

Spaceface is not:

- a router framework
- a component framework
- a feature-to-feature dependency graph
- a legacy selector compatibility layer

## Boot Flow

The composition root is [src/app/main.ts](/Users/sandorzsolt/Documents/GitHub/spaceface/src/app/main.ts).

Startup does four things:

1. attach the console log sink
2. start shared activity tracking
3. register feature constructors
4. start the global feature registry

## Core Runtime Pieces

### Feature Registry

The registry in [src/core/feature.ts](/Users/sandorzsolt/Documents/GitHub/spaceface/src/core/feature.ts) watches `document.body` with one `MutationObserver`.

It handles:

- initial DOM scan
- added nodes
- removed nodes
- `data-feature` attribute changes on existing nodes
- sync and async mount failures, with failed instances torn down before the error is surfaced
- aborting in-flight async mounts during teardown

That is the main lifecycle boundary for the whole runtime.

### Signals

The signal layer in [src/core/signals.ts](/Users/sandorzsolt/Documents/GitHub/spaceface/src/core/signals.ts) is used only for small shared state:

- `userActivitySignal`
- `screensaverActiveSignal`

It is intentionally minimal. There is no broader reactive application model on top of it.
Current activity inputs are mouse move, wheel, keydown, pointer down, and visible-tab returns.

### Scheduler

Animated features use [src/core/scheduler.ts](/Users/sandorzsolt/Documents/GitHub/spaceface/src/core/scheduler.ts).

Contract:

- `update(dt)` is for math and reads
- `render()` is for DOM writes

The scheduler isolates failing tasks and keeps healthy tasks running.

### Container

The container in [src/core/container.ts](/Users/sandorzsolt/Documents/GitHub/spaceface/src/core/container.ts) exists for shared services or tokens.

Current reality:

- feature-to-feature injection is blocked
- current shipped features do not depend on injected services yet

## Partial Model

There are two kinds of partial usage:

1. build-time includes through `<link rel="partial" href="...">`
2. runtime-loaded partials through `loadPartialHtml(...)`

Asset path rule:

- partial assets are authored relative to the partial file itself
- build-time includes rebase asset refs into the including file
- runtime loads rebase asset refs against the fetched partial URL before insertion

This keeps the same authored partial working on:

- a local web server
- a custom domain
- a GitHub Pages project subpath

Current rebased attributes:

- `src`
- `poster`
- `data-src`
- stylesheet `href`

Async mount contract:

- feature `mount(...)` may return a promise
- the registry passes an abort signal into mount context
- teardown aborts that signal before destroy so long-running setup can stop promptly

## DOM Contract Surface

Feature roots:

- `data-feature="slideshow"`
- `data-feature="slideplayer"`
- `data-feature="floating-images"`
- `data-feature="screensaver"`

Feature internals:

- slideshow: `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- slideplayer: `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`
- floating images: `[data-floating-item]`
- screensaver: `[data-screensaver]`, `[data-screensaver-partial]`

Page and authored-markup hooks:

- `html[data-mode]`
- `body[data-page]`
- `[data-nav-link]`

## Feature Notes

### Screensaver

The screensaver:

- listens to `userActivitySignal`
- toggles `screensaverActiveSignal`
- fetches and injects its partial on demand
- logs a warning if the partial fails to load

The screensaver does not directly instantiate child features. It relies on the registry to see injected `data-feature` markup.

### Slideshow

`SlideshowFeature` is the simpler rotator. It uses `[data-slide]` items and optional prev/next controls.

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

## Logging

Logging lives in [src/core/logger.ts](/Users/sandorzsolt/Documents/GitHub/spaceface/src/core/logger.ts).

Rules:

- runtime code logs through `createLogger(...)`
- sink attachment happens at startup
- failures should not be silently swallowed if they matter for debugging

## Non-Goals

- restoring the old router or PJAX shell
- broadening feature activation beyond `data-feature="..."`
- adding more architecture before a concrete need appears
