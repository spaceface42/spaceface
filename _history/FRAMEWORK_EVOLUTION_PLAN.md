# Framework Evolution Plan

This document describes how Spaceface could evolve from a repo-specific static-page runtime into a more reusable framework without losing the parts that already make it good.

It is intentionally not a plan to turn Spaceface into:

- a router framework
- a component framework
- a broad reactive app platform
- a legacy compatibility layer

The goal is to make the current runtime easier to reuse across projects while preserving its HTML-first, static-friendly identity.

## Keep These Values

- Authored HTML remains the source of truth.
- `data-feature="..."` remains the activation model.
- Runtime state stays small and explicit.
- Static deployment stays first-class.
- Contracts stay documented and testable.

## Current Read

Today, the most reusable parts of Spaceface are:

- the feature registry and lifecycle model
- the small logging layer
- the activity/signal primitives
- the partial loading and path rebasing model
- the explicit contract and verification discipline

Today, the least reusable parts are:

- the app-first packaging and build shape
- singleton assumptions inside several built-in features
- remaining direct coupling from generic features to screensaver state
- framework-facing APIs that still reflect this repo's internal naming and structure

## Recommended Order

If I were doing this for real, I would do it in this order:

1. Split package boundaries.
2. Publish a stable extension API.
3. Make the registry and features multi-instance and host-scoped.
4. Turn screensaver and editorial pieces into optional modules.
5. Add packaging, examples, migration guides, and compatibility tests.

## Phase 1: Split Package Boundaries

### Goal

Separate "the reusable runtime" from "the example app shipped in this repo".

### Changes

- Treat `src/` as the framework package.
- Treat `app/`, `public/`, `docs/`, and the current build scripts as the example site/app layer.
- Add a real library build output such as `dist/` for the public runtime.
- Build the library from `src/spaceface.ts`, not only the demo app from `app/main.ts`.
- Add package `exports`, generated type declarations, and a documented public entrypoint.

### Deliverables

- A framework build users can install and import.
- An example site that consumes that framework as a client would.
- Clear separation between public API and repo-only internals.

### Success Criteria

- A consumer can import the runtime without depending on `app/`.
- The example site still works without changing the authored HTML model.
- The package can be versioned as a library rather than only as a site repo.

### Notes

This phase should avoid behavior changes. The first win is structural clarity.

## Phase 2: Publish A Stable Extension API

### Goal

Make custom feature authoring a first-class supported workflow.

### Changes

- Decide which runtime primitives are public and export them intentionally.
- Either export core helpers directly or surface them through mount context.
- Prefer `FeatureDefinition.featureId` as the runtime-facing name and remove `selector` once the migration is complete.
- Expand `FeatureMountContext` into a stable service surface rather than only `signal` and `logger`.
- Document how third-party features should be written, mounted, paused, and cleaned up.

### Recommended Public Surface

- feature registry lifecycle
- logger
- activity tracking hooks
- partial loader
- scheduler
- signal primitives, if they are meant to be supported long-term

### Recommended Mount Context Direction

- `signal`
- `logger`
- stable scheduler access
- stable activity/visibility hooks
- stable partial loading utilities
- optional runtime services object for future expansion

### Success Criteria

- A custom feature can be authored without deep-importing internal files.
- Public naming reflects framework concepts instead of repo history.
- Future refactors can happen behind stable public entrypoints.
- The repo includes at least one tiny custom-feature example that uses only the public package surface.

## Phase 3: Make The Runtime Host-Scoped And Multi-Instance

### Goal

Allow Spaceface to mount into one subtree, one widget, or multiple independent areas on the same page.

### Changes

- Let `FeatureRegistry` start on a provided host root instead of hardcoding `document.body`.
- Support multiple registries on the same page.
- Audit built-in features for direct `document` ownership.
- Replace document-level singleton ownership with root-scoped or instance-scoped behavior where possible.
- Make dynamic replacement and re-mounting safe when one instance disappears and another remains.

