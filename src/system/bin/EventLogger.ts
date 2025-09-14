// src/system/bin/EventLogger.ts

import { eventBus } from '../bin/EventBus.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'event';

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  data?: any;
  time: number;
}

export class EventLogger {
  private scope: string;
  private devMode: boolean;

  constructor(scope: string, devMode: boolean = true) {
    this.scope = scope;
    this.devMode = devMode;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      scope: this.scope,
      message,
      data,
      time: Date.now()
    };

    // Always emit structured log event
    eventBus.emit('log', entry);

    // Console output only in devMode (except errors are always useful in dev)
    if (this.devMode) {
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
  }

  debug(msg: string, data?: any) { this.log('debug', msg, data); }
  info(msg: string, data?: any) { this.log('info', msg, data); }
  warn(msg: string, data?: any) { this.log('warn', msg, data); }
  event(msg: string, data?: any) { this.log('event', msg, data); }
  error(msg: string, data?: any) { this.log('error', msg, data); }
}
