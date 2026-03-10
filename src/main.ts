// src/main.ts
import { Container } from "./core/container.js";
import { FeatureRegistry } from "./core/feature.js";
import { initActivityTracking } from "./features/shared/activity.js";

// Import our vNext Features
import { ScreensaverFeature } from "./features/screensaver/ScreensaverFeature.js";
import { FloatingImagesFeature } from "./features/floating-images/FloatingImagesFeature.js";
import { SlideshowFeature } from "./features/slideshow/SlideshowFeature.js";

const DEFAULT_SCREENSAVER_IDLE_MS = 6000;
const DEFAULT_SLIDESHOW_AUTOPLAY_MS = 5000;
const DEFAULT_SCREENSAVER_PARTIAL_URL = "/screensaver_partial.html";

async function main() {
  // 1. Initialize Global Shared Signals/Activity
  initActivityTracking();

  // 2. Initialize Dependency Injection Container
  const container = new Container();

  // 3. Initialize Global Feature Registry
  const registry = new FeatureRegistry(container);

  // 4. Register Features
  // Just by registering these, any `<div data-feature="floating-images">` or
  // `<div data-feature="screensaver">` in the DOM will instantly come alive!
  registry.register(FloatingImagesFeature);
  registry.register(class ScreensaverVnext extends ScreensaverFeature {
    static selector = "screensaver";
    constructor() {
      super({
        idleMs: DEFAULT_SCREENSAVER_IDLE_MS,
        partialUrl: DEFAULT_SCREENSAVER_PARTIAL_URL,
      });
    }
  });

  registry.register(class SlideshowVnext extends SlideshowFeature {
    static selector = "slideshow";
    constructor() {
      super({
        autoplayMs: DEFAULT_SLIDESHOW_AUTOPLAY_MS,
      });
    }
  });

  // 5. Start DOM Observation
  registry.start();
}

// Boot
main().catch((error) => {
  setTimeout(() => {
    throw error;
  }, 0);
});
