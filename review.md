# Spaceface Codebase Review

I have reviewed the `README.md` and the entire TypeScript codebase in the `src` folder.

Overall, the codebase is of extremely high quality. It clearly implements a robust, lightweight, and modern Single Page Application (SPA)-style runtime for a statically hosted website.

Here is my review covering **Best Practices (The Good)** and **Illogical Things & Minor Edge Cases (The Potentially Problematic)**.

## 🌟 Best Practices Exhibited (Excellent Work)

It is rare to see out-of-the-box browser code that handles this many things correctly:

1. **Accessibility First (`a11y`)**: The `AnimationScheduler` checks `window.matchMedia("(prefers-reduced-motion: reduce)")` directly and completely pauses rendering loops when matched. Additionally, `aria-hidden` and `aria-current` are consistently synced with JavaScript states in `SlideshowFeature` and `SlidePlayerFeature`.
2. **Performance Optimizations**:
   - `FloatingImagesFeature` properly uses `IntersectionObserver` to pause the 60fps render loop when the floating element scrolls out of the viewport.
   - It also completely disables `requestAnimationFrame` when the screensaver overlay kicks in to save GPU cycles.
   - The bounding-box coordinate tracking intelligently uses `translate3d()` for rendering, deferring actual pixel shifts to the GPU.
3. **No Memory Leaks**: Event listeners and intervals are rigorously cleaned up using teardown functions. `AbortController` is used everywhere asynchronous operations occur (such as `fetch` requests inside `ScreensaverFeature` and `RouteCoordinator`, and `waitForImageReady` timeouts).
4. **Modern ES Module Imports**: Imports correctly include the `.js` extension (e.g., `import { eventBus } from "./events.js";`), which enforces the Node16/NodeNext standard resolution required for strict runtime ES module interop.

---

## 🔍 Illogical Things & Areas for Improvement

While the code is top-notch, there are a few quirky logic traps and architectural edge cases that could theoretically cause bugs.

### 1. In `features/floating-images/FloatingImagesFeature.ts` - Math/Bounds Oscillation Edge Case

In the `.tick()` calculation, you calculate boundaries to keep images inside the container:

```typescript
if (item.x <= 0) {
  item.x = 0;
  item.vx = Math.abs(item.vx);
} else if (item.x >= maxX) {
  item.x = maxX;
  item.vx = -Math.abs(item.vx);
}
```

**The Illogical Part**: If the container becomes smaller than the image (due to a harsh resize or mobile screen), `maxX` becomes `0` (enforced by `Math.max(0, bounds.width - item.width)`).
Because of the `else if`, both conditions evaluate to `true` (if `x = 0`, it is `<= 0`, and also `>= maxX` which is `0`). It will only trigger the first `if` branch, moving the item to the right `vx = Math.abs(vx)`. In the next frame, it moves slightly right (so `x > 0`), triggering the `else if` branch which moves it left.

**Result**: The image infinitely jitters back and forth if the bounds are squeezed out of existence.

*Fix*: You can decouple the evaluations of the left vs right constraints rather than using an `else if` exclusively, or temporarily lock speed to `0` if bounds are impossible.

### 2. In `core/router.ts` - Hardcoded Meta Loss in PJAX Routing

When swapping pages, `RouteCoordinator` specifically clones and pulls over only `title`, `lang`, `dir`, `data-mode`, `class`, and `data-page` alongside the `innerHTML` of the specific view container.

```typescript
document.title = entry.title;
document.documentElement.lang = entry.htmlAttrs.lang;
// ...
```

**The Illogical Part**: If you eventually add new scripts (`<script>`), meta tags (like `<meta name="description">`), or stylesheets (`<link>`) to one of the partial `html` documents in `public.src/`, the router will completely ignore them when navigating. The `README.md` acknowledges that scripts won't trigger, but silently stripping unique page `<meta>` tags is bad for client-side routing SEO engines and OpenGraph data over sharing.

### 3. In `features/screensaver/ScreensaverFeature.ts` - Theoretical Race Condition on Float Cleanup

When the user moves the mouse, the screensaver removes the `is-active` class and initiates a timer to clean up the floating symbols running inside the screensaver:

```typescript
this.hideCleanupTimer = window.setTimeout(() => {
  this.stopScreensaverFloating(cleanupTarget);
  this.hideCleanupTimer = null;
}, ScreensaverFeature.FADE_OUT_CLEANUP_MS); // 360ms
```

**The Illogical Part**: If the user happens to become inactive *again* incredibly fast (or if you artificially shorten `idleMs` for debugging to something like `100ms`), `this.startScreensaverFloating()` does **not** clear `this.hideCleanupTimer` (though there is an attempt in `armTimer`). However, if the cleanup timer fires, it will indiscriminately call `stopScreensaverFloating` which might stop the newly restarted float instance.

### 4. EventBus suppressing synchronous errors (`core/events.ts`)

```typescript
for (const listener of list) {
  try {
    Promise.resolve(listener.fn(payload)).catch((error) => {
      console.error(`[EventBus] listener failed for ${event}`, error);
    });
  } catch (error) { ... }
}
```

You properly swallow errors to prevent one broken listener from destroying the event pipeline thread.

**The Illogical Part**: If the errors are swallowed aggressively using `console.error` and handled internally, you may miss uncaught error events on the `window` level (so crash reporting tools won't catch them easily) and you risk masking stack traces unless you regularly monitor the console. It might be better to dispatch an `ErrorEvent` or let `window.onerror` process the trace natively.

### Summary

None of these logical quirks are currently breaking your app in active production workflows, but fixing the `FloatingImages` boundary collapse and accounting for `<head>` metadata in your router would bullet-proof your architecture moving forward.

Overall, it's a superbly engineered Vanilla TypeScript system!
