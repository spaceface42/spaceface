# Spaceface TypeScript Codebase Review

This document contains a review of the `src/` TypeScript files in the Spaceface runtime.

## Core Framework Observations

### `AnimationScheduler` (src/core/animation.ts)
- **Reduced Motion Handlers**: When `(prefers-reduced-motion: reduce)` matches, the animation loop stops. This is good for accessibility, but `FloatingImagesFeature` heavily relies on this for positioning. If animations are paused, items might stop mid-screen or not position correctly on resize if `tick` isn't called.
- **Delta time clamping**: `deltaMs` is clamped to 100ms max (`Math.min(now - this.lastNow || 16.7, 100)`). This is a good practice to prevent huge jumps after tab inactivity, but when paired with screensaver pauses, it might cause a slight jump on resume.

### `RouteCoordinator` (src/core/router.ts)
- **Cache Size**: The cache size defaults to 16. When adding a new entry and exceeding the size, it deletes the oldest. This is a simple LRU cache, but relying on `Map.keys().next().value` assumes insertion order is preserved, which is true in JS, but it only deletes *one* item at a time. If `cacheSize` is set lower dynamically, it might not prune enough. However, the loop `while (this.pageCache.size > this.cacheSize)` handles this correctly.
- **Event Listeners on Cloned Container**: When restoring from cache, `nextContainer.innerHTML = cached.html;` is used. This means any DOM event listeners attached directly to elements inside the container by features will be lost on restore. Features *must* use delegation or re-attach on `onRouteChange`. The framework seems to encourage re-attaching via `rebindOnRoute`, which destroys and re-initializes on mismatch, but it's a potential footgun for feature authors.
- **Script Execution**: The `readme.md` notes that scripts in swapped markup are not executed. The router uses `DOMParser.parseFromString` and simple `innerHTML` replacement, which naturally prevents `<script>` execution. This is intentional but something to keep in mind.

### `StartupPipeline` (src/core/startup.ts)
- **Error Handling**: `init` and `reconcileFeaturesInternal` catch errors during feature initialization, emit a failure event, and **continue**. This is great for failure isolation.
- **Race Condition in `reconcileFeatures`**:
    ```typescript
    const run = this.reconcileFeaturesInternal(features, path);
    const inFlight = run.finally(() => {
      if (this.reconcileInFlight === inFlight) {
        this.reconcileInFlight = null;
      }
    });
    ```
    This properly handles overlapping route changes by waiting on `this.reconcileInFlight`, but if multiple fast clicks happen, they queue up sequentially. If navigation happens *very* fast, the final state will match the last click, but intermediate renders might flash.

### `EventBus` (src/core/events.ts)
- **Error boundary**: Listeners that throw errors are caught and logged (`console.error`), preventing them from breaking other listeners.
- **Priority**: Priority sorting is done on *every* `on` call using `splice`. Since listener arrays are typically small, this is fine, but it's an $O(N)$ operation per registration.

## Feature Implementation Issues & Logic Gaps

### `FloatingImagesFeature`
- **Ghost Resizing Issue**: In `onResize`, the dimension properties width/height are updated reading `el.getBoundingClientRect()`.
    ```typescript
    item.width = Math.max(28, Math.round(item.el.getBoundingClientRect().width || item.width));
    ```
    If `el` is currently `display: none` or detached (unlikely, but possible during route swaps), this returns 0, but the `Math.max(28, ...)` fallback prevents complete collapse. However, if the element shrinks due to CSS media queries, it updates fine.
- **Placement logic**: The Gaussian layout logic attempts to find non-overlapping centers (up to 18 tries). However, `spread` is calculated as `10%` of the max dimension minimum, which might tightly cluster items in the center depending on CSS bounds.
- **Memory Leak Potential**: If `destroy()` is called, it removes `pointerenter/leave` listeners. But the `init` waits for `waitForImagesReady`, which might take up to 5 seconds. If `destroy` is called *before* `waitForImagesReady` resolves, the `if (runId !== this.initRunId) return;` check correctly aborts, preventing memory leaks of the listeners. This is handled well.

### `ScreensaverFeature`
- **Fade Out Timing Gap**: The feature uses a hardcoded `ScreensaverFeature.FADE_OUT_CLEANUP_MS = 360` to wait for CSS transitions to finish before removing the DOM elements or stopping the internal floating images instance. If the CSS transition time is changed in `public.src` and exceeds 360ms, the element will abruptly disappear or freeze mid-fade.
- **Partial URL caching limit**: `loadPartialHtml` uses a global `Map` without a size limit. For a screensaver partial, this is fine because it's usually just one URL, but if the URL is dynamic, it's an unbound cache growth vector.
- **`autoCreatedTarget` state mismatch on route change**: In `onRouteChange`, if the previous target was auto-created, it calls `previousTarget.remove()`. However, if the user navigates, the screensaver might currently be showing (fading out). Removing the DOM node immediately interrupts the fade-out animation.
    ```typescript
    if (previousTarget && previousTarget !== this.target && previousWasAutoCreated && previousTarget.isConnected) {
      previousTarget.remove();
    }
    ```
    This immediate removal ignores the `shouldKeepFadeOut` logic which schedules `stopScreensaverFloating` and cleanup 360ms later. The fading DOM element vanishes instantly.

### `SlidePlayerFeature`
- **Autoplay vs Screensaver Pause**: `SlidePlayerFeature` listens to `screensaver:shown/hidden` to pause autoplay.
    - If `autoplayMs` is active, and screensaver shows, `clearAutoplay` is called.
    - When screensaver hides, `updateAutoplay` is called, which resets `autoplayTimer = window.setInterval(...)`.
    - However, it starts a *new* full interval. If the user was 4.9s into a 5s slide wait when the screensaver started, they have to wait another 5s after it hides. Minor UX issue, but logical.
- **Keyboard Navigation Leak**: `document.addEventListener("keydown", this.onKeydown);` is added in `init()`, but only removed in `destroy()`. If `init()` is called multiple times on route changes without `destroy()` (handled by `rebindOnRoute`), it doesn't attach twice due to `if (this.onKeydown) return;`.

### `SlideshowFeature`
- Behavior is very similar to `SlidePlayerFeature` but simpler.
- It maintains `this.index`. When navigating away and back via router cache, the DOM `aria-hidden` and `hidden` attributes will be restored to whatever state they were in when the page was cached (e.g. Slide 3). However, `init()` unconditionally sets `this.index = 0;` and calls `this.render()`, immediately resetting the slideshow to Slide 0. It does not attempt to read the current DOM state to resume from the cached slide index.

## Summary of Findings

Overall, the codebase is structurally sound, type-safe, and handles async edge-cases (like route swaps during feature initialization) quite elegantly using `AbortController` and `runId` checks.

**Logical or UX bugs to consider:**
1. **Screensaver Fade-out interruption**: Auto-created screensaver nodes are removed immediately on route swap, interrupting the 360ms fade-out transition.
2. **Slideshow State Loss**: `SlideshowFeature` and `SlidePlayerFeature` do not hydrate their `index` from the existing DOM when resuming from the router's page cache; they always jump back to slide 0, causing a visual flash.
3. **Screensaver CSS Transition sync**: Hardcoded `360ms` cleanup timer in TypeScript might fall out of sync with CSS.
4. **Reduced Motion pauses floating images**: If floating images are the main visual, pausing the RAF loop via `(prefers-reduced-motion)` might leave them in an un-initialized `0,0` state depending on exactly when the pause triggers.
