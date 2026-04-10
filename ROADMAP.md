# Roadmap

This roadmap tracks only the current static-page runtime.

## Frontend Priorities

1. a simple reset for 2026 / https://pawelgrzybek.com/vertical-rhythm-using-css-lh-and-rlh-units/
2. write the base css vars, layout, tipo

## Current Priorities

1. Keep the `public/` to `docs/` pipeline stable and explicit.
2. Keep DOM feature contracts small and documented.
3. Add tests only where lifecycle, timing, or path rebasing logic can realistically regress.
4. Keep the screensaver shell small and stable while letting authored scenes carry the visual ambition.
5. Land Phase 1 framework packaging so `src/` builds into a reusable `dist/` package without breaking the current site app.

## Next Useful Work

1. Add direct coverage for partial asset rebasing at build time and runtime.
2. Extend partial asset rebasing to cover `srcset` when responsive images are introduced.
3. Add targeted tests for `math-utils.ts` and autoplay timing behavior.
4. Decide whether `PortfolioStageFeature` should eventually broaden beyond the current singleton authored contract. Keyboard handling is already root-scoped; the remaining question is authored semantics and warning strategy.
5. Decide whether the contract manifest should eventually generate more than docs and smoke checks.
6. Explore a screensaver-safe `terminal-scene`: terminal-style message playback with a typewriter effect, authored as a scene inside the screensaver partial instead of coupled into the shell runtime.
7. Keep `FeatureDefinition.featureId` as the only runtime registration field and avoid reintroducing `selector`.
8. Keep package-level compatibility coverage green for the new core/editorial/screensaver package entry shape.
9. Keep the screensaver authored contract singleton-only while other runtime pieces become more reusable.

## Not Planned

1. Reintroducing the old router or PJAX stack.
2. Expanding feature mounting beyond `data-feature="..."`.
3. Turning Spaceface into a general-purpose component framework.
