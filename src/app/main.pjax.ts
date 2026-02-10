// src/spaceface/app/bin/main.pjax.ts

import { SpacefaceCore } from './spaceface.core.js';
import { initPjax } from './pjax.js';

// Initialize App (PJAX-enabled)
const app = new SpacefaceCore({
    features: {
        partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
        slideplayer: { interval: 5000, includePicture: false, showDots: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
});

app.initBase().then(async () => {
    // Register DOM-dependent features to re-run after PJAX swaps
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
