import { eventBus } from './symlink.js';
import { SpacefaceCore } from './spaceface.core.js';
const app = new SpacefaceCore({
    features: {
        partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
        slideplayer: { interval: 5000, includePicture: false, showDots: false },
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
const isDev = ['localhost', '127.0.0.1'].some(host => window.location.hostname.includes(host));
if (isDev) {
    eventBus.onAny((eventName, payload) => {
        if (eventName === 'log:debug')
            return;
        if (eventName === 'log' && payload?.level === 'debug')
            return;
        const { level = 'log', args, ...otherDetails } = payload ?? {};
        if (!payload)
            return console.log(`[spaceface onAny] Event: ${eventName} – no payload!`);
        if (typeof payload === 'string')
            return console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);
        const fullMessage = args ?? otherDetails ?? '(no details)';
        const methodMap = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
            log: 'log',
        };
        const method = methodMap[level] ?? 'log';
        console[method](`[SPCFC *] Event: ${eventName} [${String(level).toUpperCase()}] –`, fullMessage);
    });
}
window.addEventListener('beforeunload', () => {
    app.destroy();
    app.log('info', 'App destroyed on beforeunload');
});
//# sourceMappingURL=main.js.map