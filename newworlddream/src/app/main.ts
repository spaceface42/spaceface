import { resolveConfig } from "../core/config.js";
import { eventBus } from "../core/events.js";
import { FeatureRegistry } from "../core/registry.js";
import { StartupPipeline } from "../core/startup.js";
import { createLogger } from "../core/logger.js";
import { RouteCoordinator } from "../core/router.js";
import { SlideshowFeature } from "../features/slideshow/SlideshowFeature.js";
import { ScreensaverFeature } from "../features/screensaver/ScreensaverFeature.js";

async function main(): Promise<void> {
  const config = resolveConfig({
    mode: readModeFromDom(),
    screensaverIdleMs: 6000,
  });

  const startup = new StartupPipeline(config);
  const registry = new FeatureRegistry();

  registry.register(new SlideshowFeature(), {
    requiredSelector: "[data-slideshow]",
    mode: "any",
  });

  registry.register(
    new ScreensaverFeature({
      targetSelector: "#screensaver",
      idleMs: config.screensaverIdleMs,
    }),
    {
      requiredSelector: "#screensaver",
      mode: "any",
    }
  );

  const ctxForResolve = {
    config,
    events: eventBus,
    logger: createLogger("registry", config.logLevel),
    route: window.location.pathname,
  };

  const activeFeatures = registry.resolve(ctxForResolve);
  await startup.init(activeFeatures);

  bindGlobalSlideControls();
  const routeCoordinator = new RouteCoordinator({
    containerSelector: "[data-route-container]",
    logger: createLogger("router", config.logLevel),
    hooks: {
      onAfterSwap: async ({ url }) => {
        const nextCtx = {
          ...ctxForResolve,
          route: url.pathname,
        };
        const nextFeatures = registry.resolve(nextCtx);
        await startup.reconcileFeatures(nextFeatures, url.pathname);
      },
    },
  });
  routeCoordinator.start();
  bindLifecycleHooks(startup, routeCoordinator);
}

function readModeFromDom(): "dev" | "prod" {
  const value = document.documentElement.getAttribute("data-mode");
  return value === "prod" ? "prod" : "dev";
}

function bindGlobalSlideControls(): void {
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      eventBus.emit("slideshow:next", { source: "keyboard" });
    }
    if (event.key === "ArrowLeft") {
      eventBus.emit("slideshow:prev", { source: "keyboard" });
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target) return;
    const next = target.closest("[data-slide-next]");
    if (next) {
      eventBus.emit("slideshow:next", { source: "click" });
      return;
    }
    const prev = target.closest("[data-slide-prev]");
    if (prev) {
      eventBus.emit("slideshow:prev", { source: "click" });
    }
  });
}

function bindLifecycleHooks(startup: StartupPipeline, routeCoordinator: RouteCoordinator): void {
  window.addEventListener("beforeunload", () => {
    routeCoordinator.destroy();
    void startup.destroy("beforeunload");
  });
}

void main();
