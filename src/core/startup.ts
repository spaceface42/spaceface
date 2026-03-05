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
  private reconcileInFlight: Promise<void> | null = null;
  private warnedRouteBinding = new Set<string>();

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
    this.featureInstances.length = 0;

    const initialized: string[] = [];
    const failed: Array<{ feature: string; error: unknown }> = [];
    features.forEach((feature) => this.warnIfDomBoundWithoutRouteHandler(feature));

    const results = await Promise.all(
      features.map(async (feature) => {
        const start = performance.now();
        try {
          await feature.init(this.ctx);
          const durationMs = Math.round(performance.now() - start);
          eventBus.emit("startup:feature:init", {
            feature: feature.name,
            durationMs,
            ok: true,
          });
          return { feature, ok: true as const, durationMs };
        } catch (error) {
          const durationMs = Math.round(performance.now() - start);
          eventBus.emit("startup:feature:init", {
            feature: feature.name,
            durationMs,
            ok: false,
            error,
          });
          this.logger.error(`Feature init failed: ${feature.name}`, error);
          return { feature, ok: false as const, durationMs, error };
        }
      })
    );

    for (const result of results) {
      if (result.ok) {
        this.featureInstances.push(result.feature);
        initialized.push(result.feature.name);
      } else {
        failed.push({ feature: result.feature.name, error: result.error });
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
    const runInFlight = async () => {
      if (this.reconcileInFlight) {
        await this.reconcileInFlight;
      }
      await this.reconcileFeaturesInternal(features, path);
    };

    const inFlight = runInFlight().finally(() => {
      if (this.reconcileInFlight === inFlight) {
        this.reconcileInFlight = null;
      }
    });

    this.reconcileInFlight = inFlight;
    await inFlight;
  }

  private async reconcileFeaturesInternal(features: Feature[], path: string): Promise<void> {
    this.ctx.route = path;
    eventBus.emit("route:changed", { path });
    features.forEach((feature) => this.warnIfDomBoundWithoutRouteHandler(feature));

    const nextByName = new Map(features.map((feature) => [feature.name, feature] as const));
    const currentByName = new Map(this.featureInstances.map((feature) => [feature.name, feature] as const));
    const nextActive: Feature[] = [];

    for (const [name, feature] of currentByName.entries()) {
      const nextFeature = nextByName.get(name);
      if (nextFeature && nextFeature === feature) continue;
      try {
        await feature.destroy?.();
      } catch (error) {
        this.logger.warn(`Feature destroy during route reconcile failed: ${name}`, error);
      }
    }

    for (const [name, feature] of currentByName.entries()) {
      const nextFeature = nextByName.get(name);
      if (!nextFeature || nextFeature !== feature) continue;
      nextActive.push(feature);
      if (!feature.onRouteChange) continue;
      try {
        await feature.onRouteChange(path, this.ctx);
      } catch (error) {
        this.logger.warn(`Feature route handler failed: ${name}`, error);
      }
    }

    const featuresToInit: Feature[] = [];
    for (const [name, feature] of nextByName.entries()) {
      const currentFeature = currentByName.get(name);
      if (currentFeature && currentFeature === feature) continue;
      featuresToInit.push(feature);
    }

    const initResults = await Promise.all(
      featuresToInit.map(async (feature) => {
        const start = performance.now();
        try {
          await feature.init(this.ctx);
          eventBus.emit("startup:feature:init", {
            feature: feature.name,
            durationMs: Math.round(performance.now() - start),
            ok: true,
          });
          return { feature, ok: true as const };
        } catch (error) {
          eventBus.emit("startup:feature:init", {
            feature: feature.name,
            durationMs: Math.round(performance.now() - start),
            ok: false,
            error,
          });
          this.logger.error(`Feature init during route reconcile failed: ${feature.name}`, error);
          return { feature, ok: false as const };
        }
      })
    );

    for (const result of initResults) {
      if (result.ok) {
        nextActive.push(result.feature);
      }
    }

    this.featureInstances.length = 0;
    for (const feature of nextActive) {
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

  private warnIfDomBoundWithoutRouteHandler(feature: Feature): void {
    if (this.config.mode !== "dev") return;
    if (!feature.domBound) return;
    if (typeof feature.onRouteChange === "function") return;
    const key = feature.name;
    if (this.warnedRouteBinding.has(key)) return;
    this.warnedRouteBinding.add(key);
    this.logger.warn(
      `DOM-bound feature "${feature.name}" has no onRouteChange handler; route swaps may leave stale DOM refs.`
    );
  }
}

function currentRoute(): string {
  return window.location.pathname;
}
