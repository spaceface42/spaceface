# Spaceface Architecture

This document defines the current architecture of the active runtime. It is the baseline for ongoing work, not a proposal for reviving older router/PJAX systems. The current composition root lives in `src/app/main.ts`.

## 0. System Boundary

This system is:
- a static-page runtime
- driven by authored HTML in `docs.src/`
- activated by `data-feature="..."`
- implemented by a small TypeScript runtime under `src/`

This system is not:
- a router framework
- a general-purpose component framework
- a feature-to-feature DI graph
- a legacy selector compatibility layer

## 1. Core Runtime

### A. Lightweight Dependency Injection (IoC Container)
The runtime provides a lightweight `Container` for shared services/tokens.
```typescript
class VideoPlayerFeature implements Feature {
  // Statically declare dependencies
  static inject = [AudioContextService, MediaSessionService];

  constructor(private audio: AudioContextService, private mediaSession: MediaSessionService) {}

  onPlay() {
    this.mediaSession.setPlaying(true);
  }
}
```

Current port note:
- Service/token injection is allowed.
- Feature-to-feature injection is intentionally unsupported.

### B. Vanilla TS Signals (Reactivity without Frameworks)
The runtime uses a minimal signal primitive for shared reactive state.
```typescript
const isIdle = createSignal(false);

// Any feature can reactively subscribe without needing a global Event Bus string:
createEffect(() => {
  if (isIdle.value) showScreensaver();
  else hideScreensaver();
});
```

## 2. Feature Lifecycle

Use a single global `MutationObserver` attached to `document.body` that watches `data-feature="..."`.
* If `<div data-feature="floating-images">` is parsed or activated, the central registry instantiates the feature and calls `mount()`.
* When the node is removed from the DOM, the observer instantly calls `destroy()`.
* Attribute toggles on existing nodes are also reconciled.

Root contract:
- feature roots use `data-feature="..."`
- feature internals use feature-specific `data-*` only where structure needs to be explicit

## 3. Animation And Render Loop

A unified `FrameScheduler` forces strict read-then-write execution across active animated features.
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
The scheduler runs all `update()` methods first, followed by all `render()` methods inside `requestAnimationFrame`.

## 4. Routing Status

The current runtime does not include the old router/PJAX shell.

If routing returns later:
- feature lifecycle must remain decoupled from routing
- routing must not own feature instantiation
- a future View Transitions based layer is preferred over reviving the old router as-is

## 5. Feature Roles

### The Screensaver & Decoupled State
Instead of managing its own hidden visual state, the Screensaver becomes a pure function reacting to a global `userActivitySignal`.
* A global listener updates the `userActivitySignal` timestamp.
* When the idle time is reached, it mounts the screensaver HTML partial dynamically.
* To communicate with other features (like pausing the slideshow), it writes to a decoupled `screensaverActiveSignal`. It never references the slideshow directly.

### Slideshow And SlidePlayer
* `SlideshowFeature` remains the minimal generic rotator for simple `[data-slide]` content blocks.
* `SlidePlayerFeature` is the image-first variant with dedicated prev/next controls and bullet navigation.
* Both subscribe to the `screensaverActiveSignal` via `createEffect`.
* When the screensaver appears, they clear internal timers and cache remaining milliseconds.
* When the screensaver hides, they resume seamlessly.

### Floating Images & Pure Math
* Pure math operations (Gaussian distribution, bounding box collision, jitter) are extracted into `src/core/utils/math-utils.ts`.
* The `FloatingImagesFeature` only manages the `MotionItem` state array and the `requestAnimationFrame` hooks via the `globalScheduler`.

---

## Current Status (March 2026)

**✅ Completed Core Primitives (`src/core/`)**
1. `signals.ts` - `createSignal`, `createEffect`
2. `container.ts` - Basic IoC `Container`
3. `scheduler.ts` - `FrameScheduler` with strict read/write phases to eliminate layout thrashing.
4. `feature.ts` - `FeatureRegistry` powered by `MutationObserver`.
5. `partials.ts` - HTML partial loading and caching.

**✅ Ported Features (`src/features/`)**
1. `shared/activity.ts` - `userActivitySignal`
2. `shared/screensaverState.ts` - `screensaverActiveSignal`
3. `core/utils/math-utils.ts`
4. `floating-images/FloatingImagesFeature.ts`
5. `screensaver/ScreensaverFeature.ts`
6. `slideshow/SlideshowFeature.ts`
7. `slideplayer/SlidePlayerFeature.ts`

## What Is Intentionally Not In Scope Right Now

- the old router/PJAX shell
- feature-to-feature injection
- reviving legacy selector contracts
- framework-managed component state outside DOM feature roots

## Near-Term Focus

- keep authored HTML/CSS aligned to `data-feature="..."`

## Logging Decision

Logging is finalized around the current typed sink dispatcher in `src/core/logger.ts`.

Current rule:
- features and runtime code use `createLogger(...)`
- sinks are attached externally
- console output remains centralized through sink attachment

Future rule:
- do not introduce a dedicated `LogBus` unless the system actually needs multiple real sinks beyond console/dev diagnostics
