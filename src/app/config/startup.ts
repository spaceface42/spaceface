import type { StartupOptions } from '../startup.js';
import { defaultFeatures, devFeatures } from './features.js';
import { DEFAULT_PJAX_CONTAINER_SELECTOR, isDevHost } from './runtime.js';

export const prodStartupOptions = {
    features: defaultFeatures,
    debug: false,
} satisfies StartupOptions;

export const devStartupOptions = {
    features: devFeatures,
    debug: true,
    usePartialLoader: true,
} satisfies StartupOptions;

export function createPjaxStartupOptions(hostname: string): StartupOptions {
    const debug = isDevHost(hostname);
    return {
        features: defaultFeatures,
        debug,
        usePjax: true,
        pjaxContainerSelector: DEFAULT_PJAX_CONTAINER_SELECTOR,
    };
}
