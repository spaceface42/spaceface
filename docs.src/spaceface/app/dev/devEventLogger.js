import { eventBus } from '../symlink.js';
export function attachDevEventLogger(options = {}) {
    const isDevHost = ['localhost', '127.0.0.1'].some(host => window.location.hostname.includes(host));
    if (!isDevHost)
        return;
    eventBus.onAny((eventName, payload) => {
        if (!options.includeDebug) {
            if (eventName === 'log:debug')
                return;
            if (eventName === 'log' && payload?.level === 'debug')
                return;
        }
        const { level = 'log', args, ...otherDetails } = payload ?? {};
        if (!payload) {
            console.log(`[spaceface onAny] Event: ${eventName} - no payload`);
            return;
        }
        if (typeof payload === 'string') {
            console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);
            return;
        }
        const fullMessage = args ?? otherDetails ?? '(no details)';
        const methodMap = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
            log: 'log',
        };
        const method = methodMap[level] ?? 'log';
        console[method](`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
    });
}
//# sourceMappingURL=devEventLogger.js.map