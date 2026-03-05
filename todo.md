# Future Architectural Evolution Ideas

The following are ideas to structurally evolve and restructure Spaceface as it grows into a larger framework or application runtime.

## 1. Smarter Route Swapping (DOM Morphing)
Currently, `RouteCoordinator` completely destroys `[data-route-container]` and replaces it using `innerHTML = cached.html`.
* **The Limitation:** If there is an `<audio>` player playing music, a `<video>` tag, or an expensive WebGL canvas inside the route container, it is completely destroyed and recreated on every page navigation.
* **The Evolution:** Instead of a hard swap, use a lightweight DOM-diffing library (like `morphdom` or `idiomorph`, the same engines that power `htmx`). This allows smooth transitions of the DOM, keeping elements that haven't actually changed intact.

## 2. Preloading & Prefetching
Right now, the router waits for a user to exactly `click` a link before it starts fetching the next page.
* **The Evolution:** Upgrade the `RouteCoordinator` to listen for `pointerenter` (hovering) or `touchstart` on valid PJAX links. When a user hovers over a link, instantly fire off the `fetch()` in the background. By the time they actually click 200ms later, the page is already cached and loads instantly.

## 3. Feature Communication (Dependency Injection)
Currently, features are completely isolated. If `Feature A` needs to talk to `Feature B`, they have to shout into the void using the global `EventBus`. This is great for loose coupling, but scales poorly for highly dependent complex interactions.
* **The Evolution:** Change the `FeatureRegistry` so that features can statically declare dependencies. For example, if a `VideoPlayerFeature` needs to pause the `SlideshowFeature`, allow the VideoPlayer to request a direct instance reference to the active Slideshow during its `init()` phase.

## 4. Unit Testing the Math
There is some fairly complex physics math statically hiding in the UI layer (for example, the bounding box collision, jitter, and Gaussian distribution in `FloatingImagesFeature.ts`).
* **The Evolution:** As more complex interactive features are added, pure math and logic functions should be extracted into a `mathUtils.ts` module and paired with a fast unit test runner (like `Vitest`). This ensures edge cases in the physics/UI generation algorithms are caught immediately before hitting the browser.

## 5. Fully Type-Safe Event Bus
The current `EventBus` has a great `AppEventMap` interface that provides autocomplete for payload types at the consumer level.
* **The Evolution:** The `EventBus` class itself has a few `any` and `unknown` casts internally to manage the generic listener maps. While it works perfectly now, as TypeScript features evolve, the internal `Map` should be refactored to be completely type-safe without relying on explicit type assertions.
