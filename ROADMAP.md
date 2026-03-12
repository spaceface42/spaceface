# Roadmap

This roadmap tracks only the current static-page runtime.

## Frontend Priorities

1. a simple reset for 2026 / https://pawelgrzybek.com/vertical-rhythm-using-css-lh-and-rlh-units/
2. write the base css vars, layout, tipo

## Current Priorities

1. Keep the `public/` to `docs/` pipeline stable and explicit.
2. Keep DOM feature contracts small and documented.
3. Add tests only where lifecycle, timing, or path rebasing logic can realistically regress.

## Next Useful Work

1. Add direct coverage for partial asset rebasing at build time and runtime.
2. Extend partial asset rebasing to cover `srcset` when responsive images are introduced.
3. Add targeted tests for `math-utils.ts` and autoplay timing behavior.
4. Decide whether the contract manifest should eventually generate more than docs and smoke checks.
5. Explore a screensaver-safe `terminal-saver` feature: terminal-style message playback with a typewriter effect, authored as a separate feature inside the screensaver partial rather than coupled into the screensaver runtime.

## Not Planned

1. Reintroducing the old router or PJAX stack.
2. Expanding feature mounting beyond `data-feature="..."`.
3. Turning Spaceface into a general-purpose component framework.
