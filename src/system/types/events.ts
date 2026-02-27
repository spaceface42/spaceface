import type { LogPayload, PartialEventPayload } from './bin.js';

export const EVENTS = {
  LOG: 'log',
  LOG_DEBUG: 'log:debug',
  LOG_ERROR: 'log:error',
  TELEMETRY: 'telemetry',
  USER_ACTIVE: 'user:active',
  USER_INACTIVE: 'user:inactive',
  SCREENSAVER_INITIALIZED: 'screensaver:initialized',
  SCREENSAVER_SHOWN: 'screensaver:shown',
  SCREENSAVER_HIDDEN: 'screensaver:hidden',
  SCREENSAVER_ERROR: 'screensaver:error',
  SCREENSAVER_LOG: 'screensaver:log',
  SLIDEPLAYER_LOG: 'slideplayer:log',
  MOTION_IMAGES_LOG: 'motionImages:log',
  PARTIAL_LOADED: 'partial:loaded',
  PARTIAL_ERROR: 'partial:error',
  PARTIAL_LOAD_COMPLETE: 'partial:load:complete',
  PARTIALS_ALL_LOADED: 'partials:allLoaded',
} as const;

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
  'screensaver:log': { level: 'debug' | 'info' | 'warn' | 'error'; message: string; data?: unknown };
  'slideplayer:log': { level: 'debug' | 'info' | 'warn' | 'error'; message: string; data?: unknown };
  'motionImages:log': { level: 'debug' | 'info' | 'warn' | 'error'; message: string; data?: unknown };
  'partial:loaded': PartialEventPayload;
  'partial:error': PartialEventPayload;
  'partial:load:complete': PartialEventPayload;
  'partials:allLoaded': PartialEventPayload;
  [event: string]: unknown;
}
