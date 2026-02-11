import { eventBus } from './EventBus.js';
export class Logger {
    constructor() {
        eventBus.on('eventbus:error', ({ message, error }) => {
            console.error('[EVENTBUS ERROR]', message, error);
        });
        eventBus.on('log', ({ level, scope, message }) => {
            const prefix = `[${level.toUpperCase()}] [${scope}]`;
            switch (level) {
                case 'debug':
                    console.debug(prefix, message);
                    break;
                case 'info':
                    console.info(prefix, message);
                    break;
                case 'warn':
                    console.warn(prefix, message);
                    break;
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'event':
                    console.log(prefix, message);
                    break;
                default:
                    console.log(prefix, message);
                    break;
            }
        });
    }
    log(level, scope, message) {
        eventBus.emit('log', { level, scope, message });
    }
}
export const logger = new Logger();
//# sourceMappingURL=Logger.js.map