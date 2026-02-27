// src/system/features/MotionImages/types.ts

export type ImageMotionMode = 'drift' | 'rain' | 'warp' | 'parallax-drift' | 'brownian' | 'glitch-jump';

export interface MotionImageEngineOptionsInterface {
    maxImages?: number;
    debug?: boolean;
    hoverBehavior?: 'none' | 'slow' | 'stop';
    hoverSlowMultiplier?: number;
    tapToFreeze?: boolean;
    pauseOnScreensaver?: boolean;
}

export interface ContainerDimensionsInterface {
    width: number;
    height: number;
}

export interface MotionImageInterface {
    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition?: boolean): boolean;
    updatePosition(): boolean;
    getElement(): HTMLElement | null;
    resetPosition(dims: ContainerDimensionsInterface): void;
    updateSize(): void;
    clampPosition(dims: ContainerDimensionsInterface): void;
    destroy(): void;
}
