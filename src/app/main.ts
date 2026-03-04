import { resolveConfig } from "../core/config.js";
import { eventBus } from "../core/events.js";
import { FeatureRegistry } from "../core/registry.js";
import { StartupPipeline } from "../core/startup.js";
import { attachConsoleLogSink, createLogger } from "../core/logger.js";
import { RouteCoordinator } from "../core/router.js";
import { animationScheduler } from "../core/animation.js";
import { SlideshowFeature } from "../features/slideshow/SlideshowFeature.js";
import { SlidePlayerFeature } from "../features/slideplayer/SlidePlayerFeature.js";
import { ScreensaverFeature } from "../features/screensaver/ScreensaverFeature.js";
import { FloatingImagesFeature } from "../features/floating-images/FloatingImagesFeature.js";

console.log("MU/TH/UR");

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

  registry.register(new SlidePlayerFeature({ autoplayMs: 5000, pauseOnScreensaver: true }), {
    requiredSelector: "[data-slideplayer]",
    mode: "any",
  });

  registry.register(new FloatingImagesFeature({ hoverBehavior: "pause", hoverSlowMultiplier: 0.2 }), {
    requiredSelector: "[data-floating-images]",
    mode: "any",
  });

  registry.register(
    new ScreensaverFeature({
      idleMs: config.screensaverIdleMs,
      partialUrl: "./resources/screensaver/index.html",
    }),
    {
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
