import { eventBus } from "./events.js";
import type { UnsubscribeFn } from "./events.js";

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
    eventBus.emit("log:entry", {
      scope,
      level: candidate,
      message,
      data,
      time: Date.now(),
    });
  };

  return {
    debug: (message, data) => write("debug", message, data),
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data),
  };
}

export function attachConsoleLogSink(minLevel: LogLevel = "debug"): UnsubscribeFn {
  const canLog = (candidate: LogLevel) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[minLevel];

  return eventBus.on("log:entry", (entry) => {
    if (!canLog(entry.level)) return;
    const prefix = `[${entry.scope}] [${entry.level.toUpperCase()}]`;
    if (entry.level === "error") {
      console.error(prefix, entry.message, entry.data);
      return;
    }
    if (entry.level === "warn") {
      console.warn(prefix, entry.message, entry.data);
      return;
    }
    console.log(prefix, entry.message, entry.data);
  });
}
