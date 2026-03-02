import { devStartupOptions } from './config/startup.js';
import { attachDevEventLogger } from './dev/devEventLogger.js';
import { startup } from './startup.js';

startup({
    ...devStartupOptions,
    enableDevEventLogging: () => attachDevEventLogger({ includeDebug: true }),
});
