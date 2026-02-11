import { SpacefaceCore } from './spaceface.core.js';
const app = new SpacefaceCore({
    features: {
        slideplayer: { interval: 5000, includePicture: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
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