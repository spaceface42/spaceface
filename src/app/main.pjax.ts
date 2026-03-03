import { createPjaxStartupOptions } from './config/startup.js';
import { isDevHost } from './config/runtime.js';
import { attachDevEventLogger } from './dev/devEventLogger.js';
import { startup } from './startup.js';

const devHost = isDevHost(window.location.hostname);

startup({
    ...createPjaxStartupOptions(window.location.hostname),
    enableDevEventLogging: () => attachDevEventLogger({ includeDebug: devHost }),
});