### Key Refactors

- `FeatureRegistry.start(root)` or equivalent constructor configuration
- root-scoped querying and observation
- root-scoped keyboard handling for interactive features
- instance ownership transfer instead of "first mounted instance wins"

Deliberate exception:

- keep the screensaver singleton contract; not every feature needs to become multi-instance

### Success Criteria

- Two separate Spaceface roots can run on the same page.
- A feature can be removed and re-added without leaving stale global ownership behind.
- Built-in features remain usable even when the page structure becomes more dynamic.

### Important Constraint

This phase should improve composability without turning the runtime into a virtual DOM or SPA shell.

## Phase 4: Turn Screensaver And Editorial Features Into Optional Modules

### Goal

Keep the core runtime small and reusable while preserving the current high-character features.

### Changes

- Treat screensaver behavior as an optional module, not a core runtime assumption.
- Move editorial features such as floating images, portfolio stage, and slideplayer into optional packages or modules.
- Continue replacing direct `screensaverActiveSignal` imports in generic features with a more general pause or visibility service.
- Keep the current example site as the reference integration of these modules.
- Preserve the screensaver itself as a singleton contract even if other features become more composable.

### Module Shape

Possible structure:

- core runtime
- optional screensaver module
- optional editorial/interaction module set
- example app that composes them together

### Success Criteria

- The core runtime is useful even if a project never needs screensavers or editorial motion.
- Projects can opt into the richer modules without inheriting them by default.
- Built-in features become examples of the framework, not the framework's definition.

## Phase 5: Packaging, Examples, Migration, And Compatibility Tests

### Goal

Make adoption practical and safe.

### Changes

- Add a minimal starter example using only the core runtime.
- Keep the current site as the "full editorial example".
- Add a custom feature example owned outside the core repo wiring.
- Add compatibility tests that exercise the public package rather than only repo-local imports.
- Write migration notes for any renamed API such as `selector` to `featureId`.

### Suggested Example Matrix

- minimal static site
- screensaver site
- editorial portfolio site
- embedded widget or host-scoped mount example

### Success Criteria

- A new user can understand where to start in under ten minutes.
- The public package can be tested like a real dependency.
- Breaking changes become easier to manage and communicate.

## Suggested Near-Term Execution Plan

This is the shortest credible path forward:

1. Add a real library build from `src/spaceface.ts`.
2. Keep the current site app intact, but treat it as the first example consumer.
3. Migrate callers to `FeatureDefinition.featureId` and remove `selector` once the migration is complete.
4. Add host-scoped registry startup.
5. Use one built-in feature as the pilot refactor for root-scoped keyboard handling, then apply the pattern to the remaining interactive features.
6. Introduce a generic pause or visibility service and begin migrating features off direct screensaver coupling.
7. Move screensaver and editorial features behind clearer module boundaries.
8. Add a minimal example that uses only the core runtime.

## Decision Gates

After each phase, stop and decide whether the next phase is still worth it.

### Gate After Phase 1

Question: Is the main pain packaging, or is the repo-only shape still acceptable?

### Gate After Phase 2

Question: Are outside custom features now practical, or are more internals still leaking?

### Gate After Phase 3

Question: Do we actually need multi-root and multi-instance support widely, or only for a few features?

### Gate After Phase 4

Question: Is there a real ecosystem or second project to justify package splitting further?

## What Not To Do

- Do not add a router just to look framework-like.
- Do not add a component DSL unless a real product need appears.
- Do not add a broad app state layer on top of the current small-signal model without a concrete use case.
- Do not break the HTML-first authoring model in order to make the internals feel more abstract.
- Do not move fast on package splitting without first clarifying the supported public API.

## Bottom Line

The right future version of Spaceface is not "bigger".

It is:

- more clearly packaged
- more explicit about what is public
- less singleton-driven
- less app-coupled
- easier to embed and extend

That path keeps the strongest parts of the current architecture while making the runtime more reusable across projects.
