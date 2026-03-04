# Copilot Instructions for Spaceface

This repository has one active code line:

1. Active app source: `src/`.

## Active Architecture

- `src/core/*`: startup pipeline, router, event bus, logger, config, shared animation scheduler.
- `src/features/*`: lifecycle-managed feature controllers.
- `src/app/main.ts`: composition root.
- `public.src/*`: source demo pages/assets.
- `bin/smoke-check.mjs`: smoke verification script.

## Build and Verify

- Build active app (dev): `npm run build:docs`
- Build active app (prod): `npm run build:docs:prod`
- Verify active app: `npm run verify:docs`
- Run local demo server: `npm run start:docs`

Compatibility aliases may still exist under `*newworlddream*` names.

## Conventions

- Keep root `src/` as source of truth for active development.
- Keep generated output (`docs/dist/`) out of source edits.
- Prefer event-driven logging (`logger -> event bus -> sink`) over direct console writes in feature code.
