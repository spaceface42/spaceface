# Roadmap

This file is the forward-looking planning document for the active runtime.

## Current Priorities

1. Decide whether logging should stay as the current typed sink dispatcher or become a dedicated `LogBus`.
2. Keep authored frontend contracts stable:
   - feature roots use `data-feature="..."`
   - feature internals use feature-specific `data-*` only where structure needs to be explicit
3. Expand regression coverage only when new lifecycle-sensitive features are added.

## Later Work

1. Revisit routing only if there is a real product need for route transitions again.
2. Add unit tests around shared math helpers and feature timing logic.
3. Revisit DI only for shared services/tokens first, not feature-to-feature references.

## Not Planned Unless Requirements Change

1. Bringing back the old PJAX/router architecture as-is.
2. Restoring legacy feature activation attributes such as one-off per-feature root selectors.
3. Turning the runtime into a general-purpose component framework.
