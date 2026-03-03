import { eventBus } from "./events.js";
import { createLogger } from "./logger.js";
import type { AppConfig } from "./config.js";
import type { Feature, StartupContext, StartupResult } from "./lifecycle.js";
import type { Logger } from "./logger.js";

export class StartupPipeline {
  private readonly config: AppConfig;
  private readonly logger: Logger;
  private readonly featureInstances: Feature[] = [];
  private ctx: StartupContext;

  constructor(config: AppConfig) {
    this.config = config;
    this.logger = createLogger("startup", config.logLevel);
    this.ctx = {
      config,
      events: eventBus,
      logger: createLogger("app", config.logLevel),
      route: currentRoute(),
    };
  }

  async init(features: Feature[]): Promise<StartupResult> {
    this.ctx.route = currentRoute();
    eventBus.emit("startup:begin", { mode: this.config.mode });

    const initialized: string[] = [];
    const failed: Array<{ feature: string; error: unknown }> = [];

    for (const feature of features) {
      const start = performance.now();
      try {
        await feature.init(this.ctx);
        this.featureInstances.push(feature);
        initialized.push(feature.name);
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: true,
        });
      } catch (error) {
        failed.push({ feature: feature.name, error });
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: false,
          error,
        });
        this.logger.error(`Feature init failed: ${feature.name}`, error);
      }
    }

    eventBus.emit("startup:ready", {
      initialized,
      failed: failed.map((item) => item.feature),
    });

    return { initialized, failed };
  }

  async onRouteChange(path: string): Promise<void> {
    this.ctx.route = path;
    eventBus.emit("route:changed", { path });

    for (const feature of this.featureInstances) {
      if (!feature.onRouteChange) continue;
      try {
        await feature.onRouteChange(path, this.ctx);
      } catch (error) {
        this.logger.warn(`Feature route handler failed: ${feature.name}`, error);
      }
    }
  }

  async reconcileFeatures(features: Feature[], path: string): Promise<void> {
    this.ctx.route = path;
    eventBus.emit("route:changed", { path });

    const nextByName = new Map(features.map((feature) => [feature.name, feature] as const));
    const currentByName = new Map(this.featureInstances.map((feature) => [feature.name, feature] as const));

    for (const [name, feature] of currentByName.entries()) {
      if (nextByName.has(name)) continue;
      try {
        await feature.destroy?.();
      } catch (error) {
        this.logger.warn(`Feature destroy during route reconcile failed: ${name}`, error);
      }
    }

    const retainedNames = new Set<string>();
    for (const [name, feature] of currentByName.entries()) {
      if (!nextByName.has(name)) continue;
      retainedNames.add(name);
      if (!feature.onRouteChange) continue;
      try {
        await feature.onRouteChange(path, this.ctx);
      } catch (error) {
        this.logger.warn(`Feature route handler failed: ${name}`, error);
      }
    }

    for (const [name, feature] of nextByName.entries()) {
      if (retainedNames.has(name)) continue;
      const start = performance.now();
      try {
        await feature.init(this.ctx);
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: true,
        });
      } catch (error) {
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: false,
          error,
        });
        this.logger.error(`Feature init during route reconcile failed: ${name}`, error);
      }
    }

    this.featureInstances.length = 0;
    for (const feature of features) {
      this.featureInstances.push(feature);
    }
  }

  async destroy(reason = "manual"): Promise<void> {
    eventBus.emit("startup:destroy", { reason });

    for (let i = this.featureInstances.length - 1; i >= 0; i -= 1) {
      const feature = this.featureInstances[i];
      try {
        await feature.destroy?.();
      } catch (error) {
        this.logger.warn(`Feature destroy failed: ${feature.name}`, error);
      }
    }

    this.featureInstances.length = 0;
  }
}

function currentRoute(): string {
  return window.location.pathname;
}
