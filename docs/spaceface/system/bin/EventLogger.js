export const VERSION = 'nextworld-1.3.0';
import { eventBus } from '../bin/EventBus.js';
export class EventLogger {
    scope;
    devMode;
    fallbackLogs = [];
    constructor(scope, devMode = true) {
        this.scope = scope;
        this.devMode = devMode;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'event', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.devMode ? 'debug' : 'warn');
        const logLevelIndex = levels.indexOf(level);
        return logLevelIndex >= currentLevelIndex;
    }
    log(level, message, data) {
        if (!this.shouldLog(level))
            return;
        const entry = {
            level,
            scope: this.scope,
            message,
            data,
            time: Date.now()
        };
        try {
            eventBus.emit('log', entry);
        }
        catch (error) {
            this.fallbackLogs.push(entry);
            if (this.devMode) {
                console.error(`[EventLogger][ERROR] Failed to emit log event`, { entry, error });
            }
        }
        if (this.devMode) {
            console.debug(`[EventLogger][DEBUG] Logging to console`, { level, message, data });
            this.consoleOutput(level, message, data);
        }
    }
    consoleOutput(level, message, data) {
        let method;
        switch (level) {
            case 'warn':
                method = 'warn';
                break;
            case 'error':
                method = 'error';
                break;
            default: method = 'log';
        }
        const prefix = `[${this.scope}][${level.toUpperCase()}]`;
        if (data !== undefined) {
            console[method](prefix, message, data);
        }
        else {
            console[method](prefix, message);
        }
    }
    getFallbackLogs() {
        return this.fallbackLogs;
    }
    debug(msg, data) { this.log('debug', msg, data); }
    info(msg, data) { this.log('info', msg, data); }
    warn(msg, data) { this.log('warn', msg, data); }
    event(msg, data) { this.log('event', msg, data); }
    error(msg, data) { this.log('error', msg, data); }
}
//# sourceMappingURL=EventLogger.js.map