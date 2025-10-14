Spaceface

A proudly overengineered, no-thrills, no-framework TypeScript oddity.
It handles screensavers and partial HTML fetching — because reloading the whole page is so last century.
No React. No clutter. No apologies.
Just handcrafted logic and a sprinkle of cosmic minimalism.

A tiny TypeScript feature library for display-focused web apps (slideshows, screensavers, floating imagery, partial HTML loading and small runtime utilities).

What it provides
Modular utilities: EventBus, EventBinder, EventWatcher, PartialFetcher, AsyncImageLoader, AnimationLoop, ResizeManager, InactivityWatcher.
Feature controllers: SlidePlayer, ScreensaverController, FloatingImagesManager / FloatingImage.
Robust lifecycle helpers: automatic bind/unbind, cancellable/debounced callbacks, safe async init and cleanup.
Why use it
Framework‑agnostic, lightweight building blocks for kiosks, digital signage and single‑page display apps.
Strong TypeScript types and defensive runtime checks for predictable behavior.
Minimizes leaks and race conditions via tracked listeners, safe destroy paths and guarded async flows.
Quick usage
Import the feature you need (e.g. SlidePlayer or ScreensaverController).
Create an instance and await its .ready promise.
Check .initError after awaiting .ready to detect init failures.
Use eventBinder / eventBus for app-level wiring with automatic cleanup.
Elevator pitch
Spaceface is a compact, TypeScript-first toolkit that supplies focused, well-typed utilities and small feature controllers for building resilient display UIs without a full framework — it handles event lifecycles, partial loading, animation loops and image management so you can compose robust progressive features with minimal overhead.

# spaceface engine

npm install --save-dev esbuild
node ./bin/build.js
