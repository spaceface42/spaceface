// src/main.ts
import { Container } from "./core/container.js";
import { FeatureRegistry } from "./core/feature.js";
import { initActivityTracking } from "./features/shared/activity.js";

// Import our vNext Features
import { ScreensaverFeature } from "./features/screensaver/ScreensaverFeature.js";
import { FloatingImagesFeature } from "./features/floating-images/FloatingImagesFeature.js";
import { SlideshowFeature } from "./features/slideshow/SlideshowFeature.js";

async function main() {
  console.log("[Spaceface vNext] Booting...");

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
        idleMs: 3000,
        partialUrl: "/screensaver_partial.html"
      });
    }
  });

  registry.register(class SlideshowVnext extends SlideshowFeature {
    static selector = "slideshow";
    constructor() {
      super({
        autoplayMs: 2000 // Very fast 2-second slides for easy testing
      });
    }
  });

  // 5. Start DOM Observation
  registry.start();

  console.log("[Spaceface vNext] Ready. Waiting for DOM mutations...");
}

// Boot
main().catch(console.error);
