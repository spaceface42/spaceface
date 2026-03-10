# Roadmap

This file is the forward-looking planning document for the active runtime.

## Current Priorities

1. Keep authored frontend contracts stable:
   - feature roots use `data-feature="..."`
   - feature internals use feature-specific `data-*` only where structure needs to be explicit
2. Expand regression coverage only when new lifecycle-sensitive features are added.
3. Keep logging on the current typed sink dispatcher unless a real multi-sink need appears.

## Later Work

1. Revisit routing only if there is a real product need for route transitions again.
2. Add unit tests around shared math helpers and feature timing logic.
3. Revisit DI only for shared services/tokens first, not feature-to-feature references.

## Not Planned Unless Requirements Change

1. Bringing back the old PJAX/router architecture as-is.
2. Restoring legacy feature activation attributes such as one-off per-feature root selectors.
3. Turning the runtime into a general-purpose component framework.
