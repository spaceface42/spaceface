# Copilot Instructions for Spaceface

This repository currently has two code lines:

1. Active app source: `src/` (new architecture).
2. Archived legacy app: `oldworld/src/` with legacy assets in `oldworld/docs.src/` and `oldworld/docs/`.

## Active Architecture

- `src/core/*`: startup pipeline, router, event bus, logger, config, shared animation scheduler.
- `src/features/*`: lifecycle-managed feature controllers.
- `src/app/main.ts`: composition root.
- `docs/demo/*`: demo pages.
- `docs/scripts/smoke-check.mjs`: smoke verification script.

## Build and Verify

- Build active app (dev): `npm run build:docs`
- Build active app (prod): `npm run build:docs:prod`
- Verify active app: `npm run verify:docs`
- Run local demo server: `npm run start:docs`

Compatibility aliases may still exist under `*newworlddream*` names.

## Legacy Build

- Legacy prod pjax build: `npm run build:old:prod:pjax`
- Legacy prod build: `npm run build:old:prod`

Legacy outputs are generated in `oldworld/docs/`.

## Conventions

- Keep root `src/` as source of truth for active development.
- Do not add new feature work under `oldworld/` unless explicitly requested.
- Keep generated output (`docs/dist/`, `oldworld/docs/`) out of source edits.
- Prefer event-driven logging (`logger -> event bus -> sink`) over direct console writes in feature code.
