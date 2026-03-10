# Roadmap

This file is the forward-looking planning document for the active vNext runtime.

## Current Priorities

1. Add regression tests for:
   - screensaver pause/resume interactions
   - `data-feature` attribute toggling
   - first-mount / destroy-during-async feature lifecycles
2. Decide whether logging should stay as the current typed sink dispatcher or become a dedicated `LogBus`.
3. Keep authored frontend contracts stable:
   - feature roots use `data-feature="..."`
   - feature internals use feature-specific `data-*` only where structure needs to be explicit

## Later Work

1. Revisit routing only if there is a real product need for route transitions again.
2. Add unit tests around shared math helpers and feature timing logic.
3. Revisit DI only for shared services/tokens first, not feature-to-feature references.

## Not Planned Unless Requirements Change

1. Bringing back the old PJAX/router architecture as-is.
2. Restoring legacy feature activation attributes such as one-off per-feature root selectors.
