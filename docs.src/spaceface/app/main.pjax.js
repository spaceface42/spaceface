import { SpacefaceCore } from './spaceface.core.js';
import { initPjax } from './pjax.js';
const app = new SpacefaceCore({
    features: {
        partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
        slideplayer: { interval: 5000, includePicture: false, showDots: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
});
app.initBase().then(async () => {
    app.registerPjaxFeature('slideplayer', () => app.initSlidePlayer());
    await app.initPartialLoader();
    await app.initDomFeatures();
    await app.initOnceFeatures();
    app.finishInit();
    initPjax({ containerSelector: '[data-pjax="container"]' });
    document.addEventListener('pjax:complete', () => {
        void app.handlePjaxComplete();
    });
});
window.addEventListener('beforeunload', () => {
    app.destroy();
    app.log('info', 'App destroyed on beforeunload');
});
//# sourceMappingURL=main.pjax.js.map