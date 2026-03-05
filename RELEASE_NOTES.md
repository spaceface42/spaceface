# Release Notes

## 2026-03-05

### Architectural Edge-Case Resolutions (v2.0.2)

- **Floating Images One-Dimensional Bounds**: Fixed a critical edge-case drift bug where floating items would sail off-screen infinitely if the container was shrunk below the item size on only one axis (for instance, a very narrow bounding box).
- **Floating Images Bounds**: Fixed a severe mathematical collision where the container shrinking smaller than the images would cause the boundaries to trap images in an infinite oscillation/jitter loop.
- **SEO Route Meta Persistence**: `RouteCoordinator`'s string-cache now explicitly preserves and restores `<meta>` tags and OpenGraph data per-page during PJAX navigation, rather than just `document.title`.
- **Global Error Telemetry**: Added a top-level `window.addEventListener("error")` and `"unhandledrejection"` boundary to `main.ts` to capture and broadcast async timeline crashes.
- **EventBus Traceability**: Modified the internal `EventBus` to dispatch explicit `ErrorEvent`s when listeners crash, ensuring they hit the new global telemetry bounds instead of failing silently.
- **Screensaver DOM Race Condition**: Applied a secondary `.is-active` guard to `stopScreensaverFloating` so delayed fade-out cleanup timers do not inadvertently destroy newly started screensavers if the user frantically wiggles the mouse.
- **Screensaver Fallback Timers**: Converted hardcoded `360ms` CSS transition waits to dynamically parse `getComputedStyle().transitionDuration`, providing a failsafe mechanism that inherently syncs JavaScript with CSS.
- **Partial Cache Exhaustion**: Implemented a maximum size of 10 for the HTML `partialCache` in `core/partials.ts` to prevent unbounded memory growth on long-lived sessions.
- **Interactive State Recovery**: Modified `RouteCoordinator` to sync states *immediately before* navigating, allowing `SlideshowFeature` and `SlidePlayerFeature` to reliably hydrate their exact slide position when a user clicks the Back button.

### Stability And Lifecycle Hardening

- Added shared route-swap helper: `src/core/rebindOnRoute.ts`.
- Applied standardized route rebind handling to:
  - `SlideshowFeature`
  - `SlidePlayerFeature`
  - `FloatingImagesFeature`
- Added `domBound` feature metadata and a dev-time startup warning when a DOM-bound feature has no `onRouteChange`.
- Added lifecycle regression check script: `bin/lifecycle-route-reuse-check.mjs`.
- Wired lifecycle check into `npm run verify:docs`.

### Screensaver Fixes

- Fixed route-swap hide behavior to preserve fade-out cleanup.
- Fixed cleanup targeting so teardown applies to the correct screensaver DOM node after route changes.
- Removed selector collision risk between page floating-images and screensaver floating-images.
- Screensaver partial contract is now strict:
  - root: `data-screensaver-floating`
  - item: `data-screensaver-floating-item`
- Split screensaver item sizing into dedicated CSS rules.

### Docs And Project Cleanup

- Renamed `todo.md` to `history.md` and documented the recent bugfix chain.
- Updated:
  - `README.md`
  - `src/app/documentation.md`
  - `src/features/screensaver/documentation.md`
  - `src/features/slideplayer/documentation.md`
- Removed `newworlddream` script aliases from `package.json`.
