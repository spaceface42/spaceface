import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

const MAX_SCALE = 3.2;
const ACCELERATION = 1.02;

export class WarpImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private scale: number;
    private scaleVelocity: number;
    private readonly useSubpixel: boolean;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.scale = 1;
        this.scaleVelocity = 0;
        this.spawn(dims);

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = '1';
        this.updatePosition();
    }

    updatePosition(): boolean {
        if (!this.element) return false;
        const x = this.useSubpixel ? this.x : Math.round(this.x);
        const y = this.useSubpixel ? this.y : Math.round(this.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${this.scale})`;
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) return false;

        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;
        this.vx *= ACCELERATION;
        this.vy *= ACCELERATION;
        this.scale += this.scaleVelocity;

        const offscreenX = this.x + this.size.width < 0 || this.x > dims.width;
        const offscreenY = this.y + this.size.height < 0 || this.y > dims.height;
        if (offscreenX || offscreenY || this.scale >= MAX_SCALE) {
            this.spawn(dims);
        }

        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.spawn(dims);
        this.updatePosition();
    }

    updateSize(): void {
        if (!this.element) return;
        this.size.width = this.element.offsetWidth;
        this.size.height = this.element.offsetHeight;
    }

    clampPosition(dims: ContainerDimensionsInterface): void {
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));
    }

    destroy(): void {
        if (!this.element) return;
        this.element.style.willChange = 'auto';
        this.element.style.backfaceVisibility = '';
        this.element.style.perspective = '';
        this.element = null;
    }

    private spawn(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);

        const imageCenterX = this.x + this.size.width / 2;
        const imageCenterY = this.y + this.size.height / 2;
        const leftDistance = imageCenterX;
        const rightDistance = dims.width - imageCenterX;
        const topDistance = imageCenterY;
        const bottomDistance = dims.height - imageCenterY;

        const minDistance = Math.min(leftDistance, rightDistance, topDistance, bottomDistance);
        let targetX = imageCenterX;
        let targetY = imageCenterY;

        if (minDistance === leftDistance) targetX = -this.size.width;
        else if (minDistance === rightDistance) targetX = dims.width + this.size.width;
        else if (minDistance === topDistance) targetY = -this.size.height;
        else targetY = dims.height + this.size.height;

        const directionX = targetX - imageCenterX;
        const directionY = targetY - imageCenterY;
        const magnitude = Math.hypot(directionX, directionY) || 1;
        const initialSpeed = 0.15 + Math.random() * 0.45;

        this.vx = (directionX / magnitude) * initialSpeed;
        this.vy = (directionY / magnitude) * initialSpeed;
        this.scale = 0.12 + Math.random() * 0.22;
        this.scaleVelocity = 0.008 + Math.random() * 0.016;
    }
}
