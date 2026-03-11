# Copilot Instructions for Spaceface

Active source of truth:

- runtime code: `src/`
- site app: `sites/spaceface/app/`
- authored frontend: `sites/spaceface/public/`
- generated output: `docs/`

Current runtime shape:

- `src/core/*`: runtime primitives and shared infrastructure
- `src/core/utils/*`: generic utilities
- `src/features/*`: feature implementations
- `src/features/shared/*`: feature-domain shared state
- `src/spaceface.ts`: public runtime API
- `sites/spaceface/app/main.ts`: composition root

Build and verify:

- dev build: `npm run build:dev`
- prod build: `npm run build:prod`
- verify: `npm run verify:docs`
- local server: `npm run serve:docs`

Conventions:

- feature roots mount via `data-feature="..."`
- generated `docs/` output is not authored source
- use `src/core/logger.ts` through `createLogger(...)` instead of direct logging in feature code
