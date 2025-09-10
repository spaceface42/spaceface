// FloatingImagesManager
export interface IFloatingImagesManagerOptions {
    maxImages?: number;
    debug?: boolean;
}
export interface IFloatingImagesManager {
    resetAllImagePositions(): void;
    destroy(): void;
    reinitializeImages(): void;
    init?(): Promise<void>;
}

// FloatingImage
export interface IFloatingImageOptions {
    useSubpixel?: boolean;
    debug?: boolean;
}
export interface IContainerDimensions {
    width: number;
    height: number;
}

// ScreensaverController
export interface IScreensaverControllerOptions {
    partialUrl: string;
    targetSelector: string;
    inactivityDelay?: number;
    onError?: (message: string, error: unknown) => void;
}
