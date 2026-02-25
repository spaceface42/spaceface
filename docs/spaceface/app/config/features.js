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
    screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
};
export const devFeatures = {
    ...defaultFeatures,
    partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
};
//# sourceMappingURL=features.js.map