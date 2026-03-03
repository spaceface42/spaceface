// src/system/types/features.ts

import type { ImageMotionMode } from '../features/MotionImages/types.js';

// Motion image runtime contract
export interface MotionImageEngineInterface {
    resetAllImagePositions(): void;
    destroy(): void;
    reinitializeImages(): void;
    init?(): Promise<void>;
}

// ScreensaverController
export interface ScreensaverControllerOptionsInterface {
    /** URL of the partial HTML to load when the screensaver shows */
    partialUrl: string;

    /** CSS selector of the container where the partial will be inserted */
    targetSelector: string;

    /** Delay in milliseconds before inactivity triggers the screensaver (default 12000) */
    inactivityDelay?: number;

    /** Optional callback for errors during screensaver operations */
    onError?: (message: string, error: unknown) => void;

    /** Motion behavior for screensaver images */
    motionMode?: ImageMotionMode;
}
