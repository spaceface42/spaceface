import { clamp } from '../../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from '../types.js';

const BASE_DAMPING = 0.965;
const BASE_JITTER = 0.09;
const BASE_MAX_SPEED = 2.1;
const BASE_EDGE_PUSH = 0.2;
const EDGE_BAND = 0.22;
const SWAY_FACTOR = 0.18;
const SWAY_FREQUENCY = 0.022;

export class BrownianImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private readonly useSubpixel: boolean;
    private readonly depth: number;
    private readonly scale: number;
    private readonly jitterStrength: number;
    private readonly maxSpeed: number;
    private readonly edgePushStrength: number;
    private phase: number;
    private phaseSpeed: number;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };

        this.depth = 0.45 + Math.random() * 1.2;
        this.scale = 0.65 + this.depth * 0.45;
        this.jitterStrength = BASE_JITTER * (0.85 + this.depth * 0.5);
        this.maxSpeed = BASE_MAX_SPEED * (0.85 + this.depth * 0.4);
        this.edgePushStrength = BASE_EDGE_PUSH * (0.9 + this.depth * 0.35);
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpeed = SWAY_FREQUENCY + Math.random() * 0.015;

        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = (Math.random() - 0.5) * 0.9;
        this.vy = (Math.random() - 0.5) * 0.9;

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

        const dt = Math.max(0.2, multiplier);
        this.phase += this.phaseSpeed * dt;

        const jitterX = (Math.random() - 0.5) * this.jitterStrength * dt;
        const jitterY = (Math.random() - 0.5) * this.jitterStrength * dt;
        const swayX = Math.cos(this.phase) * SWAY_FACTOR * this.depth;
        const swayY = Math.sin(this.phase * 0.8) * SWAY_FACTOR * this.depth;

        this.vx += jitterX + swayX * 0.06;
        this.vy += jitterY + swayY * 0.06;
        this.vx *= BASE_DAMPING;
        this.vy *= BASE_DAMPING;

        this.pushFromEdges(dims);
        this.clampVelocity();

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));

        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = (Math.random() - 0.5) * 0.9;
        this.vy = (Math.random() - 0.5) * 0.9;
        this.phase = Math.random() * Math.PI * 2;
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
        if (speedSquared > this.maxSpeed ** 2) {
            const scale = this.maxSpeed / Math.sqrt(speedSquared);
            this.vx *= scale;
            this.vy *= scale;
        }
    }

    private pushFromEdges(dims: ContainerDimensionsInterface): void {
        const maxX = Math.max(0, dims.width - this.size.width);
        const maxY = Math.max(0, dims.height - this.size.height);
        const bandX = Math.max(1, maxX * EDGE_BAND);
        const bandY = Math.max(1, maxY * EDGE_BAND);

        if (this.x < bandX) {
            const factor = 1 - this.x / bandX;
            this.vx += this.edgePushStrength * factor;
        } else if (this.x > maxX - bandX) {
            const factor = 1 - (maxX - this.x) / bandX;
            this.vx -= this.edgePushStrength * factor;
        }

        if (this.y < bandY) {
            const factor = 1 - this.y / bandY;
            this.vy += this.edgePushStrength * factor;
        } else if (this.y > maxY - bandY) {
            const factor = 1 - (maxY - this.y) / bandY;
            this.vy -= this.edgePushStrength * factor;
        }
    }
}
