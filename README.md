# Spaceface

Spaceface is a small TypeScript runtime for static pages authored in `public/` and generated into `docs/`.

The system stays deliberately narrow:

- author HTML first
- activate behavior from `data-feature="..."`
- keep runtime state small and local
- keep the generated site predictable enough to serve from a local server, a custom domain, or GitHub Pages

## Source Layout

- Authored pages and partials: `public/`
- Generated site: `docs/`
- Site app wiring: `app/`
- Public runtime API: `src/spaceface.ts`
- Shared contract data: `app/contract-data.js`
- TypeScript contract helpers: `app/contract.ts`
- Runtime registration: `app/runtime.ts`
- Runtime entrypoint: `app/main.ts`
- Core runtime primitives: `src/core/`
- DOM features: `src/features/`

Current repo behavior stays explicit: the project ships one authored site in `public/` and one app wiring layer in `app/`.

## Runtime Model

- `FeatureRegistry` mounts and destroys features from `data-feature="..."`
- `app/` imports runtime code through `src/spaceface.ts` instead of deep `src/` paths
- Feature mounts may be async and receive one mount context with `signal` and `logger`
- Failed async mounts are torn down before the error is surfaced
- `userActivitySignal` tracks last interaction time
- `screensaverActiveSignal` pauses page features while the screensaver is active
- The screensaver can also be started manually with `Ctrl+Shift+.` on all platforms
- `FrameScheduler` runs animated features in update-then-render order

## Contract Snapshot

<!-- CONTRACT:README:START -->
### Routes
- `index.html`: `body[data-page="index"]`; features `slideshow`, `floating-images`, `screensaver`
- `skeleton.html`: `body[data-page="skeleton"]`; features `screensaver`
- `slideplayer.html`: `body[data-page="slideplayer"]`; features `slideplayer`, `screensaver`
- `floatingimages.html`: `body[data-page="floatingimages"]`; features `floating-images`, `screensaver`
- `portfoliostage.html`: `body[data-page="portfoliostage"]`; features `portfolio-stage`, `screensaver`

### Feature Hooks
- `slideshow`: root `data-feature="slideshow"`; hooks `[data-slide]`, `[data-slide-prev]`, `[data-slide-next]`
- `slideplayer`: root `data-feature="slideplayer"`; hooks `[data-slideplayer-stage]`, `[data-slideplayer-slide]`, `[data-slideplayer-prev]`, `[data-slideplayer-next]`, `[data-slideplayer-bullets]`, `[data-slideplayer-bullet]`; note: Exactly one slideplayer per page; smoke validation fails duplicates and runtime warns on extra mounts.
- `floating-images`: root `data-feature="floating-images"`; hooks `[data-floating-item]`
- `portfolio-stage`: root `data-feature="portfolio-stage"`; hooks `[data-portfolio-stage-stage]`, `[data-portfolio-stage-item]`, `[data-portfolio-stage-prev]`, `[data-portfolio-stage-next]`, `[data-portfolio-stage-filter]`, `[data-portfolio-stage-current-title]`, `[data-portfolio-stage-current-category]`, `[data-portfolio-stage-current-index]`, `[data-portfolio-stage-current-summary]`, `[data-portfolio-stage-details-toggle]`, `[data-portfolio-stage-details]`; note: Exactly one portfolio-stage per page; smoke validation fails duplicates and runtime warns on extra mounts.
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
