import type { LogPayload, PartialEventPayload } from './bin.js';
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
