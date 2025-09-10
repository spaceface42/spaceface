export const VERSION = 'nextworld-1.0.0';

import { eventBus } from '../bin/EventBus.js';
import { EventBinder } from '../bin/EventBinder.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | string;

interface LogDetails {
  [key: string]: any;
}

interface LogEvent {
  level: LogLevel;
  message: string;
  details: LogDetails;
  timestamp: string;
}

// --- Minimal logger ---
export class Logger {
  // ✅ Persistent binder (no auto-unbind needed)
  private static binder = new EventBinder();

  static log(
    level: LogLevel = 'info',
    message: string,
    details: LogDetails = {}
  ): void {
    eventBus.emit<LogEvent>('log', {
      level,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Optional sugar
  static info(msg: string, details: LogDetails = {}) { this.log('info', msg, details); }
  static warn(msg: string, details: LogDetails = {}) { this.log('warn', msg, details); }
  static error(msg: string, details: LogDetails = {}) { this.log('error', msg, details); }
  static debug(msg: string, details: LogDetails = {}) { this.log('debug', msg, details); }

  // ✅ Consumers can bind safely
  static onLog(fn: (e: LogEvent) => void): void {
    this.binder.bindBus('log', fn);
  }
}
