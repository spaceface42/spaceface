# newworlddream

A clean, minimal TypeScript architecture scaffold for a feature-driven frontend system.

## Goals

- Single startup pipeline with per-feature failure isolation.
- One typed event map and one event bus implementation.
- Strict feature lifecycle contract (`init`, `destroy`, optional `onRouteChange`).
- Declarative feature registry with activation conditions.
- Centralized config and logging.

## Structure

- `src/core/events.ts`: typed EventBus + app events.
- `src/core/lifecycle.ts`: feature contracts and startup context.
- `src/core/config.ts`: runtime config parsing/validation.
- `src/core/logger.ts`: environment-aware logger.
- `src/core/registry.ts`: feature registry + activation predicates.
- `src/core/startup.ts`: startup pipeline and teardown.
- `src/features/*`: isolated feature controllers.
- `src/app/main.ts`: composition root.

## How this differs from the existing app

- No scattered init logic per entrypoint: startup is centralized.
- No duplicate contracts: core types are canonical.
- Feature activation is data-driven (route/selector/mode), not hard-coded branching.

## Next build steps

1. Add a dedicated bundler/build script for `newworlddream/src/app/main.ts`.
2. Wire one HTML page with `type="module"` and import the built output.
3. Port one existing feature at a time behind the new `Feature` contract.

## Typecheck this scaffold

```bash
tsc -p newworlddream/tsconfig.json --noEmit
```

## Run demo

```bash
npm run demo:newworlddream
```

Then open:

- `http://127.0.0.1:8787/demo/index.html`

Manual steps:

```bash
npm run build:newworlddream
php bin/start-newworlddream.php
```

## Roadmap

Current status:

1. First-step scaffold is complete.
2. Core architecture is in place (startup pipeline, typed events, lifecycle, registry).
3. Demo features are wired (`slideshow`, `screensaver`) and runnable.

Next steps to reach feature parity with the existing system:

1. Add route-change coordinator with PJAX-ready hooks and safe reactivation.
2. Define partial loading policy (runtime partials vs no-partials production mode).
3. Port production features (`FloatingImages`, `ScrollDeck`) to the new lifecycle contract.
4. Add production logging policy (verbose in dev, gated/minimal in prod).
5. Integrate build/deploy into GitHub Pages workflow.
