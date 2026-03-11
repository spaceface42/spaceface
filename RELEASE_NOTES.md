# Release Notes

## 2026-03-11

### Baseline Cleanup

- Rebuilt the runtime around a contract-first v4 shape centered on `src/app/contract.ts` and `src/app/runtime.ts`.
- Removed the unused dependency injection container from the shipped runtime.
- Changed feature registration from class statics to explicit `FeatureDefinition` entries.
- Added feature-scoped loggers to mount context alongside abort signals.
- Added contract-driven smoke coverage and contract-doc sync checks.
- Added `npm run sync:contracts` and `npm run check:contract-docs`.
- Rewrote the project docs around the current static-page runtime instead of continuing the older vNext narrative.
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
