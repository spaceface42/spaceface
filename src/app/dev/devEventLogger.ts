import { eventBus } from '../symlink.js';

export interface DevEventLoggerOptions {
    includeDebug?: boolean;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';
type EventPayloadObject = {
    level?: LogLevel;
    args?: unknown;
    [key: string]: unknown;
};

export function attachDevEventLogger(options: DevEventLoggerOptions = {}): void {
    const isDevHost = ['localhost', '127.0.0.1'].some(host =>
        window.location.hostname.includes(host),
    );
    if (!isDevHost) return;

    eventBus.onAny((eventName: string, payload: unknown) => {
        if (!options.includeDebug) {
            const maybeLevel = (
                typeof payload === 'object' &&
                payload !== null &&
                'level' in payload
            ) ? (payload as { level?: unknown }).level : undefined;
            if (eventName === 'log:debug') return;
            if (eventName === 'log' && maybeLevel === 'debug') return;
        }

        const objectPayload: EventPayloadObject | undefined =
            typeof payload === 'object' && payload !== null
                ? payload as EventPayloadObject
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
        const method = (['debug', 'info', 'warn', 'error', 'log'] as const).includes(level)
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
