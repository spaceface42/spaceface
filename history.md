# History

## 2026-03-05

- Fixed screensaver hide behavior during route swap to prevent image flicker/jump before fade-out completes.
- Updated `ScreensaverFeature` teardown flow to preserve pending fade cleanup and avoid immediate floating-image reset during route transitions.
- Added target-aware fade cleanup so the correct screensaver DOM node is cleaned even when route swap replaces the active target.
- Root cause follow-up: screensaver partial used page selectors (`data-floating-images` / `data-floating-item`), which could collide with page-level `FloatingImagesFeature` after route swaps.
- Changed screensaver partial contract to dedicated selectors:
  - root: `data-screensaver-floating`
  - items: `data-screensaver-floating-item`
- Added defensive normalization in `ScreensaverFeature` that removes `data-floating-images` from screensaver floating root to prevent unintended feature activation.
- CSS contract update:
  - Added base sizing support for `data-screensaver-floating-item`.
  - Then split sizing into separate rules so page floating items and screensaver floating items can diverge safely.
- Cleanup decision:
  - Removed legacy screensaver selector fallbacks (`data-floating-images` / `data-floating-item`) from runtime/docs/CSS.
  - System now uses strict screensaver selectors only (`data-screensaver-floating*`).
- Why this matters:
  - prevents dual-binding/dual-animation on screensaver nodes,
  - avoids hide-time flicker caused by competing feature lifecycles,
  - keeps screensaver visual behavior stable across route swaps.

## Ongoing Notes

- Pre-commit check: if code or HTML changes `data-*` attributes, selectors, feature markup contracts, routes, or partial structure, update related documentation files in the same commit (`README.md`, `src/app/documentation.md`, and relevant feature `documentation.md`).
