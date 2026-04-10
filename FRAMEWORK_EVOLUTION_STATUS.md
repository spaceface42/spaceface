# Framework Evolution Status

This note captures where the framework-evolution work stands on the repo right now, what is already done, and what should happen next so the work can resume cleanly later.

## Current Working State

- Branch: `codex/framework-phase1`
- Status: work is in progress and not yet committed on this branch
- Latest full validation run passed:
  - `npm run typecheck:docs`
  - `npm run build:lib`
  - `npm run build:dev`
  - `npm run smoke:docs`
  - `npm run verify:docs`

## Agreed Constraints

- The screensaver must remain a deliberate singleton contract.
- In the current runtime, only the screensaver pauses features.
- `featurePauseSignal` stays as an abstraction alias, not as a second independent pause source.
- `public/` remains the authored HTML source of truth.
- `docs/` remains generated output.

## What Is Already Done

### 1. Packaging And Repo Boundary Work

- Added a real library build from `src/spaceface.ts` into `dist/`.
- Added package exports and generated type declarations.
- Separated site-oriented and library-oriented build commands.
- Reframed the repo as framework plus example app, not only one site with internals.

### 2. Runtime Reuse Improvements

- `FeatureRegistry` can now start on an explicit host root instead of being hardcoded to `document.body`.
- `SlidePlayerFeature` keyboard handling is now root-scoped instead of document-scoped.
- `PortfolioStageFeature` keyboard handling is now root-scoped instead of document-scoped.
- The screensaver singleton constraint was preserved and documented during that work.

### 3. API Cleanup

- `FeatureDefinition.featureId` is now the only runtime-facing registration field.
- The legacy runtime `selector` alias has been removed.
- The app runtime definitions and contract naming now use `featureId`.
- Regression coverage exists for `featureId` validation and selector rejection.

### 4. Extension API Work

- `FeatureMountContext` now exposes a stable `services` surface:
  - `activity.signal`
  - `pause.signal`
  - `partials.loadHtml(...)`
  - `scheduler.frame`
- `src/spaceface.ts` now re-exports the supported extension primitives:
  - signal helpers
  - partial loading
  - scheduler exports
  - activity and pause signals
- A tiny custom feature example exists in `examples/public-api/PauseAwareStatusFeature.ts`.
- Regression coverage proves the example can mount using only the public API.
- `SlideshowFeature` now dogfoods `context.services.pause.signal` when registry mount context is available.
- `ScreensaverFeature` now dogfoods `context.services.activity.signal` and `context.services.partials.loadHtml(...)` when registry mount context is available.
- `FloatingImagesFeature` now dogfoods `context.services.pause.signal` and `context.services.scheduler.frame` when registry mount context is available.

### 5. Optional Module Boundaries

- `src/spaceface.ts` is now the core package entry.
- `src/editorial.ts` groups the optional editorial built-ins.
- `src/screensaver.ts` groups the optional screensaver shell and scene runtime.
- The site app now imports built-ins through those module boundaries instead of the root entry alone.

## Near-Term Plan Status

From the near-term execution plan in `FRAMEWORK_EVOLUTION_PLAN.md`:

- Done: add a real library build from `src/spaceface.ts`
- Done: keep the current site app intact as the first example consumer
- Done: migrate callers to `FeatureDefinition.featureId`
- Done: add host-scoped registry startup
- Done: apply root-scoped keyboard handling to the main interactive pilot features
- Done: dogfood the `FeatureMountContext.services` surface across representative built-in features without changing the single screensaver-owned pause model
- Started: move screensaver and editorial features behind clearer module boundaries
- Done: add a minimal example that uses only the core runtime
- Done: add package-level compatibility coverage for the core/editorial/screensaver package entry shape

## Current State And Remaining Work

### 1. Built-In Services Dogfooding Baseline

This pass is now done for the representative built-ins:

- `SlideshowFeature` reads from `context.services.pause.signal` when registry context is present
- `ScreensaverFeature` reads from `context.services.activity.signal` and `context.services.partials.loadHtml(...)` when registry context is present
- `FloatingImagesFeature` reads from `context.services.pause.signal` and `context.services.scheduler.frame` when registry context is present

Important guardrail:

- direct/manual mounts still fall back to the shared runtime defaults, so current site behavior remains intact

### 2. Runtime Naming Is Now Settled

The runtime registration API now uses `featureId` only:

- `FeatureDefinition.selector` has been removed
- app contract feature entries now use `featureId`
- route and partial manifests now use `featureIds`

### 3. Move Screensaver And Editorial Features Behind Clearer Module Boundaries

This is the largest remaining framework step.

Likely shape:

- keep the core runtime small
- treat screensaver behavior as an optional module
- treat editorial features such as `floating-images`, `slideplayer`, and `portfolio-stage` as optional modules or grouped exports
- keep the current site as the reference composition of those modules

Important constraint:

- the screensaver stays singleton-only even if module boundaries become cleaner

Current first slice:

- root exports are now core-focused
- optional package entries exist for editorial and screensaver features
- the current site already consumes those new boundaries internally

### 4. Add A Minimal Core-Only Example

This is now done:

- `examples/minimal-core/` is now the smallest standalone starter in the repo
- it uses one authored HTML page and one custom `featureId`
- it imports from the generated core runtime bundle only
- it does not depend on screensaver or editorial modules

It is now the simplest “start here” example for future reuse.

### 5. Add Package-Level Compatibility Coverage

This is now done:

- `check:package-compat` exercises `spaceface`, `spaceface/editorial`, and `spaceface/screensaver`
- the check validates both package-name imports and TypeScript consumer compilation
- `verify:docs` now includes this package-level coverage automatically

This closes the last planned package-surface gap from the evolution plan.

### 6. Keep The Pause Model Narrow

This should happen only where it genuinely improves reuse.

Current outcome:

- no second pause driver was introduced
- the screensaver remains the only pause source
- screensaver-specific behavior is still explicit where it is truly screensaver-owned

## Recommended Next Session Starting Point

If continuing tomorrow or next week, start here:

1. No required framework-evolution step is currently outstanding from the plan.
2. If continuing, treat any next work as optional polish:
   - refine package docs further
   - add an external-consumer fixture only if publish-time issues appear
   - smooth any remaining boundary rough edges without reopening the core/screensaver/editorial split
3. Keep the screensaver shell singleton-only if any follow-up refactors happen.

## Practical Definition Of “Plan Complete”

The evolution plan is effectively complete when all of the following are true:

- the runtime package is buildable and documented
- the public API is intentionally named and documented
- custom features can be authored from the public package without deep imports
- host-scoped mounting works
- the main reusable interactive features no longer depend on document-level ownership
- the screensaver singleton remains explicit and intact
- core runtime and optional/editorial features have clearer boundaries
- the repo contains both:
  - a tiny custom feature example
  - a true minimal core-only starter example

Current verdict:

- the evolution plan is now effectively complete

## Resume Reminder

The current work is still sitting as local branch changes on `codex/framework-phase1`, not as a committed checkpoint yet.
