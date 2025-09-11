// src/spaceface/features/FloatingImages/FloatingImage.ts

export const VERSION = 'nextworld-1.2.1' as const;

import { clamp } from '../bin/math.js';

import type {
    IContainerDimensions,
    IFloatingImageOptions
} from '../../types/features.js';

const DAMPING = 0.85;
const MIN_VELOCITY = 0.1;
const MAX_SPEED = 2.5;
const VELOCITY_JITTER = 0.02;

export class FloatingImage {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private options: Required<IFloatingImageOptions>;

    constructor(element: HTMLElement, dims: IContainerDimensions, options: IFloatingImageOptions = {}) {
        this.element = element;
        this.options = { useSubpixel: true, debug: false, ...options };
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        this.x = Math.random() * (dims.width - this.size.width);
        this.y = Math.random() * (dims.height - this.size.height);

        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = '1';

        this.updatePosition();
    }

    updatePosition(): boolean {
        if (!this.element) return false;
        const x = this.options.useSubpixel ? this.x : Math.round(this.x);
        const y = this.options.useSubpixel ? this.y : Math.round(this.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        return true;
    }

    update(multiplier: number, dims: IContainerDimensions, applyPosition = true): boolean {
        if (!this.element) return false;

        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;

        if (this.x <= 0 || this.x + this.size.width >= dims.width) {
            this.vx = -this.vx * DAMPING;
            this.vx = Math.abs(this.vx) < MIN_VELOCITY ? Math.sign(this.vx) * MIN_VELOCITY : this.vx;
            this.x = clamp(this.x, 0, dims.width - this.size.width);
        }

        if (this.y <= 0 || this.y + this.size.height >= dims.height) {
            this.vy = -this.vy * DAMPING;
            this.vy = Math.abs(this.vy) < MIN_VELOCITY ? Math.sign(this.vy) * MIN_VELOCITY : this.vy;
            this.y = clamp(this.y, 0, dims.height - this.size.height);
        }

        this.vx += (Math.random() - 0.5) * VELOCITY_JITTER;
        this.vy += (Math.random() - 0.5) * VELOCITY_JITTER;

        const speedSquared = this.vx ** 2 + this.vy ** 2;
        if (speedSquared > MAX_SPEED ** 2) {
            const scale = MAX_SPEED / Math.sqrt(speedSquared);
            this.vx *= scale;
            this.vy *= scale;
        }

        if (applyPosition) return this.updatePosition();
        return true;
    }

    resetPosition(dims: IContainerDimensions) {
        this.x = Math.random() * (dims.width - this.size.width);
        this.y = Math.random() * (dims.height - this.size.height);
        this.updatePosition(); // must be called
    }


    updateSize() {
        if (!this.element) return;
        this.size.width = this.element.offsetWidth;
        this.size.height = this.element.offsetHeight;
    }

    clampPosition(dims: IContainerDimensions) {
        this.x = clamp(this.x, 0, dims.width - this.size.width);
        this.y = clamp(this.y, 0, dims.height - this.size.height);
    }

    destroy() {
        if (!this.element) return;
        this.element.style.willChange = 'auto';
        this.element.style.backfaceVisibility = '';
        this.element.style.perspective = '';
        this.element = null;
    }
}
