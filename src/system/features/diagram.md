                  ┌─────────────────────┐
                  │   EventBinder       │
                  │  (DOM + eventBus)   │
                  └─────────┬──────────┘
                            │ binds events
                            ▼
 ┌───────────────────────────────┐
 │        SlidePlayer             │
 │ ----------------------------- │
 │ - container (HTMLElement)      │
 │ - slides: HTMLElement[]        │
 │ - dots: HTMLDivElement[]       │
 │ - pauseReasons: Set            │
 │ ----------------------------- │
 │ + init()                       │
 │ + goToSlide()                  │
 │ + next()/prev()                │
 │ + togglePause(reason, bool)    │
 │ + animate()                    │
 └───────────────┬────────────────┘
                 │ uses
                 ▼
         ┌──────────────────┐
         │ AnimationLoop    │
         │ ---------------- │
         │ - callbacks Set  │
         │ - _loop()        │
         │ ---------------- │
         │ + add(cb)        │
         │ + remove(cb)     │
         │ + has(cb)        │
         │ + pause()/resume()│
         └───────┬──────────┘
                 │ central RAF
                 ▼
      ┌─────────────────────────┐
      │  Browser requestAnimationFrame │
      └─────────────────────────┘

 ┌───────────────────────────────┐
 │ FloatingImagesManager          │
 │ ----------------------------- │
 │ - images: FloatingImage[]      │
 │ - containerWidth/Height        │
 │ - speedMultiplier              │
 │ - isInViewport                 │
 │ ----------------------------- │
 │ + initializeImages()           │
 │ + animate()                    │
 │ + handleResize()               │
 │ + reinitializeImages()         │
 └───────────────┬────────────────┘
                 │ uses
                 ▼
         ┌──────────────────┐
         │ AnimationLoop    │
         └──────────────────┘
                 │ central RAF
                 ▼
      ┌─────────────────────────┐
      │  Browser requestAnimationFrame │
      └─────────────────────────┘

 ┌───────────────────────────────┐
 │ AsyncImageLoader               │
 │ ----------------------------- │
 │ + waitForImagesToLoad(selector)│
 └───────────────┬────────────────┘
                 │ provides loaded images
                 ▼
 ┌───────────────────────────────┐
 │ SlidePlayer / FloatingImages  │
 │ consume images for rendering  │
 └───────────────────────────────┘

 ┌───────────────────────────────┐
 │ PerformanceMonitor             │
 │ ----------------------------- │
 │ + update()                     │
 └───────────────┬────────────────┘
                 │ controls frame skipping
                 ▼
 ┌───────────────────────────────┐
 │ FloatingImagesManager.animate()│
 └───────────────────────────────┘


Notes from Diagram

AnimationLoop is central: Both SlidePlayer and FloatingImagesManager register their animateCallbacks here. Only one RAF is running at a time.

EventBinder is key: SlidePlayer binds DOM and bus events (pointer, keyboard, visibility, activity). FloatingImagesManager does not bind DOM events directly but uses ResizeManager.

PerformanceMonitor throttles animation: Helps FloatingImagesManager skip frames on low FPS devices.

Image loading: Both modules rely on AsyncImageLoader, ensuring slides/images are fully loaded before starting animation.

Pause logic: SlidePlayer uses pauseReasons and can dynamically add/remove itself from AnimationLoop. FloatingImagesManager uses isInViewport + speedMultiplier to skip frames instead of pausing RAF.

Lifecycle: destroy() removes callbacks, unsubscribes events, cleans images — prevents memory leaks.
