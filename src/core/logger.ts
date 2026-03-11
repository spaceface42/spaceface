export type LogLevel = "debug" | "info" | "warn" | "error";
export type UnsubscribeFn = () => void;
export type LogScopeMatcher = "any" | string | RegExp;

export interface LogEntry {
  scope: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  time: number;
}

export type LogListener = (entry: LogEntry) => void;

export interface Logger {
  child(scope: string): Logger;
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
const logSinks = new Set<LogListener>();

export function createLogger(scope: string, level: LogLevel): Logger {
  const canLog = (candidate: LogLevel) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[level];

  const createScopedLogger = (scopeName: string): Logger => {
    const write = (candidate: LogLevel, message: string, data?: unknown) => {
      if (!canLog(candidate)) return;
      const entry: LogEntry = {
        scope: scopeName,
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
      child: (childScope) => createScopedLogger(`${scopeName}:${childScope}`),
      debug: (message, data) => write("debug", message, data),
      info: (message, data) => write("info", message, data),
      warn: (message, data) => write("warn", message, data),
      error: (message, data) => write("error", message, data),
    };
  };

  return createScopedLogger(scope);
}

export function attachConsoleLogSink(minLevel: LogLevel = "debug"): UnsubscribeFn {
  const write = (method: "log" | "warn" | "error", entry: LogEntry): void => {
    const prefix = `[${entry.scope}] [${entry.level.toUpperCase()}]`;
    if (entry.data === undefined) {
      console[method](prefix, entry.message);
      return;
    }
    console[method](prefix, entry.message, entry.data);
  };

  const sink = (entry: LogEntry): void => {
    if (entry.level === "error") {
      write("error", entry);
      return;
    }
    if (entry.level === "warn") {
      write("warn", entry);
      return;
    }
    write("log", entry);
  };
  return subscribeLogs("any", sink, minLevel);
}

export function subscribeLogs(
  matcher: LogScopeMatcher,
  listener: LogListener,
  minLevel: LogLevel = "debug"
): UnsubscribeFn {
  const canLog = (candidate: LogLevel) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[minLevel];
  const sink: LogListener = (entry) => {
    if (!canLog(entry.level)) return;
    if (!matchesScope(matcher, entry.scope)) return;
    listener(entry);
  };

  logSinks.add(sink);
  return () => {
    logSinks.delete(sink);
  };
}

function matchesScope(matcher: LogScopeMatcher, scope: string): boolean {
  if (matcher === "any") {
    return true;
  }
  if (matcher instanceof RegExp) {
    return matcher.test(scope);
  }
  return scope === matcher || scope.startsWith(`${matcher}:`);
}
