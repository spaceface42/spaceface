import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

export class RainImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private readonly useSubpixel: boolean;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = -Math.random() * Math.max(this.size.height, dims.height);
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = 1 + Math.random() * 1.8;

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
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) return false;
        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;

        if (this.x < -this.size.width) this.x = Math.max(0, dims.width - this.size.width);
        else if (this.x > dims.width) this.x = -this.size.width;

        if (this.y > dims.height) this.resetPosition(dims);

        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = -Math.random() * Math.max(this.size.height, dims.height);
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = 1 + Math.random() * 1.8;
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
}
