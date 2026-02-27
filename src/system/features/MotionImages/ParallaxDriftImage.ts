import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

export class ParallaxDriftImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private readonly useSubpixel: boolean;
    private readonly debug: boolean;
    private readonly depth: number;
    private readonly scale: number;
    private readonly alpha: number;
    private phase: number;
    private phaseSpeed: number;
    private readonly baseFlowX: number;
    private readonly baseFlowY: number;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean; debug?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.debug = options.debug ?? false;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        this.depth = 0.35 + Math.random() * 1.35;
        this.scale = 0.55 + this.depth * 0.55;
        this.alpha = 0.35 + Math.min(0.55, this.depth * 0.35);
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpeed = 0.01 + Math.random() * 0.02;
        this.baseFlowX = 0.45 + this.depth * 1.1;
        this.baseFlowY = (Math.random() - 0.5) * (0.08 + this.depth * 0.15);

        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = this.baseFlowX;
        this.vy = this.baseFlowY;

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = `${this.alpha}`;
        element.style.zIndex = `${Math.round(this.depth * 10)}`;
        this.updatePosition();
    }

    private logDebug(message: string, data?: unknown): void {
        if (this.debug) console.debug(`[ParallaxDriftImage] ${message}`, data);
    }

    updatePosition(): boolean {
        if (!this.element) return false;
        const swayX = Math.cos(this.phase) * (2.5 * this.depth);
        const swayY = Math.sin(this.phase * 0.7) * (2 * this.depth);
        const xRaw = this.x + swayX;
        const yRaw = this.y + swayY;
        const x = this.useSubpixel ? xRaw : Math.round(xRaw);
        const y = this.useSubpixel ? yRaw : Math.round(yRaw);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${this.scale})`;
        this.logDebug('Position updated', { x, y, depth: this.depth });
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) return false;
        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;
        this.phase += this.phaseSpeed * Math.max(0.2, multiplier);
        this.handleWrap(dims);
        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
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
        this.element.style.zIndex = '';
        this.element = null;
    }

    private handleWrap(dims: ContainerDimensionsInterface): void {
        if (this.x > dims.width + this.size.width) {
            this.x = -this.size.width - Math.random() * 80;
            this.y = Math.random() * Math.max(0, dims.height - this.size.height);
            return;
        }
        if (this.x < -this.size.width * 2) {
            this.x = dims.width + Math.random() * 80;
            this.y = Math.random() * Math.max(0, dims.height - this.size.height);
            return;
        }
        if (this.y > dims.height + this.size.height) {
            this.y = -this.size.height;
        } else if (this.y < -this.size.height) {
            this.y = dims.height;
        }
    }
}
