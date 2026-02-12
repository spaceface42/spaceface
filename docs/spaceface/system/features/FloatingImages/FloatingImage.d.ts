export declare const VERSION: "2.0.0";
import type { ContainerDimensionsInterface, FloatingImageOptionsInterface } from '../../types/features.js';
export declare class FloatingImage {
    private element;
    private size;
    private x;
    private y;
    private vx;
    private vy;
    private options;
    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options?: FloatingImageOptionsInterface);
    private logDebug;
    updatePosition(): boolean;
    getElement(): HTMLElement | null;
    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition?: boolean): boolean;
    private handleCollisions;
    private applyVelocityJitter;
    resetPosition(dims: ContainerDimensionsInterface): void;
    updateSize(): void;
    clampPosition(dims: ContainerDimensionsInterface): void;
    destroy(): void;
}
