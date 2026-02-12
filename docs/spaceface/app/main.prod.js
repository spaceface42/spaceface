import { SpacefaceCore } from './spaceface.core.js';
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
};
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
//# sourceMappingURL=main.prod.js.map