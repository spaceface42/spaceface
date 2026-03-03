export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(scope: string, level: LogLevel): Logger {
  const canLog = (candidate: LogLevel) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[level];

  const write = (candidate: LogLevel, message: string, data?: unknown) => {
    if (!canLog(candidate)) return;
    const prefix = `[${scope}] [${candidate.toUpperCase()}]`;
    if (candidate === "error") {
      console.error(prefix, message, data);
      return;
    }
    if (candidate === "warn") {
      console.warn(prefix, message, data);
      return;
    }
    console.log(prefix, message, data);
  };

  return {
    debug: (message, data) => write("debug", message, data),
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data),
  };
}
