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
export declare function startup(options: StartupOptions): SpacefaceCore;
