import type { SpacefaceFeaturesConfig } from '../types.js';

export const defaultFeatures = {
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
        includePicture: false,
        debug: false,
    },
    /**
     * screensaver can be rain drift warp brownian parallax-drift
     */
    screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html', motionMode: 'brownian' },
} satisfies SpacefaceFeaturesConfig;

export const devFeatures = {
    ...defaultFeatures,
    partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
} satisfies SpacefaceFeaturesConfig;
