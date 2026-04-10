# Release Notes

## Unreleased

### Framework Packaging

- Added a generated `dist/` package build from `src/spaceface.ts`, including package exports and declaration output for the public runtime API.
- Split the build commands into explicit site-oriented `build:docs*` and package-oriented `build:lib*` flows, while keeping `build` as the combined entrypoint.
- Documented the reusable-framework path in `FRAMEWORK_EVOLUTION_PLAN.md` and aligned the main docs around the new `dist/` output.
- Added host-root startup for `FeatureRegistry` so the runtime can mount into a provided subtree while the shipped app still starts on `document.body`.
- Recorded that the screensaver remains a deliberate singleton contract for later framework work.
- Refactored `SlidePlayerFeature` keyboard handling to live on the feature root instead of `document`, while preserving duplicate-mount warnings for the current singleton authored contract.
- Refactored `PortfolioStageFeature` keyboard handling to live on the feature root instead of `document`, while preserving duplicate-mount warnings for the current singleton authored contract.
- Added a generic `featurePauseSignal` service, currently backed by the screensaver shell state, and migrated `SlideshowFeature` to depend on it instead of a direct screensaver-state import.
- Migrated runtime registration onto `FeatureDefinition.featureId` and aligned the app runtime definitions around the clearer field name.
- Expanded `FeatureMountContext` with a stable `services` surface for activity, pause, partial loading, and scheduler access.
- Re-exported the supported extension primitives from `src/spaceface.ts`, including signals, partial loading, scheduler access, and shared activity/pause signals.
- Added a tiny public-api custom feature example under `examples/public-api/PauseAwareStatusFeature.ts` and regression coverage proving it mounts without deep imports.
- Updated `SlideshowFeature` to dogfood `context.services.pause.signal` when registry mount context is available, while keeping the shared pause alias as the fallback for direct/manual mounts.
- Updated `ScreensaverFeature` to dogfood `context.services.activity.signal` and `context.services.partials.loadHtml(...)` when registry mount context is available, while keeping the screensaver as the sole owner of `screensaverActiveSignal`.
- Updated `FloatingImagesFeature` to dogfood `context.services.pause.signal` and `context.services.scheduler.frame` when registry mount context is available, while preserving its existing screensaver-owned pause inversion.
- Split the public package surface into a core entry (`src/spaceface.ts`) plus optional `editorial` and `screensaver` module entries, and switched the site app to import built-ins through those boundaries.
- Removed the legacy `FeatureDefinition.selector` runtime alias and aligned the app contract naming around `featureId`.
- Added a true minimal core-only starter under `examples/minimal-core/`, plus a small `serve:root` helper so the example can run against the generated `dist/spaceface.js` bundle without the site app.
- Added `check:package-compat` coverage for the exported `spaceface`, `spaceface/editorial`, and `spaceface/screensaver` entrypoints, including TypeScript consumer compilation and package-name import validation, and folded it into `verify:docs`.

### Public Pages

- Added a progressive startup intro to `public/index.html` with authored `data-startup-*` markup plus a self-contained startup partial under `public/resources/features/startup-sequence/`.
- Simplified the startup intro to one app-owned boot path and restyled it around a full-screen SVG transparency-layer background.
- Added `public/demo3.html` and `public/resources/demo3.css` as a surreal anti-UX landing-page experiment with a third demo route.
- Added `public/demo2.html` and `public/resources/demo2.css` as an even stranger sibling landing-page experiment with its own nav route.
- Removed the original `public/demo.html` landing-page experiment and its dedicated `public/resources/demo.css` stylesheet.
- Removed `public/skeleton.html` and its dedicated `public/resources/spacesuit/skeleton.css` starter stylesheet.
- Added a manual screensaver shortcut: `Ctrl+Shift+.` on all platforms.
- Set the current development screensaver delay to 1 minute.
- Moved the portfolio-stage demo presentation styles out of inline page markup and into `public/resources/spacesuit/features/portfolio-stage.css`.
- Switched the shared site typography over to ArrivalApercuMonoPro.
- Refactored the screensaver into a scene-based idle shell with authored `floating-images` and `attractor` scene partials.
- Added `AttractorSceneFeature` as the editorial scene runtime and switched `demo3.html` back to the shared screensaver shell with `data-screensaver-scene="attractor"` and `data-screensaver-idle-ms="120000"`.

