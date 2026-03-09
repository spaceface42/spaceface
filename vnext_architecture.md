# Spaceface vNext: Clean Architecture Proposal

This document outlines the proposed architecture for a completely new, zero-dependency, vanilla TypeScript system. It serves as the blueprint when starting or continuing development of the next generation of the spaceface runtime.

## 1. The Core Paradigm: Container + Signals

### A. Lightweight Dependency Injection (IoC Container)
Instead of forcing a global `EventBus`, the system provides a lightweight Context/Container. When a feature mounts, it can statically request references to other services or features.
```typescript
class VideoPlayerFeature implements Feature {
  // Statically declare dependencies
  static inject = [SlideshowFeature, AudioContextService];

  constructor(private slideshow: SlideshowFeature, private audio: AudioContextService) {}

  onPlay() {
    this.slideshow.pause(); // Direct, type-safe communication
  }
}
```

### B. Vanilla TS Signals (Reactivity without Frameworks)
Instead of manually querying the DOM to check if the screensaver is active, we introduce a minimal Reactive Signal primitive (inspired by Solid.js, but minimal in size).
```typescript
const isIdle = createSignal(false);

// Any feature can reactively subscribe without needing a global Event Bus string:
createEffect(() => {
  if (isIdle.value) showScreensaver();
  else hideScreensaver();
});
```

## 2. Decoupled Lifecycle via `MutationObserver`

**The Evolution:** Use a single, global `MutationObserver` attached to `document.body` that watches for `data-feature="..."` attributes entering or leaving the DOM.
* If `<div data-feature="floating-images">` is parsed and mounted (whether by the router, or a user clicking a button that injects HTML), the central Registry instantly instantiates the feature and calls `mount()`.
* When the node is removed from the DOM, the observer instantly calls `destroy()`.
* **Benefit:** The Router no longer needs to know what features exist. Full separation of concerns.

## 3. The Unified Physics & Render Loop

**The Evolution:** A unified `FrameScheduler` that forces a strict Read-then-Write execution order across *all* active features, avoiding layout thrashing.
```typescript
class FloatingImagesFeature {
  update(dt: number) {
    // Phase 1: Math and Logic (READ)
    this.x += this.vx * dt;
  }

  render() {
    // Phase 2: DOM Mutation (WRITE)
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  }
}
```
The central scheduler runs all `update()` methods first, followed by all `render()` methods using `requestAnimationFrame`. This guarantees 60/120fps physics.

## 4. Next-Gen Routing: View Transitions + Morphing

**The Evolution:** Wrap the existing DOM Morphing logic in the native **View Transitions API** (`document.startViewTransition`).
This allows us to cross-fade between entirely different DOM structures, or morph elements seamlessly across pages, while still keeping the zero-flash, state-preserving benefits of morphdom underneath.

## 5. Feature Implementation Examples

### The Screensaver & Decoupled State
Instead of managing its own hidden visual state, the Screensaver becomes a pure function reacting to a global `userActivitySignal`.
* A global listener updates the `userActivitySignal` timestamp.
* When the idle time is reached, it mounts the screensaver HTML partial dynamically.
* To communicate with other features (like pausing the slideshow), it writes to a decoupled `screensaverActiveSignal`. It never references the slideshow directly.

### The Slideshow (SlidePlayer)
* Subscribes to the `screensaverActiveSignal` via `createEffect`.
* When the screensaver appears, it clears its internal timer and caches the remaining milliseconds.
* When the screensaver hides, it resumes the timer seamlessly.

### Floating Images & Pure Math
* Pure math operations (Gaussian distribution, bounding box collision, jitter) are extracted entirely out into `mathUtils.ts`.
* The `FloatingImagesFeature` only manages the `MotionItem` state array and the `requestAnimationFrame` hooks via the `globalScheduler`.

---

## Current Porting Status (March 2026)

**✅ Completed Core Primitives (`src/core/`)**
1. `signals.ts` - `createSignal`, `createEffect`
2. `container.ts` - Basic IoC `Container`
3. `scheduler.ts` - `FrameScheduler` with strict read/write phases to eliminate layout thrashing.
4. `feature.ts` - `FeatureRegistry` powered by `MutationObserver`.
5. `partials.ts` - HTML partial loading and caching.

**✅ Ported Features (`src/features/`)**
1. `shared/activity.ts` - `userActivitySignal`
2. `shared/screensaverState.ts` - `screensaverActiveSignal`
3. `shared/mathUtils.ts`
4. `floating-images/FloatingImagesFeature.ts`
5. `screensaver/ScreensaverFeature.ts`
6. `slideshow/SlideshowFeature.ts`

**⏳ Next Up For Porting**
- The View Transitions Router (`RouteCoordinator`)
- Global UI Shell / Navigation Lifecycle
- Content partials and remaining slideshow logic.

**❓Open Question (Later Decision)**
- Logging architecture: keep the current typed sink dispatcher in `src/core/logger.ts`, or formalize it into a dedicated `LogBus`/message channel module with pluggable sinks (console, telemetry, UI debug panel) while preserving the same `createLogger(...)` API.
