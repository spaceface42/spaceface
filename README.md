# Spaceface

Spaceface is a small TypeScript runtime for static pages authored in `docs.src/` and generated into `docs/`.

The system stays deliberately narrow:

- author HTML first
- activate behavior from `data-feature="..."`
- keep runtime state small and local
- keep the generated site predictable enough to serve from a local server, a custom domain, or GitHub Pages

## Source Layout

- Authored pages and partials: `docs.src/`
- Generated site: `docs/`
- Shared contract data: `src/app/contract-data.js`
- TypeScript contract helpers: `src/app/contract.ts`
- Runtime registration: `src/app/runtime.ts`
- Runtime entrypoint: `src/app/main.ts`
- Core runtime primitives: `src/core/`
- DOM features: `src/features/`

## Runtime Model

- `FeatureRegistry` mounts and destroys features from `data-feature="..."`
- Feature mounts may be async and receive one mount context with `signal` and `logger`
- Failed async mounts are torn down before the error is surfaced
- `userActivitySignal` tracks last interaction time
- `screensaverActiveSignal` pauses page features while the screensaver is active
- `FrameScheduler` runs animated features in update-then-render order

## Contract Snapshot

<!-- CONTRACT:README:START -->
### Routes
- `index.html`: `body[data-page="index"]`; features `slideshow`, `floating-images`, `screensaver`
- `slideplayer.html`: `body[data-page="slideplayer"]`; features `slideplayer`, `screensaver`
- `floatingimages.html`: `body[data-page="floatingimages"]`; features `floating-images`, `screensaver`

### Feature Hooks
- `slideshow`: root `data-feature="slideshow"`; hooks `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- `slideplayer`: root `data-feature="slideplayer"`; hooks `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`; note: One slideplayer per page is the intended authored pattern.
- `floating-images`: root `data-feature="floating-images"`; hooks `[data-floating-item]`
- `screensaver`: root `data-feature="screensaver"`; hooks `[data-screensaver]`, `[data-screensaver-partial]`

### Shared Contracts
- Page hooks: `html[data-mode]`, `body[data-page]`, `[data-nav-link]`
- Activity inputs: `mousemove`, `wheel`, `keydown`, `pointerdown`, `visibilitychange`
- Partial asset attributes rebased at build time and runtime: `src`, `poster`, `data-src`
<!-- CONTRACT:README:END -->

## Commands

```bash
npm ci
npm run build:dev
npm run build:prod
npm run serve:docs
npm run sync:contracts
npm run verify:docs
```

## Validation

Minimum validation before commit:

- `npm run typecheck:docs`
- `npm run build:dev`
- `npm run smoke:docs`

Additional contract validation:

- `npm run check:contract-docs`

Full verification:

- `npm run verify:docs`

## Scope Limits

- no router or PJAX shell
- no feature-to-feature injection container
- no broad app state layer on top of signals
- no component framework

## Related Docs

- [`architecture.md`](./architecture.md)
- [`V4_ARCHITECTURE_NOTE.md`](./V4_ARCHITECTURE_NOTE.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [`ROADMAP.md`](./ROADMAP.md)
