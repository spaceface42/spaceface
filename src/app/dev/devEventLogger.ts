import { eventBus } from '../symlink.js';

export interface DevEventLoggerOptions {
    includeDebug?: boolean;
}

export function attachDevEventLogger(options: DevEventLoggerOptions = {}): void {
    const isDevHost = ['localhost', '127.0.0.1'].some(host =>
        window.location.hostname.includes(host),
    );
    if (!isDevHost) return;

    eventBus.onAny((eventName: string, payload: any) => {
        if (!options.includeDebug) {
            if (eventName === 'log:debug') return;
            if (eventName === 'log' && payload?.level === 'debug') return;
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
        const methodMap: Record<'debug' | 'info' | 'warn' | 'error' | 'log', keyof Console> = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
            log: 'log',
        };
        const method = methodMap[level as keyof typeof methodMap] ?? 'log';
        (console as any)[method](`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] -`, fullMessage);
    });
}
