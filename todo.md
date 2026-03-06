# Future Architectural Evolution Ideas

The following are ideas to structurally evolve and restructure Spaceface as it grows into a larger framework or application runtime.

## 1. Smarter Route Swapping (Native DOM Morphing) (IMPLEMENTED)
*(Implemented using a custom `morphNode` utility in `morphdom.ts`. `RouteCoordinator` now morphs the newly fetched HTML into the existing container, preserving elements like playing `<video>` or `<audio>` across page navigation.)*

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
