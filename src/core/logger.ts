export type LogLevel = "debug" | "info" | "warn" | "error";
export type UnsubscribeFn = () => void;

interface LogEntry {
  scope: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  time: number;
}

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
const logSinks = new Set<(entry: LogEntry) => void>();

export function createLogger(scope: string, level: LogLevel): Logger {
  const canLog = (candidate: LogLevel) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[level];

  const write = (candidate: LogLevel, message: string, data?: unknown) => {
    if (!canLog(candidate)) return;
    const entry: LogEntry = {
      scope,
      level: candidate,
      message,
      data,
      time: Date.now(),
    };
    for (const sink of logSinks) {
      sink(entry);
    }
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
  const sink = (entry: LogEntry): void => {
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
  };
  logSinks.add(sink);
  return () => {
    logSinks.delete(sink);
  };
}
