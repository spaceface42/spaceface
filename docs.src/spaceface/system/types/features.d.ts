export interface FloatingImagesManagerOptionsInterface {
    maxImages?: number;
    debug?: boolean;
}
export interface FloatingImagesManagerInterface {
    resetAllImagePositions(): void;
    destroy(): void;
    reinitializeImages(): void;
    init?(): Promise<void>;
}
export interface FloatingImageOptionsInterface {
    useSubpixel?: boolean;
    debug?: boolean;
}
export interface ContainerDimensionsInterface {
    width: number;
    height: number;
}
export interface ScreensaverControllerOptionsInterface {
    partialUrl: string;
    targetSelector: string;
    inactivityDelay?: number;
    onError?: (message: string, error: unknown) => void;
}
