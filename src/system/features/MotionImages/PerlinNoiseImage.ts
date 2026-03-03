import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

const NOISE_FREQUENCY = 0.0024;
const FLOW_SPEED = 0.0042;
const TURN_SMOOTHING = 0.08;
const BASE_SPEED = 0.5;
const SPEED_VARIATION = 1.0;
const ZOOM_RANGE = 0.09;
const ZOOM_BLEND = 0.14;
const MIN_ZOOM_FRAMES = 10;
const MAX_ZOOM_FRAMES = 45;

export class PerlinNoiseImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private time: number;
    private phaseOffset: number;
    private speedFactor: number;
    private baseScale: number;
    private scale: number;
    private targetScale: number;
    private framesUntilZoomTarget: number;
    private readonly useSubpixel: boolean;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = 0;
        this.vy = 0;
        this.time = Math.random() * 1000;
        this.phaseOffset = Math.random() * 1000;
        this.speedFactor = BASE_SPEED + Math.random() * SPEED_VARIATION;
        this.baseScale = 0.75 + Math.random() * 0.55;
        this.scale = this.baseScale;
        this.targetScale = this.randomScaleTarget();
        this.framesUntilZoomTarget = this.randomZoomFrames();

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

        this.time += FLOW_SPEED * Math.max(0.2, multiplier);
        const sampleX = (this.x + this.phaseOffset) * NOISE_FREQUENCY;
        const sampleY = (this.y + this.phaseOffset * 0.73) * NOISE_FREQUENCY;
        const field = this.perlin2(sampleX + this.time, sampleY + this.time * 0.41);
        const direction = field * Math.PI * 3.2;
        const speed = this.speedFactor * Math.max(0.2, multiplier);
        const targetVx = Math.cos(direction) * speed;
        const targetVy = Math.sin(direction) * speed;

        this.vx += (targetVx - this.vx) * TURN_SMOOTHING;
        this.vy += (targetVy - this.vy) * TURN_SMOOTHING;
        this.x += this.vx;
        this.y += this.vy;
        this.updateScale(multiplier);

        this.wrapAround(dims);
        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = 0;
        this.vy = 0;
        this.time = Math.random() * 1000;
        this.scale = this.baseScale;
        this.targetScale = this.randomScaleTarget();
        this.framesUntilZoomTarget = this.randomZoomFrames();
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

    private wrapAround(dims: ContainerDimensionsInterface): void {
        if (this.x > dims.width) this.x = -this.size.width;
        else if (this.x < -this.size.width) this.x = dims.width;

        if (this.y > dims.height) this.y = -this.size.height;
        else if (this.y < -this.size.height) this.y = dims.height;
    }

    private updateScale(multiplier: number): void {
        this.framesUntilZoomTarget -= Math.max(0.2, multiplier);
        if (this.framesUntilZoomTarget <= 0) {
            this.targetScale = this.randomScaleTarget();
            this.framesUntilZoomTarget = this.randomZoomFrames();
        }
        this.scale += (this.targetScale - this.scale) * ZOOM_BLEND * Math.max(0.2, multiplier);
    }

    private randomScaleTarget(): number {
        return this.baseScale + (Math.random() * 2 - 1) * ZOOM_RANGE;
    }

    private randomZoomFrames(): number {
        return Math.floor(Math.random() * (MAX_ZOOM_FRAMES - MIN_ZOOM_FRAMES + 1)) + MIN_ZOOM_FRAMES;
    }

    private perlin2(x: number, y: number): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const sx = this.fade(x - x0);
        const sy = this.fade(y - y0);

        const n00 = this.gradDot(x0, y0, x, y);
        const n10 = this.gradDot(x1, y0, x, y);
        const n01 = this.gradDot(x0, y1, x, y);
        const n11 = this.gradDot(x1, y1, x, y);

        const nx0 = this.lerp(n00, n10, sx);
        const nx1 = this.lerp(n01, n11, sx);
        return this.lerp(nx0, nx1, sy);
    }

    private gradDot(ix: number, iy: number, x: number, y: number): number {
        const hash = this.hash2(ix, iy);
        const angle = (hash / 4294967295) * Math.PI * 2;
        const gx = Math.cos(angle);
        const gy = Math.sin(angle);
        const dx = x - ix;
        const dy = y - iy;
        return gx * dx + gy * dy;
    }

    private hash2(x: number, y: number): number {
        let h = (x * 374761393 + y * 668265263) >>> 0;
        h ^= h >>> 13;
        h = (h * 1274126177) >>> 0;
        h ^= h >>> 16;
        return h >>> 0;
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
}
