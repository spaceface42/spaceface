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
4. Route coordinator is wired (token/abort guarded swaps + post-swap feature reconciliation).
5. One production-style feature port is done (`floating-images`) with lifecycle-safe init/destroy.
6. Partials policy is defined in config (`partialMode`) and defaults to `none` (runtime partials deferred).

Next steps to reach feature parity with the existing system:

1. Port remaining production features (`ScrollDeck`) to the new lifecycle contract.
2. Add production logging policy (verbose in dev, gated/minimal in prod).
3. Integrate build/deploy into GitHub Pages workflow.
4. Revisit runtime partials later only as an optional dev adapter.

## Route Swap Demo

Use links between:

1. `/demo/index.html`
2. `/demo/page2.html`

Both pages share a `data-route-container` region. Navigation swaps only that container and then re-evaluates feature activation through the registry.

## Logging Architecture

`newworlddream` now uses:

1. `logger -> event bus -> sinks`
2. Logger emits typed `log:entry` events.
3. Console output is handled by a sink subscriber (`attachConsoleLogSink`), not by feature code directly.

Runtime control:

1. Default: console sink attaches in `dev`, not in `prod`.
2. Force console sink: set `<html data-log-sink=\"console\">`.
3. Disable console sink: set `<html data-log-sink=\"none\">`.

## Router Hardening Checklist

Use this checklist after route-related changes:

1. Rapidly click internal links and confirm stale responses do not overwrite latest navigation.
2. Use browser back/forward and confirm content + feature activation remain correct.
3. Click a cross-origin link and confirm full browser navigation occurs.
4. Add `data-router=\"off\"` on an internal link and confirm no route interception happens.
5. Click the same URL repeatedly and confirm no-op behavior (no redundant swap work).
