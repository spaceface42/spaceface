import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

const DAMPING = 0.97;
const STEP_JITTER = 0.2;
const MAX_SPEED = 2.7;
const EDGE_PUSH = 0.28;

export class BrownianImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private readonly useSubpixel: boolean;
    private readonly scale: number;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        const depth = 0.45 + Math.random() * 1.2;
        this.scale = 0.65 + depth * 0.45;

        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;

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

        this.vx += (Math.random() - 0.5) * STEP_JITTER * multiplier;
        this.vy += (Math.random() - 0.5) * STEP_JITTER * multiplier;
        this.vx *= DAMPING;
        this.vy *= DAMPING;

        this.pushFromEdges(dims);
        this.clampVelocity();

        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));

        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
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

    private clampVelocity(): void {
        const speedSquared = this.vx ** 2 + this.vy ** 2;
        if (speedSquared > MAX_SPEED ** 2) {
            const scale = MAX_SPEED / Math.sqrt(speedSquared);
            this.vx *= scale;
            this.vy *= scale;
        }
    }

    private pushFromEdges(dims: ContainerDimensionsInterface): void {
        if (this.x < this.size.width * 0.3) this.vx += EDGE_PUSH;
        if (this.x > dims.width - this.size.width * 1.3) this.vx -= EDGE_PUSH;
        if (this.y < this.size.height * 0.3) this.vy += EDGE_PUSH;
        if (this.y > dims.height - this.size.height * 1.3) this.vy -= EDGE_PUSH;
    }
}
