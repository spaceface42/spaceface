// src/spaceface/app/bin/main.ts

import { eventBus } from './symlink.js';
import { SpacefaceCore } from './spaceface.core.js';

// Initialize App (dev/learning)
const app = new SpacefaceCore({
    features: {
        partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
        slideplayer: { interval: 5000, includePicture: false },
        floatingImages: { selector: '.floating-images-container', maxImages: 24, debug: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
});

app.initBase().then(async () => {
    await app.initPartialLoader();
    await app.initDomFeatures();
    await app.initOnceFeatures();
    app.finishInit();
});

// Dev Event Logging
const isDev = ['localhost', '127.0.0.1'].some(host =>
    window.location.hostname.includes(host),
);

if (isDev) {
    eventBus.onAny((eventName: string, payload: any) => {
        // Filter noisy debug logs while keeping functional events visible.
        if (eventName === 'log:debug') return;
        if (eventName === 'log' && payload?.level === 'debug') return;
        const { level = 'log', args, ...otherDetails } = payload ?? {};
        if (!payload) return console.log(`[spaceface onAny] Event: ${eventName} – no payload!`);
        if (typeof payload === 'string') return console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);

        const fullMessage = args ?? otherDetails ?? '(no details)';
        const methodMap: Record<'debug' | 'info' | 'warn' | 'error' | 'log', keyof Console> = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
            log: 'log',
        };
        const method = methodMap[level as keyof typeof methodMap] ?? 'log';
        (console as any)[method](`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] –`, fullMessage);
    });
}

window.addEventListener('beforeunload', () => {
    app.destroy();
    app.log('info', 'App destroyed on beforeunload');
});
