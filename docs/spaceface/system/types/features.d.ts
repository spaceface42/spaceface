export interface FloatingImagesManagerInterface {
    resetAllImagePositions(): void;
    destroy(): void;
    reinitializeImages(): void;
    init?(): Promise<void>;
}
export interface ScreensaverControllerOptionsInterface {
    partialUrl: string;
    targetSelector: string;
    inactivityDelay?: number;
    onError?: (message: string, error: unknown) => void;
}
