export const VERSION = 'nextworld-1.0.0';
import { eventBus } from '../bin/EventBus.js';
import { EventBinder } from '../bin/EventBinder.js';
export class Logger {
    static binder = new EventBinder();
    static log(level = 'info', message, details = {}) {
        eventBus.emit('log', {
            level,
            message,
            details,
            timestamp: new Date().toISOString()
        });
    }
    static info(msg, details = {}) { this.log('info', msg, details); }
    static warn(msg, details = {}) { this.log('warn', msg, details); }
    static error(msg, details = {}) { this.log('error', msg, details); }
    static debug(msg, details = {}) { this.log('debug', msg, details); }
    static onLog(fn) {
        this.binder.bindBus('log', fn);
    }
}
//# sourceMappingURL=logging.js.map