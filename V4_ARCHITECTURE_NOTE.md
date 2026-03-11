# Spaceface v4 Architecture Note

This note started as a direction document. The current runtime now implements most of this shape.

The goal for a v4 iteration should be to keep the system small, make the contracts harder to misuse, and avoid adding framework-shaped abstractions before the product actually needs them.

## Keep

- Keep `docs.src/` as the authored source of truth and `docs/` as generated output.
- Keep static pages as the primary delivery model.
- Keep feature activation from `data-feature="..."`.
- Keep feature modules DOM-first, with explicit `mount(...)` and `destroy()` boundaries.
- Keep async work only where real I/O or readiness exists.
- Keep signals small and limited to shared runtime state.
- Keep the scheduler only for features that genuinely animate over time.

## Simplify

### One runtime contract

Make every feature follow the same mount shape:

```ts
mount?(el, context): void | Promise<void>
destroy?(): void
```

Context should stay narrow:

- `signal`
- `logger`

That is enough for cancellation and diagnostics without turning the runtime into a service container.

### One contract manifest

Stop hand-maintaining the same contract details across multiple markdown files.

Introduce one small authored manifest for:

- feature names
- `data-*` attributes
- selector contracts
- singleton assumptions
- route names if they matter to smoke coverage

Then generate the contract sections in docs from that manifest.

### One partial asset pipeline

Keep partial assets partial-relative and keep one shared rebasing utility used by:

- build-time partial inclusion
- runtime partial loading

That logic should remain boring and centralized. It should not be reimplemented in feature code.

### Fewer dormant abstractions

That cleanup is now part of the current runtime: the unused container path is gone.

Unused architecture tends to get defended long after it stops earning its cost.

### Explicit singleton behavior

If a feature is intentionally singleton-like, document that in the contract manifest instead of leaving the assumption in code comments or review knowledge.

That applies to cases like document-level key handling.

## Do Not Build Yet

- No client router.
- No PJAX shell.
- No component system.
- No feature-to-feature dependency graph.
- No global event bus.
- No general application state layer on top of signals.
- No plugin API for third-party features.
- No build-time metaframework around the current static pipeline.

Each of those adds more surface area than this project currently needs.

## Hardening Priorities

If v4 work happens, prioritize these in order:

1. Generate contract docs from a single manifest.
2. Keep regression coverage focused on lifecycle, async aborts, and partial rebasing.
3. Extend partial rebasing to cover `srcset` when responsive images are actually introduced.
4. Remove or demote abstractions that are still unused after real feature work.

## Complexity Triggers

Only add more architecture if one of these becomes true:

- multiple features need the same shared service
- features need coordinated ownership of the same DOM or state
- the site stops being mostly page-driven
- async setup becomes common enough that feature bootstrap needs richer orchestration

Until then, the right shape is still a small static runtime with strict lifecycle rules.

## Practical v4 Standard

If a change makes the runtime harder to explain in one short page, it probably needs a stronger justification.

The system should remain easy to answer with:

- where HTML is authored
- how a feature mounts
- how a feature stops
- what shared state exists
- what happens when async setup fails
