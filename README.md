# Spaceface

Spaceface is a small TypeScript runtime for static pages authored in `docs.src/`.

The system is intentionally narrow:

- author HTML first
- mount behavior from `data-feature="..."`
- keep runtime state small and local
- generate `docs/` from `docs.src/`

## Source Layout

- Authored pages and partials: `docs.src/`
- Generated site: `docs/`
- Runtime entrypoint: `src/app/main.ts`
- Core runtime primitives: `src/core/`
- DOM features: `src/features/`

## Runtime Model

- `FeatureRegistry` mounts and destroys features from `data-feature="..."`
- the registry reconciles existing DOM, node removal, and `data-feature` attribute changes
- feature mounts may be async; failed mounts are torn down and surfaced
- async feature mounts receive an abort signal so teardown can cancel in-flight work
- `userActivitySignal` tracks last interaction time
- activity tracking currently listens to mouse move, wheel, keydown, pointer down, and visible-tab returns
- `screensaverActiveSignal` pauses page features while the screensaver is active
- `FrameScheduler` runs animated features in update-then-render order

## DOM Contracts

Feature roots:

- `data-feature="slideshow"`
- `data-feature="slideplayer"`
- `data-feature="floating-images"`
- `data-feature="screensaver"`

Feature internals:

- slideshow: `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- slideplayer: `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`
- floating images: `[data-floating-item]`
- screensaver host: `[data-screensaver]`
- screensaver partial mount: `[data-screensaver-partial]`

Page and authored-markup hooks:

- `html[data-mode]`
- `body[data-page]`
- `[data-nav-link]`

## Partial Path Model

Spaceface treats asset URLs inside partial HTML as partial-relative.

- author image, poster, stylesheet, and `data-src` URLs relative to the partial file that contains them
- build-time partial includes rebase those asset URLs into the including page
- runtime-loaded partials rebase those asset URLs before insertion into the document
- avoid root-relative asset URLs when the same build must work on a local server, a custom domain, and GitHub Pages project subpaths

Normal page links are still authored explicitly in the page or partial that owns them.

## Commands

```bash
npm ci
npm run build:dev
npm run build:prod
npm run serve:docs
npm run verify:docs
```

## Validation

Minimum validation before commit:

- `npm run typecheck:docs`
- `npm run build:dev`
- `npm run smoke:docs`

Full verification:

- `npm run verify:docs`

## Scope Limits

- no router or PJAX shell
- no feature-to-feature injection
- no legacy selector compatibility layer

## Related Docs

- [`architecture.md`](/Users/sandorzsolt/Documents/GitHub/spaceface/architecture.md)
- [`RELEASE_NOTES.md`](/Users/sandorzsolt/Documents/GitHub/spaceface/RELEASE_NOTES.md)
- [`ROADMAP.md`](/Users/sandorzsolt/Documents/GitHub/spaceface/ROADMAP.md)
