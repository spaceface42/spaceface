import type { LogLevel } from "./logger.js";

export type RuntimeMode = "dev" | "prod";

export interface AppConfig {
  mode: RuntimeMode;
  logLevel: LogLevel;
  screensaverIdleMs: number;
}

export interface RawConfig {
  mode?: string;
  logLevel?: string;
  screensaverIdleMs?: number;
}

export const defaultConfig: AppConfig = {
  mode: "dev",
  logLevel: "debug",
  screensaverIdleMs: 12000,
};

export function resolveConfig(input: RawConfig = {}): AppConfig {
  const mode = input.mode === "prod" ? "prod" : "dev";

  const logLevel = toLogLevel(input.logLevel, mode);
  const screensaverIdleMs =
    typeof input.screensaverIdleMs === "number" && input.screensaverIdleMs > 0
      ? input.screensaverIdleMs
      : defaultConfig.screensaverIdleMs;

  return {
    mode,
    logLevel,
    screensaverIdleMs,
  };
}

function toLogLevel(value: string | undefined, mode: RuntimeMode): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return mode === "prod" ? "warn" : "debug";
}