### Runtime Fixes

- Added app-owned `initStartupSequence()` startup wiring with layout-target fallback, click-to-dismiss support, and one app-specific playback path.
- Restored `PortfolioStageFeature` authored DOM state during destroy so `data-feature` deactivation and replacement clean up safely.
- Formalized `portfolio-stage` as a singleton authored contract, with smoke validation for duplicate mounts and a runtime warning on extra instances.
- Formalized `screensaver` as a singleton authored contract, with smoke validation for duplicate mounts and a runtime warning on extra instances.
- Changed portfolio-stage blank-stage click targeting to use live rendered card boxes instead of duplicated slot-position constants.
- Synced the portfolio-stage contract docs to include authored metadata attrs plus runtime-owned filter/slot/wrap attrs.
- Updated `FloatingImagesFeature` so screensaver-owned instances stay paused while the shell is hidden and only animate during active screensaver scenes.
- Delayed screensaver resume so underlying features restart only after the overlay has fully finished fading out.

## 2026-03-12

### Single-Site Rollback

- Removed the dormant multi-site folder layout and restored a single-site source tree.
- Moved app wiring to `app/` and authored pages/assets to `public/`.
- Removed the starter scaffold.
- Repointed build scripts, checks, workspace config, and contract docs to the root `app/` and `public/` paths.
- Stopped ignoring the authored `public/` tree in `.gitignore`.

### Runtime Fixes

- Enforced the one-slideplayer-per-page contract via smoke validation and duplicate keyboard-binding warnings at runtime.
- Decoupled `src/core/partials.ts` from app contract imports by flowing `partialAssetAttributes` through runtime options instead.
- Fixed screensaver hide cleanup timing so teardown waits for `transition-delay + transition-duration`.
- Added `ResizeObserver`-based bounds refresh for `FloatingImagesFeature`, with the existing `window.resize` path kept as fallback.
- Removed the unused app entrypoint debug import.
- Added regression coverage for screensaver hide timing and floating-image container resize handling.

## 2026-03-11

### Baseline Cleanup

- Rebuilt the runtime around a contract-first v4 shape centered on the app contract data, helpers, and runtime registration layer.
- Added `src/spaceface.ts` as the public runtime API so app wiring no longer imports deep `src/` internals directly.
- Removed the unused dependency injection container from the shipped runtime.
- Changed feature registration from class statics to explicit `FeatureDefinition` entries.
- Added feature-scoped loggers to mount context alongside abort signals.
- Added contract-driven smoke coverage and contract-doc sync checks.
- Added `npm run sync:contracts` and `npm run check:contract-docs`.
- Added a minimal starter scaffold while keeping the current build explicit to the shipped site.
- Rewrote the project docs around the current static-page runtime instead of continuing the older transitional narrative.
- Formalized the partial path rule: partial assets are authored relative to the partial file, then rebased when partial markup is included or injected.
- Fixed the screensaver partial to use partial-relative asset paths.
- Fixed `FloatingImagesFeature` cleanup so container inline `position` styles are restored on destroy.
- Added warning-level logging when the screensaver partial fails to load instead of failing silently.
- Prevented failed screensaver partial loads from activating the overlay or shared pause state.
- Made feature mounting explicitly async-safe in the registry and added regression coverage for failed async mounts.
- Added abort-signal support for async feature mounts so long-running mount work can cancel cleanly during teardown.
- Added wheel and visible-tab activity handling to reduce false screensaver activations.
- Added current-page nav highlighting and more robust pointer swipe capture handling.
- Restored `npm run verify:docs` to a passing state by aligning validation with the runtime path model.
