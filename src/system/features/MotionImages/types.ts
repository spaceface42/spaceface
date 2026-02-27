// src/system/features/MotionImages/types.ts

export type ImageMotionMode = 'drift' | 'rain';

export interface MotionImageEngineOptionsInterface {
    maxImages?: number;
    debug?: boolean;
    hoverBehavior?: 'none' | 'slow' | 'stop';
    hoverSlowMultiplier?: number;
    tapToFreeze?: boolean;
    pauseOnScreensaver?: boolean;
}

export interface MotionImageOptionsInterface {
    useSubpixel?: boolean;
    debug?: boolean;
    motionMode?: ImageMotionMode;
}

export interface ContainerDimensionsInterface {
    width: number;
    height: number;
}

export interface ImageMotionStateInterface {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: { width: number; height: number };
}

export interface ImageMotionInterface {
    initialize(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void;
    step(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void;
    reset(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void;
}
