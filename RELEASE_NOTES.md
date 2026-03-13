# Release Notes

## Unreleased

### Public Pages

- Added `public/skeleton.html` as a graphic designer portfolio starter page with first-page content prompts and suggested opening copy.
- Added a manual screensaver shortcut: `Ctrl+Shift+.` on all platforms.
- Set the current development screensaver delay to 1 minute.

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
