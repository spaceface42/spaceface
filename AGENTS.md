# AGENTS

## Scope

These instructions apply to the whole repository.

## Working Rules

- Use `docs.src/` as source of truth for HTML/CSS.
- Treat `docs.src/` as the source-of-truth authored HTML tree.
- Build output in `docs/` is generated; do not treat it as authored source.

## Pre-Commit Documentation Sync (Required)

Before committing, if code or HTML changed any of the following:

- `data-*` attributes
- selector contracts
- feature markup contracts
- route/page names or links
- partial structure/paths

then update documentation in the same commit:

- `README.md`
- `RELEASE_NOTES.md`
- `ROADMAP.md` when roadmap or scope changes
- `vnext_architecture.md` when architectural direction or contracts change

## Feature/CSS Organization

- Keep feature-specific CSS in `docs.src/spacesuit/` when feature-specific styles are added.
- Keep shared layout/base styles in `docs.src/spacesuit/` when shared styles are added.

## Markup/CSS/Script Hygiene

- Avoid inline `<style>` and inline `<script>` in partials unless there is a documented technical reason.
- Prefer centralized styles and runtime code in source files under `docs.src/` and `src/`.

## Attribute Registry Rule

- Any new `data-*` attribute introduced in code or HTML must be reflected in the current contract docs (`README.md` and `vnext_architecture.md`) in the same commit.

## Route Rename Rule

- If route files, route names, or primary links are renamed, update `bin/smoke-check.mjs` in the same commit.

## Route-Swap Feature Rule

- Features that keep DOM references must implement/verify `onRouteChange` identity handling to avoid stale references after route swaps.

## Pre-Commit Minimum Validation

- Run and pass:
  - `npm run typecheck:docs`
  - `npm run build:dev`
  - `npm run smoke:docs`
