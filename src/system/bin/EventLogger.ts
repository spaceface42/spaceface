// src/system/bin/EventLogger.ts
export const VERSION = '2.0.0' as const;

import { eventBus } from '../bin/EventBus.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'event';

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
  time: number;
}

export class EventLogger {
  private scope: string;
  private devMode: boolean;
  private fallbackLogs: LogEntry[] = []; // Fallback storage for logs

  constructor(scope: string, devMode: boolean = true) {
    this.scope = scope;
    this.devMode = devMode;
  }

  /**
   * Filters logs based on the configured log level.
   * Suppresses logs below the specified level in production.
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'event', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.devMode ? 'debug' : 'warn');
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Log a message with the specified level.
   * @param level The log level (e.g., debug, info, warn, error).
   * @param message The log message.
   * @param data Optional additional data to log.
   */
  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      scope: this.scope,
      message,
      data,
      time: Date.now()
    };

    try {
      // Attempt to emit structured log event
      eventBus.emit('log', entry);
    } catch (error) {
      // Fallback to in-memory storage if eventBus fails
      this.fallbackLogs.push(entry);
      if (this.devMode) {
        console.error(`[EventLogger][ERROR] Failed to emit log event`, { entry, error });
      }
    }

    // Console output only in devMode (except errors are always useful in dev)
    if (this.devMode) {
      console.debug(`[EventLogger][DEBUG] Logging to console`, { level, message, data }); // Debug log for visibility
      this.consoleOutput(level, message, data);
    }
  }

  /**
   * Output log to the console based on the log level.
   * @param level The log level.
   * @param message The log message.
   * @param data Optional additional data to log.
   */
  private consoleOutput(level: LogLevel, message: string, data?: unknown) {
    let method: 'log' | 'warn' | 'error';
    switch (level) {
      case 'warn': method = 'warn'; break;
      case 'error': method = 'error'; break;
      default: method = 'log'; // debug, info, event → log
    }

    const prefix = `[${this.scope}][${level.toUpperCase()}]`;
    if (data !== undefined) {
      console[method](prefix, message, data);
    } else {
      console[method](prefix, message);
    }
  }

  /**
   * Retrieve fallback logs stored in memory.
   * @returns An array of fallback log entries.
   */
  getFallbackLogs(): LogEntry[] {
    return this.fallbackLogs;
  }

  debug(msg: string, data?: unknown) { this.log('debug', msg, data); }
  info(msg: string, data?: unknown) { this.log('info', msg, data); }
  warn(msg: string, data?: unknown) { this.log('warn', msg, data); }
  event(msg: string, data?: unknown) { this.log('event', msg, data); }
  error(msg: string, data?: unknown) { this.log('error', msg, data); }
}
