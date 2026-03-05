# Future Architectural Evolution Ideas

The following are ideas to structurally evolve and restructure Spaceface as it grows into a larger framework or application runtime.

## 1. Smarter Route Swapping (Native DOM Morphing)
Currently, `RouteCoordinator` completely destroys `[data-route-container]` and replaces it using `innerHTML = cached.html`.
* **The Limitation:** If there is an `<audio>` player playing music, a `<video>` tag, or an expensive WebGL canvas inside the route container, it is completely destroyed and recreated on every page navigation.
* **The Evolution:** Instead of a hard swap, you could write a small, custom DOM-diffing function (often called "morphing") to traverse the newly fetched HTML and only update the CSS classes or text nodes that have actually changed on the existing DOM elements.
* *Note: Writing a robust morphing algorithm from scratch is complex (handling focus states, cursor positions in inputs, etc.), so the current `innerHTML` approach remains the fastest and safest zero-dependency method unless you specifically need to preserve playing `<video>` elements across page loads!*

## 2. Preloading & Prefetching (IMPLEMENTED)
*(Implemented in v2.0.3 using `pointerenter` tracking to aggressively pre-cache valid navigation targets instantly on hover)*

## 3. Feature Communication (Dependency Injection)
Currently, features are completely isolated. If `Feature A` needs to talk to `Feature B`, they have to shout into the void using the global `EventBus`. This is great for loose coupling, but scales poorly for highly dependent complex interactions.
* **The Evolution:** Change the `FeatureRegistry` so that features can statically declare dependencies. For example, if a `VideoPlayerFeature` needs to pause the `SlideshowFeature`, allow the VideoPlayer to request a direct instance reference to the active Slideshow during its `init()` phase.

## 4. Unit Testing the Math
There is some fairly complex physics math statically hiding in the UI layer (for example, the bounding box collision, jitter, and Gaussian distribution in `FloatingImagesFeature.ts`).
* **The Evolution:** As more complex interactive features are added, pure math and logic functions should be extracted into a `mathUtils.ts` module and paired with a fast unit test runner (like `Vitest`). This ensures edge cases in the physics/UI generation algorithms are caught immediately before hitting the browser.

## 5. Fully Type-Safe Event Bus (IMPLEMENTED)
*(Implemented in v2.0.4. The `EventBus` now successfully uses mapped Types via `ListenerStore<T>` instead of raw `Map<string, unknown>`, making it 100% type-safe under the hood without the need for `as ...` type-casting.)*
