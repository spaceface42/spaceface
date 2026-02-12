// src/spaceface/system/types/features.ts

// FloatingImagesManager
export interface FloatingImagesManagerOptionsInterface {
    maxImages?: number;
    debug?: boolean;
    hoverBehavior?: 'none' | 'slow' | 'stop';
    hoverSlowMultiplier?: number;
    tapToFreeze?: boolean;
}
export interface FloatingImagesManagerInterface {
    resetAllImagePositions(): void;
    destroy(): void;
    reinitializeImages(): void;
    init?(): Promise<void>;
}

// FloatingImage
export interface FloatingImageOptionsInterface {
    useSubpixel?: boolean;
    debug?: boolean;
}
export interface ContainerDimensionsInterface {
    width: number;
    height: number;
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
}
