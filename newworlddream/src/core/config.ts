import type { LogLevel } from "./logger.js";

export type RuntimeMode = "dev" | "prod";

export interface AppConfig {
  mode: RuntimeMode;
  logLevel: LogLevel;
  screensaverIdleMs: number;
  routeSelector: string;
}

export interface RawConfig {
  mode?: string;
  logLevel?: string;
  screensaverIdleMs?: number;
  routeSelector?: string;
}

export const defaultConfig: AppConfig = {
  mode: "dev",
  logLevel: "debug",
  screensaverIdleMs: 12000,
  routeSelector: "html[data-page]",
};

export function resolveConfig(input: RawConfig = {}): AppConfig {
  const mode = input.mode === "prod" ? "prod" : "dev";

  const logLevel = toLogLevel(input.logLevel, mode);
  const screensaverIdleMs =
    typeof input.screensaverIdleMs === "number" && input.screensaverIdleMs > 0
      ? input.screensaverIdleMs
      : defaultConfig.screensaverIdleMs;

  const routeSelector =
    typeof input.routeSelector === "string" && input.routeSelector.trim().length > 0
      ? input.routeSelector
      : defaultConfig.routeSelector;

  return {
    mode,
    logLevel,
    screensaverIdleMs,
    routeSelector,
  };
}

function toLogLevel(value: string | undefined, mode: RuntimeMode): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return mode === "prod" ? "warn" : "debug";
}
