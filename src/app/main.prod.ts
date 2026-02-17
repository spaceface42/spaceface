// src/spaceface/app/bin/main.prod.ts

import { SpacefaceCore } from './spaceface.core.js';
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
    scrollDeck: {
        selector: '.scroll-deck-container',
        slideSelector: '.slide',
        trackSelector: '#track',
        hudSelector: '#hud',
        hintSelector: '#hint',
        topStripPx: 100,
        gate: 0.12,
        backZPx: -220,
        backScaleEnd: 0.78,
        scrollPerSegment: 1.6,
        hideHintAfter: 0.12,
    },
    screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
} satisfies SpacefaceFeaturesConfig;

// Initialize App (production defaults)
const app = new SpacefaceCore({
    features,
});

app.initBase().then(async () => {
    await app.initDomFeatures();
    await app.initOnceFeatures();
    app.finishInit();
});

window.addEventListener('beforeunload', () => {
    app.destroy();
    app.log('info', 'App destroyed on beforeunload');
});
