import type { LogPayload, PartialEventPayload } from './bin.js';
export declare const EVENTS: {
    readonly LOG: "log";
    readonly LOG_DEBUG: "log:debug";
    readonly LOG_ERROR: "log:error";
    readonly TELEMETRY: "telemetry";
    readonly USER_ACTIVE: "user:active";
    readonly USER_INACTIVE: "user:inactive";
    readonly SCREENSAVER_INITIALIZED: "screensaver:initialized";
    readonly SCREENSAVER_SHOWN: "screensaver:shown";
    readonly SCREENSAVER_HIDDEN: "screensaver:hidden";
    readonly SCREENSAVER_ERROR: "screensaver:error";
    readonly SCREENSAVER_LOG: "screensaver:log";
    readonly SLIDEPLAYER_LOG: "slideplayer:log";
    readonly FLOATING_IMAGES_LOG: "floatingImages:log";
    readonly PARTIAL_LOADED: "partial:loaded";
    readonly PARTIAL_ERROR: "partial:error";
    readonly PARTIAL_LOAD_COMPLETE: "partial:load:complete";
    readonly PARTIALS_ALL_LOADED: "partials:allLoaded";
};
export interface TelemetryPayload {
    type: string;
    feature?: string;
    status?: 'success' | 'skipped' | 'error';
    duration?: string;
    value?: string;
    page?: string;
    error?: unknown;
}
export interface UserActivityPayload {
    lastActiveAt: number;
    inactivityDelay: number;
    visible: boolean;
    inactiveAt?: number;
}
export interface ScreensaverVisibilityPayload {
    targetSelector: string;
}
export interface ScreensaverErrorPayload {
    message: string;
    error: unknown;
}
export interface SpacefaceEventMap {
    log: LogPayload;
    'log:debug': LogPayload;
    'log:error': unknown;
    telemetry: TelemetryPayload;
    'user:active': UserActivityPayload;
    'user:inactive': UserActivityPayload;
    'screensaver:initialized': string;
    'screensaver:shown': ScreensaverVisibilityPayload;
    'screensaver:hidden': ScreensaverVisibilityPayload;
    'screensaver:error': ScreensaverErrorPayload;
    'screensaver:log': {
        level: 'debug' | 'info' | 'warn' | 'error';
        message: string;
        data?: unknown;
    };
    'slideplayer:log': {
        level: 'debug' | 'info' | 'warn' | 'error';
        message: string;
        data?: unknown;
    };
    'floatingImages:log': {
        level: 'debug' | 'info' | 'warn' | 'error';
        message: string;
        data?: unknown;
    };
    'partial:loaded': PartialEventPayload;
    'partial:error': PartialEventPayload;
    'partial:load:complete': PartialEventPayload;
    'partials:allLoaded': PartialEventPayload;
    [event: string]: unknown;
}
