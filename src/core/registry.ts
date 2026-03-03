import type { Feature, StartupContext } from "./lifecycle.js";

export interface FeatureConditions {
  mode?: "dev" | "prod" | "any";
  routeIncludes?: string;
  requiredSelector?: string;
}

export interface RegisteredFeature {
  feature: Feature;
  conditions: FeatureConditions;
}

export class FeatureRegistry {
  private features: RegisteredFeature[] = [];

  register(feature: Feature, conditions: FeatureConditions = {}): void {
    this.features.push({ feature, conditions });
  }

  resolve(ctx: StartupContext): Feature[] {
    return this.features
      .filter(({ conditions }) => this.matches(conditions, ctx))
      .map(({ feature }) => feature);
  }

  private matches(conditions: FeatureConditions, ctx: StartupContext): boolean {
    if (conditions.mode && conditions.mode !== "any" && conditions.mode !== ctx.config.mode) {
      return false;
    }

    if (conditions.routeIncludes && !ctx.route.includes(conditions.routeIncludes)) {
      return false;
    }

    if (conditions.requiredSelector) {
      return Boolean(document.querySelector(conditions.requiredSelector));
    }

    return true;
  }
}
