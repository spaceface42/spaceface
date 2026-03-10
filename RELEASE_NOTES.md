# Release Notes

## 2026-03-10

### vNext Frontend Contract Alignment And SlidePlayer Port

- **Authored Source Rename**: Consolidated authored frontend sources under `docs.src/`, with generated output continuing to build into `docs/`.
- **Build/Serve Script Refresh**: Replaced obsolete router-era validation and server scripts with the current vNext `verify:docs`, `serve:docs`, and core contract checks.
- **App Entrypoint Move**: Moved the composition root to `src/app/main.ts` and aligned build tooling to bundle that entrypoint.
- **Markup Contract Cleanup**: Removed legacy bridge selectors from authored HTML/CSS and standardized vNext feature mounting on `data-feature="..."`.
- **Floating Images Contract Update**: `FloatingImagesFeature` now uses its feature mount root as the container and item selection is standardized on `data-floating-item`.
- **Page Feature Pause On Screensaver**: Page-level `FloatingImagesFeature` instances now pause while the screensaver is active, while screensaver-owned floating images continue running.
- **Dedicated SlidePlayer Port**: Added `SlidePlayerFeature` with `data-feature="slideplayer"`, dedicated `data-slideplayer-*` controls, bullet navigation, autoplay, and screensaver-aware pause/resume.
- **Regression Coverage Added**: Added `bin/vnext-regression-check.mjs` and wired it into `verify:docs` to cover `data-feature` attribute toggling, screensaver pause behavior, and interrupted async floating-images mounts.
- **Contract Documentation Refresh**: Updated README, architecture notes, smoke validation, and implementation notes to match the current vNext HTML/CSS/TypeScript contracts.

## 2026-03-09

### vNext Stability And Lifecycle Hardening

- **Signal Dependency Cleanup**: Fixed `createEffect` subscription lifecycle in `src/core/signals.ts` so dependencies are removed on rerun/destroy, preventing stale reactive subscribers and memory growth.
- **Feature Registry Reconciliation**: Upgraded `src/core/feature.ts` to reconcile `data-feature` attribute changes (not just node add/remove), so feature mount/unmount now correctly follows runtime attribute toggles.
- **Duplicate Mount Prevention (First Screensaver Run Flicker)**: Reworked active-instance tracking to a per-node/per-feature-id map, eliminating duplicate feature mounts that caused first-run screensaver floating-item flicker.
- **Selector Contract Alignment**: Standardized `ScreensaverFeature.selector` to `"screensaver"` to match the `data-feature="..."` registry contract.
- **Runtime Logging Hygiene**: Removed direct `console.*` calls from feature runtime paths (`slideshow`, `screensaver`, `main`) and kept console output centralized through `src/core/logger.ts`.
- **Logger Typecheck Fix**: Removed stale `./events.js` dependency from `src/core/logger.ts` and replaced it with a local typed sink dispatcher, restoring `npm run typecheck:docs` pass status on vNext.
- **Startup Error Visibility**: Replaced silent startup catch in `src/app/main.ts` with rethrow-on-microtask behavior so boot failures are surfaced instead of swallowed.
