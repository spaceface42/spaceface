import { eventBus } from '../symlink.js';
export function attachDevEventLogger(options = {}) {
    const isDevHost = ['localhost', '127.0.0.1'].some(host => window.location.hostname.includes(host));
    if (!isDevHost)
        return;
    eventBus.onAny((eventName, payload) => {
        if (!options.includeDebug) {
            const maybeLevel = (typeof payload === 'object' &&
                payload !== null &&
                'level' in payload) ? payload.level : undefined;
            if (eventName === 'log:debug')
                return;
            if (eventName === 'log' && maybeLevel === 'debug')
                return;
        }
        const objectPayload = typeof payload === 'object' && payload !== null
            ? payload
            : undefined;
        const { level = 'log', args, ...otherDetails } = objectPayload ?? {};
        if (!payload) {
            console.log(`[spaceface onAny] Event: ${eventName} - no payload`);
            return;
        }
        if (typeof payload === 'string') {
            console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);
            return;
        }
        const fullMessage = args ?? otherDetails ?? '(no details)';
        const method = ['debug', 'info', 'warn', 'error', 'log'].includes(level)
            ? level
            : 'log';
        switch (method) {
            case 'debug':
                console.debug(`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
                break;
            case 'info':
                console.info(`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
                break;
            case 'warn':
                console.warn(`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
                break;
            case 'error':
                console.error(`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
                break;
            default:
                console.log(`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
        }
    });
}
//# sourceMappingURL=devEventLogger.js.map