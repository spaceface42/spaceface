import { SpacefaceCore } from './spaceface.core.js';
import type { SpacefaceFeaturesConfig } from './types.js';

export interface StartupOptions {
    features: SpacefaceFeaturesConfig;
    debug?: boolean;
    usePartialLoader?: boolean;
    usePjax?: boolean;
    pjaxContainerSelector?: string;
    enableDevEventLogging?: () => void;
}

export function startup(options: StartupOptions): SpacefaceCore {
    const app = new SpacefaceCore({
        features: options.features,
        debug: options.debug,
    });

    void app.initBase().then(async () => {
        if (options.enableDevEventLogging) {
            options.enableDevEventLogging();
        }

        if (options.usePartialLoader) {
            await app.initPartialLoader();
        }

        await app.initDomFeatures();
        await app.initOnceFeatures();
        app.finishInit();

        if (options.usePjax) {
            const { initPjax } = await import('./pjax.js');
            initPjax({ containerSelector: options.pjaxContainerSelector ?? '[data-pjax="container"]' });
            document.addEventListener('pjax:complete', () => {
                void app.handlePjaxComplete();
            });
        }
    });

    window.addEventListener('beforeunload', () => {
        app.destroy();
        app.log('info', 'App destroyed on beforeunload');
    });

    return app;
}
