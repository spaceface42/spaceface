# Prioritized Issue List

## P1 - Screensaver can activate after route swap due to uncancelled async idle callback
- **File:** `src/features/screensaver/ScreensaverFeature.ts:158-178`, `src/features/screensaver/ScreensaverFeature.ts:87-136`
- **Risk:** High (user-visible state corruption + wrong lifecycle events)
- **Why:** `onRouteChange()` clears the timeout id, but if the timeout callback already started and is awaiting `prepareScreensaverMarkup()`, it still resumes and can activate screensaver on the new route (`is-active`, `screensaver:shown`, `user:inactive`) even though that idle cycle belongs to the previous route state.
- **Suggested fix:** Add a monotonic generation token (or `AbortController`) per armed timer/route epoch and check it before and after every `await` in the timeout callback. Invalidate token in `onRouteChange()` and `destroy()`.
- **Status:** Fixed in current working tree.

## P2 - In-flight screensaver partial load can write into the wrong target after route change
- **File:** `src/features/screensaver/ScreensaverFeature.ts:181-213`, `src/features/screensaver/ScreensaverFeature.ts:130-133`, `src/features/screensaver/ScreensaverFeature.ts:191`
- **Risk:** Medium (stale async write + inconsistent asset URL normalization)
- **Why:** On route change, `partialLoadPromise` is nulled but not cancelled. When the old promise resolves, it writes into `this.target` (which may now point to a different/new route target). `partialBaseUrl` is captured from old `window.location.href`, so relative image normalization can be incorrect for the new route context.
- **Suggested fix:** Guard partial load with the same generation token as timer activation and/or pass an immutable target reference into load/normalize path, then no-op if target or generation changed.
- **Status:** Fixed in current working tree.

## P2 - Hash-only navigations are intercepted as full SPA route swaps
- **File:** `src/core/router.ts:82-89`, `src/core/router.ts:225-232`, `src/core/router.ts:97`
- **Risk:** Medium (broken anchor UX + unnecessary fetch/cache churn)
- **Why:** The early-return condition requires `url.hash === current.hash`, so same-path hash changes (for example `/page#section`) fall through to SPA `navigate()`. This triggers fetch/swap instead of native in-page anchor behavior and stores separate cache entries per hash (`cacheKey = url.toString()`).
- **Suggested fix:** Special-case same-origin/same-path/same-search + different hash to allow native hash navigation (`location.hash` or default browser behavior) without fetch/swap, and normalize cache keys to exclude hash for document-level route caching.
- **Status:** Fixed in current working tree.
