import { resolveConfig } from "../core/config.js";
import { eventBus } from "../core/events.js";
import { FeatureRegistry } from "../core/registry.js";
import { StartupPipeline } from "../core/startup.js";
import { attachConsoleLogSink, createLogger } from "../core/logger.js";
import { RouteCoordinator } from "../core/router.js";
import { animationScheduler } from "../core/animation.js";
import { SlideshowFeature } from "../features/slideshow/SlideshowFeature.js";
import { ScreensaverFeature } from "../features/screensaver/ScreensaverFeature.js";
import { FloatingImagesFeature } from "../features/floating-images/FloatingImagesFeature.js";

async function main(): Promise<void> {
  const config = resolveConfig({
    mode: readModeFromDom(),
    screensaverIdleMs: 6000,
  });

  const startup = new StartupPipeline(config);
  const registry = new FeatureRegistry();
  const detachConsoleSink = maybeAttachConsoleSink(config.mode, config.logLevel);
  const detachAnimationMetrics = maybeAttachAnimationMetrics(config.mode);

  registry.register(new SlideshowFeature({ autoplayMs: 5000, pauseOnScreensaver: true }), {
    requiredSelector: "[data-slideshow]",
    mode: "any",
  });

  registry.register(new FloatingImagesFeature({ hoverBehavior: "pause", hoverSlowMultiplier: 0.2 }), {
    requiredSelector: "[data-floating-images]",
    mode: "any",
  });

  registry.register(
    new ScreensaverFeature({
      targetSelector: "#screensaver",
      idleMs: config.screensaverIdleMs,
      partialUrl: "./screensaver/index.html",
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
  bindLifecycleHooks(startup, routeCoordinator, detachConsoleSink, detachAnimationMetrics);
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

function bindLifecycleHooks(
  startup: StartupPipeline,
  routeCoordinator: RouteCoordinator,
  detachConsoleSink: (() => void) | undefined,
  detachAnimationMetrics: (() => void) | undefined
): void {
  window.addEventListener("beforeunload", () => {
    routeCoordinator.destroy();
    detachConsoleSink?.();
    detachAnimationMetrics?.();
    void startup.destroy("beforeunload");
  });
}

function maybeAttachConsoleSink(mode: "dev" | "prod", logLevel: "debug" | "info" | "warn" | "error"): (() => void) | undefined {
  const sinkAttr = document.documentElement.getAttribute("data-log-sink");
  if (sinkAttr === "none") return undefined;

  if (mode === "prod") {
    if (sinkAttr === "force") {
      return attachConsoleLogSink("warn");
    }
    return undefined;
  }

  if (sinkAttr === "console" || sinkAttr === "force") {
    return attachConsoleLogSink(logLevel);
  }

  return attachConsoleLogSink(logLevel);
}

function maybeAttachAnimationMetrics(mode: "dev" | "prod"): (() => void) | undefined {
  if (mode !== "dev") return undefined;
  const metricsAttr = document.documentElement.getAttribute("data-animation-metrics");
  if (metricsAttr !== "on") return undefined;

  const timer = window.setInterval(() => {
    const stats = animationScheduler.getStats();
    console.log("[animation] [METRICS]", stats);
  }, 2000);

  return () => window.clearInterval(timer);
}

void main();
