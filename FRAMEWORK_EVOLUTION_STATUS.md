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

- `FeatureDefinition.featureId` is now the preferred runtime-facing field.
- Legacy `FeatureDefinition.selector` still works as a compatibility alias.
- The app runtime definitions already use `featureId`.
- Regression coverage exists for `featureId` and legacy `selector` compatibility.

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

## Near-Term Plan Status

From the near-term execution plan in `FRAMEWORK_EVOLUTION_PLAN.md`:

- Done: add a real library build from `src/spaceface.ts`
- Done: keep the current site app intact as the first example consumer
- Done: migrate callers to `FeatureDefinition.featureId`
- Done: add host-scoped registry startup
- Done: apply root-scoped keyboard handling to the main interactive pilot features
- Started: introduce a generic pause service and begin migrating features off direct screensaver coupling
- Not done: move screensaver and editorial features behind clearer module boundaries
- Not done: add a minimal example that uses only the core runtime

## What Still Needs To Be Done To Finish The Plan

### 1. Dogfood `FeatureMountContext.services` In A Shipped Built-In Feature

Recommended first move:

- update `SlideshowFeature` to read from `context.services.pause.signal` instead of importing pause state directly
- optionally read `activity.signal` or `scheduler.frame` only if it improves clarity
- keep the behavior unchanged: only the screensaver should still control pause

Why this matters:

- it validates the public extension API inside real shipped runtime code, not only in the example feature

### 2. Decide The Long-Term Fate Of `selector`

There is still one open compatibility decision:

- keep `FeatureDefinition.selector` permanently as a legacy alias
- or remove it later after the migration settles

This does not block ongoing framework work, but it should be decided before calling the public API fully stable.

### 3. Move Screensaver And Editorial Features Behind Clearer Module Boundaries

This is the largest remaining framework step.

Likely shape:

- keep the core runtime small
- treat screensaver behavior as an optional module
- treat editorial features such as `floating-images`, `slideplayer`, and `portfolio-stage` as optional modules or grouped exports
- keep the current site as the reference composition of those modules

Important constraint:

- the screensaver stays singleton-only even if module boundaries become cleaner

### 4. Add A Minimal Core-Only Example

The repo now has a tiny custom-feature example, but it still needs a true minimal starter that shows:

- a small authored HTML page
- one custom feature mounted from `data-feature="..."`
- only the core runtime and public package API
- no screensaver or editorial feature dependency

This should become the simplest “start here” example for future reuse.

### 5. Add Package-Level Compatibility Coverage

The runtime is already checked heavily through repo-local imports.

Still useful to add later:

- a compatibility test that exercises the package entry as a real dependency surface
- possibly a tiny example build that imports from the package-style entry only

### 6. Continue Pause Decoupling Carefully

This should happen only where it genuinely improves reuse.

Recommended order:

- `SlideshowFeature`
- then possibly `FloatingImagesFeature`
- leave screensaver-specific behavior explicit where it is truly screensaver-owned

Guardrail:

- do not introduce any second pause driver unless there is a real product need

## Recommended Next Session Starting Point

If continuing tomorrow or next week, start here:

1. Update `SlideshowFeature` to consume `context.services.pause.signal` instead of importing pause state directly.
2. Add or update regression coverage so the feature still pauses only when the screensaver pause alias changes.
3. Re-run `npm run verify:docs`.
4. Then decide whether to:
   - continue the same pattern into `FloatingImagesFeature`
   - or switch to module-boundary work if the extension API already feels stable enough

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

## Resume Reminder

The current work is still sitting as local branch changes on `codex/framework-phase1`, not as a committed checkpoint yet.
