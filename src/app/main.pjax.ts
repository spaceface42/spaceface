// src/spaceface/app/bin/main.pjax.ts

import { SpacefaceCore } from './spaceface.core.js';
import { initPjax } from './pjax.js';
import type { SpacefaceFeaturesConfig } from './types.js';

const features = {
    slideplayer: { interval: 5000, includePicture: false },
    floatingImages: {
        selector: '.floating-images-container',
        maxImages: 24,
        debug: false,
        hoverBehavior: 'slow',
        hoverSlowMultiplier: 0.2,
        tapToFreeze: true,
    },
    screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
} satisfies SpacefaceFeaturesConfig;

// Initialize App (PJAX-enabled)
const app = new SpacefaceCore({
    features,
});

app.initBase().then(async () => {
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
