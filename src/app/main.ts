import { devFeatures } from './config/features.js';
import { attachDevEventLogger } from './dev/devEventLogger.js';
import { startup } from './startup.js';

startup({
    features: devFeatures,
    debug: true,
    usePartialLoader: true,
    enableDevEventLogging: () => attachDevEventLogger({ includeDebug: true }),
});
