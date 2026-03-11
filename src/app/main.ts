// src/app/main.ts
import { Container } from "../core/container.js";
import { FeatureRegistry } from "../core/feature.js";
import { attachConsoleLogSink, createLogger, type LogLevel } from "../core/logger.js";
import { initActivityTracking } from "../features/shared/activity.js";

// Import our vNext Features
import { ScreensaverFeature } from "../features/screensaver/ScreensaverFeature.js";
import { FloatingImagesFeature } from "../features/floating-images/FloatingImagesFeature.js";
import { SlideshowFeature } from "../features/slideshow/SlideshowFeature.js";
import { SlidePlayerFeature } from "../features/slideplayer/SlidePlayerFeature.js";

const DEFAULT_SCREENSAVER_IDLE_MS = 6000;
const DEFAULT_SLIDESHOW_AUTOPLAY_MS = 5000;
const DEFAULT_SCREENSAVER_PARTIAL_URL = "./resources/features/screensaver/index.html";
const DEFAULT_LOG_LEVEL: LogLevel = getDefaultLogLevel();

const logger = createLogger("MU/TH/UR", DEFAULT_LOG_LEVEL);

function main(): void {
  attachConsoleLogSink(DEFAULT_LOG_LEVEL);
  // logger.info("[MU/TH/UR] boot start", { mode: getDocumentMode() });
  logger.info("boot start", { mode: getDocumentMode() });

  applyCurrentNavState();

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

  registry.register(class SlidePlayerVnext extends SlidePlayerFeature {
    static selector = "slideplayer";
    constructor() {
      super({
        autoplayMs: DEFAULT_SLIDESHOW_AUTOPLAY_MS,
      });
    }
  });

  // 5. Start DOM Observation
  registry.start();
  logger.info("boot complete");
}

// Boot
try {
  main();
} catch (error) {
  logger.error("boot failed", error);
  setTimeout(() => {
    throw error;
  }, 0);
}

function getDocumentMode(): string {
  return document.documentElement?.dataset.mode ?? "prod";
}

function getDefaultLogLevel(): LogLevel {
  return getDocumentMode() === "dev" ? "debug" : "warn";
}

function applyCurrentNavState(): void {
  const currentPage = document.body?.dataset.page;
  if (!currentPage) return;

  const links = document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]");
  for (const link of links) {
    if (link.dataset.navLink === currentPage) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}
