import type { AppConfig } from "./config.js";
import type { EventBus, AppEventMap } from "./events.js";
import type { Logger } from "./logger.js";

export interface StartupContext {
  config: AppConfig;
  events: EventBus<AppEventMap>;
  logger: Logger;
  route: string;
}

export interface Feature {
  readonly name: string;
  init(ctx: StartupContext): Promise<void> | void;
  destroy?(): Promise<void> | void;
  onRouteChange?(nextRoute: string, ctx: StartupContext): Promise<void> | void;
}

export interface StartupResult {
  initialized: string[];
  failed: Array<{ feature: string; error: unknown }>;
}
