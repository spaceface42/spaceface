# AGENTS

## Scope

These instructions apply to the whole repository.

## Working Rules

- Use `public.src/` as source of truth for HTML/CSS.
- Treat `public.src/resources/partials/` as source-of-truth partial location.
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
- `src/app/documentation.md`
- relevant feature docs in `src/features/**/documentation.md`
- `tmp.md` when it is being used as the active implementation/reference note

## Feature/CSS Organization

- Keep feature-specific CSS in `public.src/resources/spacesuit/features.css`.
- Keep shared layout/base styles in `public.src/resources/spacesuit/styles.css`.

## Markup/CSS/Script Hygiene

- Avoid inline `<style>` and inline `<script>` in partials unless there is a documented technical reason.
- Prefer centralized styles and runtime code in source files under `public.src/resources/spacesuit/` and `src/`.

## Attribute Registry Rule

- Any new `data-*` attribute introduced in code or HTML must be added to the registry section in `src/app/documentation.md` in the same commit.

## Route Rename Rule

- If route files, route names, or primary links are renamed, update `bin/smoke-check.mjs` in the same commit.

## Route-Swap Feature Rule

- Features that keep DOM references must implement/verify `onRouteChange` identity handling to avoid stale references after route swaps.

## Pre-Commit Minimum Validation

- Run and pass:
  - `npm run typecheck:docs`
  - `npm run build:dev`
  - `npm run smoke:docs`
