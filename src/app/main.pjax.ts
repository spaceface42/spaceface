import { defaultFeatures } from './config/features.js';
import { attachDevEventLogger } from './dev/devEventLogger.js';
import { startup } from './startup.js';

const isDevHost = ['localhost', '127.0.0.1'].some(host =>
    window.location.hostname.includes(host),
);

startup({
    features: defaultFeatures,
    debug: isDevHost,
    usePjax: true,
    pjaxContainerSelector: '[data-pjax="container"]',
    enableDevEventLogging: () => attachDevEventLogger({ includeDebug: isDevHost }),
});
