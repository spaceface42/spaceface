// src/spaceface/features/FloatingImages/FloatingImage.ts

export const VERSION = '2.0.0' as const;

import { clamp } from '../bin/math.js';

import type {
    ContainerDimensionsInterface,
    FloatingImageOptionsInterface
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
    private options: Required<FloatingImageOptionsInterface>;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: FloatingImageOptionsInterface = {}) {
        this.element = element;
        this.options = { useSubpixel: true, debug: false, ...options };
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        // guard against negative ranges if container is smaller than image
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);

        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = '1';

        this.updatePosition();
    }

    private logDebug(message: string, data?: unknown): void {
        if (this.options.debug) {
            console.debug(`[FloatingImage] ${message}`, data);
        }
    }

    updatePosition(): boolean {
        if (!this.element) {
            this.logDebug("updatePosition called on destroyed element");
            return false;
        }
        const x = this.options.useSubpixel ? this.x : Math.round(this.x);
        const y = this.options.useSubpixel ? this.y : Math.round(this.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.logDebug("Position updated", { x, y });
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) {
            this.logDebug("update called on destroyed element");
            return false;
        }

        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;

        this.handleCollisions(dims);
        this.applyVelocityJitter();

        if (applyPosition) return this.updatePosition();
        return true;
    }

    private handleCollisions(dims: ContainerDimensionsInterface): void {
        if (this.x <= 0 || this.x + this.size.width >= dims.width) {
            this.vx = -this.vx * DAMPING;
            const signX = this.vx >= 0 ? 1 : -1;
            this.vx = Math.abs(this.vx) < MIN_VELOCITY ? signX * MIN_VELOCITY : this.vx;
            this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
            this.logDebug("Horizontal collision handled", { x: this.x, vx: this.vx });
        }

        if (this.y <= 0 || this.y + this.size.height >= dims.height) {
            this.vy = -this.vy * DAMPING;
            const signY = this.vy >= 0 ? 1 : -1;
            this.vy = Math.abs(this.vy) < MIN_VELOCITY ? signY * MIN_VELOCITY : this.vy;
            this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));
            this.logDebug("Vertical collision handled", { y: this.y, vy: this.vy });
        }
    }

    private applyVelocityJitter(): void {
        this.vx += (Math.random() - 0.5) * VELOCITY_JITTER;
        this.vy += (Math.random() - 0.5) * VELOCITY_JITTER;

        const speedSquared = this.vx ** 2 + this.vy ** 2;
        if (speedSquared > MAX_SPEED ** 2) {
            const scale = MAX_SPEED / Math.sqrt(speedSquared);
            this.vx *= scale;
            this.vy *= scale;
            this.logDebug("Velocity clamped", { vx: this.vx, vy: this.vy });
        }
    }

    resetPosition(dims: ContainerDimensionsInterface) {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.updatePosition(); // must be called
    }


    updateSize() {
        if (!this.element) return;
        this.size.width = this.element.offsetWidth;
        this.size.height = this.element.offsetHeight;
    }

    clampPosition(dims: ContainerDimensionsInterface) {
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));
    }

    destroy() {
        if (!this.element) return;
        this.element.style.willChange = 'auto';
        this.element.style.backfaceVisibility = '';
        this.element.style.perspective = '';
        this.element = null;
    }
}
