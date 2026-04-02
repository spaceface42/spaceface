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

Feature-authored assets can stay colocated under `public/resources/features/<feature>/`, including partial markup and feature-local CSS.

## Runtime Model

- `FeatureRegistry` mounts and destroys features from `data-feature="..."`
- `app/` imports shared runtime code through `src/spaceface.ts`, while app-owned boot wiring stays in `app/`
- `initStartupSequence()` is an app-owned progressive DOM enhancement that returns early unless the startup markup contract is present
- Feature mounts may be async and receive one mount context with `signal` and `logger`
- Failed async mounts are torn down before the error is surfaced
- `userActivitySignal` tracks last interaction time
- `screensaverActiveSignal` pauses page features while the screensaver is active
- `ScreensaverFeature` is the shared idle shell, and it can load different visual scenes from authored partials
- `Ctrl+Shift+.` starts the screensaver shell on all platforms, regardless of which scene the page selects
- `AttractorSceneFeature` is the editorial scene runtime: it updates viewport metadata and rotates authored layouts while the shell is active
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

## Startup Sequence

Spaceface keeps its startup enhancer app-owned through `initStartupSequence(options?)`.

Authored DOM contract:

- Root: `[data-startup-sequence]`
- Required startup children: `[data-startup-splash]`, `[data-startup-intro]`
- Layout target: `[data-startup-layout]`, resolved from the startup root first, then `data-layout-target`, then the document-level layout selector
- Optional timing and behavior attrs: `data-delay`, `data-intro-delay`, `data-dismiss-on-click`
- Runtime-owned replay guard: `data-startup-complete="true"`

Minimal class contract:

- `has-startup-lock` on `body` locks scrolling while the intro is active
- `is-startup-active`, `is-startup-intro-visible`, and `is-startup-complete` control the startup root animation states
- `is-startup-layout-hidden` hides the layout until the sequence completes
- `is-hidden` remains available for authored fallback intro markup

Integration points:

- `app/main.ts` calls the app-local `initStartupSequence()` before shared activity tracking and feature registry startup
- `public/index.html` demonstrates the external-layout pattern through `data-layout-target="#app"`
- `public/resources/features/startup-sequence/splash.html` owns the startup markup and links its sibling `startup-sequence.css` so the authored intro stays self-contained
- If any required startup node is missing, the initializer returns `null` without mutating the DOM

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
