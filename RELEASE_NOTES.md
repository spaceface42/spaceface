# Release Notes

## 2026-03-05

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
