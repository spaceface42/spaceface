export interface FloatingImagesManagerOptionsInterface {
    maxImages?: number;
    debug?: boolean;
    hoverBehavior?: 'none' | 'slow' | 'stop';
    hoverSlowMultiplier?: number;
    tapToFreeze?: boolean;
}
export interface FloatingImageOptionsInterface {
    useSubpixel?: boolean;
    debug?: boolean;
}
export interface ContainerDimensionsInterface {
    width: number;
    height: number;
}
