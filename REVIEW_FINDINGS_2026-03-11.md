# Spaceface Runtime Review Findings (March 11, 2026)

## Scope
- Reviewed TypeScript runtime and app entrypoints in:
  - `src/**/*`
  - `sites/spaceface/app/**/*`
  - `sites/starter/app/**/*`
- Validated with:
  - `npm run typecheck:docs` (pass)
  - `npm run check:core` (pass)
  - `npm run check:regressions` (pass)
  - `npm run check:partial-paths` (pass)
  - `npm run build:dev && npm run smoke:docs` (pass)
  - Direct ESLint run on `src` and `sites` (1 warning)

## Findings

### 1) High: SlidePlayer global keyboard handler is per-instance
- Impact: Multiple `slideplayer` instances all respond to one Arrow key press.
- Risk: Duplicate navigation and global keyboard side effects.
- Location:
  - `src/features/slideplayer/SlidePlayerFeature.ts:151`
  - `src/features/slideplayer/SlidePlayerFeature.ts:164`
- Notes:
  - Contract says singleton is intended, but runtime does not enforce singleton behavior.

### 2) High: Core partial loader is coupled to one site contract
- Impact: Shared `src/core` behavior depends on `sites/spaceface` contract data.
- Risk: If starter/other sites diverge in `partialAssetAttributes`, runtime rebasing can be wrong.
- Location:
  - `src/core/partials.ts:1`
- Notes:
  - `src` is used by both `spaceface` and `starter`, so this coupling is architectural debt.

### 3) Medium: Screensaver transition cleanup timing ignores transition-delay
- Impact: Hide cleanup can execute before visual transition fully completes.
- Risk: Flicker/pop or premature teardown timing.
- Location:
  - `src/features/screensaver/ScreensaverFeature.ts:209`
  - `src/features/screensaver/ScreensaverFeature.ts:215`
- Notes:
  - Uses `transitionDuration` only; does not account for `transitionDelay`.

### 4) Medium: FloatingImages bounds can go stale on container-only resizes
- Impact: Movement bounds update only on `window.resize`.
- Risk: Layout shifts not tied to window resize can cause clipping/out-of-bounds motion.
- Location:
  - `src/features/floating-images/FloatingImagesFeature.ts:101`
  - `src/features/floating-images/FloatingImagesFeature.ts:325`
- Notes:
  - Candidate fix: `ResizeObserver` on container (with fallback).

### 5) Low: Lint wrapper is broken on Windows
- Impact: `npm run lint` fails in this environment.
- Risk: Weakens normal quality gate path.
- Location:
  - `bin/lint.mjs:17`
- Observed error:
  - `spawnSync ...\\node_modules\\.bin\\eslint.cmd EINVAL`

### 6) Low: Unused import in app entrypoint
- Impact: Minor hygiene issue.
- Location:
  - `sites/spaceface/app/main.ts:7`
- Notes:
  - `subscribeLogs` is imported but unused.

## Overall Assessment
- The system is not doomed.
- Core architecture is generally solid:
  - Feature lifecycle management with mount/destroy and abort signaling is coherent.
  - Runtime checks/build/smoke/typecheck pass.
- Main risks are:
  - Global input scope (keyboard handling),
  - cross-site coupling in shared core,
  - timing/layout edge cases.

## Suggested Fix Order
1. Fix SlidePlayer keyboard scoping or enforce singleton runtime guard.
2. Decouple `src/core/partials.ts` from site-specific contract import.
3. Correct screensaver transition timing (`delay + duration`).
4. Add container resize observation for FloatingImages.
5. Fix lint wrapper on Windows.
6. Remove unused `subscribeLogs` import.

## Implemented Fix: Core Partial Loader Decoupling

### Problem
- `src/core/partials.ts` imported `sites/spaceface/app/contract.js` directly to read `partialAssetAttributes`.
- This created an architecture violation: shared core runtime depended on a specific site app contract.

### What Was Changed
1. `src/core/partials.ts`
- Removed site-specific import.
- Extended `LoadPartialOptions` with `assetAttributes?: string[]`.
- Updated `loadPartialHtml(...)` to use passed `assetAttributes` for URL rebasing.
- Added attribute normalization and per-attribute-set regex caching.
- Kept a safe fallback default (`src`, `poster`, `data-src`) when no attributes are provided.

2. `src/features/screensaver/ScreensaverFeature.ts`
- Extended `ScreensaverFeatureOptions` with `partialAssetAttributes?: string[]`.
- Passed `partialAssetAttributes` through to `loadPartialHtml(...)`.

3. App runtime wiring
- `sites/spaceface/app/runtime.ts`: passed `APP_CONTRACT.partialAssetAttributes` into `ScreensaverFeature`.
- `sites/starter/app/runtime.ts`: passed `APP_CONTRACT.partialAssetAttributes` into `ScreensaverFeature`.

### Result
- Dependency direction is now correct: app/site config flows into core, not the other way around.
- `src/core` remains reusable across multiple site apps.
- Behavior is explicit and contract-driven per app.

### Validation
- `npm run typecheck:docs` passed.
- `npm run build:dev` passed.
- `npm run smoke:docs` passed.
